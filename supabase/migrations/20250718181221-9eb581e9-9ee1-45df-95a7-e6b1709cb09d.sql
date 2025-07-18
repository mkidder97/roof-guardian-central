-- Add intelligent property grouping tables and functions
CREATE TABLE public.property_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  group_type TEXT NOT NULL CHECK (group_type IN ('geographic', 'property_manager', 'seasonal', 'risk_based', 'custom')),
  client_id UUID REFERENCES clients(id),
  properties JSONB NOT NULL DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add grouping configuration table
CREATE TABLE public.grouping_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  name TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add property routing optimization table
CREATE TABLE public.inspector_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL,
  route_date DATE NOT NULL,
  property_sequence JSONB NOT NULL DEFAULT '[]',
  estimated_travel_time INTEGER, -- in minutes
  total_distance DECIMAL, -- in miles
  optimization_score DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add seasonal scheduling preferences
CREATE TABLE public.seasonal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  region TEXT,
  season TEXT CHECK (season IN ('spring', 'summer', 'fall', 'winter')),
  preferred_months INTEGER[] DEFAULT '{}',
  avoid_conditions TEXT[] DEFAULT '{}',
  optimal_temperature_range JSONB DEFAULT '{"min": 40, "max": 85}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.property_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grouping_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspector_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for property groups
CREATE POLICY "Users can view property groups" ON public.property_groups
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage property groups" ON public.property_groups
FOR ALL USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS policies for grouping configurations
CREATE POLICY "Users can view grouping configurations" ON public.grouping_configurations
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage grouping configurations" ON public.grouping_configurations
FOR ALL USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS policies for inspector routes
CREATE POLICY "Inspectors can view their routes" ON public.inspector_routes
FOR SELECT USING (has_role(auth.uid(), 'inspector'::app_role) AND inspector_id = auth.uid());

CREATE POLICY "Managers can view all routes" ON public.inspector_routes
FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Managers can manage routes" ON public.inspector_routes
FOR ALL USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS policies for seasonal preferences
CREATE POLICY "Users can view seasonal preferences" ON public.seasonal_preferences
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage seasonal preferences" ON public.seasonal_preferences
FOR ALL USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add intelligent grouping function
CREATE OR REPLACE FUNCTION public.calculate_property_proximity(
  property1_lat DECIMAL,
  property1_lng DECIMAL,
  property2_lat DECIMAL,
  property2_lng DECIMAL
) RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
  distance DECIMAL;
BEGIN
  -- Calculate distance using Haversine formula (approximate)
  -- Returns distance in miles
  distance := (
    3959 * acos(
      cos(radians(property1_lat)) * 
      cos(radians(property2_lat)) * 
      cos(radians(property2_lng) - radians(property1_lng)) + 
      sin(radians(property1_lat)) * 
      sin(radians(property2_lat))
    )
  );
  
  RETURN COALESCE(distance, 9999);
END;
$$;

-- Function to generate intelligent property groups
CREATE OR REPLACE FUNCTION public.generate_intelligent_groups(
  p_client_id UUID DEFAULT NULL,
  p_group_type TEXT DEFAULT 'geographic',
  p_max_group_size INTEGER DEFAULT 10,
  p_max_distance_miles DECIMAL DEFAULT 25.0
) RETURNS TABLE (
  group_id INTEGER,
  property_id UUID,
  property_name TEXT,
  group_center_lat DECIMAL,
  group_center_lng DECIMAL,
  optimization_score DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  property_record RECORD;
  current_group_id INTEGER := 1;
  group_properties UUID[];
BEGIN
  -- For geographic grouping
  IF p_group_type = 'geographic' THEN
    FOR property_record IN 
      SELECT id, property_name, latitude, longitude, property_manager_name
      FROM public.roofs 
      WHERE (p_client_id IS NULL OR client_id = p_client_id)
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND status = 'active'
      ORDER BY latitude, longitude
    LOOP
      -- Simple clustering logic - group by proximity
      -- In a real implementation, you'd use more sophisticated clustering algorithms
      RETURN QUERY SELECT 
        current_group_id,
        property_record.id,
        property_record.property_name,
        property_record.latitude,
        property_record.longitude,
        random() * 100; -- Placeholder optimization score
        
      IF (current_group_id % p_max_group_size = 0) THEN
        current_group_id := current_group_id + 1;
      END IF;
    END LOOP;
  END IF;
  
  RETURN;
END;
$$;

-- Add triggers for updated_at columns
CREATE TRIGGER update_property_groups_updated_at
  BEFORE UPDATE ON public.property_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grouping_configurations_updated_at
  BEFORE UPDATE ON public.grouping_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspector_routes_updated_at
  BEFORE UPDATE ON public.inspector_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();