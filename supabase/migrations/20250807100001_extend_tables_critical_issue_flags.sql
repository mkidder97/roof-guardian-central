-- Extend existing tables with critical issue flags and tracking
-- This migration adds critical issue detection and management fields

-- Extend inspections table with critical issue management
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS has_critical_issues BOOLEAN DEFAULT false;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS critical_issue_count INTEGER DEFAULT 0;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS last_criticality_check TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS supervisor_alert_sent BOOLEAN DEFAULT false;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS supervisor_alert_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS emergency_contact_made BOOLEAN DEFAULT false;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS emergency_contact_at TIMESTAMP WITH TIME ZONE;

-- Extend inspection_deficiencies table with critical flags
ALTER TABLE public.inspection_deficiencies ADD COLUMN IF NOT EXISTS is_immediate_repair BOOLEAN DEFAULT false;
ALTER TABLE public.inspection_deficiencies ADD COLUMN IF NOT EXISTS needs_supervisor_alert BOOLEAN DEFAULT false;
ALTER TABLE public.inspection_deficiencies ADD COLUMN IF NOT EXISTS criticality_score INTEGER DEFAULT 0 CHECK (criticality_score >= 0 AND criticality_score <= 100);
ALTER TABLE public.inspection_deficiencies ADD COLUMN IF NOT EXISTS detection_timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.inspection_deficiencies ADD COLUMN IF NOT EXISTS alert_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.inspection_deficiencies ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.inspection_deficiencies ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES public.users(id);

-- Add indexes for efficient critical issue queries
CREATE INDEX IF NOT EXISTS idx_inspections_has_critical_issues ON public.inspections(has_critical_issues) WHERE has_critical_issues = true;
CREATE INDEX IF NOT EXISTS idx_inspections_supervisor_alert_sent ON public.inspections(supervisor_alert_sent) WHERE supervisor_alert_sent = false AND has_critical_issues = true;
CREATE INDEX IF NOT EXISTS idx_inspections_emergency_contact ON public.inspections(emergency_contact_made) WHERE emergency_contact_made = false AND has_critical_issues = true;

CREATE INDEX IF NOT EXISTS idx_deficiencies_is_immediate_repair ON public.inspection_deficiencies(is_immediate_repair) WHERE is_immediate_repair = true;
CREATE INDEX IF NOT EXISTS idx_deficiencies_needs_supervisor_alert ON public.inspection_deficiencies(needs_supervisor_alert) WHERE needs_supervisor_alert = true;
CREATE INDEX IF NOT EXISTS idx_deficiencies_criticality_score ON public.inspection_deficiencies(criticality_score DESC) WHERE criticality_score > 70;

-- Create function to update inspection critical issue status
CREATE OR REPLACE FUNCTION public.update_inspection_critical_status(inspection_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  critical_count INTEGER;
  has_critical BOOLEAN;
BEGIN
  -- Count critical deficiencies for this inspection
  SELECT 
    COUNT(*),
    COUNT(*) > 0
  INTO critical_count, has_critical
  FROM public.inspection_deficiencies 
  WHERE inspection_id = $1 
  AND (is_immediate_repair = true OR needs_supervisor_alert = true OR criticality_score > 70);
  
  -- Update inspection record
  UPDATE public.inspections 
  SET 
    has_critical_issues = has_critical,
    critical_issue_count = critical_count,
    last_criticality_check = now(),
    updated_at = now()
  WHERE id = inspection_id;
END;
$$;

-- Create function to calculate deficiency criticality score
CREATE OR REPLACE FUNCTION public.calculate_criticality_score(
  deficiency_type TEXT,
  severity TEXT,
  description TEXT,
  location_description TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score INTEGER := 0;
  critical_keywords TEXT[] := ARRAY[
    'roof failure', 'membrane failure', 'structural damage', 'structural failure',
    'collapse', 'falling', 'dangerous', 'unsafe', 'emergency', 'immediate',
    'leak severe', 'water intrusion', 'mold', 'electrical hazard',
    'safety hazard', 'injury risk', 'slip hazard', 'fall hazard'
  ];
  high_priority_keywords TEXT[] := ARRAY[
    'leak', 'water damage', 'ponding', 'cracking', 'separation',
    'deterioration', 'wear', 'aging', 'maintenance needed'
  ];
  keyword TEXT;
  desc_lower TEXT;
BEGIN
  -- Base score from severity
  CASE severity
    WHEN 'high' THEN score := 60;
    WHEN 'medium' THEN score := 30;
    WHEN 'low' THEN score := 10;
    ELSE score := 0;
  END CASE;
  
  -- Combine description fields for keyword analysis
  desc_lower := LOWER(COALESCE(description, '') || ' ' || COALESCE(location_description, ''));
  
  -- Check for critical keywords
  FOREACH keyword IN ARRAY critical_keywords
  LOOP
    IF desc_lower LIKE '%' || keyword || '%' THEN
      score := score + 30;
      EXIT; -- Only add bonus once for critical keywords
    END IF;
  END LOOP;
  
  -- Check for high priority keywords (smaller bonus)
  FOREACH keyword IN ARRAY high_priority_keywords
  LOOP
    IF desc_lower LIKE '%' || keyword || '%' THEN
      score := score + 15;
      EXIT; -- Only add bonus once for high priority keywords
    END IF;
  END LOOP;
  
  -- Additional scoring based on deficiency type
  CASE LOWER(deficiency_type)
    WHEN 'structural' THEN score := score + 20;
    WHEN 'safety' THEN score := score + 25;
    WHEN 'membrane' THEN score := score + 15;
    WHEN 'flashing' THEN score := score + 10;
    ELSE score := score + 0;
  END CASE;
  
  -- Cap score at 100
  IF score > 100 THEN
    score := 100;
  END IF;
  
  RETURN score;
END;
$$;

-- Create trigger to automatically update criticality scores and flags
CREATE OR REPLACE FUNCTION public.handle_deficiency_criticality()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_score INTEGER;
BEGIN
  -- Calculate criticality score
  new_score := public.calculate_criticality_score(
    NEW.deficiency_type,
    NEW.severity,
    NEW.description,
    NEW.location_description
  );
  
  -- Update the new record with calculated values
  NEW.criticality_score := new_score;
  NEW.detection_timestamp := now();
  
  -- Set flags based on score
  IF new_score >= 80 THEN
    NEW.is_immediate_repair := true;
    NEW.needs_supervisor_alert := true;
  ELSIF new_score >= 60 THEN
    NEW.needs_supervisor_alert := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on inspection_deficiencies
DROP TRIGGER IF EXISTS trigger_deficiency_criticality ON public.inspection_deficiencies;
CREATE TRIGGER trigger_deficiency_criticality
  BEFORE INSERT OR UPDATE ON public.inspection_deficiencies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_deficiency_criticality();

-- Create trigger to update inspection critical status when deficiencies change
CREATE OR REPLACE FUNCTION public.handle_inspection_critical_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update inspection critical status for both old and new inspection (in case deficiency moved)
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_inspection_critical_status(OLD.inspection_id);
    RETURN OLD;
  ELSE
    PERFORM public.update_inspection_critical_status(NEW.inspection_id);
    
    -- If inspection_id changed, update old inspection too
    IF TG_OP = 'UPDATE' AND OLD.inspection_id != NEW.inspection_id THEN
      PERFORM public.update_inspection_critical_status(OLD.inspection_id);
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_inspection_critical_status_update ON public.inspection_deficiencies;
CREATE TRIGGER trigger_inspection_critical_status_update
  AFTER INSERT OR UPDATE OR DELETE ON public.inspection_deficiencies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inspection_critical_status_update();

-- Update existing deficiencies with criticality scores
UPDATE public.inspection_deficiencies 
SET 
  criticality_score = public.calculate_criticality_score(deficiency_type, severity, description, location_description),
  detection_timestamp = now(),
  is_immediate_repair = (public.calculate_criticality_score(deficiency_type, severity, description, location_description) >= 80),
  needs_supervisor_alert = (public.calculate_criticality_score(deficiency_type, severity, description, location_description) >= 60)
WHERE criticality_score IS NULL OR criticality_score = 0;

-- Update existing inspections with critical issue status
UPDATE public.inspections 
SET 
  has_critical_issues = (
    SELECT COUNT(*) > 0 
    FROM public.inspection_deficiencies d 
    WHERE d.inspection_id = inspections.id 
    AND (d.is_immediate_repair = true OR d.needs_supervisor_alert = true OR d.criticality_score > 70)
  ),
  critical_issue_count = (
    SELECT COUNT(*) 
    FROM public.inspection_deficiencies d 
    WHERE d.inspection_id = inspections.id 
    AND (d.is_immediate_repair = true OR d.needs_supervisor_alert = true OR d.criticality_score > 70)
  ),
  last_criticality_check = now()
WHERE has_critical_issues IS NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN public.inspections.has_critical_issues IS 'True if inspection has any deficiencies requiring immediate attention or supervisor alerts';
COMMENT ON COLUMN public.inspections.critical_issue_count IS 'Number of critical deficiencies found in this inspection';
COMMENT ON COLUMN public.inspections.last_criticality_check IS 'Timestamp of last automated criticality assessment';

COMMENT ON COLUMN public.inspection_deficiencies.is_immediate_repair IS 'True if deficiency requires immediate repair action (criticality score >= 80)';
COMMENT ON COLUMN public.inspection_deficiencies.needs_supervisor_alert IS 'True if deficiency requires supervisor notification (criticality score >= 60)';
COMMENT ON COLUMN public.inspection_deficiencies.criticality_score IS 'Automated criticality assessment score (0-100) based on keywords and severity';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_inspection_critical_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_criticality_score(TEXT, TEXT, TEXT, TEXT) TO authenticated;