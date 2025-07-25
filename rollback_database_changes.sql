-- Rollback script to undo all database changes that may be causing React dispatcher errors
-- Execute this in Supabase SQL Editor to rollback the problematic changes

-- Remove the comment system tables and their dependencies
DROP TABLE IF EXISTS public.comment_reactions CASCADE;
DROP TABLE IF EXISTS public.comment_mentions CASCADE; 
DROP TABLE IF EXISTS public.comments CASCADE;

-- Remove added columns from roofs table
ALTER TABLE public.roofs DROP COLUMN IF EXISTS roof_age;
ALTER TABLE public.roofs DROP COLUMN IF EXISTS capital_budget;

-- Remove the trigger if it exists
DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;

-- Note: This rollback script removes:
-- 1. All comment system tables (comments, comment_mentions, comment_reactions)
-- 2. New columns added to roofs table (roof_age, capital_budget) 
-- 3. Associated RLS policies (automatically dropped with tables)
-- 4. Associated triggers
--
-- After running this script, the database should be back to its original state
-- before the comment system was added.