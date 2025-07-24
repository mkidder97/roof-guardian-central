-- Update current user to super_admin role
UPDATE public.user_roles 
SET role = 'super_admin'::app_role 
WHERE user_id = auth.uid();