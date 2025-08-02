-- Add missing foreign key constraints for inspection-related tables
-- This ensures data integrity and proper cascading deletes

-- Add foreign key constraint for inspection_deficiencies.inspection_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inspection_deficiencies_inspection_id_fkey'
        AND table_name = 'inspection_deficiencies'
    ) THEN
        ALTER TABLE public.inspection_deficiencies 
        ADD CONSTRAINT inspection_deficiencies_inspection_id_fkey 
        FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for inspection_photos.inspection_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inspection_photos_inspection_id_fkey'
        AND table_name = 'inspection_photos'
    ) THEN
        ALTER TABLE public.inspection_photos 
        ADD CONSTRAINT inspection_photos_inspection_id_fkey 
        FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for inspection_capital_expenses.inspection_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inspection_capital_expenses_inspection_id_fkey'
        AND table_name = 'inspection_capital_expenses'
    ) THEN
        ALTER TABLE public.inspection_capital_expenses 
        ADD CONSTRAINT inspection_capital_expenses_inspection_id_fkey 
        FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for inspection_photos.deficiency_id (optional reference)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inspection_photos_deficiency_id_fkey'
        AND table_name = 'inspection_photos'
    ) THEN
        ALTER TABLE public.inspection_photos 
        ADD CONSTRAINT inspection_photos_deficiency_id_fkey 
        FOREIGN KEY (deficiency_id) REFERENCES public.inspection_deficiencies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add helpful comments
COMMENT ON CONSTRAINT inspection_deficiencies_inspection_id_fkey ON public.inspection_deficiencies 
IS 'Ensures deficiencies are linked to valid inspections with cascade delete';

COMMENT ON CONSTRAINT inspection_photos_inspection_id_fkey ON public.inspection_photos 
IS 'Ensures photos are linked to valid inspections with cascade delete';

COMMENT ON CONSTRAINT inspection_capital_expenses_inspection_id_fkey ON public.inspection_capital_expenses 
IS 'Ensures capital expenses are linked to valid inspections with cascade delete';

COMMENT ON CONSTRAINT inspection_photos_deficiency_id_fkey ON public.inspection_photos 
IS 'Optional link to deficiency, nullified if deficiency is deleted';