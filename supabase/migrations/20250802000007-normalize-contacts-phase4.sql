-- Phase 4: Normalize contact and property manager JSON blobs
-- This migration creates proper tables for contact preferences and manager automation settings

-- =====================================================
-- 1. CONTACT PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contact_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL CHECK (preference_type IN (
    'communication', 'scheduling', 'notification', 'reporting', 'accessibility'
  )),
  preference_key TEXT NOT NULL,
  preference_value TEXT NOT NULL,
  
  -- Preference metadata for complex values
  preference_metadata JSONB DEFAULT '{}',
  
  -- Settings
  is_enabled BOOLEAN DEFAULT true,
  priority_level INTEGER DEFAULT 50 CHECK (priority_level >= 0 AND priority_level <= 100),
  
  -- Validation
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique preference combinations per contact
  UNIQUE(contact_id, preference_type, preference_key)
);

-- =====================================================
-- 2. PROPERTY MANAGER AUTOMATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.property_manager_automation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES public.property_managers(id) ON DELETE CASCADE,
  automation_type TEXT NOT NULL CHECK (automation_type IN (
    'auto_schedule', 'report_generation', 'follow_up', 'escalation',
    'invoice_processing', 'maintenance_alerts', 'compliance_tracking'
  )),
  trigger_condition TEXT NOT NULL,
  action_config TEXT NOT NULL,
  
  -- Automation settings
  is_enabled BOOLEAN DEFAULT true,
  execution_priority INTEGER DEFAULT 50,
  retry_count INTEGER DEFAULT 0,
  max_retry_count INTEGER DEFAULT 3,
  
  -- Timing settings
  trigger_delay_minutes INTEGER DEFAULT 0,
  execution_schedule TEXT, -- Cron-like schedule for recurring automations
  last_executed_at TIMESTAMP WITH TIME ZONE,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  
  -- Conditions and filters
  property_filter JSONB DEFAULT '{}', -- Which properties this automation applies to
  condition_metadata JSONB DEFAULT '{}', -- Additional condition parameters
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. CONTACT COMMUNICATION LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contact_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.roofs(id) ON DELETE SET NULL,
  
  -- Communication details
  communication_type TEXT NOT NULL CHECK (communication_type IN (
    'email', 'phone', 'sms', 'mail', 'portal_message', 'in_person'
  )),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  message_content TEXT,
  
  -- Contact information used
  contact_method TEXT, -- Which email/phone was used
  response_preference TEXT, -- How they prefer to respond
  
  -- Status and tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'failed'
  )),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  
  -- Response handling
  response_content TEXT,
  response_action_needed BOOLEAN DEFAULT false,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- Integration tracking
  external_id TEXT, -- For email service/CRM integration
  campaign_id UUID REFERENCES public.inspection_campaigns(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. PROPERTY MANAGER CONTACT ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.property_manager_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES public.property_managers(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  
  -- Assignment details
  contact_role TEXT CHECK (contact_role IN (
    'primary', 'secondary', 'emergency', 'billing', 'maintenance', 'inspection_coordinator'
  )),
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Contact permissions
  can_schedule BOOLEAN DEFAULT false,
  can_approve_work BOOLEAN DEFAULT false,
  can_receive_reports BOOLEAN DEFAULT true,
  can_authorize_expenses BOOLEAN DEFAULT false,
  expense_limit NUMERIC(10,2),
  
  -- Effective dates
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique manager-contact-role combinations
  UNIQUE(manager_id, contact_id, contact_role)
);

-- =====================================================
-- 5. ENHANCED CONTACTS TABLE COLUMNS
-- =====================================================

-- Add new tracking columns to contacts table
DO $$ 
BEGIN
  -- Add communication stats
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contacts' AND column_name = 'total_communications') THEN
    ALTER TABLE public.contacts ADD COLUMN total_communications INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contacts' AND column_name = 'successful_contacts') THEN
    ALTER TABLE public.contacts ADD COLUMN successful_contacts INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contacts' AND column_name = 'last_contact_date') THEN
    ALTER TABLE public.contacts ADD COLUMN last_contact_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contacts' AND column_name = 'last_response_date') THEN
    ALTER TABLE public.contacts ADD COLUMN last_response_date DATE;
  END IF;
  
  -- Add preferred contact method
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contacts' AND column_name = 'preferred_contact_method') THEN
    ALTER TABLE public.contacts ADD COLUMN preferred_contact_method TEXT 
      CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'mail'));
  END IF;
  
  -- Add contact effectiveness score
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contacts' AND column_name = 'response_rate') THEN
    ALTER TABLE public.contacts ADD COLUMN response_rate NUMERIC(5,2) DEFAULT 0;
  END IF;
  
  -- Add timezone for scheduling
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'contacts' AND column_name = 'timezone') THEN
    ALTER TABLE public.contacts ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
  END IF;
END $$;

-- =====================================================
-- 6. ENHANCED PROPERTY MANAGERS TABLE COLUMNS
-- =====================================================

-- Add new tracking columns to property_managers table
DO $$ 
BEGIN
  -- Add automation stats
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'property_managers' AND column_name = 'automation_count') THEN
    ALTER TABLE public.property_managers ADD COLUMN automation_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'property_managers' AND column_name = 'active_automations') THEN
    ALTER TABLE public.property_managers ADD COLUMN active_automations INTEGER DEFAULT 0;
  END IF;
  
  -- Add performance tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'property_managers' AND column_name = 'response_time_hours') THEN
    ALTER TABLE public.property_managers ADD COLUMN response_time_hours NUMERIC(6,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'property_managers' AND column_name = 'satisfaction_score') THEN
    ALTER TABLE public.property_managers ADD COLUMN satisfaction_score NUMERIC(3,2);
  END IF;
  
  -- Add preferred settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'property_managers' AND column_name = 'preferred_report_format') THEN
    ALTER TABLE public.property_managers ADD COLUMN preferred_report_format TEXT 
      CHECK (preferred_report_format IN ('pdf', 'excel', 'email_summary', 'dashboard'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'property_managers' AND column_name = 'report_frequency') THEN
    ALTER TABLE public.property_managers ADD COLUMN report_frequency TEXT 
      CHECK (report_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'on_demand'));
  END IF;
END $$;

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

-- Contact preferences indexes
CREATE INDEX IF NOT EXISTS idx_contact_preferences_contact_id 
  ON public.contact_preferences(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_preferences_type 
  ON public.contact_preferences(preference_type);
CREATE INDEX IF NOT EXISTS idx_contact_preferences_enabled 
  ON public.contact_preferences(is_enabled);

-- Property manager automation indexes
CREATE INDEX IF NOT EXISTS idx_property_manager_automation_manager_id 
  ON public.property_manager_automation(manager_id);
CREATE INDEX IF NOT EXISTS idx_property_manager_automation_type 
  ON public.property_manager_automation(automation_type);
CREATE INDEX IF NOT EXISTS idx_property_manager_automation_enabled 
  ON public.property_manager_automation(is_enabled);
CREATE INDEX IF NOT EXISTS idx_property_manager_automation_next_execution 
  ON public.property_manager_automation(next_execution_at);

-- Contact communications indexes
CREATE INDEX IF NOT EXISTS idx_contact_communications_contact_id 
  ON public.contact_communications(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_communications_property_id 
  ON public.contact_communications(property_id);
CREATE INDEX IF NOT EXISTS idx_contact_communications_type 
  ON public.contact_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_contact_communications_status 
  ON public.contact_communications(status);
CREATE INDEX IF NOT EXISTS idx_contact_communications_sent_at 
  ON public.contact_communications(sent_at);

-- Manager contact assignments indexes
CREATE INDEX IF NOT EXISTS idx_property_manager_contacts_manager_id 
  ON public.property_manager_contacts(manager_id);
CREATE INDEX IF NOT EXISTS idx_property_manager_contacts_contact_id 
  ON public.property_manager_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_property_manager_contacts_role 
  ON public.property_manager_contacts(contact_role);
CREATE INDEX IF NOT EXISTS idx_property_manager_contacts_active 
  ON public.property_manager_contacts(is_active);

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.contact_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_manager_automation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_manager_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_preferences
CREATE POLICY "Users can view contact preferences they have access to"
  ON public.contact_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id
      -- Add your specific access control logic here
    )
  );

-- RLS Policies for property_manager_automation
CREATE POLICY "Users can view manager automation they have access to"
  ON public.property_manager_automation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.property_managers pm
      WHERE pm.id = manager_id
      -- Add your specific access control logic here
    )
  );

-- =====================================================
-- 9. TRIGGERS FOR UPDATED_AT AND AUTOMATION
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_contact_preferences_updated_at
  BEFORE UPDATE ON public.contact_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_manager_automation_updated_at
  BEFORE UPDATE ON public.property_manager_automation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_manager_contacts_updated_at
  BEFORE UPDATE ON public.property_manager_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update contact statistics
CREATE OR REPLACE FUNCTION public.update_contact_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update contact communication statistics
  UPDATE public.contacts SET
    total_communications = (
      SELECT COUNT(*)
      FROM public.contact_communications cc
      WHERE cc.contact_id = COALESCE(NEW.contact_id, OLD.contact_id)
    ),
    successful_contacts = (
      SELECT COUNT(*)
      FROM public.contact_communications cc
      WHERE cc.contact_id = COALESCE(NEW.contact_id, OLD.contact_id)
        AND cc.status IN ('delivered', 'opened', 'replied')
    ),
    last_contact_date = (
      SELECT MAX(sent_at::date)
      FROM public.contact_communications cc
      WHERE cc.contact_id = COALESCE(NEW.contact_id, OLD.contact_id)
        AND cc.direction = 'outbound'
    ),
    last_response_date = (
      SELECT MAX(replied_at::date)
      FROM public.contact_communications cc
      WHERE cc.contact_id = COALESCE(NEW.contact_id, OLD.contact_id)
        AND cc.direction = 'inbound'
    ),
    response_rate = (
      SELECT CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(CASE WHEN status IN ('opened', 'replied') THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0 
      END
      FROM public.contact_communications cc
      WHERE cc.contact_id = COALESCE(NEW.contact_id, OLD.contact_id)
        AND cc.direction = 'outbound'
    )
  WHERE id = COALESCE(NEW.contact_id, OLD.contact_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update contact statistics
CREATE TRIGGER update_contact_statistics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.contact_communications
  FOR EACH ROW EXECUTE FUNCTION public.update_contact_statistics();

-- Function to update manager automation counts
CREATE OR REPLACE FUNCTION public.update_manager_automation_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update manager automation counts
  UPDATE public.property_managers SET
    automation_count = (
      SELECT COUNT(*)
      FROM public.property_manager_automation pma
      WHERE pma.manager_id = COALESCE(NEW.manager_id, OLD.manager_id)
    ),
    active_automations = (
      SELECT COUNT(*)
      FROM public.property_manager_automation pma
      WHERE pma.manager_id = COALESCE(NEW.manager_id, OLD.manager_id)
        AND pma.is_enabled = true
    )
  WHERE id = COALESCE(NEW.manager_id, OLD.manager_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update manager automation counts
CREATE TRIGGER update_manager_automation_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.property_manager_automation
  FOR EACH ROW EXECUTE FUNCTION public.update_manager_automation_count();

-- =====================================================
-- 10. HELPFUL VIEWS
-- =====================================================

-- Contact overview with preferences and communication stats
CREATE OR REPLACE VIEW public.contact_overview AS
SELECT 
  c.id as contact_id,
  c.first_name,
  c.last_name,
  c.email,
  c.office_phone,
  c.mobile_phone,
  c.preferred_contact_method,
  c.total_communications,
  c.successful_contacts,
  c.response_rate,
  c.last_contact_date,
  c.last_response_date,
  c.timezone,
  COUNT(cp.id) as preference_count,
  COUNT(CASE WHEN cp.is_enabled THEN 1 END) as active_preferences,
  COUNT(pmc.id) as manager_assignments
FROM public.contacts c
LEFT JOIN public.contact_preferences cp ON c.id = cp.contact_id
LEFT JOIN public.property_manager_contacts pmc ON c.id = pmc.contact_id AND pmc.is_active = true
GROUP BY c.id, c.first_name, c.last_name, c.email, c.office_phone, c.mobile_phone,
         c.preferred_contact_method, c.total_communications, c.successful_contacts,
         c.response_rate, c.last_contact_date, c.last_response_date, c.timezone;

-- Property manager performance overview
CREATE OR REPLACE VIEW public.manager_performance AS
SELECT 
  pm.id as manager_id,
  pm.company_name,
  pm.contact_name,
  pm.email,
  pm.automation_count,
  pm.active_automations,
  pm.response_time_hours,
  pm.satisfaction_score,
  pm.preferred_report_format,
  pm.report_frequency,
  COUNT(pmc.id) as assigned_contacts,
  COUNT(CASE WHEN pmc.is_active THEN 1 END) as active_contacts,
  COUNT(CASE WHEN pmc.can_schedule THEN 1 END) as scheduling_contacts
FROM public.property_managers pm
LEFT JOIN public.property_manager_contacts pmc ON pm.id = pmc.manager_id
GROUP BY pm.id, pm.company_name, pm.contact_name, pm.email, pm.automation_count,
         pm.active_automations, pm.response_time_hours, pm.satisfaction_score,
         pm.preferred_report_format, pm.report_frequency;

-- Grant permissions on views
GRANT SELECT ON public.contact_overview TO authenticated;
GRANT SELECT ON public.manager_performance TO authenticated;

-- =====================================================
-- 11. DEFAULT PREFERENCE FUNCTIONS
-- =====================================================

-- Function to create default contact preferences
CREATE OR REPLACE FUNCTION public.create_default_contact_preferences(p_contact_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Default communication preferences
  INSERT INTO public.contact_preferences (
    contact_id, preference_type, preference_key, preference_value, is_enabled
  ) VALUES
  (p_contact_id, 'communication', 'preferred_method', 'email', true),
  (p_contact_id, 'communication', 'business_hours_only', 'true', true),
  (p_contact_id, 'scheduling', 'advance_notice_days', '7', true),
  (p_contact_id, 'scheduling', 'preferred_day_of_week', 'tuesday,wednesday,thursday', true),
  (p_contact_id, 'notification', 'inspection_reminders', 'true', true),
  (p_contact_id, 'notification', 'report_delivery', 'true', true),
  (p_contact_id, 'reporting', 'format_preference', 'pdf', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default manager automation
CREATE OR REPLACE FUNCTION public.create_default_manager_automation(p_manager_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Default automation settings
  INSERT INTO public.property_manager_automation (
    manager_id, automation_type, trigger_condition, action_config, is_enabled
  ) VALUES
  (p_manager_id, 'report_generation', 'monthly', 'generate_monthly_report', true),
  (p_manager_id, 'follow_up', 'no_response_after_7_days', 'send_follow_up_email', true),
  (p_manager_id, 'maintenance_alerts', 'critical_issues_found', 'send_immediate_alert', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.contact_preferences IS 'Structured storage for contact communication and scheduling preferences';
COMMENT ON TABLE public.property_manager_automation IS 'Automation rules and settings for property managers';
COMMENT ON TABLE public.contact_communications IS 'Log of all communications with contacts for tracking and analytics';
COMMENT ON TABLE public.property_manager_contacts IS 'Junction table for manager-contact assignments with permissions';

COMMENT ON COLUMN public.contact_preferences.preference_type IS 'Category of preference for organization and filtering';
COMMENT ON COLUMN public.property_manager_automation.automation_type IS 'Type of automation for categorization and execution';
COMMENT ON COLUMN public.contact_communications.direction IS 'Direction of communication (inbound/outbound)';

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION public.create_default_contact_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_manager_automation(UUID) TO authenticated;