-- Update inspections status constraint to include 'ready_for_review'
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_status_check
  CHECK (status IN ('scheduled', 'in_progress', 'ready_for_review', 'completed', 'cancelled'));

-- Add comment to document the status workflow
COMMENT ON COLUMN public.inspections.status IS 'Inspection workflow states: scheduled → in_progress → ready_for_review → completed (or cancelled at any point)';