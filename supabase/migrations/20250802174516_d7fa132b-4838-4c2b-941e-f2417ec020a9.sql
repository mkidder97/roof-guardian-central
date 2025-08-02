-- Phase 1: Database Schema Enhancements
-- Create missing tables for structured inspection data

-- Table for individual inspection deficiencies
CREATE TABLE public.inspection_deficiencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL,
  deficiency_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  location_description TEXT,
  estimated_cost NUMERIC(10,2),
  priority_level TEXT DEFAULT 'medium',
  photo_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for inspection photos with proper categorization
CREATE TABLE public.inspection_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL,
  deficiency_id UUID,
  photo_type TEXT NOT NULL DEFAULT 'general',
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for capital expenses identified during inspection
CREATE TABLE public.inspection_capital_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL,
  expense_type TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_cost NUMERIC(10,2) NOT NULL,
  priority TEXT DEFAULT 'medium',
  recommended_timeline TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add inspection_id to inspection_sessions for proper relationship
ALTER TABLE public.inspection_sessions 
ADD COLUMN inspection_id UUID;

-- Add indexes for performance
CREATE INDEX idx_inspection_deficiencies_inspection_id ON public.inspection_deficiencies(inspection_id);
CREATE INDEX idx_inspection_photos_inspection_id ON public.inspection_photos(inspection_id);
CREATE INDEX idx_inspection_photos_deficiency_id ON public.inspection_photos(deficiency_id);
CREATE INDEX idx_inspection_capital_expenses_inspection_id ON public.inspection_capital_expenses(inspection_id);
CREATE INDEX idx_inspection_sessions_inspection_id ON public.inspection_sessions(inspection_id);

-- Enable RLS on new tables
ALTER TABLE public.inspection_deficiencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_capital_expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for inspection_deficiencies
CREATE POLICY "Super admins and managers can access all deficiencies" 
ON public.inspection_deficiencies FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Inspectors can access deficiencies for their inspections" 
ON public.inspection_deficiencies FOR ALL 
USING (has_role(auth.uid(), 'inspector'::app_role) AND inspection_id IN (
  SELECT id FROM public.inspections WHERE inspector_id = auth.uid()
));

-- RLS policies for inspection_photos
CREATE POLICY "Super admins and managers can access all photos" 
ON public.inspection_photos FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Inspectors can access photos for their inspections" 
ON public.inspection_photos FOR ALL 
USING (has_role(auth.uid(), 'inspector'::app_role) AND inspection_id IN (
  SELECT id FROM public.inspections WHERE inspector_id = auth.uid()
));

-- RLS policies for inspection_capital_expenses
CREATE POLICY "Super admins and managers can access all capital expenses" 
ON public.inspection_capital_expenses FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Inspectors can access capital expenses for their inspections" 
ON public.inspection_capital_expenses FOR ALL 
USING (has_role(auth.uid(), 'inspector'::app_role) AND inspection_id IN (
  SELECT id FROM public.inspections WHERE inspector_id = auth.uid()
));

-- Function to process inspection completion
CREATE OR REPLACE FUNCTION public.complete_inspection_from_session(
  p_session_id UUID,
  p_final_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_inspection_id UUID;
  v_deficiency JSONB;
  v_photo JSONB;
  v_expense JSONB;
BEGIN
  -- Get session data
  SELECT * INTO v_session
  FROM public.inspection_sessions
  WHERE id = p_session_id AND inspector_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or access denied';
  END IF;
  
  -- Create or update main inspection record
  IF v_session.inspection_id IS NOT NULL THEN
    v_inspection_id := v_session.inspection_id;
    
    UPDATE public.inspections 
    SET 
      status = 'completed',
      completed_date = CURRENT_DATE,
      notes = COALESCE(p_final_notes, v_session.session_data->>'notes'),
      weather_conditions = v_session.session_data->>'weatherConditions',
      updated_at = now()
    WHERE id = v_inspection_id;
  ELSE
    -- Create new inspection record
    INSERT INTO public.inspections (
      roof_id,
      inspector_id,
      scheduled_date,
      completed_date,
      status,
      inspection_type,
      notes,
      weather_conditions
    ) VALUES (
      v_session.property_id,
      v_session.inspector_id,
      CURRENT_DATE,
      CURRENT_DATE,
      'completed',
      COALESCE(v_session.session_data->>'inspectionType', 'routine'),
      COALESCE(p_final_notes, v_session.session_data->>'notes'),
      v_session.session_data->>'weatherConditions'
    ) RETURNING id INTO v_inspection_id;
    
    -- Link session to inspection
    UPDATE public.inspection_sessions 
    SET inspection_id = v_inspection_id
    WHERE id = p_session_id;
  END IF;
  
  -- Process deficiencies
  IF v_session.session_data ? 'deficiencies' THEN
    FOR v_deficiency IN SELECT * FROM jsonb_array_elements(v_session.session_data->'deficiencies')
    LOOP
      INSERT INTO public.inspection_deficiencies (
        inspection_id,
        deficiency_type,
        severity,
        description,
        location_description,
        estimated_cost
      ) VALUES (
        v_inspection_id,
        v_deficiency->>'type',
        COALESCE(v_deficiency->>'severity', 'medium'),
        v_deficiency->>'description',
        v_deficiency->>'location',
        (v_deficiency->>'estimatedCost')::NUMERIC
      );
    END LOOP;
  END IF;
  
  -- Process capital expenses
  IF v_session.session_data ? 'capitalExpenses' THEN
    FOR v_expense IN SELECT * FROM jsonb_array_elements(v_session.session_data->'capitalExpenses')
    LOOP
      INSERT INTO public.inspection_capital_expenses (
        inspection_id,
        expense_type,
        description,
        estimated_cost,
        priority,
        recommended_timeline
      ) VALUES (
        v_inspection_id,
        v_expense->>'type',
        v_expense->>'description',
        (v_expense->>'estimatedCost')::NUMERIC,
        COALESCE(v_expense->>'priority', 'medium'),
        v_expense->>'timeline'
      );
    END LOOP;
  END IF;
  
  -- Update session status
  UPDATE public.inspection_sessions 
  SET 
    status = 'completed',
    last_updated = now()
  WHERE id = p_session_id;
  
  RETURN v_inspection_id;
END;
$$;

-- Function to create inspection from direct scheduling
CREATE OR REPLACE FUNCTION public.create_direct_inspection(
  p_roof_id UUID,
  p_inspector_id UUID,
  p_scheduled_date DATE,
  p_inspection_type TEXT DEFAULT 'routine',
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inspection_id UUID;
  v_session_id UUID;
BEGIN
  -- Create inspection record
  INSERT INTO public.inspections (
    roof_id,
    inspector_id,
    scheduled_date,
    status,
    inspection_type,
    notes
  ) VALUES (
    p_roof_id,
    p_inspector_id,
    p_scheduled_date,
    'scheduled',
    p_inspection_type,
    p_notes
  ) RETURNING id INTO v_inspection_id;
  
  -- Create corresponding session
  INSERT INTO public.inspection_sessions (
    property_id,
    inspector_id,
    inspection_id,
    status,
    session_data
  ) VALUES (
    p_roof_id,
    p_inspector_id,
    v_inspection_id,
    'active',
    jsonb_build_object(
      'inspectionType', p_inspection_type,
      'directInspection', true,
      'scheduledDate', p_scheduled_date,
      'notes', p_notes
    )
  ) RETURNING id INTO v_session_id;
  
  RETURN v_inspection_id;
END;
$$;