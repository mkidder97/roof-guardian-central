-- Phase 3: Normalize campaign_groups and property_groups JSON blobs
-- This migration creates proper junction tables for group-property relationships and rules

-- =====================================================
-- 1. GROUP PROPERTIES JUNCTION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.group_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.campaign_groups(id) ON DELETE CASCADE,
  roof_id UUID NOT NULL REFERENCES public.roofs(id) ON DELETE CASCADE,
  sequence_order INTEGER,
  assignment_reason TEXT CHECK (assignment_reason IN (
    'geographic', 'property_value', 'risk_level', 'property_type', 
    'property_manager', 'manual', 'algorithm', 'seasonal'
  )),
  assignment_score NUMERIC(5,2), -- Score used for algorithmic grouping
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique group-property combinations
  UNIQUE(group_id, roof_id)
);

-- =====================================================
-- 2. GROUP RULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.group_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.campaign_groups(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'geographic', 'property_value', 'risk_score', 'property_type', 'age', 
    'size', 'inspector_preference', 'seasonal', 'custom'
  )),
  rule_operator TEXT NOT NULL CHECK (rule_operator IN (
    'equals', 'not_equals', 'greater_than', 'less_than', 'between', 
    'in_list', 'not_in_list', 'contains', 'within_radius', 'regex'
  )),
  rule_field TEXT NOT NULL, -- Which property field to evaluate
  rule_value TEXT NOT NULL, -- The value(s) to compare against
  rule_value_secondary TEXT, -- For 'between' operations
  rule_weight NUMERIC(3,2) DEFAULT 1.0, -- Weight in scoring algorithms
  is_active BOOLEAN DEFAULT true,
  
  -- Rule execution settings
  priority_order INTEGER DEFAULT 100,
  stop_on_match BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. GROUP EXECUTION LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.group_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.campaign_groups(id) ON DELETE CASCADE,
  execution_type TEXT NOT NULL CHECK (execution_type IN (
    'manual_assignment', 'rule_evaluation', 'algorithm_run', 'bulk_import'
  )),
  
  -- Execution details
  properties_processed INTEGER DEFAULT 0,
  properties_assigned INTEGER DEFAULT 0,
  properties_removed INTEGER DEFAULT 0,
  rules_evaluated INTEGER DEFAULT 0,
  
  -- Results and metadata
  execution_summary JSONB DEFAULT '{}',
  error_log TEXT,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- User tracking
  executed_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. ENHANCED GROUP TABLE COLUMNS
-- =====================================================

-- Add new tracking columns to campaign_groups table
DO $$ 
BEGIN
  -- Add property count tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'campaign_groups' AND column_name = 'property_count') THEN
    ALTER TABLE public.campaign_groups ADD COLUMN property_count INTEGER DEFAULT 0;
  END IF;
  
  -- Add rule count tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'campaign_groups' AND column_name = 'rule_count') THEN
    ALTER TABLE public.campaign_groups ADD COLUMN rule_count INTEGER DEFAULT 0;
  END IF;
  
  -- Add algorithm settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'campaign_groups' AND column_name = 'algorithm_type') THEN
    ALTER TABLE public.campaign_groups ADD COLUMN algorithm_type TEXT 
      CHECK (algorithm_type IN ('manual', 'rule_based', 'geographic', 'optimization', 'hybrid'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'campaign_groups' AND column_name = 'max_properties') THEN
    ALTER TABLE public.campaign_groups ADD COLUMN max_properties INTEGER;
  END IF;
  
  -- Add status tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'campaign_groups' AND column_name = 'is_active') THEN
    ALTER TABLE public.campaign_groups ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  -- Add last execution tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'campaign_groups' AND column_name = 'last_executed_at') THEN
    ALTER TABLE public.campaign_groups ADD COLUMN last_executed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add geographic center for geographic groups
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'campaign_groups' AND column_name = 'geographic_center') THEN
    ALTER TABLE public.campaign_groups ADD COLUMN geographic_center POINT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'campaign_groups' AND column_name = 'geographic_radius_miles') THEN
    ALTER TABLE public.campaign_groups ADD COLUMN geographic_radius_miles NUMERIC(8,2);
  END IF;
END $$;

-- =====================================================
-- 5. PROPERTY GROUPS TABLE (IF SEPARATE FROM CAMPAIGN GROUPS)
-- =====================================================

-- Check if property_groups table exists and normalize it too
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_groups') THEN
    
    -- Create junction table for property_groups if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.property_group_assignments (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      property_group_id UUID NOT NULL, -- Will add FK constraint after checking table structure
      roof_id UUID NOT NULL REFERENCES public.roofs(id) ON DELETE CASCADE,
      sequence_order INTEGER,
      assignment_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(property_group_id, roof_id)
    );
    
    -- Add FK constraint if property_groups table has id column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'property_groups' AND column_name = 'id') THEN
      ALTER TABLE public.property_group_assignments 
      ADD CONSTRAINT fk_property_group_assignments_group_id 
      FOREIGN KEY (property_group_id) REFERENCES public.property_groups(id) ON DELETE CASCADE;
    END IF;
    
  END IF;
END $$;

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Group properties indexes
CREATE INDEX IF NOT EXISTS idx_group_properties_group_id 
  ON public.group_properties(group_id);
CREATE INDEX IF NOT EXISTS idx_group_properties_roof_id 
  ON public.group_properties(roof_id);
CREATE INDEX IF NOT EXISTS idx_group_properties_assignment_reason 
  ON public.group_properties(assignment_reason);
CREATE INDEX IF NOT EXISTS idx_group_properties_active 
  ON public.group_properties(is_active);

-- Group rules indexes
CREATE INDEX IF NOT EXISTS idx_group_rules_group_id 
  ON public.group_rules(group_id);
CREATE INDEX IF NOT EXISTS idx_group_rules_type 
  ON public.group_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_group_rules_active 
  ON public.group_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_group_rules_priority 
  ON public.group_rules(priority_order);

-- Group executions indexes
CREATE INDEX IF NOT EXISTS idx_group_executions_group_id 
  ON public.group_executions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_executions_type 
  ON public.group_executions(execution_type);
CREATE INDEX IF NOT EXISTS idx_group_executions_started_at 
  ON public.group_executions(started_at);

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.group_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_properties
CREATE POLICY "Users can view group properties they have access to"
  ON public.group_properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_groups g
      WHERE g.id = group_id
      -- Add your specific access control logic here
    )
  );

-- RLS Policies for group_rules
CREATE POLICY "Users can view group rules they have access to"
  ON public.group_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_groups g
      WHERE g.id = group_id
      -- Add your specific access control logic here
    )
  );

-- RLS Policies for group_executions
CREATE POLICY "Users can view group executions they have access to"
  ON public.group_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_groups g
      WHERE g.id = group_id
      -- Add your specific access control logic here
    )
  );

-- =====================================================
-- 8. TRIGGERS FOR UPDATED_AT AND AUTOMATION
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_group_properties_updated_at
  BEFORE UPDATE ON public.group_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_rules_updated_at
  BEFORE UPDATE ON public.group_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update group statistics
CREATE OR REPLACE FUNCTION public.update_group_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update group property counts when properties are added/removed
  UPDATE public.campaign_groups SET
    property_count = (
      SELECT COUNT(*)
      FROM public.group_properties gp
      WHERE gp.group_id = COALESCE(NEW.group_id, OLD.group_id)
        AND gp.is_active = true
    ),
    last_executed_at = now()
  WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update group statistics
CREATE TRIGGER update_group_statistics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.group_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_group_statistics();

-- Function to update rule counts
CREATE OR REPLACE FUNCTION public.update_group_rule_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update group rule counts when rules are added/removed
  UPDATE public.campaign_groups SET
    rule_count = (
      SELECT COUNT(*)
      FROM public.group_rules gr
      WHERE gr.group_id = COALESCE(NEW.group_id, OLD.group_id)
        AND gr.is_active = true
    )
  WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rule counts
CREATE TRIGGER update_group_rule_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.group_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_group_rule_count();

-- =====================================================
-- 9. HELPFUL VIEWS
-- =====================================================

-- Group overview with statistics
CREATE OR REPLACE VIEW public.group_overview AS
SELECT 
  g.id as group_id,
  g.name as group_name,
  g.group_type,
  g.client_id,
  g.property_count,
  g.rule_count,
  g.algorithm_type,
  g.max_properties,
  g.is_active,
  g.last_executed_at,
  g.geographic_center,
  g.geographic_radius_miles,
  COUNT(gp.id) as active_properties,
  COUNT(gr.id) as active_rules,
  COUNT(ge.id) as total_executions,
  MAX(ge.started_at) as last_execution_date
FROM public.campaign_groups g
LEFT JOIN public.group_properties gp ON g.id = gp.group_id AND gp.is_active = true
LEFT JOIN public.group_rules gr ON g.id = gr.group_id AND gr.is_active = true
LEFT JOIN public.group_executions ge ON g.id = ge.group_id
GROUP BY g.id, g.name, g.group_type, g.client_id, g.property_count, g.rule_count,
         g.algorithm_type, g.max_properties, g.is_active, g.last_executed_at,
         g.geographic_center, g.geographic_radius_miles;

-- Property assignment details
CREATE OR REPLACE VIEW public.property_assignments AS
SELECT 
  gp.id as assignment_id,
  gp.group_id,
  g.name as group_name,
  g.group_type,
  gp.roof_id,
  r.property_name,
  r.address,
  r.city,
  r.state,
  gp.sequence_order,
  gp.assignment_reason,
  gp.assignment_score,
  gp.is_active,
  gp.assigned_at,
  u.email as assigned_by_email
FROM public.group_properties gp
JOIN public.campaign_groups g ON gp.group_id = g.id
JOIN public.roofs r ON gp.roof_id = r.id
LEFT JOIN auth.users u ON gp.assigned_by = u.id;

-- Grant permissions on views
GRANT SELECT ON public.group_overview TO authenticated;
GRANT SELECT ON public.property_assignments TO authenticated;

-- =====================================================
-- 10. GROUP RULE EXECUTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.execute_group_rules(p_group_id UUID)
RETURNS UUID AS $$
DECLARE
  execution_id UUID;
  rule_record RECORD;
  properties_processed INTEGER := 0;
  properties_assigned INTEGER := 0;
  rules_evaluated INTEGER := 0;
  start_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Create execution record
  INSERT INTO public.group_executions (
    group_id, execution_type, executed_by, started_at
  ) VALUES (
    p_group_id, 'rule_evaluation', auth.uid(), start_time
  ) RETURNING id INTO execution_id;
  
  -- Get all active rules for this group, ordered by priority
  FOR rule_record IN 
    SELECT * FROM public.group_rules 
    WHERE group_id = p_group_id 
      AND is_active = true 
    ORDER BY priority_order ASC
  LOOP
    rules_evaluated := rules_evaluated + 1;
    
    -- Execute rule logic here (simplified example)
    -- In a real implementation, this would contain complex rule evaluation logic
    -- based on rule_type, rule_operator, rule_field, and rule_value
    
    -- For now, just log that the rule was evaluated
    -- Implementation would vary based on specific rule types
    
  END LOOP;
  
  -- Update execution record with results
  UPDATE public.group_executions SET
    completed_at = now(),
    duration_seconds = EXTRACT(EPOCH FROM (now() - start_time))::INTEGER,
    properties_processed = properties_processed,
    properties_assigned = properties_assigned,
    rules_evaluated = rules_evaluated,
    execution_summary = jsonb_build_object(
      'rules_evaluated', rules_evaluated,
      'properties_processed', properties_processed,
      'properties_assigned', properties_assigned,
      'execution_time_seconds', EXTRACT(EPOCH FROM (now() - start_time))
    )
  WHERE id = execution_id;
  
  -- Update group last executed timestamp
  UPDATE public.campaign_groups SET
    last_executed_at = now()
  WHERE id = p_group_id;
  
  RETURN execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.group_properties IS 'Junction table for group-property relationships, replacing JSON arrays in groups';
COMMENT ON TABLE public.group_rules IS 'Structured storage for group assignment rules and algorithms';
COMMENT ON TABLE public.group_executions IS 'Log of group rule executions and property assignments';

COMMENT ON COLUMN public.group_properties.assignment_reason IS 'Reason for property assignment to group';
COMMENT ON COLUMN public.group_rules.rule_type IS 'Type of rule for categorization and execution';
COMMENT ON COLUMN public.group_rules.rule_weight IS 'Weight of rule in scoring algorithms (0.0-1.0)';

-- Grant execute permission on rule execution function
GRANT EXECUTE ON FUNCTION public.execute_group_rules(UUID) TO authenticated;