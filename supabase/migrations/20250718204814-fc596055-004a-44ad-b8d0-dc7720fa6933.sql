-- Create inspection campaigns table
CREATE TABLE inspection_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_id TEXT UNIQUE NOT NULL, -- From n8n workflow (e.g., "CAMP-1752869822633-NZU0RI90P")
  client_id UUID REFERENCES clients(id),
  region TEXT,
  market TEXT,
  inspection_type TEXT DEFAULT 'annual',
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'emails_sent', 'responses_received', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  
  -- Property and contact info
  total_properties INTEGER NOT NULL DEFAULT 0,
  property_manager_name TEXT,
  property_manager_email TEXT,
  
  -- Timeline tracking
  estimated_completion DATE,
  actual_completion DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Integration data
  n8n_execution_id TEXT,
  gmail_draft_id TEXT,
  gmail_thread_id TEXT,
  
  -- Metadata and settings
  automation_settings JSONB DEFAULT '{}',
  campaign_metadata JSONB DEFAULT '{}',
  
  -- User tracking
  created_by UUID REFERENCES auth.users(id),
  assigned_inspector UUID REFERENCES users(id)
);

-- Create campaign properties table
CREATE TABLE campaign_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES inspection_campaigns(id) ON DELETE CASCADE,
  roof_id UUID REFERENCES roofs(id) ON DELETE CASCADE,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'scheduled', 'completed', 'cancelled')),
  inspection_date DATE,
  inspector_notes TEXT,
  
  -- Property manager response tracking
  pm_response_received BOOLEAN DEFAULT false,
  pm_response_date TIMESTAMP WITH TIME ZONE,
  pm_response_notes TEXT,
  
  -- Automation data
  automation_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create campaign communications table
CREATE TABLE campaign_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES inspection_campaigns(id) ON DELETE CASCADE,
  
  -- Communication details
  communication_type TEXT CHECK (communication_type IN ('email_draft', 'email_sent', 'email_received', 'phone_call', 'text_message')),
  direction TEXT CHECK (direction IN ('outbound', 'inbound')),
  
  -- Content
  subject TEXT,
  message_content TEXT,
  
  -- Integration IDs
  gmail_message_id TEXT,
  gmail_thread_id TEXT,
  
  -- Participants
  from_email TEXT,
  to_email TEXT,
  cc_emails TEXT[],
  
  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE inspection_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_communications ENABLE ROW LEVEL SECURITY;

-- Campaign access policies
CREATE POLICY "Users can view campaigns" ON inspection_campaigns FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers can create campaigns" ON inspection_campaigns FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can update assigned campaigns" ON inspection_campaigns FOR UPDATE USING (created_by = auth.uid() OR assigned_inspector = auth.uid() OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Property access policies  
CREATE POLICY "Users can view campaign properties" ON campaign_properties FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Inspectors can update assigned properties" ON campaign_properties FOR UPDATE USING (
  EXISTS (SELECT 1 FROM inspection_campaigns WHERE id = campaign_id AND (assigned_inspector = auth.uid() OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)))
);
CREATE POLICY "Managers can create campaign properties" ON campaign_properties FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Communications policies
CREATE POLICY "Users can view campaign communications" ON campaign_communications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers can manage communications" ON campaign_communications FOR ALL USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_campaigns_status ON inspection_campaigns(status);
CREATE INDEX idx_campaigns_market ON inspection_campaigns(market);
CREATE INDEX idx_campaigns_created_at ON inspection_campaigns(created_at);
CREATE INDEX idx_campaign_properties_campaign_id ON campaign_properties(campaign_id);
CREATE INDEX idx_campaign_properties_status ON campaign_properties(status);
CREATE INDEX idx_campaign_communications_campaign_id ON campaign_communications(campaign_id);

-- Create triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON inspection_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_properties_updated_at
BEFORE UPDATE ON campaign_properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();