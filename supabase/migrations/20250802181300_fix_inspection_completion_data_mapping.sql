-- Fix data mapping in complete_inspection_from_session function
-- Update function to handle the actual data structure from the frontend

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
      notes = COALESCE(p_final_notes, v_session.session_data->>'inspectionNotes'),
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
      COALESCE(p_final_notes, v_session.session_data->>'inspectionNotes'),
      v_session.session_data->>'weatherConditions'
    ) RETURNING id INTO v_inspection_id;
    
    -- Link session to inspection
    UPDATE public.inspection_sessions 
    SET inspection_id = v_inspection_id
    WHERE id = p_session_id;
  END IF;
  
  -- Process deficiencies (handle both 'category' and 'type' fields)
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
        COALESCE(v_deficiency->>'category', v_deficiency->>'type', 'general'),
        COALESCE(v_deficiency->>'severity', 'medium'),
        v_deficiency->>'description',
        v_deficiency->>'location',
        COALESCE((v_deficiency->>'budgetAmount')::NUMERIC, (v_deficiency->>'estimatedCost')::NUMERIC, 0)
      );
    END LOOP;
  END IF;
  
  -- Process capital expenses (handle frontend data structure)
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
        COALESCE(v_expense->>'type', 'capital_expense'),
        v_expense->>'description',
        (v_expense->>'estimatedCost')::NUMERIC,
        COALESCE(v_expense->>'priority', 'medium'),
        COALESCE(v_expense->>'timeline', (v_expense->>'year')::text)
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