-- Remove foreign key constraint and add company employees
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey;

-- Add company employees to users table
INSERT INTO users (auth_user_id, email, first_name, last_name, role, is_active, created_at, updated_at)
VALUES
  -- Michael Kidder (Inspector, existing auth user)  
  ((SELECT id FROM auth.users WHERE email = 'kidderswork@gmail.com'), 'kidderswork@gmail.com', 'Michael', 'Kidder', 'inspector', true, now(), now()),
  
  -- Jeremy Ragdale (Inspector)
  (gen_random_uuid(), 'jragdale@roofmind.com', 'Jeremy', 'Ragdale', 'inspector', true, now(), now()),
  
  -- Jordan Biggers (Super Admin)  
  (gen_random_uuid(), 'jbiggers@roofmind.com', 'Jordan', 'Biggers', 'super_admin', true, now(), now()),
  
  -- Bill Ricci (Inspector)
  (gen_random_uuid(), 'bricci@roofmind.com', 'Bill', 'Ricci', 'inspector', true, now(), now()),
  
  -- Mandy Mccord (Manager)
  (gen_random_uuid(), 'mmccord@roofmind.com', 'Mandy', 'Mccord', 'manager', true, now(), now())

ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();