-- Add archived_at column to inspections table for soft deletion
ALTER TABLE public.inspections 
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Create index for archived inspections for better query performance
CREATE INDEX IF NOT EXISTS idx_inspections_archived_at 
ON public.inspections(archived_at) 
WHERE archived_at IS NOT NULL;

-- Update existing queries to exclude archived inspections by default
-- Note: This is handled in application logic, but we could add views if needed

-- Add comment to document the archival feature
COMMENT ON COLUMN public.inspections.archived_at IS 'Timestamp when the inspection was archived. NULL means active, NOT NULL means archived.';