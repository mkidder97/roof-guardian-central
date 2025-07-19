-- Create campaign communications table for n8n Gmail automation
CREATE TABLE public.campaign_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.inspection_campaigns(id) ON DELETE CASCADE,
  communication_type TEXT CHECK (communication_type IN ('email_draft', 'email_sent', 'email_received', 'phone_call', 'text_message')),
  direction TEXT CHECK (direction IN ('outbound', 'inbound')),
  subject TEXT,
  message_content TEXT,
  gmail_message_id TEXT,
  gmail_thread_id TEXT,
  from_email TEXT,
  to_email TEXT,
  cc_emails TEXT[],
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_communications ENABLE ROW LEVEL SECURITY;

-- Service role full access for n8n workflows
CREATE POLICY "Service role full access" ON public.campaign_communications
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can view communications
CREATE POLICY "Users can view communications" ON public.campaign_communications 
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Managers can manage communications
CREATE POLICY "Managers can manage communications" ON public.campaign_communications
FOR ALL USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_campaign_communications_campaign_id ON public.campaign_communications(campaign_id);
CREATE INDEX idx_campaign_communications_gmail_thread ON public.campaign_communications(gmail_thread_id);
CREATE INDEX idx_campaign_communications_type ON public.campaign_communications(communication_type);

-- Add updated_at trigger
CREATE TRIGGER update_campaign_communications_updated_at
BEFORE UPDATE ON public.campaign_communications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();