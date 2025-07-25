-- Clean rollback - only drop what exists
-- Remove added columns from roofs table if they exist
ALTER TABLE public.roofs DROP COLUMN IF EXISTS roof_age;
ALTER TABLE public.roofs DROP COLUMN IF EXISTS capital_budget;