-- Fix inspector_id references in inspections table
-- This migration ensures inspector_id correctly references public.users.id instead of auth.users.id

-- 1. Check and fix any inspection records that have auth.users.id instead of public.users.id
UPDATE public.inspections 
SET inspector_id = (
  SELECT u.id 
  FROM public.users u 
  WHERE u.auth_user_id = inspections.inspector_id
)
WHERE EXISTS (
  SELECT 1 FROM public.users u 
  WHERE u.auth_user_id = inspections.inspector_id
);

-- 2. Add a helpful comment to clarify the relationship
COMMENT ON COLUMN public.inspections.inspector_id IS 'References public.users.id (not auth.users.id)';

-- 3. Ensure the foreign key constraint is properly defined
-- Drop existing constraint if it exists
ALTER TABLE public.inspections 
DROP CONSTRAINT IF EXISTS inspections_inspector_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE public.inspections 
ADD CONSTRAINT inspections_inspector_id_fkey 
FOREIGN KEY (inspector_id) REFERENCES public.users(id) ON DELETE SET NULL;