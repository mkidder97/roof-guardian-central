-- Additional helper functions and views for inspection workflow integration
-- Database Agent implementation for enhanced inspection management

-- 1. Create function to get inspection details with session data
CREATE OR REPLACE FUNCTION public.get_inspection_with_session(p_inspection_id UUID)
RETURNS TABLE(
  inspection_id UUID,
  session_id UUID,
  property_id UUID,
  property_address TEXT,
  property_name TEXT,
  inspector_id UUID,
  inspector_email TEXT,
  scheduled_date DATE,
  completed_date DATE,
  inspection_type TEXT,
  inspection_status inspection_status,
  session_data JSONB,
  campaign_id UUID,
  campaign_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as inspection_id,
    s.id as session_id,
    i.roof_id as property_id,
    r.full_address as property_address,
    r.property_name,
    i.inspector_id,
    u.email as inspector_email,
    i.scheduled_date,
    i.completed_date,
    i.inspection_type,
    s.inspection_status,
    s.session_data,
    i.campaign_id,
    ic.name as campaign_name,
    i.created_at,
    s.last_updated
  FROM public.inspections i
  LEFT JOIN public.inspection_sessions s ON s.inspection_id = i.id
  LEFT JOIN public.roofs r ON r.id = i.roof_id
  LEFT JOIN auth.users u ON u.id = i.inspector_id
  LEFT JOIN public.inspection_campaigns ic ON ic.id = i.campaign_id
  WHERE i.id = p_inspection_id;
END;
$$;

-- 2. Create function to list all active inspections for an inspector
CREATE OR REPLACE FUNCTION public.get_inspector_active_inspections(p_inspector_id UUID)
RETURNS TABLE(
  inspection_id UUID,
  session_id UUID,
  property_address TEXT,
  property_name TEXT,
  scheduled_date DATE,
  inspection_status inspection_status,
  inspection_source TEXT,
  campaign_name TEXT,
  last_updated TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as inspection_id,
    s.id as session_id,
    r.full_address as property_address,
    r.property_name,
    i.scheduled_date,
    s.inspection_status,
    CASE 
      WHEN i.campaign_id IS NOT NULL THEN 'campaign'
      ELSE 'direct'
    END as inspection_source,
    ic.name as campaign_name,
    s.last_updated,
    s.expires_at
  FROM public.inspections i
  LEFT JOIN public.inspection_sessions s ON s.inspection_id = i.id
  LEFT JOIN public.roofs r ON r.id = i.roof_id
  LEFT JOIN public.inspection_campaigns ic ON ic.id = i.campaign_id
  WHERE i.inspector_id = p_inspector_id
    AND i.status != 'completed'
    AND i.status != 'cancelled'
    AND s.inspection_status IS NOT NULL
  ORDER BY 
    CASE s.inspection_status
      WHEN 'in_progress' THEN 1
      WHEN 'ready_for_review' THEN 2
      WHEN 'scheduled' THEN 3
      ELSE 4
    END,
    i.scheduled_date ASC NULLS LAST,
    s.last_updated DESC;
END;
$$;

-- 3. Create function to update inspection session progress
CREATE OR REPLACE FUNCTION public.update_inspection_progress(
  p_session_id UUID,
  p_session_data JSONB,
  p_new_status inspection_status DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status inspection_status;
  v_inspector_id UUID;
BEGIN
  -- Get current status and verify permissions
  SELECT inspection_status, inspector_id 
  INTO v_current_status, v_inspector_id
  FROM public.inspection_sessions 
  WHERE id = p_session_id;
  
  -- Check if session exists
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Inspection session not found';
  END IF;
  
  -- Check permissions (user must be the inspector or have elevated role)
  IF v_inspector_id != auth.uid() AND 
     NOT (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions to update this inspection session';
  END IF;
  
  -- Update session data
  UPDATE public.inspection_sessions 
  SET 
    session_data = p_session_data,
    inspection_status = COALESCE(p_new_status, inspection_status),
    last_updated = now(),
    status_change_reason = CASE 
      WHEN p_new_status IS NOT NULL AND p_new_status != v_current_status 
      THEN 'Progress update via API'
      ELSE NULL
    END
  WHERE id = p_session_id;
  
  RETURN TRUE;
END;
$$;

-- 4. Create view for inspection summary statistics
CREATE OR REPLACE VIEW public.inspection_summary_stats AS
SELECT 
  COUNT(*) as total_inspections,
  COUNT(*) FILTER (WHERE inspection_source = 'campaign') as campaign_inspections,
  COUNT(*) FILTER (WHERE inspection_source = 'direct') as direct_inspections,
  COUNT(*) FILTER (WHERE inspection_status = 'scheduled') as scheduled_count,
  COUNT(*) FILTER (WHERE inspection_status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE inspection_status = 'ready_for_review') as ready_for_review_count,
  COUNT(*) FILTER (WHERE inspection_status = 'completed') as completed_count,
  COUNT(DISTINCT inspector_id) as active_inspectors,
  COUNT(DISTINCT property_id) as properties_with_inspections,
  ROUND(
    AVG(CASE 
      WHEN inspection_status = 'completed' 
      THEN EXTRACT(EPOCH FROM (last_updated - created_at)) / 3600 
    END), 2
  ) as avg_completion_hours
FROM public.inspection_status_dashboard
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- 5. Create function to clean up orphaned sessions
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete sessions that don't have a corresponding inspection
  DELETE FROM public.inspection_sessions 
  WHERE inspection_id IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM public.inspections 
      WHERE id = inspection_sessions.inspection_id
    );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO public.system_logs (
    event_type,
    event_data,
    created_at
  ) VALUES (
    'session_cleanup',
    jsonb_build_object('deleted_sessions', v_deleted_count),
    now()
  ) ON CONFLICT DO NOTHING; -- In case system_logs table doesn't exist yet
  
  RETURN v_deleted_count;
END;
$$;

-- 6. Create trigger to prevent direct deletion of inspection_sessions with linked inspections
CREATE OR REPLACE FUNCTION public.protect_linked_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent deletion if there's a linked inspection
  IF OLD.inspection_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot delete inspection session that is linked to an inspection. Delete the inspection first.';
  END IF;
  
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_linked_sessions ON public.inspection_sessions;
CREATE TRIGGER trigger_protect_linked_sessions
  BEFORE DELETE ON public.inspection_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_linked_sessions();

-- 7. Create indexes for the new functions
CREATE INDEX IF NOT EXISTS idx_inspections_status_inspector 
ON public.inspections(status, inspector_id) 
WHERE status != 'completed' AND status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_inspection_sessions_inspector_status 
ON public.inspection_sessions(inspector_id, inspection_status);

-- 8. Grant permissions for new functions
GRANT EXECUTE ON FUNCTION public.get_inspection_with_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inspector_active_inspections(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_inspection_progress(UUID, JSONB, inspection_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_sessions() TO service_role;

-- Grant select permissions on views
GRANT SELECT ON public.inspection_summary_stats TO authenticated;

-- 9. Add helpful comments
COMMENT ON FUNCTION public.get_inspection_with_session IS 'Retrieves complete inspection details including session data';
COMMENT ON FUNCTION public.get_inspector_active_inspections IS 'Gets all active inspections for a specific inspector, ordered by priority';
COMMENT ON FUNCTION public.update_inspection_progress IS 'Safely updates inspection progress with permission checks';
COMMENT ON FUNCTION public.cleanup_orphaned_sessions IS 'Removes inspection sessions that no longer have corresponding inspections';
COMMENT ON VIEW public.inspection_summary_stats IS 'Provides high-level statistics about inspection workflow performance';

-- 10. Create a sample RPC function for frontend integration
CREATE OR REPLACE FUNCTION public.schedule_direct_inspection(
  property_id UUID,
  inspector_id UUID,
  scheduled_date DATE,
  inspection_type TEXT DEFAULT 'Routine Inspection',
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_inspection_id UUID;
  v_session_id UUID;
  v_property_address TEXT;
BEGIN
  -- Call the main creation function
  SELECT inspection_id, session_id, property_address 
  INTO v_inspection_id, v_session_id, v_property_address
  FROM public.create_direct_inspection(
    property_id, 
    inspector_id, 
    scheduled_date, 
    inspection_type, 
    notes
  );
  
  -- Build response JSON
  v_result := jsonb_build_object(
    'success', true,
    'inspection_id', v_inspection_id,
    'session_id', v_session_id,
    'property_address', v_property_address,
    'scheduled_date', scheduled_date,
    'inspection_type', inspection_type,
    'status', 'scheduled'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_direct_inspection(UUID, UUID, DATE, TEXT, TEXT) TO authenticated;
COMMENT ON FUNCTION public.schedule_direct_inspection IS 'Frontend-friendly RPC function for scheduling direct inspections';