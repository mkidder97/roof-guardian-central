
-- Step 1: Update properties with fake PMs to NULL their property manager details
UPDATE roofs 
SET 
  property_manager_name = NULL,
  property_manager_email = NULL,
  property_manager_phone = NULL,
  property_manager_mobile = NULL,
  updated_at = NOW()
WHERE property_manager_name IN ('David Chen', 'Jennifer Thompson', 'Marcus Rodriguez');

-- Step 2: Clean up any property contact assignments for fake contacts (should be minimal since they're not in client_contacts)
DELETE FROM property_contact_assignments 
WHERE contact_id NOT IN (SELECT id FROM client_contacts);

-- Step 3: Fix Karen Morgan's email in client_contacts
UPDATE client_contacts 
SET email = 'kmorgan@veritascommercial.com'
WHERE first_name = 'Karen' AND last_name = 'Morgan' AND email IS NULL;

-- Step 4: Update properties assigned to Karen Morgan with the correct email
UPDATE roofs 
SET 
  property_manager_email = 'kmorgan@veritascommercial.com',
  updated_at = NOW()
WHERE property_manager_name = 'Karen Morgan' AND property_manager_email IS NULL;

-- Verification query - check remaining property managers
-- This will show us the count of properties per property manager after cleanup
SELECT 
  property_manager_name,
  property_manager_email,
  COUNT(*) as property_count
FROM roofs 
WHERE property_manager_name IS NOT NULL 
  AND is_deleted = false
GROUP BY property_manager_name, property_manager_email
ORDER BY property_count DESC;
