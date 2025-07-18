-- Create the app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'manager', 'inspector');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(auth_user_id)
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'inspector' THEN 3
    END
  LIMIT 1
$$;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  );
  
  -- Assign default inspector role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'inspector');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Managers and super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'super_admin')
);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Managers can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'manager'));

-- Update existing table RLS policies to use role-based access

-- Roofs: Super admins and managers see all, inspectors see assigned
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.roofs;

CREATE POLICY "Super admins and managers can view all roofs" 
ON public.roofs 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Inspectors can view all roofs" 
ON public.roofs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'inspector'));

CREATE POLICY "Super admins and managers can modify roofs" 
ON public.roofs 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'manager')
);

-- Similar policies for other tables
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.clients;
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers and super admins can modify clients" ON public.clients FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager')
);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.vendors;
CREATE POLICY "Authenticated users can view vendors" ON public.vendors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers and super admins can modify vendors" ON public.vendors FOR ALL USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'manager')
);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.inspections;
CREATE POLICY "Authenticated users can view inspections" ON public.inspections FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can modify inspections" ON public.inspections FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.inspection_reports;
CREATE POLICY "Authenticated users can view inspection reports" ON public.inspection_reports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can modify inspection reports" ON public.inspection_reports FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.work_orders;
CREATE POLICY "Authenticated users can view work orders" ON public.work_orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can modify work orders" ON public.work_orders FOR ALL USING (auth.uid() IS NOT NULL);

-- Create updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();