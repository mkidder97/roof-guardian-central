-- Create inspection_sessions table with proper structure
CREATE TABLE IF NOT EXISTS public.inspection_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.roofs(id) ON DELETE CASCADE,
  inspector_id uuid NOT NULL,
  inspection_status text NOT NULL CHECK (inspection_status IN ('scheduled', 'in_progress', 'ready_for_review', 'completed', 'cancelled')),
  session_data jsonb DEFAULT '{}'::jsonb,
  expires_at timestamptz DEFAULT (now() + interval '48 hours'),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on inspection_sessions
ALTER TABLE public.inspection_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inspection_sessions
CREATE POLICY "Inspectors can manage their own sessions" ON public.inspection_sessions
  FOR ALL USING (inspector_id = auth.uid());

CREATE POLICY "Managers can view all sessions" ON public.inspection_sessions
  FOR SELECT USING (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_inspection_sessions_property_id ON public.inspection_sessions(property_id);
CREATE INDEX IF NOT EXISTS idx_inspection_sessions_inspector_id ON public.inspection_sessions(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspection_sessions_status ON public.inspection_sessions(inspection_status);
CREATE INDEX IF NOT EXISTS idx_inspection_sessions_expires_at ON public.inspection_sessions(expires_at);

-- Update inspections table structure
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS inspection_type text DEFAULT 'routine',
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS weather_conditions text,
ADD COLUMN IF NOT EXISTS notes text;

-- Update inspections status constraint
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_status_check
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));

-- Create query_performance_log table for monitoring
CREATE TABLE IF NOT EXISTS public.query_performance_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query_type text NOT NULL,
  execution_time_ms integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on query_performance_log
ALTER TABLE public.query_performance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view query performance logs" ON public.query_performance_log
  FOR SELECT USING (
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Add trigger for updating inspection_sessions timestamp
CREATE OR REPLACE FUNCTION public.update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inspection_sessions_timestamp
  BEFORE UPDATE ON public.inspection_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_timestamp();

-- Add trigger for cleaning up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.inspection_sessions 
  WHERE expires_at < now() AND inspection_status = 'expired';
END;
$$ LANGUAGE plpgsql;