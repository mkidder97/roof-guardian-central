-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'manager', 'inspector');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(auth_user_id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.auth_user_id = ur.user_id
    WHERE p.auth_user_id = _user_id
      AND ur.role = _role
  )
$$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  JOIN public.profiles p ON p.auth_user_id = ur.user_id
  WHERE p.auth_user_id = auth.uid()
  ORDER BY 
    CASE ur.role
      WHEN 'super_admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'inspector' THEN 3
    END
  LIMIT 1
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (auth_user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Assign default inspector role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'inspector');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth_user_id = auth.uid());

CREATE POLICY "Super admins and managers can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Managers can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'manager'));

-- Update existing table RLS policies to work with roles

-- Roofs policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.roofs;

CREATE POLICY "Super admins and managers can access all roofs"
  ON public.roofs
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Inspectors can view all roofs"
  ON public.roofs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'inspector'));

-- Inspections policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.inspections;

CREATE POLICY "Super admins and managers can access all inspections"
  ON public.inspections
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Inspectors can access their assigned inspections"
  ON public.inspections
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'inspector') AND
    inspector_id = auth.uid()
  );

-- Similar policies for other tables
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.clients;
CREATE POLICY "Authenticated users can access clients"
  ON public.clients
  FOR ALL
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.vendors;
CREATE POLICY "Authenticated users can access vendors"
  ON public.vendors
  FOR ALL
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.work_orders;
CREATE POLICY "Super admins and managers can access all work orders"
  ON public.work_orders
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Inspectors can access assigned work orders"
  ON public.work_orders
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'inspector') AND
    assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.inspection_reports;
CREATE POLICY "Super admins and managers can access all reports"
  ON public.inspection_reports
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Inspectors can access reports for their inspections"
  ON public.inspection_reports
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'inspector') AND
    inspection_id IN (
      SELECT id FROM public.inspections WHERE inspector_id = auth.uid()
    )
  );

-- Add updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();