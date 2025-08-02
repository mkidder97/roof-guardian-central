-- Phase 2 Data Migration: Extract JSON data from inspection_campaigns
-- This migration safely extracts property arrays and settings from campaign JSON blobs

-- =====================================================
-- 1. CAMPAIGN DATA MIGRATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.migrate_campaign_data()
RETURNS TABLE (
  campaigns_processed INTEGER,
  properties_created INTEGER,
  settings_created INTEGER,
  errors_encountered INTEGER
) AS $$
DECLARE
  campaign_record RECORD;
  property_record RECORD;
  setting_record RECORD;
  
  campaigns_count INTEGER := 0;
  properties_count INTEGER := 0;
  settings_count INTEGER := 0;
  errors_count INTEGER := 0;
  
  sequence_order INTEGER;
  
BEGIN
  -- =====================================================
  -- 2. MIGRATE CAMPAIGN PROPERTIES
  -- =====================================================
  
  -- Loop through all campaigns with property data
  FOR campaign_record IN 
    SELECT 
      id, 
      properties, 
      automation_settings, 
      campaign_metadata,
      created_at
    FROM public.inspection_campaigns 
    WHERE properties IS NOT NULL 
      AND jsonb_typeof(properties) = 'array'
  LOOP
    BEGIN
      campaigns_count := campaigns_count + 1;
      sequence_order := 1;
      
      -- Extract properties array
      FOR property_record IN 
        SELECT value FROM jsonb_array_elements(campaign_record.properties)
      LOOP
        BEGIN
          -- Handle both string IDs and object properties
          DECLARE
            property_id UUID;
            property_status TEXT := 'pending';
            estimated_cost NUMERIC := NULL;
          BEGIN
            -- Check if it's a simple UUID string or an object
            IF jsonb_typeof(property_record.value) = 'string' THEN
              property_id := (property_record.value #>> '{}')::UUID;
            ELSIF jsonb_typeof(property_record.value) = 'object' THEN
              property_id := (property_record.value->>'id')::UUID;
              property_status := COALESCE(property_record.value->>'status', 'pending');
              
              -- Extract cost if present
              IF property_record.value ? 'estimated_cost' AND 
                 property_record.value->>'estimated_cost' ~ '^[0-9]+\.?[0-9]*$' THEN
                estimated_cost := (property_record.value->>'estimated_cost')::NUMERIC;
              END IF;
            ELSE
              CONTINUE; -- Skip invalid property entries
            END IF;
            
            -- Verify the property exists
            IF EXISTS (SELECT 1 FROM public.roofs WHERE id = property_id) THEN
              INSERT INTO public.campaign_properties (
                campaign_id,
                roof_id,
                sequence_order,
                status,
                estimated_cost,
                created_at
              ) VALUES (
                campaign_record.id,
                property_id,
                sequence_order,
                CASE 
                  WHEN property_status IN ('pending', 'contacted', 'scheduled', 'in_progress', 'completed', 'cancelled', 'failed')
                  THEN property_status
                  ELSE 'pending'
                END,
                estimated_cost,
                campaign_record.created_at
              );
              
              properties_count := properties_count + 1;
              sequence_order := sequence_order + 1;
            ELSE
              RAISE NOTICE 'Property % not found in roofs table for campaign %', property_id, campaign_record.id;
            END IF;
            
          EXCEPTION WHEN OTHERS THEN
            errors_count := errors_count + 1;
            RAISE NOTICE 'Error processing property for campaign %: %', campaign_record.id, SQLERRM;
            CONTINUE;
          END;
        END;
      END LOOP;
      
      -- =====================================================
      -- 3. MIGRATE AUTOMATION SETTINGS
      -- =====================================================
      
      IF campaign_record.automation_settings IS NOT NULL AND
         jsonb_typeof(campaign_record.automation_settings) = 'object' THEN
        
        -- Extract email settings
        IF campaign_record.automation_settings ? 'email_reminders' THEN
          DECLARE
            email_settings JSONB := campaign_record.automation_settings->'email_reminders';
          BEGIN
            -- Email reminder enabled
            IF email_settings ? 'enabled' THEN
              INSERT INTO public.campaign_automation_settings (
                campaign_id, setting_type, setting_key, setting_value, is_enabled
              ) VALUES (
                campaign_record.id,
                'email_reminder',
                'enabled',
                email_settings->>'enabled',
                (email_settings->>'enabled')::BOOLEAN
              );
              settings_count := settings_count + 1;
            END IF;
            
            -- Reminder frequency
            IF email_settings ? 'frequency_days' THEN
              INSERT INTO public.campaign_automation_settings (
                campaign_id, setting_type, setting_key, setting_value, is_enabled
              ) VALUES (
                campaign_record.id,
                'email_reminder',
                'frequency_days',
                email_settings->>'frequency_days',
                true
              );
              settings_count := settings_count + 1;
            END IF;
            
            -- Max reminders
            IF email_settings ? 'max_reminders' THEN
              INSERT INTO public.campaign_automation_settings (
                campaign_id, setting_type, setting_key, setting_value, is_enabled
              ) VALUES (
                campaign_record.id,
                'email_reminder',
                'max_reminders',
                email_settings->>'max_reminders',
                true
              );
              settings_count := settings_count + 1;
            END IF;
            
          EXCEPTION WHEN OTHERS THEN
            errors_count := errors_count + 1;
            RAISE NOTICE 'Error processing email settings for campaign %: %', campaign_record.id, SQLERRM;
          END;
        END IF;
        
        -- Extract auto-scheduling settings
        IF campaign_record.automation_settings ? 'auto_schedule' THEN
          DECLARE
            schedule_settings JSONB := campaign_record.automation_settings->'auto_schedule';
          BEGIN
            -- Auto-schedule enabled
            IF schedule_settings ? 'enabled' THEN
              INSERT INTO public.campaign_automation_settings (
                campaign_id, setting_type, setting_key, setting_value, is_enabled
              ) VALUES (
                campaign_record.id,
                'auto_schedule',
                'enabled',
                schedule_settings->>'enabled',
                (schedule_settings->>'enabled')::BOOLEAN
              );
              settings_count := settings_count + 1;
            END IF;
            
            -- Preferred time slots
            IF schedule_settings ? 'preferred_times' THEN
              INSERT INTO public.campaign_automation_settings (
                campaign_id, setting_type, setting_key, setting_value, is_enabled
              ) VALUES (
                campaign_record.id,
                'auto_schedule',
                'preferred_times',
                schedule_settings->>'preferred_times',
                true
              );
              settings_count := settings_count + 1;
            END IF;
            
          EXCEPTION WHEN OTHERS THEN
            errors_count := errors_count + 1;
            RAISE NOTICE 'Error processing schedule settings for campaign %: %', campaign_record.id, SQLERRM;
          END;
        END IF;
        
        -- Extract follow-up settings
        IF campaign_record.automation_settings ? 'follow_up' THEN
          DECLARE
            followup_settings JSONB := campaign_record.automation_settings->'follow_up';
          BEGIN
            -- Follow-up sequence enabled
            IF followup_settings ? 'enabled' THEN
              INSERT INTO public.campaign_automation_settings (
                campaign_id, setting_type, setting_key, setting_value, is_enabled
              ) VALUES (
                campaign_record.id,
                'follow_up_sequence',
                'enabled',
                followup_settings->>'enabled',
                (followup_settings->>'enabled')::BOOLEAN
              );
              settings_count := settings_count + 1;
            END IF;
            
            -- Follow-up delay
            IF followup_settings ? 'delay_days' THEN
              INSERT INTO public.campaign_automation_settings (
                campaign_id, setting_type, setting_key, setting_value, is_enabled
              ) VALUES (
                campaign_record.id,
                'follow_up_sequence',
                'delay_days',
                followup_settings->>'delay_days',
                true
              );
              settings_count := settings_count + 1;
            END IF;
            
          EXCEPTION WHEN OTHERS THEN
            errors_count := errors_count + 1;
            RAISE NOTICE 'Error processing follow-up settings for campaign %: %', campaign_record.id, SQLERRM;
          END;
        END IF;
      END IF;
      
      -- =====================================================
      -- 4. EXTRACT METADATA SETTINGS
      -- =====================================================
      
      IF campaign_record.campaign_metadata IS NOT NULL AND
         jsonb_typeof(campaign_record.campaign_metadata) = 'object' THEN
        
        -- Extract general configuration from metadata
        FOR setting_record IN 
          SELECT key, value FROM jsonb_each_text(campaign_record.campaign_metadata)
        LOOP
          BEGIN
            -- Only migrate settings that make sense as automation settings
            IF setting_record.key IN ('weather_dependency', 'inspector_assignment_rule', 
                                     'communication_preference', 'escalation_threshold') THEN
              INSERT INTO public.campaign_automation_settings (
                campaign_id, setting_type, setting_key, setting_value, is_enabled
              ) VALUES (
                campaign_record.id,
                'communication_preference',
                setting_record.key,
                setting_record.value,
                true
              );
              settings_count := settings_count + 1;
            END IF;
            
          EXCEPTION WHEN OTHERS THEN
            errors_count := errors_count + 1;
            RAISE NOTICE 'Error processing metadata setting % for campaign %: %', 
                        setting_record.key, campaign_record.id, SQLERRM;
          END;
        END LOOP;
      END IF;
      
      -- Create default settings if none were migrated
      IF NOT EXISTS (SELECT 1 FROM public.campaign_automation_settings WHERE campaign_id = campaign_record.id) THEN
        PERFORM public.create_default_campaign_settings(campaign_record.id);
        settings_count := settings_count + 6; -- Default settings count
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      errors_count := errors_count + 1;
      RAISE NOTICE 'Error processing campaign %: %', campaign_record.id, SQLERRM;
    END;
  END LOOP;
  
  -- =====================================================
  -- 5. UPDATE CAMPAIGN STATISTICS
  -- =====================================================
  
  -- Update progress and cost statistics for all migrated campaigns
  UPDATE public.inspection_campaigns SET
    progress_percentage = (
      SELECT ROUND(
        (COUNT(CASE WHEN cp.status = 'completed' THEN 1 END)::numeric / 
         NULLIF(COUNT(*)::numeric, 0)) * 100, 2
      )
      FROM public.campaign_properties cp
      WHERE cp.campaign_id = inspection_campaigns.id
    ),
    total_estimated_cost = (
      SELECT COALESCE(SUM(estimated_cost), 0)
      FROM public.campaign_properties cp
      WHERE cp.campaign_id = inspection_campaigns.id
    )
  WHERE id IN (
    SELECT DISTINCT campaign_id FROM public.campaign_properties
  );
  
  -- Return summary statistics
  RETURN QUERY SELECT 
    campaigns_count,
    properties_count,
    settings_count,
    errors_count;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. VALIDATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_campaign_migration()
RETURNS TABLE (
  metric TEXT,
  original_count BIGINT,
  migrated_count BIGINT,
  difference BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Campaigns with properties' as metric,
    COUNT(*)::BIGINT as original_count,
    (SELECT COUNT(DISTINCT campaign_id) FROM public.campaign_properties)::BIGINT as migrated_count,
    (SELECT COUNT(DISTINCT campaign_id) FROM public.campaign_properties)::BIGINT - COUNT(*)::BIGINT as difference
  FROM public.inspection_campaigns 
  WHERE properties IS NOT NULL 
    AND jsonb_typeof(properties) = 'array'
    AND jsonb_array_length(properties) > 0
  
  UNION ALL
  
  SELECT 
    'Campaign Properties' as metric,
    (
      SELECT COALESCE(SUM(jsonb_array_length(properties)), 0)::BIGINT
      FROM public.inspection_campaigns 
      WHERE properties IS NOT NULL 
        AND jsonb_typeof(properties) = 'array'
    ) as original_count,
    COUNT(*)::BIGINT as migrated_count,
    COUNT(*)::BIGINT - (
      SELECT COALESCE(SUM(jsonb_array_length(properties)), 0)::BIGINT
      FROM public.inspection_campaigns 
      WHERE properties IS NOT NULL 
        AND jsonb_typeof(properties) = 'array'
    ) as difference
  FROM public.campaign_properties
  
  UNION ALL
  
  SELECT 
    'Automation Settings' as metric,
    0::BIGINT as original_count,
    COUNT(*)::BIGINT as migrated_count,
    COUNT(*)::BIGINT as difference
  FROM public.campaign_automation_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. CLEANUP FUNCTION (USE WITH CAUTION)
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_campaign_json_columns()
RETURNS TEXT AS $$
BEGIN
  -- This function removes the JSON columns after successful migration
  -- Only run this after validating the migration was successful
  
  -- Backup existing data first (optional)
  -- CREATE TABLE campaign_json_backup AS 
  -- SELECT id, properties, automation_settings, campaign_metadata 
  -- FROM public.inspection_campaigns;
  
  -- Remove JSON columns
  ALTER TABLE public.inspection_campaigns DROP COLUMN IF EXISTS properties;
  ALTER TABLE public.inspection_campaigns DROP COLUMN IF EXISTS automation_settings;
  ALTER TABLE public.inspection_campaigns DROP COLUMN IF EXISTS campaign_metadata;
  
  RETURN 'JSON columns removed successfully. Campaign data is now fully normalized.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.migrate_campaign_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_campaign_migration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_campaign_json_columns() TO authenticated;

-- =====================================================
-- 9. HELPFUL QUERIES FOR MONITORING
-- =====================================================

-- Query to run the migration
-- SELECT * FROM public.migrate_campaign_data();

-- Query to validate migration results
-- SELECT * FROM public.validate_campaign_migration();

-- Query to see campaign performance after migration
-- SELECT * FROM public.campaign_performance ORDER BY created_at DESC LIMIT 10;

-- Query to check automation settings distribution
-- SELECT 
--   setting_type,
--   setting_key,
--   COUNT(*) as usage_count,
--   COUNT(CASE WHEN is_enabled THEN 1 END) as enabled_count
-- FROM public.campaign_automation_settings
-- GROUP BY setting_type, setting_key
-- ORDER BY setting_type, usage_count DESC;