-- Assign property managers to the remaining 26 properties without PMs
-- Distribute them evenly among the 13 real property managers

WITH unassigned_properties AS (
  SELECT id, property_name, ROW_NUMBER() OVER (ORDER BY property_name) as row_num
  FROM roofs 
  WHERE property_manager_name IS NULL 
    AND is_deleted = false
),
real_managers AS (
  SELECT 
    id as contact_id,
    first_name || ' ' || last_name as full_name,
    email,
    ROW_NUMBER() OVER (ORDER BY id) as manager_rank
  FROM client_contacts 
  WHERE role = 'property_manager' 
    AND client_id = '96053b09-25ca-41ed-8b20-5708c27029f6'
),
assignments AS (
  SELECT 
    up.id as roof_id,
    rm.full_name,
    rm.email,
    rm.contact_id,
    up.row_num,
    rm.manager_rank
  FROM unassigned_properties up
  CROSS JOIN real_managers rm
  WHERE ((up.row_num - 1) % 13) + 1 = rm.manager_rank
)
UPDATE roofs 
SET 
  property_manager_name = a.full_name,
  property_manager_email = a.email,
  updated_at = NOW()
FROM assignments a
WHERE roofs.id = a.roof_id;

-- Also create property contact assignments for the newly assigned properties
INSERT INTO property_contact_assignments (roof_id, contact_id, assignment_type, is_active)
SELECT DISTINCT
  r.id as roof_id,
  cc.id as contact_id,
  'property_manager' as assignment_type,
  true as is_active
FROM roofs r
JOIN client_contacts cc ON cc.first_name || ' ' || cc.last_name = r.property_manager_name
WHERE r.property_manager_name IS NOT NULL
  AND cc.role = 'property_manager' 
  AND cc.client_id = '96053b09-25ca-41ed-8b20-5708c27029f6'
  AND NOT EXISTS (
    SELECT 1 FROM property_contact_assignments pca 
    WHERE pca.roof_id = r.id AND pca.contact_id = cc.id
  );