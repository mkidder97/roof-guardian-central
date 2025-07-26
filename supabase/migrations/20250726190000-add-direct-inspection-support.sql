-- Add support for direct inspection scheduling workflow
-- This migration ensures seamless integration between inspections and inspection_sessions tables
-- Database Agent implementation for direct inspection creation

-- 1. Add campaign_id to inspections table to differentiate between campaign and direct inspections
ALTER TABLE public.inspections 
ADD COLUMN campaign_id UUID REFERENCES public.inspection_campaigns(id) ON DELETE SET NULL;

-- 2. Add inspection_id to inspection_sessions table to link the two tables
ALTER TABLE public.inspection_sessions 
ADD COLUMN inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE;

-- 3. Create unique constraint to ensure one-to-one relationship between inspection and session
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_sessions_inspection_id 
ON public.inspection_sessions(inspection_id) 
WHERE inspection_id IS NOT NULL;

-- 4. Create function to automatically create inspection_sessions when inspections are created
CREATE OR REPLACE FUNCTION public.auto_create_inspection_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create session if one doesn't already exist for this inspection
  IF NOT EXISTS (
    SELECT 1 FROM public.inspection_sessions 
    WHERE inspection_id = NEW.id
  ) THEN
    INSERT INTO public.inspection_sessions (
      inspection_id,
      property_id,
      inspector_id,
      session_data,
      status,
      inspection_status,
      last_updated,
      expires_at
    ) VALUES (
      NEW.id,
      NEW.roof_id,
      NEW.inspector_id,
      '{"step": "briefing", "notes": [], "photos": []}'::jsonb,
      'active',
      CASE 
        WHEN NEW.status = 'completed' THEN 'completed'::inspection_status
        WHEN NEW.status = 'in-progress' THEN 'in_progress'::inspection_status
        ELSE 'scheduled'::inspection_status
      END,
      now(),
      CASE 
        WHEN NEW.scheduled_date IS NOT NULL THEN 
          NEW.scheduled_date::timestamp + INTERVAL '7 days'
        ELSE 
          now() + INTERVAL '48 hours'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Create trigger for automatic inspection_session creation
DROP TRIGGER IF EXISTS trigger_auto_create_inspection_session ON public.inspections;
CREATE TRIGGER trigger_auto_create_inspection_session
  AFTER INSERT ON public.inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_inspection_session();

-- 6. Create function to sync status changes between inspections and inspection_sessions
CREATE OR REPLACE FUNCTION public.sync_inspection_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sync status from inspections to inspection_sessions
  IF TG_TABLE_NAME = 'inspections' THEN
    UPDATE public.inspection_sessions 
    SET 
      inspection_status = CASE 
        WHEN NEW.status = 'completed' THEN 'completed'::inspection_status
        WHEN NEW.status = 'in-progress' THEN 'in_progress'::inspection_status
        WHEN NEW.status = 'cancelled' THEN 'scheduled'::inspection_status -- Reset to scheduled if cancelled
        ELSE 'scheduled'::inspection_status
      END,
      last_updated = now(),
      status_change_reason = 'Synced from inspections table'
    WHERE inspection_id = NEW.id;
    
  -- Sync status from inspection_sessions to inspections
  ELSIF TG_TABLE_NAME = 'inspection_sessions' THEN
    UPDATE public.inspections 
    SET 
      status = CASE 
        WHEN NEW.inspection_status = 'completed' THEN 'completed'
        WHEN NEW.inspection_status = 'in_progress' THEN 'in-progress'
        WHEN NEW.inspection_status = 'ready_for_review' THEN 'in-progress' -- Keep as in-progress until fully completed
        ELSE 'scheduled'
      END,
      updated_at = now(),
      completed_date = CASE 
        WHEN NEW.inspection_status = 'completed' AND OLD.inspection_status != 'completed' THEN CURRENT_DATE
        WHEN NEW.inspection_status != 'completed' THEN NULL
        ELSE completed_date
      END
    WHERE id = NEW.inspection_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Create triggers for bidirectional status sync
DROP TRIGGER IF EXISTS trigger_sync_inspection_status_from_inspections ON public.inspections;
CREATE TRIGGER trigger_sync_inspection_status_from_inspections
  AFTER UPDATE OF status ON public.inspections
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.sync_inspection_status();

DROP TRIGGER IF EXISTS trigger_sync_inspection_status_from_sessions ON public.inspection_sessions;
CREATE TRIGGER trigger_sync_inspection_status_from_sessions
  AFTER UPDATE OF inspection_status ON public.inspection_sessions
  FOR EACH ROW
  WHEN (OLD.inspection_status IS DISTINCT FROM NEW.inspection_status)
  EXECUTE FUNCTION public.sync_inspection_status();

-- 8. Create comprehensive view for inspection status dashboard that includes both campaign and direct inspections
CREATE OR REPLACE VIEW public.inspection_status_dashboard AS
SELECT 
  -- Use inspection_session id as primary identifier
  i.id,
  i.property_id,
  i.inspector_id,
  i.inspection_status,
  i.created_at,
  i.last_updated,
  i.expires_at,
  
  -- Property information
  r.full_address,
  r.property_name,
  
  -- Inspector information
  u.email as inspector_email,
  
  -- Inspection information
  insp.id as inspection_id,
  insp.scheduled_date,
  insp.completed_date,
  insp.inspection_type,
  insp.notes as inspection_notes,
  insp.weather_conditions,
  
  -- Campaign information (if applicable)
  insp.campaign_id,
  ic.name as campaign_name,
  
  -- Status tracking
  (
    SELECT COUNT(*) 
    FROM public.inspection_status_history h 
    WHERE h.inspection_session_id = i.id
  ) as status_change_count,
  (
    SELECT h.created_at 
    FROM public.inspection_status_history h 
    WHERE h.inspection_session_id = i.id 
    ORDER BY h.created_at DESC 
    LIMIT 1
  ) as last_status_change,
  
  -- Source identification
  CASE 
    WHEN insp.campaign_id IS NOT NULL THEN 'campaign'
    ELSE 'direct'
  END as inspection_source
  
FROM public.inspection_sessions i
LEFT JOIN public.roofs r ON r.id = i.property_id
LEFT JOIN auth.users u ON u.id = i.inspector_id
LEFT JOIN public.inspections insp ON insp.id = i.inspection_id
LEFT JOIN public.inspection_campaigns ic ON ic.id = insp.campaign_id
WHERE i.inspection_status IS NOT NULL;

-- 9. Create function for seamless direct inspection creation
CREATE OR REPLACE FUNCTION public.create_direct_inspection(
  p_roof_id UUID,
  p_inspector_id UUID,
  p_scheduled_date DATE DEFAULT NULL,
  p_inspection_type TEXT DEFAULT 'Routine Inspection',
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  inspection_id UUID,
  session_id UUID,
  property_address TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inspection_id UUID;
  v_session_id UUID;
  v_property_address TEXT;
BEGIN
  -- Get property address for response
  SELECT full_address INTO v_property_address 
  FROM public.roofs 
  WHERE id = p_roof_id;
  
  -- Create the inspection record
  INSERT INTO public.inspections (
    roof_id,
    inspector_id,
    scheduled_date,
    inspection_type,
    status,
    notes,
    created_at,
    updated_at
  ) VALUES (
    p_roof_id,
    p_inspector_id,
    COALESCE(p_scheduled_date, CURRENT_DATE + INTERVAL '1 day'),
    p_inspection_type,
    'scheduled',
    p_notes,
    now(),
    now()
  ) RETURNING id INTO v_inspection_id;
  
  -- Get the auto-created session ID
  SELECT id INTO v_session_id 
  FROM public.inspection_sessions 
  WHERE inspection_id = v_inspection_id;
  
  -- Return the results
  RETURN QUERY SELECT 
    v_inspection_id,
    v_session_id,
    v_property_address;
END;
$$;

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inspections_campaign_id 
ON public.inspections(campaign_id) 
WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inspections_roof_inspector 
ON public.inspections(roof_id, inspector_id);

CREATE INDEX IF NOT EXISTS idx_inspection_sessions_inspection_property 
ON public.inspection_sessions(inspection_id, property_id);

-- 11. Update existing inspection_sessions to link with existing inspections (best effort)
UPDATE public.inspection_sessions 
SET inspection_id = (
  SELECT i.id 
  FROM public.inspections i 
  WHERE i.roof_id = inspection_sessions.property_id 
    AND i.inspector_id = inspection_sessions.inspector_id
    AND i.created_at >= inspection_sessions.created_at - INTERVAL '1 hour'
    AND i.created_at <= inspection_sessions.created_at + INTERVAL '1 hour'
  ORDER BY ABS(EXTRACT(EPOCH FROM (i.created_at - inspection_sessions.created_at)))
  LIMIT 1
)
WHERE inspection_id IS NULL;

-- 12. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.auto_create_inspection_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_inspection_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_inspection(UUID, UUID, DATE, TEXT, TEXT) TO authenticated;
GRANT SELECT ON public.inspection_status_dashboard TO authenticated;

-- 13. Add helpful comments
COMMENT ON FUNCTION public.create_direct_inspection IS 'Creates a direct inspection with automatic session creation - bypasses campaign workflow';
COMMENT ON FUNCTION public.auto_create_inspection_session IS 'Automatically creates inspection_session when inspection is created';
COMMENT ON FUNCTION public.sync_inspection_status IS 'Keeps status synchronized between inspections and inspection_sessions tables';
COMMENT ON VIEW public.inspection_status_dashboard IS 'Unified view for both campaign-created and direct-created inspections';
COMMENT ON COLUMN public.inspections.campaign_id IS 'Links to campaign if inspection was created via campaign workflow, NULL for direct inspections';
COMMENT ON COLUMN public.inspection_sessions.inspection_id IS 'Links to parent inspection record for data consistency';