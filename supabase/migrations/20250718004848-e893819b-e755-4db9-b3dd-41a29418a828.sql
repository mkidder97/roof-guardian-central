-- Phase 1: Complete Database Schema for Rich Data and Enterprise Client Management

-- First, let's create the client contacts system
CREATE TABLE public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  office_phone TEXT,
  mobile_phone TEXT,
  role TEXT NOT NULL DEFAULT 'contact', -- 'primary', 'property_manager', 'regional_manager', 'billing', 'emergency', 'contact'
  title TEXT,
  department TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property assignments for contacts  
CREATE TABLE public.property_contact_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roof_id UUID REFERENCES public.roofs(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.client_contacts(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL DEFAULT 'site_contact', -- 'primary_manager', 'backup', 'site_contact', 'emergency'
  assigned_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(roof_id, contact_id, assignment_type)
);

-- Enable RLS for client_contacts
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for client_contacts
CREATE POLICY "Authenticated users can access client contacts" 
ON public.client_contacts 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Enable RLS for property_contact_assignments
ALTER TABLE public.property_contact_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for property_contact_assignments
CREATE POLICY "Authenticated users can access property contact assignments" 
ON public.property_contact_assignments 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Add triggers for updated_at columns
CREATE TRIGGER update_client_contacts_updated_at
BEFORE UPDATE ON public.client_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_contact_assignments_updated_at
BEFORE UPDATE ON public.property_contact_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX idx_client_contacts_role ON public.client_contacts(role);
CREATE INDEX idx_client_contacts_is_primary ON public.client_contacts(is_primary);
CREATE INDEX idx_property_contact_assignments_roof_id ON public.property_contact_assignments(roof_id);
CREATE INDEX idx_property_contact_assignments_contact_id ON public.property_contact_assignments(contact_id);
CREATE INDEX idx_property_contact_assignments_assignment_type ON public.property_contact_assignments(assignment_type);