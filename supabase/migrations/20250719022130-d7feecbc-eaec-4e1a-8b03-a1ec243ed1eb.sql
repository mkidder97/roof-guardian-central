-- Update roofs table with the real property managers from client_contacts
-- Distribute properties among the 13 real property managers

-- First, get a list of all roofs and update them with real property managers
WITH real_managers AS (
  SELECT 
    id as contact_id,
    first_name || ' ' || last_name as full_name,
    email,
    ROW_NUMBER() OVER (ORDER BY id) as manager_rank
  FROM client_contacts 
  WHERE role = 'property_manager' 
    AND client_id = '96053b09-25ca-41ed-8b20-5708c27029f6'
),
roof_assignments AS (
  SELECT 
    r.id as roof_id,
    rm.full_name,
    rm.email,
    ROW_NUMBER() OVER (ORDER BY r.id) as roof_rank
  FROM roofs r
  CROSS JOIN real_managers rm
  WHERE r.is_deleted = false
)
UPDATE roofs 
SET 
  property_manager_name = ra.full_name,
  property_manager_email = ra.email
FROM roof_assignments ra
WHERE roofs.id = ra.roof_id 
  AND ra.roof_rank % 13 = (ra.manager_rank - 1);

-- Also create property contact assignments to link these properly
INSERT INTO property_contact_assignments (roof_id, contact_id, assignment_type, is_active)
SELECT DISTINCT
  r.id as roof_id,
  cc.id as contact_id,
  'property_manager' as assignment_type,
  true as is_active
FROM roofs r
JOIN client_contacts cc ON cc.first_name || ' ' || cc.last_name = r.property_manager_name
WHERE cc.role = 'property_manager' 
  AND cc.client_id = '96053b09-25ca-41ed-8b20-5708c27029f6'
  AND NOT EXISTS (
    SELECT 1 FROM property_contact_assignments pca 
    WHERE pca.roof_id = r.id AND pca.contact_id = cc.id
  );