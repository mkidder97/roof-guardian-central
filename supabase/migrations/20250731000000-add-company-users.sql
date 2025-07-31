-- Add real company users to the users table
-- These are employees who can log into the system and perform inspections

-- First, add Michael Kidder (you) if not exists - using existing auth user
INSERT INTO users (auth_user_id, email, first_name, last_name, role, is_active)
SELECT id, email, 'Michael', 'Kidder', 'inspector', true
FROM auth.users 
WHERE email = 'kidderswork@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Add other company employees
-- Note: These will need auth.users entries created separately for actual login
INSERT INTO users (auth_user_id, email, first_name, last_name, role, is_active, created_at, updated_at)
VALUES
  -- Jeremy Ragdale (Inspector)
  (gen_random_uuid(), 'jragdale@roofmind.com', 'Jeremy', 'Ragdale', 'inspector', true, now(), now()),
  
  -- Jordan Biggers (Super Admin)
  (gen_random_uuid(), 'jbiggers@roofmind.com', 'Jordan', 'Biggers', 'super_admin', true, now(), now()),
  
  -- Bill Ricci (Inspector)
  (gen_random_uuid(), 'bricci@roofmind.com', 'Bill', 'Ricci', 'inspector', true, now(), now()),
  
  -- Mandy Mccord (Admin)
  (gen_random_uuid(), 'mmccord@roofmind.com', 'Mandy', 'Mccord', 'manager', true, now(), now())

ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Comment for documentation
COMMENT ON TABLE users IS 'Company employees who can log into the system. Different from profiles which are external contacts like property managers.';