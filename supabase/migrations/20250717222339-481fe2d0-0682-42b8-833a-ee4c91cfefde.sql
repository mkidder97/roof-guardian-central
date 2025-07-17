-- Create properties table
CREATE TABLE public.properties (
  property_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  region TEXT,
  market TEXT,
  roof_section TEXT,
  roof_area NUMERIC,
  roof_system TEXT,
  install_year INTEGER,
  site_contact_name TEXT,
  site_contact_email TEXT,
  site_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warranties table
CREATE TABLE public.warranties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
  manufacturer_name TEXT,
  warranty_term INTEGER,
  expiration_date DATE,
  contractor_name TEXT,
  installer_warranty_term INTEGER,
  installer_expiration_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budgets_and_repairs table
CREATE TABLE public.budgets_and_repairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(property_id) ON DELETE CASCADE,
  capital_budget_year INTEGER,
  capital_budget_estimated NUMERIC,
  capital_budget_actual NUMERIC,
  scope_of_work TEXT,
  preventative_budget_estimated NUMERIC,
  preventative_budget_actual NUMERIC,
  total_leaks_12mo INTEGER DEFAULT 0,
  total_leak_expense_12mo NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets_and_repairs ENABLE ROW LEVEL SECURITY;

-- Create policies (internal tool - allow all authenticated users)
CREATE POLICY "Allow all operations for authenticated users" 
ON public.properties 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" 
ON public.warranties 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" 
ON public.budgets_and_repairs 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warranties_updated_at
  BEFORE UPDATE ON public.warranties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_and_repairs_updated_at
  BEFORE UPDATE ON public.budgets_and_repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_warranties_property_id ON public.warranties(property_id);
CREATE INDEX idx_budgets_repairs_property_id ON public.budgets_and_repairs(property_id);
CREATE INDEX idx_warranties_expiration_date ON public.warranties(expiration_date);
CREATE INDEX idx_budgets_repairs_capital_year ON public.budgets_and_repairs(capital_budget_year);