-- Remove duplicate contacts, keeping the one with the most contact information

WITH contact_scores AS (
  SELECT 
    id,
    client_id,
    first_name,
    last_name,
    email,
    office_phone,
    mobile_phone,
    -- Score based on how much contact info is available
    (CASE WHEN email IS NOT NULL AND trim(email) != '' THEN 1 ELSE 0 END +
     CASE WHEN office_phone IS NOT NULL AND trim(office_phone) != '' THEN 1 ELSE 0 END +
     CASE WHEN mobile_phone IS NOT NULL AND trim(mobile_phone) != '' THEN 1 ELSE 0 END) as contact_score,
    -- Use row_number to rank contacts by completeness
    ROW_NUMBER() OVER (
      PARTITION BY client_id, LOWER(trim(first_name)), LOWER(trim(last_name))
      ORDER BY 
        (CASE WHEN email IS NOT NULL AND trim(email) != '' THEN 1 ELSE 0 END +
         CASE WHEN office_phone IS NOT NULL AND trim(office_phone) != '' THEN 1 ELSE 0 END +
         CASE WHEN mobile_phone IS NOT NULL AND trim(mobile_phone) != '' THEN 1 ELSE 0 END) DESC,
        created_at ASC
    ) as rn
  FROM public.client_contacts
  WHERE is_active = true
),
duplicates_to_delete AS (
  SELECT id
  FROM contact_scores
  WHERE rn > 1  -- Keep only the first (most complete) contact for each name/client combination
)
DELETE FROM public.client_contacts
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Update the remaining contacts to ensure proper primary contact designation
WITH client_contact_counts AS (
  SELECT 
    client_id,
    COUNT(*) as contact_count
  FROM public.client_contacts
  WHERE is_active = true
  GROUP BY client_id
),
primary_contacts AS (
  SELECT DISTINCT ON (cc.client_id)
    cc.id,
    cc.client_id
  FROM public.client_contacts cc
  JOIN client_contact_counts ccc ON cc.client_id = ccc.client_id
  WHERE cc.is_active = true
  ORDER BY cc.client_id, 
    (CASE WHEN cc.email IS NOT NULL AND trim(cc.email) != '' THEN 1 ELSE 0 END +
     CASE WHEN cc.office_phone IS NOT NULL AND trim(cc.office_phone) != '' THEN 1 ELSE 0 END +
     CASE WHEN cc.mobile_phone IS NOT NULL AND trim(cc.mobile_phone) != '' THEN 1 ELSE 0 END) DESC,
    cc.created_at ASC
)
UPDATE public.client_contacts
SET is_primary = CASE 
  WHEN id IN (SELECT id FROM primary_contacts) THEN true 
  ELSE false 
END;