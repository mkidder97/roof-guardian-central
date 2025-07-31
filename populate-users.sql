-- MANUAL SQL TO RUN IN SUPABASE CONSOLE
-- Go to your Supabase Dashboard -> SQL Editor and run this:

-- First, let's see what's in the users table currently
-- RUN THIS FIRST to check structure:
-- SELECT * FROM users LIMIT 5;

-- Clear any existing test data if needed (OPTIONAL)
-- DELETE FROM users WHERE email LIKE '%roofmind.com' OR email = 'kidderswork@gmail.com';

-- Add your existing auth user first (Michael Kidder)
INSERT INTO users (auth_user_id, email, first_name, last_name, role, is_active, created_at, updated_at)
SELECT id, email, 'Michael', 'Kidder', 'inspector', true, now(), now()
FROM auth.users 
WHERE email = 'kidderswork@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Add the other company employees (they can be added even without auth.users entries)
INSERT INTO users (auth_user_id, email, first_name, last_name, role, is_active, created_at, updated_at)
VALUES
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

-- Verify the users were added
SELECT id, email, first_name, last_name, role, is_active FROM users ORDER BY first_name;