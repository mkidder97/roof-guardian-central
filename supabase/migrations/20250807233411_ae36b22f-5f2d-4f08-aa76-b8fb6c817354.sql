-- Add missing foreign key constraints to fix inspection data relationships

-- Add foreign key constraint for inspection_deficiencies
ALTER TABLE public.inspection_deficiencies 
ADD CONSTRAINT fk_inspection_deficiencies_inspection_id 
FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE;

-- Add foreign key constraint for inspection_capital_expenses  
ALTER TABLE public.inspection_capital_expenses 
ADD CONSTRAINT fk_inspection_capital_expenses_inspection_id 
FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE;

-- Add foreign key constraint for inspection_photos
ALTER TABLE public.inspection_photos 
ADD CONSTRAINT fk_inspection_photos_inspection_id 
FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE;