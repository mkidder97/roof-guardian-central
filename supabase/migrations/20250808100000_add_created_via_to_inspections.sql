-- Add created_via field to inspections table for tracking scheduling mode
-- This migration adds a field to distinguish between n8n-triggered and direct scheduling

-- 1. Add created_via column to inspections table
ALTER TABLE public.inspections 
ADD COLUMN created_via TEXT DEFAULT 'manual' 
CHECK (created_via IN ('n8n', 'manual', 'direct'));

-- 2. Add index for efficient filtering by creation method
CREATE INDEX idx_inspections_created_via ON public.inspections(created_via);

-- 3. Add created_by field to track which user created the inspection
ALTER TABLE public.inspections 
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Add index for created_by field
CREATE INDEX idx_inspections_created_by ON public.inspections(created_by);

-- 5. Add helpful comments
COMMENT ON COLUMN public.inspections.created_via IS 'Tracks scheduling mode: n8n (campaign workflow), manual (UI scheduling), direct (immediate scheduling)';
COMMENT ON COLUMN public.inspections.created_by IS 'User who created this inspection record';

-- 6. Update existing records to have proper created_via values
UPDATE public.inspections 
SET created_via = CASE 
  WHEN campaign_id IS NOT NULL THEN 'n8n'
  ELSE 'manual'
END
WHERE created_via = 'manual';

-- 7. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.inspections TO authenticated;