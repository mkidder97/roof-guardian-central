-- Update specific user to super_admin role
UPDATE public.user_roles 
SET role = 'super_admin'::app_role 
WHERE user_id = 'fffc247c-a4b0-4b6a-a68a-18feaaf0aeed';