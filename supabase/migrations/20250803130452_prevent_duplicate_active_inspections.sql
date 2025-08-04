-- Prevent duplicate active inspections for the same property/inspector combination
-- This addresses the root cause of duplicate inspections appearing on dashboard refresh

-- Add unique constraint to prevent multiple active/in_progress inspections per property per inspector
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'unique_active_inspection_per_property_inspector'
    ) THEN
        CREATE UNIQUE INDEX unique_active_inspection_per_property_inspector 
        ON public.inspections(roof_id, inspector_id) 
        WHERE status IN ('scheduled', 'in_progress') AND archived_at IS NULL;
    END IF;
END $$;

-- Add constraint to prevent multiple ready_for_review inspections (which should be unique per property/inspector)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'unique_review_inspection_per_property_inspector'
    ) THEN
        CREATE UNIQUE INDEX unique_review_inspection_per_property_inspector 
        ON public.inspections(roof_id, inspector_id) 
        WHERE status = 'ready_for_review' AND archived_at IS NULL;
    END IF;
END $$;

-- Add a function to safely create inspections with duplicate checking
CREATE OR REPLACE FUNCTION public.create_inspection_safely(
    p_roof_id UUID,
    p_inspector_id UUID,
    p_status TEXT DEFAULT 'scheduled',
    p_inspection_type TEXT DEFAULT 'annual',
    p_scheduled_date TIMESTAMPTZ DEFAULT NOW(),
    p_weather_conditions TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inspection_id UUID;
    v_existing_id UUID;
BEGIN
    -- Check for existing active inspections for this property/inspector
    SELECT id INTO v_existing_id
    FROM public.inspections
    WHERE roof_id = p_roof_id 
      AND inspector_id = p_inspector_id
      AND status IN ('scheduled', 'in_progress', 'ready_for_review')
      AND archived_at IS NULL
    LIMIT 1;
    
    -- If existing inspection found, return its ID instead of creating duplicate
    IF v_existing_id IS NOT NULL THEN
        RAISE NOTICE 'Existing inspection found with ID %, returning existing ID', v_existing_id;
        RETURN v_existing_id;
    END IF;
    
    -- Create new inspection if none exists
    INSERT INTO public.inspections (
        roof_id,
        inspector_id,
        status,
        inspection_type,
        scheduled_date,
        weather_conditions,
        notes
    ) VALUES (
        p_roof_id,
        p_inspector_id,
        p_status,
        p_inspection_type,
        p_scheduled_date,
        p_weather_conditions,
        p_notes
    ) RETURNING id INTO v_inspection_id;
    
    RAISE NOTICE 'Created new inspection with ID %', v_inspection_id;
    RETURN v_inspection_id;
    
EXCEPTION WHEN unique_violation THEN
    -- If a unique constraint violation occurs, try to find existing inspection
    SELECT id INTO v_existing_id
    FROM public.inspections
    WHERE roof_id = p_roof_id 
      AND inspector_id = p_inspector_id
      AND status IN ('scheduled', 'in_progress', 'ready_for_review')
      AND archived_at IS NULL
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
        RAISE NOTICE 'Unique violation caught, returning existing inspection ID %', v_existing_id;
        RETURN v_existing_id;
    ELSE
        -- Re-raise the exception if we can't find the conflicting record
        RAISE;
    END IF;
END;
$$;

-- Add helpful comments
COMMENT ON INDEX unique_active_inspection_per_property_inspector 
IS 'Prevents multiple active inspections (scheduled/in_progress) per property per inspector';

COMMENT ON INDEX unique_review_inspection_per_property_inspector 
IS 'Prevents multiple ready_for_review inspections per property per inspector';

COMMENT ON FUNCTION public.create_inspection_safely(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT)
IS 'Safely creates inspection with duplicate checking, returns existing ID if duplicate found';

-- Update RLS policies to account for new function (if needed)
-- The function runs with SECURITY DEFINER so it should inherit proper permissions