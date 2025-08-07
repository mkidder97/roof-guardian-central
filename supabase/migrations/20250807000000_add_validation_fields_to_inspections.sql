-- Add validation fields to inspections table for external automation integration
-- This migration adds fields required for inspection completion validation and reporting workflow

-- Add the new validation fields
ALTER TABLE public.inspections 
ADD COLUMN ready_to_send BOOLEAN DEFAULT false,
ADD COLUMN proof_check_notes TEXT;

-- Update the status constraint to ensure proper workflow states
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'ready_for_review', 'cancelled'));

-- Add comments to document the new fields
COMMENT ON COLUMN public.inspections.ready_to_send IS 'Flag indicating inspection has passed all validation checks and is ready for external report generation';
COMMENT ON COLUMN public.inspections.proof_check_notes IS 'Notes from validation process - contains error details if validation fails';

-- Create index for efficient querying of ready-to-send inspections
CREATE INDEX idx_inspections_ready_to_send ON public.inspections(ready_to_send, status) WHERE ready_to_send = true;

-- Update the status constraint comment to include the new 'pending' status
COMMENT ON COLUMN public.inspections.status IS 'Inspection workflow states: pending → in_progress → completed (or ready_for_review) → external validation → report generation (or cancelled at any point)';