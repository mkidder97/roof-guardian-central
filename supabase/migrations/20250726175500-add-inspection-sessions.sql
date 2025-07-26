-- Create inspection_sessions table for autosave functionality
-- This enables real-time saving during inspections to prevent data loss

CREATE TABLE IF NOT EXISTS public.inspection_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.roofs(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '48 hours')
);

-- Enable RLS for security
ALTER TABLE public.inspection_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for inspection sessions
CREATE POLICY "Inspectors can access their own sessions" 
ON public.inspection_sessions 
FOR ALL 
USING (inspector_id = auth.uid());

CREATE POLICY "Managers can access all sessions" 
ON public.inspection_sessions 
FOR ALL 
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inspection_sessions_inspector_property 
ON public.inspection_sessions(inspector_id, property_id);

CREATE INDEX IF NOT EXISTS idx_inspection_sessions_expires_at 
ON public.inspection_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_inspection_sessions_status 
ON public.inspection_sessions(status);

-- Create function to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.inspection_sessions 
  WHERE expires_at < now() 
    AND status != 'completed';
END;
$$;

-- Grant necessary permissions
GRANT ALL ON public.inspection_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_sessions TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.inspection_sessions IS 'Stores inspection session data for autosave functionality';
COMMENT ON COLUMN public.inspection_sessions.session_data IS 'JSONB data containing inspection progress, photos, notes, etc.';
COMMENT ON COLUMN public.inspection_sessions.expires_at IS 'Sessions auto-expire after 48 hours for cleanup';