-- Add comprehensive inspection status management system
-- Database Agent implementation for status tracking

-- Create inspection status enum type
CREATE TYPE inspection_status AS ENUM (
  'scheduled',
  'in_progress', 
  'ready_for_review',
  'completed'
);

-- Add status column to inspection_sessions table
ALTER TABLE public.inspection_sessions 
ADD COLUMN inspection_status inspection_status DEFAULT 'scheduled';

-- Update existing sessions to have proper status
UPDATE public.inspection_sessions 
SET inspection_status = CASE 
  WHEN status = 'completed' THEN 'completed'::inspection_status
  WHEN status = 'active' THEN 'in_progress'::inspection_status
  ELSE 'scheduled'::inspection_status
END;

-- Create inspection status history table for tracking changes
CREATE TABLE IF NOT EXISTS public.inspection_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_session_id UUID NOT NULL REFERENCES public.inspection_sessions(id) ON DELETE CASCADE,
  previous_status inspection_status,
  new_status inspection_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for status history
ALTER TABLE public.inspection_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies for status history
CREATE POLICY "Users can view status history for their inspections" 
ON public.inspection_status_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.inspection_sessions 
    WHERE id = inspection_session_id 
    AND inspector_id = auth.uid()
  )
);

CREATE POLICY "Users can insert status history for their inspections" 
ON public.inspection_status_history 
FOR INSERT 
WITH CHECK (
  changed_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.inspection_sessions 
    WHERE id = inspection_session_id 
    AND inspector_id = auth.uid()
  )
);

-- Create function to automatically track status changes
CREATE OR REPLACE FUNCTION public.track_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.inspection_status IS DISTINCT FROM NEW.inspection_status THEN
    INSERT INTO public.inspection_status_history (
      inspection_session_id,
      previous_status,
      new_status,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.inspection_status,
      NEW.inspection_status,
      auth.uid(),
      COALESCE(NEW.status_change_reason, 'Automatic status update')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic status change tracking
DROP TRIGGER IF EXISTS trigger_track_status_change ON public.inspection_sessions;
CREATE TRIGGER trigger_track_status_change
  AFTER UPDATE ON public.inspection_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.track_status_change();

-- Add temporary column for status change reason (not persisted)
ALTER TABLE public.inspection_sessions 
ADD COLUMN status_change_reason TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inspection_sessions_status 
ON public.inspection_sessions(inspection_status);

CREATE INDEX IF NOT EXISTS idx_inspection_sessions_status_inspector 
ON public.inspection_sessions(inspection_status, inspector_id);

CREATE INDEX IF NOT EXISTS idx_status_history_session 
ON public.inspection_status_history(inspection_session_id);

-- Create view for inspection status dashboard
CREATE OR REPLACE VIEW public.inspection_status_dashboard AS
SELECT 
  i.id,
  i.property_id,
  i.inspector_id,
  i.inspection_status,
  i.created_at,
  i.last_updated,
  i.expires_at,
  r.full_address,
  r.property_name,
  u.email as inspector_email,
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
  ) as last_status_change
FROM public.inspection_sessions i
LEFT JOIN public.roofs r ON r.id = i.property_id
LEFT JOIN auth.users u ON u.id = i.inspector_id
WHERE i.inspection_status IS NOT NULL;

-- Grant permissions
GRANT ALL ON public.inspection_status_history TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_status_history TO authenticated;
GRANT SELECT ON public.inspection_status_dashboard TO authenticated;

-- Add helpful comments
COMMENT ON TYPE inspection_status IS 'Inspection workflow states: scheduled → in_progress → ready_for_review → completed';
COMMENT ON TABLE public.inspection_status_history IS 'Tracks all status changes for audit trail and workflow analysis';
COMMENT ON VIEW public.inspection_status_dashboard IS 'Comprehensive view for inspection status management dashboard';

-- Update cleanup function to handle status
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark expired in-progress sessions as ready for review
  UPDATE public.inspection_sessions 
  SET inspection_status = 'ready_for_review'::inspection_status,
      status_change_reason = 'Auto-escalated due to expiration'
  WHERE expires_at < now() 
    AND inspection_status = 'in_progress'::inspection_status;
    
  -- Delete very old completed sessions (older than 90 days)
  DELETE FROM public.inspection_sessions 
  WHERE created_at < now() - INTERVAL '90 days'
    AND inspection_status = 'completed'::inspection_status;
END;
$$;