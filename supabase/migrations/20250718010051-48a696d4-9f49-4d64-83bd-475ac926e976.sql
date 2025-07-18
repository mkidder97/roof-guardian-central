-- One-time migration to extract site contacts from existing roof data and create contact records

INSERT INTO public.client_contacts (
  client_id,
  first_name,
  last_name,
  email,
  office_phone,
  mobile_phone,
  role,
  is_primary,
  is_active,
  notes
)
SELECT DISTINCT
  r.client_id,
  CASE 
    WHEN r.site_contact IS NOT NULL AND trim(r.site_contact) != '' THEN
      split_part(trim(r.site_contact), ' ', 1)
    ELSE 'Site'
  END as first_name,
  CASE 
    WHEN r.site_contact IS NOT NULL AND trim(r.site_contact) != '' AND array_length(string_to_array(trim(r.site_contact), ' '), 1) > 1 THEN
      trim(substring(r.site_contact from position(' ' in r.site_contact) + 1))
    ELSE 'Contact'
  END as last_name,
  r.site_contact_email,
  r.site_contact_office_phone,
  r.site_contact_mobile_phone,
  'property_manager' as role,
  true as is_primary,
  true as is_active,
  'Auto-generated from roof property data'
FROM public.roofs r
WHERE r.client_id IS NOT NULL 
  AND r.is_deleted = false
  AND (
    r.site_contact IS NOT NULL AND trim(r.site_contact) != ''
    OR r.site_contact_email IS NOT NULL AND trim(r.site_contact_email) != ''
    OR r.site_contact_office_phone IS NOT NULL AND trim(r.site_contact_office_phone) != ''
    OR r.site_contact_mobile_phone IS NOT NULL AND trim(r.site_contact_mobile_phone) != ''
  )
  AND NOT EXISTS (
    -- Avoid duplicates by checking if a contact with same email or name already exists for this client
    SELECT 1 FROM public.client_contacts cc 
    WHERE cc.client_id = r.client_id 
    AND (
      (cc.email = r.site_contact_email AND r.site_contact_email IS NOT NULL)
      OR (cc.first_name = split_part(trim(r.site_contact), ' ', 1) AND cc.last_name = trim(substring(r.site_contact from position(' ' in r.site_contact) + 1)) AND r.site_contact IS NOT NULL)
    )
  );