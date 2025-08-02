-- Local Testing Setup for JSON Normalization
-- This script sets up a safe testing environment for the normalization migrations

-- =====================================================
-- 1. CREATE TEST SCHEMA (ISOLATED FROM PRODUCTION)
-- =====================================================

-- Create a separate schema for testing
CREATE SCHEMA IF NOT EXISTS test_normalization;

-- Set search path to include test schema
SET search_path TO test_normalization, public;

-- =====================================================
-- 2. CREATE BACKUP TABLES FOR EXISTING DATA
-- =====================================================

-- Backup inspection_sessions with JSON data
CREATE TABLE IF NOT EXISTS test_normalization.backup_inspection_sessions AS 
SELECT * FROM public.inspection_sessions 
WHERE session_data IS NOT NULL 
  AND session_data != '{}'::jsonb
LIMIT 100; -- Limit to 100 records for testing

-- Backup inspection_campaigns with JSON data
CREATE TABLE IF NOT EXISTS test_normalization.backup_inspection_campaigns AS 
SELECT * FROM public.inspection_campaigns 
WHERE (properties IS NOT NULL AND jsonb_typeof(properties) = 'array')
   OR (automation_settings IS NOT NULL AND jsonb_typeof(automation_settings) = 'object')
   OR (campaign_metadata IS NOT NULL AND jsonb_typeof(campaign_metadata) = 'object')
LIMIT 50;

-- Backup campaign_groups with JSON data
CREATE TABLE IF NOT EXISTS test_normalization.backup_campaign_groups AS 
SELECT * FROM public.campaign_groups 
WHERE (properties IS NOT NULL AND jsonb_typeof(properties) = 'array')
   OR (rules IS NOT NULL AND jsonb_typeof(rules) = 'object')
LIMIT 50;

-- Backup contacts with metadata
CREATE TABLE IF NOT EXISTS test_normalization.backup_contacts AS 
SELECT * FROM public.contacts 
WHERE metadata IS NOT NULL 
  AND jsonb_typeof(metadata) = 'object'
LIMIT 100;

-- Backup property_managers with settings
CREATE TABLE IF NOT EXISTS test_normalization.backup_property_managers AS 
SELECT * FROM public.property_managers 
WHERE (automation_settings IS NOT NULL AND jsonb_typeof(automation_settings) = 'object')
   OR (contact_preferences IS NOT NULL AND jsonb_typeof(contact_preferences) = 'object')
LIMIT 50;

-- =====================================================
-- 3. CREATE TEST COPIES OF MAIN TABLES
-- =====================================================

-- Create test copies of the tables we'll be modifying
CREATE TABLE test_normalization.inspection_sessions (LIKE public.inspection_sessions INCLUDING ALL);
CREATE TABLE test_normalization.inspection_campaigns (LIKE public.inspection_campaigns INCLUDING ALL);
CREATE TABLE test_normalization.campaign_groups (LIKE public.campaign_groups INCLUDING ALL);
CREATE TABLE test_normalization.contacts (LIKE public.contacts INCLUDING ALL);
CREATE TABLE test_normalization.property_managers (LIKE public.property_managers INCLUDING ALL);
CREATE TABLE test_normalization.roofs (LIKE public.roofs INCLUDING ALL);
CREATE TABLE test_normalization.users (LIKE public.users INCLUDING ALL);

-- =====================================================
-- 4. COPY SAMPLE DATA TO TEST TABLES
-- =====================================================

-- Copy inspection sessions
INSERT INTO test_normalization.inspection_sessions 
SELECT * FROM test_normalization.backup_inspection_sessions;

-- Copy campaigns
INSERT INTO test_normalization.inspection_campaigns 
SELECT * FROM test_normalization.backup_inspection_campaigns;

-- Copy groups
INSERT INTO test_normalization.campaign_groups 
SELECT * FROM test_normalization.backup_campaign_groups;

-- Copy contacts
INSERT INTO test_normalization.contacts 
SELECT * FROM test_normalization.backup_contacts;

-- Copy managers
INSERT INTO test_normalization.property_managers 
SELECT * FROM test_normalization.backup_property_managers;

-- Copy related roofs (needed for foreign keys)
INSERT INTO test_normalization.roofs 
SELECT DISTINCT r.* 
FROM public.roofs r
WHERE EXISTS (
  SELECT 1 FROM test_normalization.inspection_sessions s WHERE s.property_id = r.id
  UNION
  SELECT 1 FROM test_normalization.backup_inspection_campaigns c, 
              jsonb_array_elements_text(c.properties) prop_id 
         WHERE prop_id::uuid = r.id
)
ON CONFLICT (id) DO NOTHING;

-- Copy related users (needed for foreign keys)
INSERT INTO test_normalization.users 
SELECT DISTINCT u.* 
FROM public.users u
WHERE EXISTS (
  SELECT 1 FROM test_normalization.inspection_sessions s WHERE s.inspector_id = u.id
  UNION
  SELECT 1 FROM test_normalization.contacts c WHERE c.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. CREATE TEST STATISTICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW test_normalization.test_data_stats AS
SELECT 
  'inspection_sessions' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN session_data IS NOT NULL AND session_data != '{}'::jsonb THEN 1 END) as json_records,
  pg_size_pretty(SUM(pg_column_size(session_data))) as json_data_size
FROM test_normalization.inspection_sessions

UNION ALL

SELECT 
  'inspection_campaigns' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN properties IS NOT NULL OR automation_settings IS NOT NULL THEN 1 END) as json_records,
  pg_size_pretty(
    COALESCE(SUM(pg_column_size(properties)), 0) + 
    COALESCE(SUM(pg_column_size(automation_settings)), 0)
  ) as json_data_size
FROM test_normalization.inspection_campaigns

UNION ALL

SELECT 
  'campaign_groups' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN properties IS NOT NULL OR rules IS NOT NULL THEN 1 END) as json_records,
  pg_size_pretty(
    COALESCE(SUM(pg_column_size(properties)), 0) + 
    COALESCE(SUM(pg_column_size(rules)), 0)
  ) as json_data_size
FROM test_normalization.campaign_groups

UNION ALL

SELECT 
  'contacts' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN metadata IS NOT NULL AND metadata != '{}'::jsonb THEN 1 END) as json_records,
  pg_size_pretty(SUM(pg_column_size(metadata))) as json_data_size
FROM test_normalization.contacts

UNION ALL

SELECT 
  'property_managers' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN automation_settings IS NOT NULL OR contact_preferences IS NOT NULL THEN 1 END) as json_records,
  pg_size_pretty(
    COALESCE(SUM(pg_column_size(automation_settings)), 0) + 
    COALESCE(SUM(pg_column_size(contact_preferences)), 0)
  ) as json_data_size
FROM test_normalization.property_managers;

-- =====================================================
-- 6. CREATE SAMPLE JSON DATA INSPECTION
-- =====================================================

-- Function to inspect JSON structure
CREATE OR REPLACE FUNCTION test_normalization.inspect_json_structures()
RETURNS TABLE (
  source_table TEXT,
  json_column TEXT,
  sample_keys TEXT[],
  sample_value JSONB
) AS $$
BEGIN
  -- Inspection sessions
  RETURN QUERY
  SELECT 
    'inspection_sessions'::TEXT,
    'session_data'::TEXT,
    ARRAY(SELECT jsonb_object_keys(session_data) ORDER BY 1),
    session_data
  FROM test_normalization.inspection_sessions
  WHERE session_data IS NOT NULL AND session_data != '{}'::jsonb
  LIMIT 1;
  
  -- Campaigns properties
  RETURN QUERY
  SELECT 
    'inspection_campaigns'::TEXT,
    'properties'::TEXT,
    ARRAY['array_length: ' || jsonb_array_length(properties)::text],
    properties
  FROM test_normalization.inspection_campaigns
  WHERE properties IS NOT NULL AND jsonb_typeof(properties) = 'array'
  LIMIT 1;
  
  -- Campaign automation settings
  RETURN QUERY
  SELECT 
    'inspection_campaigns'::TEXT,
    'automation_settings'::TEXT,
    ARRAY(SELECT jsonb_object_keys(automation_settings) ORDER BY 1),
    automation_settings
  FROM test_normalization.inspection_campaigns
  WHERE automation_settings IS NOT NULL AND jsonb_typeof(automation_settings) = 'object'
  LIMIT 1;
  
  -- Groups properties
  RETURN QUERY
  SELECT 
    'campaign_groups'::TEXT,
    'properties'::TEXT,
    ARRAY['array_length: ' || jsonb_array_length(properties)::text],
    properties
  FROM test_normalization.campaign_groups
  WHERE properties IS NOT NULL AND jsonb_typeof(properties) = 'array'
  LIMIT 1;
  
  -- Contact metadata
  RETURN QUERY
  SELECT 
    'contacts'::TEXT,
    'metadata'::TEXT,
    ARRAY(SELECT jsonb_object_keys(metadata) ORDER BY 1),
    metadata
  FROM test_normalization.contacts
  WHERE metadata IS NOT NULL AND metadata != '{}'::jsonb
  LIMIT 1;
  
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Check test data statistics
SELECT * FROM test_normalization.test_data_stats;

-- Inspect JSON structures
SELECT * FROM test_normalization.inspect_json_structures();

-- =====================================================
-- 8. IMPORTANT NOTES
-- =====================================================

/*
To use this test environment:

1. Run this setup script first
2. Modify the migration scripts to use 'test_normalization' schema:
   - Replace 'public.' with 'test_normalization.' in all migration files
   - Or set search_path at the beginning of each migration

3. Run migrations in the test schema
4. Verify results before applying to production

To clean up after testing:
DROP SCHEMA test_normalization CASCADE;
*/

-- Set a flag to indicate test mode
DO $$
BEGIN
  RAISE NOTICE 'Test environment created successfully!';
  RAISE NOTICE 'Total test records prepared:';
  RAISE NOTICE '- Inspection sessions: %', (SELECT COUNT(*) FROM test_normalization.inspection_sessions);
  RAISE NOTICE '- Campaigns: %', (SELECT COUNT(*) FROM test_normalization.inspection_campaigns);
  RAISE NOTICE '- Groups: %', (SELECT COUNT(*) FROM test_normalization.campaign_groups);
  RAISE NOTICE '- Contacts: %', (SELECT COUNT(*) FROM test_normalization.contacts);
  RAISE NOTICE '- Managers: %', (SELECT COUNT(*) FROM test_normalization.property_managers);
END $$;