-- Add executive_summary column to inspection_reports table
-- This migration adds executive summary support for historical PDF uploads

ALTER TABLE public.inspection_reports ADD COLUMN IF NOT EXISTS executive_summary TEXT;

-- Add comment to document the new field
COMMENT ON COLUMN public.inspection_reports.executive_summary IS 'AI-generated executive summary of the inspection findings and key insights';