-- Create inspection_campaigns table
CREATE TABLE public.inspection_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  region TEXT,
  market TEXT,
  inspection_type TEXT NOT NULL,
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'processing', 'completed', 'failed', 'cancelled')),
  total_properties INTEGER NOT NULL,
  completed_properties INTEGER DEFAULT 0,
  failed_properties INTEGER DEFAULT 0,
  n8n_workflow_id TEXT,
  n8n_execution_id TEXT,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  actual_completion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  error_message TEXT,
  automation_settings JSONB,
  contact_preferences JSONB
);

-- Create campaign_properties junction table
CREATE TABLE public.campaign_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.inspection_campaigns(id) ON DELETE CASCADE,
  roof_id UUID REFERENCES public.roofs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'failed', 'skipped')),
  scheduled_date DATE,
  completed_date DATE,
  inspector_id UUID REFERENCES auth.users(id),
  n8n_property_id TEXT,
  error_message TEXT,
  automation_data JSONB,
  risk_assessment JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, roof_id)
);

-- Enable RLS on both tables
ALTER TABLE public.inspection_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspection_campaigns
CREATE POLICY "Super admins and managers can access all campaigns" 
ON public.inspection_campaigns 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Inspectors can view campaigns they're involved in" 
ON public.inspection_campaigns 
FOR SELECT 
USING (
  has_role(auth.uid(), 'inspector'::app_role) AND 
  id IN (
    SELECT DISTINCT campaign_id 
    FROM public.campaign_properties 
    WHERE inspector_id = auth.uid()
  )
);

-- RLS Policies for campaign_properties
CREATE POLICY "Super admins and managers can access all campaign properties" 
ON public.campaign_properties 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Inspectors can access their assigned campaign properties" 
ON public.campaign_properties 
FOR ALL 
USING (has_role(auth.uid(), 'inspector'::app_role) AND inspector_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_inspection_campaigns_status ON public.inspection_campaigns(status);
CREATE INDEX idx_inspection_campaigns_created_by ON public.inspection_campaigns(created_by);
CREATE INDEX idx_inspection_campaigns_client_id ON public.inspection_campaigns(client_id);
CREATE INDEX idx_campaign_properties_campaign_id ON public.campaign_properties(campaign_id);
CREATE INDEX idx_campaign_properties_roof_id ON public.campaign_properties(roof_id);
CREATE INDEX idx_campaign_properties_status ON public.campaign_properties(status);
CREATE INDEX idx_campaign_properties_inspector_id ON public.campaign_properties(inspector_id);

-- Create function to update campaign progress
CREATE OR REPLACE FUNCTION public.update_campaign_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    UPDATE public.inspection_campaigns 
    SET 
      completed_properties = (
        SELECT COUNT(*) 
        FROM public.campaign_properties 
        WHERE campaign_id = NEW.campaign_id AND status = 'completed'
      ),
      failed_properties = (
        SELECT COUNT(*) 
        FROM public.campaign_properties 
        WHERE campaign_id = NEW.campaign_id AND status = 'failed'
      ),
      progress_percentage = (
        SELECT ROUND(
          (COUNT(*) FILTER (WHERE status IN ('completed', 'failed'))::DECIMAL / COUNT(*)) * 100, 2
        )
        FROM public.campaign_properties 
        WHERE campaign_id = NEW.campaign_id
      ),
      updated_at = NOW()
    WHERE id = NEW.campaign_id;
    
    -- Auto-complete campaign if all properties are done
    UPDATE public.inspection_campaigns 
    SET 
      status = 'completed',
      completed_at = NOW(),
      actual_completion = NOW()
    WHERE id = NEW.campaign_id 
      AND status NOT IN ('completed', 'cancelled', 'failed')
      AND NOT EXISTS (
        SELECT 1 FROM public.campaign_properties 
        WHERE campaign_id = NEW.campaign_id AND status = 'pending'
      );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic campaign progress updates
CREATE TRIGGER update_campaign_progress_trigger
  AFTER INSERT OR UPDATE OF status ON public.campaign_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_progress();

-- Create function to generate campaign names
CREATE OR REPLACE FUNCTION public.generate_campaign_name(
  p_market TEXT,
  p_inspection_type TEXT,
  p_total_properties INTEGER
)
RETURNS TEXT AS $$
BEGIN
  RETURN format('%s %s Campaign - %s Properties (%s)',
    COALESCE(p_market, 'Multi-Market'),
    INITCAP(p_inspection_type),
    p_total_properties,
    TO_CHAR(NOW(), 'MM/DD/YYYY')
  );
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to inspection_campaigns
CREATE TRIGGER update_inspection_campaigns_updated_at
  BEFORE UPDATE ON public.inspection_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger to campaign_properties  
CREATE TRIGGER update_campaign_properties_updated_at
  BEFORE UPDATE ON public.campaign_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for campaign tracking
ALTER TABLE public.inspection_campaigns REPLICA IDENTITY FULL;
ALTER TABLE public.campaign_properties REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.inspection_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_properties;