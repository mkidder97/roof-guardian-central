-- Ensure data consistency and add final constraints for inspection workflow
-- Database Agent implementation for robust inspection data management

-- 1. Create function to validate inspection data consistency
CREATE OR REPLACE FUNCTION public.validate_inspection_consistency()
RETURNS TABLE(
  issue_type TEXT,
  issue_description TEXT,
  inspection_id UUID,
  session_id UUID,
  property_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check for inspections without sessions
  RETURN QUERY
  SELECT 
    'missing_session'::TEXT,
    'Inspection exists but no corresponding session found'::TEXT,
    i.id,
    NULL::UUID,
    i.roof_id
  FROM public.inspections i
  LEFT JOIN public.inspection_sessions s ON s.inspection_id = i.id
  WHERE s.id IS NULL;
  
  -- Check for sessions without inspections (when inspection_id is set)
  RETURN QUERY
  SELECT 
    'orphaned_session'::TEXT,
    'Session has inspection_id but no corresponding inspection found'::TEXT,
    s.inspection_id,
    s.id,
    s.property_id
  FROM public.inspection_sessions s
  LEFT JOIN public.inspections i ON i.id = s.inspection_id
  WHERE s.inspection_id IS NOT NULL AND i.id IS NULL;
  
  -- Check for mismatched property IDs
  RETURN QUERY
  SELECT 
    'property_mismatch'::TEXT,
    'Inspection and session have different property IDs'::TEXT,
    i.id,
    s.id,
    i.roof_id
  FROM public.inspections i
  JOIN public.inspection_sessions s ON s.inspection_id = i.id
  WHERE i.roof_id != s.property_id;
  
  -- Check for mismatched inspector IDs
  RETURN QUERY
  SELECT 
    'inspector_mismatch'::TEXT,
    'Inspection and session have different inspector IDs'::TEXT,
    i.id,
    s.id,
    i.roof_id
  FROM public.inspections i
  JOIN public.inspection_sessions s ON s.inspection_id = i.id
  WHERE i.inspector_id != s.inspector_id;
END;
$$;

-- 2. Create function to fix data consistency issues
CREATE OR REPLACE FUNCTION public.fix_inspection_consistency()
RETURNS TABLE(
  fixed_type TEXT,
  fixed_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_missing_sessions INTEGER := 0;
  v_orphaned_sessions INTEGER := 0;
  v_property_mismatches INTEGER := 0;
  v_inspector_mismatches INTEGER := 0;
BEGIN
  -- Fix missing sessions by creating them
  INSERT INTO public.inspection_sessions (
    inspection_id,
    property_id,
    inspector_id,
    session_data,
    status,
    inspection_status,
    last_updated,
    expires_at
  )
  SELECT 
    i.id,
    i.roof_id,
    i.inspector_id,
    '{"step": "briefing", "notes": [], "photos": [], "auto_created": true}'::jsonb,
    'active',
    CASE 
      WHEN i.status = 'completed' THEN 'completed'::inspection_status
      WHEN i.status = 'in-progress' THEN 'in_progress'::inspection_status
      ELSE 'scheduled'::inspection_status
    END,
    now(),
    COALESCE(i.scheduled_date::timestamp + INTERVAL '7 days', now() + INTERVAL '48 hours')
  FROM public.inspections i
  LEFT JOIN public.inspection_sessions s ON s.inspection_id = i.id
  WHERE s.id IS NULL;
  
  GET DIAGNOSTICS v_missing_sessions = ROW_COUNT;
  
  -- Fix orphaned sessions by removing inspection_id reference
  UPDATE public.inspection_sessions 
  SET inspection_id = NULL
  WHERE inspection_id IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM public.inspections 
      WHERE id = inspection_sessions.inspection_id
    );
  
  GET DIAGNOSTICS v_orphaned_sessions = ROW_COUNT;
  
  -- Fix property mismatches by updating session property_id
  UPDATE public.inspection_sessions s
  SET property_id = i.roof_id
  FROM public.inspections i
  WHERE s.inspection_id = i.id 
    AND s.property_id != i.roof_id;
  
  GET DIAGNOSTICS v_property_mismatches = ROW_COUNT;
  
  -- Fix inspector mismatches by updating session inspector_id
  UPDATE public.inspection_sessions s
  SET inspector_id = i.inspector_id
  FROM public.inspections i
  WHERE s.inspection_id = i.id 
    AND s.inspector_id != i.inspector_id;
  
  GET DIAGNOSTICS v_inspector_mismatches = ROW_COUNT;
  
  -- Return summary of fixes
  RETURN QUERY VALUES 
    ('missing_sessions', v_missing_sessions),
    ('orphaned_sessions', v_orphaned_sessions),
    ('property_mismatches', v_property_mismatches),
    ('inspector_mismatches', v_inspector_mismatches);
END;
$$;

-- 3. Add constraint to ensure property_id consistency between inspections and sessions
CREATE OR REPLACE FUNCTION public.check_inspection_session_property_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if there's a linked inspection and validate property_id match
  IF NEW.inspection_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.inspections 
      WHERE id = NEW.inspection_id 
        AND roof_id = NEW.property_id
    ) THEN
      RAISE EXCEPTION 'Property ID mismatch: inspection_session.property_id must match inspections.roof_id for linked records';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_property_consistency ON public.inspection_sessions;
CREATE TRIGGER trigger_check_property_consistency
  BEFORE INSERT OR UPDATE ON public.inspection_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_inspection_session_property_consistency();

-- 4. Add constraint to ensure inspector_id consistency
CREATE OR REPLACE FUNCTION public.check_inspection_session_inspector_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if there's a linked inspection and validate inspector_id match
  IF NEW.inspection_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.inspections 
      WHERE id = NEW.inspection_id 
        AND inspector_id = NEW.inspector_id
    ) THEN
      RAISE EXCEPTION 'Inspector ID mismatch: inspection_session.inspector_id must match inspections.inspector_id for linked records';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_inspector_consistency ON public.inspection_sessions;
CREATE TRIGGER trigger_check_inspector_consistency
  BEFORE INSERT OR UPDATE ON public.inspection_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_inspection_session_inspector_consistency();

-- 5. Create comprehensive health check function
CREATE OR REPLACE FUNCTION public.inspection_system_health_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_total_inspections INTEGER;
  v_total_sessions INTEGER;
  v_linked_sessions INTEGER;
  v_orphaned_sessions INTEGER;
  v_consistency_issues INTEGER;
BEGIN
  -- Get basic counts
  SELECT COUNT(*) INTO v_total_inspections FROM public.inspections;
  SELECT COUNT(*) INTO v_total_sessions FROM public.inspection_sessions;
  SELECT COUNT(*) INTO v_linked_sessions FROM public.inspection_sessions WHERE inspection_id IS NOT NULL;
  SELECT COUNT(*) INTO v_orphaned_sessions FROM public.inspection_sessions WHERE inspection_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.inspections WHERE id = inspection_sessions.inspection_id);
  
  -- Count consistency issues
  SELECT COUNT(*) INTO v_consistency_issues FROM public.validate_inspection_consistency();
  
  -- Build result
  v_result := jsonb_build_object(
    'timestamp', now(),
    'total_inspections', v_total_inspections,
    'total_sessions', v_total_sessions,
    'linked_sessions', v_linked_sessions,
    'orphaned_sessions', v_orphaned_sessions,
    'consistency_issues', v_consistency_issues,
    'health_status', CASE 
      WHEN v_consistency_issues = 0 THEN 'healthy'
      WHEN v_consistency_issues < 10 THEN 'warning'
      ELSE 'critical'
    END,
    'link_percentage', CASE 
      WHEN v_total_sessions > 0 THEN ROUND((v_linked_sessions::DECIMAL / v_total_sessions) * 100, 2)
      ELSE 0
    END
  );
  
  RETURN v_result;
END;
$$;

-- 6. Create automated maintenance function
CREATE OR REPLACE FUNCTION public.run_inspection_maintenance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_health_before JSONB;
  v_health_after JSONB;
  v_fixes JSONB;
  v_cleanup_count INTEGER;
BEGIN
  -- Check health before
  SELECT public.inspection_system_health_check() INTO v_health_before;
  
  -- Run consistency fixes
  SELECT jsonb_object_agg(fixed_type, fixed_count) INTO v_fixes
  FROM public.fix_inspection_consistency();
  
  -- Run cleanup
  SELECT public.cleanup_orphaned_sessions() INTO v_cleanup_count;
  
  -- Check health after
  SELECT public.inspection_system_health_check() INTO v_health_after;
  
  RETURN jsonb_build_object(
    'maintenance_timestamp', now(),
    'health_before', v_health_before,
    'health_after', v_health_after,
    'fixes_applied', v_fixes,
    'sessions_cleaned', v_cleanup_count
  );
END;
$$;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_inspection_consistency() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_inspection_consistency() TO service_role;
GRANT EXECUTE ON FUNCTION public.inspection_system_health_check() TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_inspection_maintenance() TO service_role;

-- 8. Add helpful comments
COMMENT ON FUNCTION public.validate_inspection_consistency IS 'Identifies data consistency issues between inspections and inspection_sessions';
COMMENT ON FUNCTION public.fix_inspection_consistency IS 'Automatically fixes common data consistency issues';
COMMENT ON FUNCTION public.inspection_system_health_check IS 'Provides comprehensive health status of the inspection system';
COMMENT ON FUNCTION public.run_inspection_maintenance IS 'Runs automated maintenance and returns detailed results';

-- 9. Create a scheduled job placeholder (for cron extension if available)
DO $$ 
BEGIN
  -- Try to create a scheduled job for maintenance (will fail gracefully if pg_cron not available)
  BEGIN
    PERFORM cron.schedule('inspection-maintenance', '0 2 * * *', 'SELECT public.run_inspection_maintenance();');
  EXCEPTION 
    WHEN undefined_function THEN 
      NULL; -- pg_cron not available, skip
    WHEN OTHERS THEN 
      NULL; -- Other error, skip
  END;
END $$;

-- 10. Create a simple status summary view for quick monitoring
CREATE OR REPLACE VIEW public.inspection_status_summary AS
SELECT 
  inspection_status,
  COUNT(*) as count,
  COUNT(DISTINCT inspector_id) as inspector_count,
  COUNT(DISTINCT property_id) as property_count,
  MIN(created_at) as oldest_created,
  MAX(last_updated) as most_recent_update,
  COUNT(*) FILTER (WHERE inspection_source = 'campaign') as campaign_count,
  COUNT(*) FILTER (WHERE inspection_source = 'direct') as direct_count
FROM public.inspection_status_dashboard
GROUP BY inspection_status
ORDER BY 
  CASE inspection_status
    WHEN 'in_progress' THEN 1
    WHEN 'ready_for_review' THEN 2
    WHEN 'scheduled' THEN 3
    WHEN 'completed' THEN 4
    ELSE 5
  END;

GRANT SELECT ON public.inspection_status_summary TO authenticated;
COMMENT ON VIEW public.inspection_status_summary IS 'Quick summary of inspection statuses for monitoring dashboard';