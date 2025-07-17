-- Drop existing tables and their dependencies
DROP TABLE IF EXISTS public.budgets_and_repairs CASCADE;
DROP TABLE IF EXISTS public.warranties CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;

-- Drop the update function if it exists
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Create users table for internal team management
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'inspector',
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vendors table
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  vendor_type TEXT, -- roofing, inspection, maintenance, etc.
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create roofs table (main asset table)
CREATE TABLE public.roofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  roof_type TEXT,
  roof_area NUMERIC,
  install_date DATE,
  warranty_expiration DATE,
  last_inspection_date DATE,
  next_inspection_due DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inspections table
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roof_id UUID REFERENCES public.roofs(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES public.users(id),
  scheduled_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  inspection_type TEXT, -- routine, emergency, warranty, etc.
  weather_conditions TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inspection_reports table
CREATE TABLE public.inspection_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
  report_url TEXT, -- PDF storage location
  findings TEXT,
  recommendations TEXT,
  priority_level TEXT DEFAULT 'low', -- low, medium, high, critical
  estimated_cost NUMERIC,
  photos_urls TEXT[], -- Array of photo URLs
  status TEXT DEFAULT 'draft', -- draft, reviewed, approved, sent
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create work_orders table
CREATE TABLE public.work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roof_id UUID REFERENCES public.roofs(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id),
  inspection_report_id UUID REFERENCES public.inspection_reports(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- low, medium, high, emergency
  status TEXT DEFAULT 'pending', -- pending, assigned, in_progress, completed, cancelled
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  scheduled_start DATE,
  scheduled_end DATE,
  completed_date DATE,
  created_by UUID REFERENCES public.users(id),
  assigned_to UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Create policies (internal tool - allow all authenticated users)
CREATE POLICY "Allow all operations for authenticated users" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.roofs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.inspection_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_roofs_updated_at BEFORE UPDATE ON public.roofs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inspection_reports_updated_at BEFORE UPDATE ON public.inspection_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_roofs_client_id ON public.roofs(client_id);
CREATE INDEX idx_roofs_next_inspection_due ON public.roofs(next_inspection_due);
CREATE INDEX idx_inspections_roof_id ON public.inspections(roof_id);
CREATE INDEX idx_inspections_inspector_id ON public.inspections(inspector_id);
CREATE INDEX idx_inspections_status ON public.inspections(status);
CREATE INDEX idx_inspections_scheduled_date ON public.inspections(scheduled_date);
CREATE INDEX idx_inspection_reports_inspection_id ON public.inspection_reports(inspection_id);
CREATE INDEX idx_inspection_reports_status ON public.inspection_reports(status);
CREATE INDEX idx_work_orders_roof_id ON public.work_orders(roof_id);
CREATE INDEX idx_work_orders_vendor_id ON public.work_orders(vendor_id);
CREATE INDEX idx_work_orders_status ON public.work_orders(status);