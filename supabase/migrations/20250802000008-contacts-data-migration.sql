-- Phase 4 Data Migration: Extract JSON data from contacts and property_managers
-- This migration safely extracts preferences and settings from contact JSON blobs

-- =====================================================
-- 1. CONTACTS DATA MIGRATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.migrate_contacts_data()
RETURNS TABLE (
  contacts_processed INTEGER,
  managers_processed INTEGER,
  preferences_created INTEGER,
  automations_created INTEGER,
  contact_assignments_created INTEGER,
  errors_encountered INTEGER
) AS $$
DECLARE
  contact_record RECORD;
  manager_record RECORD;
  preference_record RECORD;
  automation_record RECORD;
  
  contacts_count INTEGER := 0;
  managers_count INTEGER := 0;
  preferences_count INTEGER := 0;
  automations_count INTEGER := 0;
  assignments_count INTEGER := 0;
  errors_count INTEGER := 0;
  
BEGIN
  -- =====================================================
  -- 2. MIGRATE CONTACT PREFERENCES
  -- =====================================================
  
  -- Loop through all contacts with metadata
  FOR contact_record IN 
    SELECT 
      id, 
      metadata,
      first_name,
      last_name,
      email,
      office_phone,
      mobile_phone,
      created_at
    FROM public.contacts 
    WHERE metadata IS NOT NULL 
      AND jsonb_typeof(metadata) = 'object'
  LOOP
    BEGIN
      contacts_count := contacts_count + 1;
      
      -- Extract communication preferences
      IF contact_record.metadata ? 'communication_preferences' THEN
        DECLARE
          comm_prefs JSONB := contact_record.metadata->'communication_preferences';
        BEGIN
          -- Preferred contact method
          IF comm_prefs ? 'preferred_method' THEN
            INSERT INTO public.contact_preferences (
              contact_id, preference_type, preference_key, preference_value, is_enabled
            ) VALUES (
              contact_record.id,
              'communication',
              'preferred_method',
              comm_prefs->>'preferred_method',
              true
            );
            preferences_count := preferences_count + 1;
            
            -- Also update the main contacts table
            UPDATE public.contacts SET
              preferred_contact_method = CASE 
                WHEN comm_prefs->>'preferred_method' IN ('email', 'phone', 'sms', 'mail')
                THEN comm_prefs->>'preferred_method'
                ELSE NULL
              END
            WHERE id = contact_record.id;
          END IF;
          
          -- Business hours preference
          IF comm_prefs ? 'business_hours_only' THEN
            INSERT INTO public.contact_preferences (
              contact_id, preference_type, preference_key, preference_value, is_enabled
            ) VALUES (
              contact_record.id,
              'communication',
              'business_hours_only',
              comm_prefs->>'business_hours_only',
              (comm_prefs->>'business_hours_only')::BOOLEAN
            );
            preferences_count := preferences_count + 1;
          END IF;
          
          -- Email frequency
          IF comm_prefs ? 'email_frequency' THEN
            INSERT INTO public.contact_preferences (
              contact_id, preference_type, preference_key, preference_value, is_enabled
            ) VALUES (
              contact_record.id,
              'communication',
              'email_frequency',
              comm_prefs->>'email_frequency',
              true
            );
            preferences_count := preferences_count + 1;
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          errors_count := errors_count + 1;
          RAISE NOTICE 'Error processing communication preferences for contact %: %', contact_record.id, SQLERRM;
        END;
      END IF;
      
      -- Extract scheduling preferences
      IF contact_record.metadata ? 'scheduling_preferences' THEN
        DECLARE
          sched_prefs JSONB := contact_record.metadata->'scheduling_preferences';
        BEGIN
          -- Advance notice days
          IF sched_prefs ? 'advance_notice_days' THEN
            INSERT INTO public.contact_preferences (
              contact_id, preference_type, preference_key, preference_value, is_enabled
            ) VALUES (
              contact_record.id,
              'scheduling',
              'advance_notice_days',
              sched_prefs->>'advance_notice_days',
              true
            );
            preferences_count := preferences_count + 1;
          END IF;
          
          -- Preferred time slots
          IF sched_prefs ? 'preferred_times' THEN
            INSERT INTO public.contact_preferences (
              contact_id, preference_type, preference_key, preference_value, is_enabled
            ) VALUES (
              contact_record.id,
              'scheduling',
              'preferred_times',
              sched_prefs->>'preferred_times',
              true
            );
            preferences_count := preferences_count + 1;
          END IF;
          
          -- Preferred days of week
          IF sched_prefs ? 'preferred_days' THEN
            INSERT INTO public.contact_preferences (
              contact_id, preference_type, preference_key, preference_value, is_enabled
            ) VALUES (
              contact_record.id,
              'scheduling',
              'preferred_days',
              sched_prefs->>'preferred_days',
              true
            );
            preferences_count := preferences_count + 1;
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          errors_count := errors_count + 1;
          RAISE NOTICE 'Error processing scheduling preferences for contact %: %', contact_record.id, SQLERRM;
        END;
      END IF;
      
      -- Extract notification preferences
      IF contact_record.metadata ? 'notification_preferences' THEN
        DECLARE
          notif_prefs JSONB := contact_record.metadata->'notification_preferences';
        BEGIN
          -- Report delivery preference
          IF notif_prefs ? 'report_delivery' THEN
            INSERT INTO public.contact_preferences (
              contact_id, preference_type, preference_key, preference_value, is_enabled
            ) VALUES (
              contact_record.id,
              'notification',
              'report_delivery',
              notif_prefs->>'report_delivery',
              (notif_prefs->>'report_delivery')::BOOLEAN
            );
            preferences_count := preferences_count + 1;
          END IF;
          
          -- Inspection reminders
          IF notif_prefs ? 'inspection_reminders' THEN
            INSERT INTO public.contact_preferences (
              contact_id, preference_type, preference_key, preference_value, is_enabled
            ) VALUES (
              contact_record.id,
              'notification',
              'inspection_reminders',
              notif_prefs->>'inspection_reminders',
              (notif_prefs->>'inspection_reminders')::BOOLEAN
            );
            preferences_count := preferences_count + 1;
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          errors_count := errors_count + 1;
          RAISE NOTICE 'Error processing notification preferences for contact %: %', contact_record.id, SQLERRM;
        END;
      END IF;
      
      -- Extract timezone if present
      IF contact_record.metadata ? 'timezone' THEN
        UPDATE public.contacts SET
          timezone = contact_record.metadata->>'timezone'
        WHERE id = contact_record.id;
      END IF;
      
      -- Create default preferences if none were migrated
      IF NOT EXISTS (SELECT 1 FROM public.contact_preferences WHERE contact_id = contact_record.id) THEN
        PERFORM public.create_default_contact_preferences(contact_record.id);
        preferences_count := preferences_count + 7; -- Default preferences count
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      errors_count := errors_count + 1;
      RAISE NOTICE 'Error processing contact %: %', contact_record.id, SQLERRM;
    END;
  END LOOP;
  
  -- =====================================================
  -- 3. MIGRATE PROPERTY MANAGER AUTOMATION
  -- =====================================================
  
  -- Loop through all property managers with automation settings
  FOR manager_record IN 
    SELECT 
      id, 
      automation_settings,
      contact_preferences,
      company_name,
      created_at
    FROM public.property_managers 
    WHERE automation_settings IS NOT NULL 
      AND jsonb_typeof(automation_settings) = 'object'
  LOOP
    BEGIN
      managers_count := managers_count + 1;
      
      -- Extract auto-scheduling settings
      IF manager_record.automation_settings ? 'auto_schedule' THEN
        DECLARE
          auto_sched JSONB := manager_record.automation_settings->'auto_schedule';
        BEGIN
          IF auto_sched ? 'enabled' THEN
            INSERT INTO public.property_manager_automation (
              manager_id, automation_type, trigger_condition, action_config, is_enabled
            ) VALUES (
              manager_record.id,
              'auto_schedule',
              'inspection_requested',
              jsonb_build_object(
                'auto_assign', auto_sched->>'enabled',
                'preferences', auto_sched
              )::text,
              (auto_sched->>'enabled')::BOOLEAN
            );
            automations_count := automations_count + 1;
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          errors_count := errors_count + 1;
          RAISE NOTICE 'Error processing auto-schedule settings for manager %: %', manager_record.id, SQLERRM;
        END;
      END IF;
      
      -- Extract report generation settings
      IF manager_record.automation_settings ? 'report_generation' THEN
        DECLARE
          report_gen JSONB := manager_record.automation_settings->'report_generation';
        BEGIN
          IF report_gen ? 'frequency' THEN
            INSERT INTO public.property_manager_automation (
              manager_id, automation_type, trigger_condition, action_config, is_enabled
            ) VALUES (
              manager_record.id,
              'report_generation',
              report_gen->>'frequency',
              jsonb_build_object(
                'format', report_gen->>'format',
                'delivery_method', report_gen->>'delivery_method'
              )::text,
              COALESCE((report_gen->>'enabled')::BOOLEAN, true)
            );
            automations_count := automations_count + 1;
            
            -- Update manager report preferences
            UPDATE public.property_managers SET
              preferred_report_format = CASE 
                WHEN report_gen->>'format' IN ('pdf', 'excel', 'email_summary', 'dashboard')
                THEN report_gen->>'format'
                ELSE NULL
              END,
              report_frequency = CASE 
                WHEN report_gen->>'frequency' IN ('daily', 'weekly', 'monthly', 'quarterly', 'on_demand')
                THEN report_gen->>'frequency'
                ELSE NULL
              END
            WHERE id = manager_record.id;
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          errors_count := errors_count + 1;
          RAISE NOTICE 'Error processing report generation settings for manager %: %', manager_record.id, SQLERRM;
        END;
      END IF;
      
      -- Extract follow-up automation
      IF manager_record.automation_settings ? 'follow_up' THEN
        DECLARE
          follow_up JSONB := manager_record.automation_settings->'follow_up';
        BEGIN
          IF follow_up ? 'enabled' THEN
            INSERT INTO public.property_manager_automation (
              manager_id, automation_type, trigger_condition, action_config, is_enabled
            ) VALUES (
              manager_record.id,
              'follow_up',
              COALESCE(follow_up->>'trigger', 'no_response_after_7_days'),
              jsonb_build_object(
                'action', follow_up->>'action',
                'delay_days', follow_up->>'delay_days'
              )::text,
              (follow_up->>'enabled')::BOOLEAN
            );
            automations_count := automations_count + 1;
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          errors_count := errors_count + 1;
          RAISE NOTICE 'Error processing follow-up settings for manager %: %', manager_record.id, SQLERRM;
        END;
      END IF;
      
      -- Extract maintenance alerts
      IF manager_record.automation_settings ? 'maintenance_alerts' THEN
        DECLARE
          maint_alerts JSONB := manager_record.automation_settings->'maintenance_alerts';
        BEGIN
          IF maint_alerts ? 'enabled' THEN
            INSERT INTO public.property_manager_automation (
              manager_id, automation_type, trigger_condition, action_config, is_enabled
            ) VALUES (
              manager_record.id,
              'maintenance_alerts',
              COALESCE(maint_alerts->>'threshold', 'critical_issues_found'),
              jsonb_build_object(
                'alert_method', maint_alerts->>'method',
                'severity_filter', maint_alerts->>'severity'
              )::text,
              (maint_alerts->>'enabled')::BOOLEAN
            );
            automations_count := automations_count + 1;
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          errors_count := errors_count + 1;
          RAISE NOTICE 'Error processing maintenance alerts for manager %: %', manager_record.id, SQLERRM;
        END;
      END IF;
      
      -- Create default automation if none were migrated
      IF NOT EXISTS (SELECT 1 FROM public.property_manager_automation WHERE manager_id = manager_record.id) THEN
        PERFORM public.create_default_manager_automation(manager_record.id);
        automations_count := automations_count + 3; -- Default automations count
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      errors_count := errors_count + 1;
      RAISE NOTICE 'Error processing property manager %: %', manager_record.id, SQLERRM;
    END;
  END LOOP;
  
  -- =====================================================
  -- 4. CREATE MANAGER-CONTACT ASSIGNMENTS
  -- =====================================================
  
  -- Create default contact assignments for managers where applicable
  -- This is based on existing relationships that might be inferred from data
  
  INSERT INTO public.property_manager_contacts (
    manager_id, contact_id, contact_role, is_primary, is_active,
    can_schedule, can_receive_reports
  )
  SELECT DISTINCT
    pm.id as manager_id,
    c.id as contact_id,
    'primary' as contact_role,
    true as is_primary,
    true as is_active,
    true as can_schedule,
    true as can_receive_reports
  FROM public.property_managers pm
  JOIN public.contacts c ON (
    -- Match by email if they share the same company/contact email
    c.email = pm.email OR
    -- Match by company name pattern (simplified)
    (pm.company_name IS NOT NULL AND c.first_name || ' ' || c.last_name ILIKE '%' || pm.contact_name || '%')
  )
  WHERE NOT EXISTS (
    SELECT 1 FROM public.property_manager_contacts pmc
    WHERE pmc.manager_id = pm.id AND pmc.contact_id = c.id
  );
  
  GET DIAGNOSTICS assignments_count = ROW_COUNT;
  
  -- =====================================================
  -- 5. UPDATE STATISTICS
  -- =====================================================
  
  -- Update automation counts for all managers
  UPDATE public.property_managers SET
    automation_count = (
      SELECT COUNT(*)
      FROM public.property_manager_automation pma
      WHERE pma.manager_id = property_managers.id
    ),
    active_automations = (
      SELECT COUNT(*)
      FROM public.property_manager_automation pma
      WHERE pma.manager_id = property_managers.id
        AND pma.is_enabled = true
    )
  WHERE id IN (
    SELECT DISTINCT manager_id FROM public.property_manager_automation
  );
  
  -- Return summary statistics
  RETURN QUERY SELECT 
    contacts_count,
    managers_count,
    preferences_count,
    automations_count,
    assignments_count,
    errors_count;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. VALIDATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_contacts_migration()
RETURNS TABLE (
  metric TEXT,
  original_count BIGINT,
  migrated_count BIGINT,
  difference BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Contacts with metadata' as metric,
    COUNT(*)::BIGINT as original_count,
    (SELECT COUNT(DISTINCT contact_id) FROM public.contact_preferences)::BIGINT as migrated_count,
    (SELECT COUNT(DISTINCT contact_id) FROM public.contact_preferences)::BIGINT - COUNT(*)::BIGINT as difference
  FROM public.contacts 
  WHERE metadata IS NOT NULL 
    AND jsonb_typeof(metadata) = 'object'
    AND metadata != '{}'::jsonb
  
  UNION ALL
  
  SELECT 
    'Property Managers with automation settings' as metric,
    COUNT(*)::BIGINT as original_count,
    (SELECT COUNT(DISTINCT manager_id) FROM public.property_manager_automation)::BIGINT as migrated_count,
    (SELECT COUNT(DISTINCT manager_id) FROM public.property_manager_automation)::BIGINT - COUNT(*)::BIGINT as difference
  FROM public.property_managers 
  WHERE automation_settings IS NOT NULL 
    AND jsonb_typeof(automation_settings) = 'object'
    AND automation_settings != '{}'::jsonb
  
  UNION ALL
  
  SELECT 
    'Contact Preferences' as metric,
    0::BIGINT as original_count,
    COUNT(*)::BIGINT as migrated_count,
    COUNT(*)::BIGINT as difference
  FROM public.contact_preferences
  
  UNION ALL
  
  SELECT 
    'Manager Automations' as metric,
    0::BIGINT as original_count,
    COUNT(*)::BIGINT as migrated_count,
    COUNT(*)::BIGINT as difference
  FROM public.property_manager_automation
  
  UNION ALL
  
  SELECT 
    'Manager-Contact Assignments' as metric,
    0::BIGINT as original_count,
    COUNT(*)::BIGINT as migrated_count,
    COUNT(*)::BIGINT as difference
  FROM public.property_manager_contacts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. CLEANUP FUNCTION (USE WITH CAUTION)
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_contacts_json_columns()
RETURNS TEXT AS $$
BEGIN
  -- This function removes the JSON columns after successful migration
  -- Only run this after validating the migration was successful
  
  -- Remove JSON columns from contacts
  ALTER TABLE public.contacts DROP COLUMN IF EXISTS metadata;
  
  -- Remove JSON columns from property_managers
  ALTER TABLE public.property_managers DROP COLUMN IF EXISTS automation_settings;
  ALTER TABLE public.property_managers DROP COLUMN IF EXISTS contact_preferences;
  
  RETURN 'JSON columns removed successfully. Contact and manager data is now fully normalized.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.migrate_contacts_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_contacts_migration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_contacts_json_columns() TO authenticated;

-- =====================================================
-- 9. HELPFUL QUERIES FOR MONITORING
-- =====================================================

-- Query to run the migration
-- SELECT * FROM public.migrate_contacts_data();

-- Query to validate migration results
-- SELECT * FROM public.validate_contacts_migration();

-- Query to see contact overview after migration
-- SELECT * FROM public.contact_overview ORDER BY response_rate DESC LIMIT 10;

-- Query to see manager performance after migration
-- SELECT * FROM public.manager_performance ORDER BY active_automations DESC LIMIT 10;

-- Query to check preference distribution
-- SELECT 
--   preference_type,
--   preference_key,
--   COUNT(*) as usage_count,
--   COUNT(CASE WHEN is_enabled THEN 1 END) as enabled_count
-- FROM public.contact_preferences
-- GROUP BY preference_type, preference_key
-- ORDER BY preference_type, usage_count DESC;