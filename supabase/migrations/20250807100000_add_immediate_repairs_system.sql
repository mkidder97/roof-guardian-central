-- Create immediate repairs system for critical issue management
-- This migration adds comprehensive immediate repair tracking and workflow management

-- Create immediate_repairs table
CREATE TABLE public.immediate_repairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  deficiency_id UUID REFERENCES public.inspection_deficiencies(id) ON DELETE SET NULL,
  property_id UUID NOT NULL REFERENCES public.roofs(id) ON DELETE CASCADE,
  
  -- Repair details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical', 'emergency')),
  estimated_cost NUMERIC,
  
  -- Risk assessment
  safety_risk BOOLEAN DEFAULT false,
  structural_risk BOOLEAN DEFAULT false,
  weather_exposure_risk BOOLEAN DEFAULT false,
  accessibility_issues TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'assigned', 'in_progress', 'completed', 'cancelled')),
  priority_score INTEGER DEFAULT 0 CHECK (priority_score >= 0 AND priority_score <= 100),
  
  -- People involved
  reported_by UUID REFERENCES public.users(id),
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_to UUID REFERENCES public.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  supervisor_id UUID REFERENCES public.users(id),
  supervisor_notified_at TIMESTAMP WITH TIME ZONE,
  supervisor_acknowledged_at TIMESTAMP WITH TIME ZONE,
  
  -- Emergency contact tracking
  emergency_contact_required BOOLEAN DEFAULT false,
  emergency_contact_made BOOLEAN DEFAULT false,
  emergency_contact_at TIMESTAMP WITH TIME ZONE,
  emergency_contact_notes TEXT,
  
  -- Resolution tracking
  resolution_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.users(id),
  final_cost NUMERIC,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergency escalations table
CREATE TABLE public.emergency_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_id UUID NOT NULL REFERENCES public.immediate_repairs(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL CHECK (escalation_level >= 1 AND escalation_level <= 5),
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('system', 'user')),
  contacts_notified TEXT[], -- Array of contact IDs/emails
  acknowledgment_required BOOLEAN DEFAULT true,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES public.users(id),
  resolution_deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create repair team members table
CREATE TABLE public.repair_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialties TEXT[], -- Array of specialty areas
  availability TEXT DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'unavailable')),
  current_workload INTEGER DEFAULT 0,
  max_workload INTEGER DEFAULT 10,
  latitude NUMERIC, -- For proximity-based assignment
  longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create repair alert configurations table
CREATE TABLE public.repair_alert_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical', 'emergency')),
  alert_channels TEXT[] NOT NULL, -- ['email', 'sms', 'push', 'phone']
  escalation_time_minutes INTEGER NOT NULL DEFAULT 30,
  requires_immediate BOOLEAN DEFAULT false,
  auto_assign_specialty TEXT,
  auto_assign_max_workload INTEGER,
  auto_assign_proximity_radius NUMERIC, -- miles
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(urgency)
);

-- Add indexes for performance
CREATE INDEX idx_immediate_repairs_inspection_id ON public.immediate_repairs(inspection_id);
CREATE INDEX idx_immediate_repairs_property_id ON public.immediate_repairs(property_id);
CREATE INDEX idx_immediate_repairs_status ON public.immediate_repairs(status);
CREATE INDEX idx_immediate_repairs_urgency ON public.immediate_repairs(urgency);
CREATE INDEX idx_immediate_repairs_reported_at ON public.immediate_repairs(reported_at);
CREATE INDEX idx_immediate_repairs_assigned_to ON public.immediate_repairs(assigned_to);
CREATE INDEX idx_immediate_repairs_priority_score ON public.immediate_repairs(priority_score DESC);

CREATE INDEX idx_emergency_escalations_repair_id ON public.emergency_escalations(repair_id);
CREATE INDEX idx_emergency_escalations_escalation_level ON public.emergency_escalations(escalation_level);
CREATE INDEX idx_emergency_escalations_triggered_at ON public.emergency_escalations(triggered_at);

CREATE INDEX idx_repair_team_members_user_id ON public.repair_team_members(user_id);
CREATE INDEX idx_repair_team_members_availability ON public.repair_team_members(availability);
CREATE INDEX idx_repair_team_members_workload ON public.repair_team_members(current_workload);

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_immediate_repairs_updated_at BEFORE UPDATE ON public.immediate_repairs 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_repair_team_members_updated_at BEFORE UPDATE ON public.repair_team_members 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_repair_alert_configs_updated_at BEFORE UPDATE ON public.repair_alert_configs 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all new tables
ALTER TABLE public.immediate_repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_alert_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for immediate_repairs
CREATE POLICY "inspectors_can_create_immediate_repairs" ON public.immediate_repairs
  FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "users_can_read_immediate_repairs" ON public.immediate_repairs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "assigned_users_can_update_immediate_repairs" ON public.immediate_repairs
  FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid() OR 
    reported_by = auth.uid() OR 
    supervisor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create policies for emergency escalations (admins and supervisors only)
CREATE POLICY "supervisors_can_manage_escalations" ON public.emergency_escalations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create policies for repair team members
CREATE POLICY "users_can_read_repair_team_members" ON public.repair_team_members
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admins_can_manage_repair_team_members" ON public.repair_team_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create policies for alert configurations (admins only)
CREATE POLICY "admins_can_manage_alert_configs" ON public.repair_alert_configs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Insert default alert configurations
INSERT INTO public.repair_alert_configs (urgency, alert_channels, escalation_time_minutes, requires_immediate, auto_assign_max_workload) VALUES
('low', ARRAY['email'], 240, false, 8),
('medium', ARRAY['email', 'push'], 120, false, 6),
('high', ARRAY['email', 'push', 'sms'], 60, false, 4),
('critical', ARRAY['email', 'push', 'sms', 'phone'], 15, true, 2),
('emergency', ARRAY['email', 'push', 'sms', 'phone'], 5, true, 1);

-- Add comments to document the schema
COMMENT ON TABLE public.immediate_repairs IS 'Tracks immediate repair requests from critical inspection findings';
COMMENT ON TABLE public.emergency_escalations IS 'Manages escalation workflow for critical repairs';
COMMENT ON TABLE public.repair_team_members IS 'Directory of repair team members with availability and specialties';
COMMENT ON TABLE public.repair_alert_configs IS 'Configuration for alert channels and escalation timing by urgency level';