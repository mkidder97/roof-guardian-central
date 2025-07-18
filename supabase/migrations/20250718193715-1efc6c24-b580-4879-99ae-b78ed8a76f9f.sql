-- Add missing site contact fields to roofs table
-- Note: Most requested fields already exist in the table

-- Add site_contact_name if it doesn't exist (there's already a site_contact field)
ALTER TABLE roofs ADD COLUMN IF NOT EXISTS site_contact_name TEXT;

-- Add site_contact_phone if needed (there are already office and mobile phone fields)
ALTER TABLE roofs ADD COLUMN IF NOT EXISTS site_contact_phone TEXT;