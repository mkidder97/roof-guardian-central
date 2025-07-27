-- Create inspection_sessions table for autosave functionality
CREATE TABLE public.inspection_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  inspector_id UUID NOT NULL,
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '48 hours')
);

-- Enable Row Level Security
ALTER TABLE public.inspection_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for inspection sessions
CREATE POLICY "Inspectors can manage their own sessions" 
ON public.inspection_sessions 
FOR ALL 
USING (auth.uid() = inspector_id);

CREATE POLICY "Managers can view all sessions" 
ON public.inspection_sessions 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create index for performance
CREATE INDEX idx_inspection_sessions_inspector_property ON public.inspection_sessions(inspector_id, property_id);
CREATE INDEX idx_inspection_sessions_expires_at ON public.inspection_sessions(expires_at);

-- Create function to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.inspection_sessions 
  WHERE expires_at < now() AND status = 'expired';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inspection_sessions_timestamp
BEFORE UPDATE ON public.inspection_sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_timestamp();