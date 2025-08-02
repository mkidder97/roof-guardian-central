-- Add uniqueness constraints to prevent duplicate inspections
-- This ensures data integrity and prevents multiple inspections for same property/date

-- Add unique constraint to prevent multiple completed inspections for same property on same date
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_completed_inspection_per_property_date'
        AND table_name = 'inspections'
    ) THEN
        CREATE UNIQUE INDEX unique_completed_inspection_per_property_date 
        ON public.inspections(roof_id, inspector_id, completed_date) 
        WHERE status = 'completed' AND completed_date IS NOT NULL;
    END IF;
END $$;

-- Add unique constraint to prevent multiple active sessions per property per inspector
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_active_session_per_property_inspector'
        AND table_name = 'inspection_sessions'
    ) THEN
        CREATE UNIQUE INDEX unique_active_session_per_property_inspector 
        ON public.inspection_sessions(property_id, inspector_id) 
        WHERE status = 'active';
    END IF;
END $$;

-- Add helpful comments
COMMENT ON INDEX unique_completed_inspection_per_property_date 
IS 'Ensures only one completed inspection per property per inspector per date';

COMMENT ON INDEX unique_active_session_per_property_inspector 
IS 'Ensures only one active session per property per inspector at a time';

-- Add function to clean up abandoned sessions (optional, for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark sessions older than 7 days as abandoned if not completed
  UPDATE public.inspection_sessions 
  SET status = 'abandoned'
  WHERE status = 'active' 
    AND created_at < (now() - INTERVAL '7 days');
    
  -- Delete very old abandoned sessions (older than 30 days)
  DELETE FROM public.inspection_sessions 
  WHERE status = 'abandoned' 
    AND created_at < (now() - INTERVAL '30 days');
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_sessions() 
IS 'Maintenance function to clean up old inspection sessions';