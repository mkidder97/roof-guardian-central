-- Phase 2: Normalize inspection_campaigns JSON blobs into proper relational tables
-- This migration creates junction tables for campaign-property relationships and settings

-- =====================================================
-- 1. CAMPAIGN PROPERTIES JUNCTION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.campaign_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.inspection_campaigns(id) ON DELETE CASCADE,
  roof_id UUID NOT NULL REFERENCES public.roofs(id) ON DELETE CASCADE,
  sequence_order INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'contacted', 'scheduled', 'in_progress', 'completed', 'cancelled', 'failed'
  )),
  scheduled_date DATE,
  completed_date DATE,
  contact_attempted_date DATE,
  response_received_date DATE,
  inspector_id UUID REFERENCES auth.users(id),
  inspector_notes TEXT,
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
  
  -- Campaign-specific property metadata
  property_manager_contact_id UUID REFERENCES public.contacts(id),
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'mail')),
  accessibility_notes TEXT,
  special_instructions TEXT,
  
  -- Tracking fields
  email_sent_count INTEGER DEFAULT 0,
  last_email_sent DATE,
  phone_contact_attempts INTEGER DEFAULT 0,
  last_phone_contact DATE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique campaign-property combinations
  UNIQUE(campaign_id, roof_id)
);

-- =====================================================
-- 2. CAMPAIGN AUTOMATION SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.campaign_automation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.inspection_campaigns(id) ON DELETE CASCADE,
  setting_type TEXT NOT NULL CHECK (setting_type IN (
    'email_reminder', 'follow_up_sequence', 'auto_schedule', 'escalation_rule',
    'communication_preference', 'inspector_assignment', 'weather_dependency'
  )),
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  setting_metadata JSONB DEFAULT '{}', -- For complex configuration data only
  is_enabled BOOLEAN DEFAULT true,
  
  -- Conditional settings
  condition_type TEXT CHECK (condition_type IN ('always', 'property_type', 'region', 'custom')),
  condition_value TEXT,
  
  -- Timing settings
  trigger_delay_days INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retry_count INTEGER DEFAULT 3,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique setting combinations per campaign
  UNIQUE(campaign_id, setting_type, setting_key)
);

-- =====================================================
-- 3. CAMPAIGN COMMUNICATION LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.campaign_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.inspection_campaigns(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.roofs(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL CHECK (communication_type IN (
    'email', 'phone', 'sms', 'mail', 'site_visit', 'portal_message'
  )),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  
  -- Communication details
  subject TEXT,
  message_content TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,
  sender_id UUID REFERENCES auth.users(id),
  
  -- Integration fields
  external_message_id TEXT, -- For email service integration
  external_thread_id TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed'
  )),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  
  -- Response data
  response_content TEXT,
  response_metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. ENHANCED CAMPAIGN TABLE COLUMNS
-- =====================================================

-- Add new tracking columns to campaigns table
DO $$ 
BEGIN
  -- Add total cost tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'inspection_campaigns' AND column_name = 'total_estimated_cost') THEN
    ALTER TABLE public.inspection_campaigns ADD COLUMN total_estimated_cost NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'inspection_campaigns' AND column_name = 'total_actual_cost') THEN
    ALTER TABLE public.inspection_campaigns ADD COLUMN total_actual_cost NUMERIC(12,2) DEFAULT 0;
  END IF;
  
  -- Add progress tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'inspection_campaigns' AND column_name = 'progress_percentage') THEN
    ALTER TABLE public.inspection_campaigns ADD COLUMN progress_percentage NUMERIC(5,2) DEFAULT 0;
  END IF;
  
  -- Add communication stats
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'inspection_campaigns' AND column_name = 'emails_sent_count') THEN
    ALTER TABLE public.inspection_campaigns ADD COLUMN emails_sent_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'inspection_campaigns' AND column_name = 'responses_received_count') THEN
    ALTER TABLE public.inspection_campaigns ADD COLUMN responses_received_count INTEGER DEFAULT 0;
  END IF;
  
  -- Add timing fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'inspection_campaigns' AND column_name = 'first_email_sent_at') THEN
    ALTER TABLE public.inspection_campaigns ADD COLUMN first_email_sent_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'inspection_campaigns' AND column_name = 'last_activity_at') THEN
    ALTER TABLE public.inspection_campaigns ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

-- Campaign properties indexes
CREATE INDEX IF NOT EXISTS idx_campaign_properties_campaign_id 
  ON public.campaign_properties(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_properties_roof_id 
  ON public.campaign_properties(roof_id);
CREATE INDEX IF NOT EXISTS idx_campaign_properties_status 
  ON public.campaign_properties(status);
CREATE INDEX IF NOT EXISTS idx_campaign_properties_inspector_id 
  ON public.campaign_properties(inspector_id);
CREATE INDEX IF NOT EXISTS idx_campaign_properties_scheduled_date 
  ON public.campaign_properties(scheduled_date);

-- Automation settings indexes
CREATE INDEX IF NOT EXISTS idx_campaign_automation_settings_campaign_id 
  ON public.campaign_automation_settings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_automation_settings_type 
  ON public.campaign_automation_settings(setting_type);
CREATE INDEX IF NOT EXISTS idx_campaign_automation_settings_enabled 
  ON public.campaign_automation_settings(is_enabled);

-- Communications indexes
CREATE INDEX IF NOT EXISTS idx_campaign_communications_campaign_id 
  ON public.campaign_communications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_communications_property_id 
  ON public.campaign_communications(property_id);
CREATE INDEX IF NOT EXISTS idx_campaign_communications_type 
  ON public.campaign_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_campaign_communications_status 
  ON public.campaign_communications(status);
CREATE INDEX IF NOT EXISTS idx_campaign_communications_sent_at 
  ON public.campaign_communications(sent_at);

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.campaign_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_properties
CREATE POLICY "Users can view campaign properties they have access to"
  ON public.campaign_properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_campaigns c
      WHERE c.id = campaign_id
      -- Add your specific access control logic here
    )
  );

CREATE POLICY "Users can manage campaign properties they have access to"
  ON public.campaign_properties FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_campaigns c
      WHERE c.id = campaign_id
      -- Add your specific access control logic here
    )
  );

-- RLS Policies for automation settings
CREATE POLICY "Users can view automation settings for their campaigns"
  ON public.campaign_automation_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_campaigns c
      WHERE c.id = campaign_id
      -- Add your specific access control logic here
    )
  );

-- RLS Policies for communications
CREATE POLICY "Users can view communications for their campaigns"
  ON public.campaign_communications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_campaigns c
      WHERE c.id = campaign_id
      -- Add your specific access control logic here
    )
  );

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT AND AUTOMATION
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_campaign_properties_updated_at
  BEFORE UPDATE ON public.campaign_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_automation_settings_updated_at
  BEFORE UPDATE ON public.campaign_automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update campaign statistics
CREATE OR REPLACE FUNCTION public.update_campaign_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign progress and costs when properties are updated
  UPDATE public.inspection_campaigns SET
    progress_percentage = (
      SELECT ROUND(
        (COUNT(CASE WHEN cp.status = 'completed' THEN 1 END)::numeric / 
         NULLIF(COUNT(*)::numeric, 0)) * 100, 2
      )
      FROM public.campaign_properties cp
      WHERE cp.campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
    ),
    total_estimated_cost = (
      SELECT COALESCE(SUM(estimated_cost), 0)
      FROM public.campaign_properties cp
      WHERE cp.campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
    ),
    total_actual_cost = (
      SELECT COALESCE(SUM(actual_cost), 0)
      FROM public.campaign_properties cp
      WHERE cp.campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
    ),
    last_activity_at = now()
  WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update campaign statistics
CREATE TRIGGER update_campaign_statistics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.campaign_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_campaign_statistics();

-- =====================================================
-- 8. HELPFUL VIEWS
-- =====================================================

-- Campaign performance overview
CREATE OR REPLACE VIEW public.campaign_performance AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.status as campaign_status,
  c.inspection_type,
  COUNT(cp.id) as total_properties,
  COUNT(CASE WHEN cp.status = 'completed' THEN 1 END) as completed_properties,
  COUNT(CASE WHEN cp.status = 'pending' THEN 1 END) as pending_properties,
  COUNT(CASE WHEN cp.status = 'in_progress' THEN 1 END) as in_progress_properties,
  c.progress_percentage,
  c.total_estimated_cost,
  c.total_actual_cost,
  c.emails_sent_count,
  c.responses_received_count,
  c.created_at,
  c.last_activity_at
FROM public.inspection_campaigns c
LEFT JOIN public.campaign_properties cp ON c.id = cp.campaign_id
GROUP BY c.id, c.name, c.status, c.inspection_type, c.progress_percentage, 
         c.total_estimated_cost, c.total_actual_cost, c.emails_sent_count,
         c.responses_received_count, c.created_at, c.last_activity_at;

-- Property campaign details
CREATE OR REPLACE VIEW public.property_campaign_details AS
SELECT 
  cp.id as campaign_property_id,
  cp.campaign_id,
  c.name as campaign_name,
  cp.roof_id,
  r.property_name,
  r.address,
  r.city,
  r.state,
  cp.status as property_status,
  cp.scheduled_date,
  cp.completed_date,
  cp.inspector_id,
  u.email as inspector_email,
  cp.estimated_cost,
  cp.actual_cost,
  cp.priority_score,
  cp.sequence_order
FROM public.campaign_properties cp
JOIN public.inspection_campaigns c ON cp.campaign_id = c.id
JOIN public.roofs r ON cp.roof_id = r.id
LEFT JOIN auth.users u ON cp.inspector_id = u.id;

-- Grant permissions on views
GRANT SELECT ON public.campaign_performance TO authenticated;
GRANT SELECT ON public.property_campaign_details TO authenticated;

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.campaign_properties IS 'Junction table for campaign-property relationships, replacing JSON arrays in campaigns';
COMMENT ON TABLE public.campaign_automation_settings IS 'Structured storage for campaign automation rules and settings';
COMMENT ON TABLE public.campaign_communications IS 'Log of all campaign communications for tracking and analytics';

COMMENT ON COLUMN public.campaign_properties.sequence_order IS 'Order of property processing within campaign';
COMMENT ON COLUMN public.campaign_properties.priority_score IS 'Priority score (0-100) for scheduling optimization';
COMMENT ON COLUMN public.campaign_automation_settings.setting_type IS 'Type of automation setting for categorization';
COMMENT ON COLUMN public.campaign_communications.direction IS 'Direction of communication (inbound/outbound)';

-- =====================================================
-- 10. DEFAULT AUTOMATION SETTINGS
-- =====================================================

-- Function to create default automation settings for new campaigns
CREATE OR REPLACE FUNCTION public.create_default_campaign_settings(p_campaign_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Default email reminder settings
  INSERT INTO public.campaign_automation_settings (
    campaign_id, setting_type, setting_key, setting_value, is_enabled
  ) VALUES
  (p_campaign_id, 'email_reminder', 'initial_contact_delay_days', '0', true),
  (p_campaign_id, 'email_reminder', 'follow_up_delay_days', '7', true),
  (p_campaign_id, 'email_reminder', 'max_reminders', '3', true),
  (p_campaign_id, 'follow_up_sequence', 'sequence_enabled', 'true', true),
  (p_campaign_id, 'auto_schedule', 'enabled', 'false', false),
  (p_campaign_id, 'escalation_rule', 'escalate_after_days', '14', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_default_campaign_settings(UUID) TO authenticated;