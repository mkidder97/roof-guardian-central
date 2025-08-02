-- Phase 3 Data Migration: Extract JSON data from campaign_groups and property_groups
-- This migration safely extracts property arrays and rules from group JSON blobs

-- =====================================================
-- 1. GROUPS DATA MIGRATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.migrate_groups_data()
RETURNS TABLE (
  campaign_groups_processed INTEGER,
  property_groups_processed INTEGER,
  properties_created INTEGER,
  rules_created INTEGER,
  errors_encountered INTEGER
) AS $$
DECLARE
  group_record RECORD;
  property_record RECORD;
  rule_record RECORD;
  
  campaign_groups_count INTEGER := 0;
  property_groups_count INTEGER := 0;
  properties_count INTEGER := 0;
  rules_count INTEGER := 0;
  errors_count INTEGER := 0;
  
  sequence_order INTEGER;
  
BEGIN
  -- =====================================================
  -- 2. MIGRATE CAMPAIGN_GROUPS PROPERTIES
  -- =====================================================
  
  -- Loop through all campaign_groups with property data
  FOR group_record IN 
    SELECT 
      id, 
      properties, 
      property_sequence,
      rules,
      metadata,
      group_type,
      created_at
    FROM public.campaign_groups 
    WHERE properties IS NOT NULL 
      AND jsonb_typeof(properties) = 'array'
  LOOP
    BEGIN
      campaign_groups_count := campaign_groups_count + 1;
      sequence_order := 1;
      
      -- Extract properties array
      FOR property_record IN 
        SELECT value FROM jsonb_array_elements(group_record.properties)
      LOOP
        BEGIN
          -- Handle both string IDs and object properties
          DECLARE
            property_id UUID;
            assignment_reason TEXT := 'migration';
            assignment_score NUMERIC := NULL;
          BEGIN
            -- Check if it's a simple UUID string or an object
            IF jsonb_typeof(property_record.value) = 'string' THEN
              property_id := (property_record.value #>> '{}')::UUID;
              
              -- Try to determine assignment reason from group type
              assignment_reason := CASE 
                WHEN group_record.group_type = 'geographic' THEN 'geographic'
                WHEN group_record.group_type = 'property_manager' THEN 'property_manager'
                WHEN group_record.group_type = 'seasonal' THEN 'seasonal'
                WHEN group_record.group_type = 'risk_based' THEN 'risk_level'
                ELSE 'manual'
              END;
              
            ELSIF jsonb_typeof(property_record.value) = 'object' THEN
              property_id := (property_record.value->>'id')::UUID;
              assignment_reason := COALESCE(property_record.value->>'reason', assignment_reason);
              
              -- Extract assignment score if present
              IF property_record.value ? 'score' AND 
                 property_record.value->>'score' ~ '^[0-9]+\.?[0-9]*$' THEN
                assignment_score := (property_record.value->>'score')::NUMERIC;
              END IF;
              
            ELSE
              CONTINUE; -- Skip invalid property entries
            END IF;
            
            -- Handle sequence from property_sequence if available
            IF group_record.property_sequence IS NOT NULL AND 
               jsonb_typeof(group_record.property_sequence) = 'array' THEN
              
              -- Try to find this property's position in the sequence
              SELECT pos INTO sequence_order
              FROM (
                SELECT value::text as prop_id, 
                       ROW_NUMBER() OVER () as pos
                FROM jsonb_array_elements(group_record.property_sequence)
              ) seq
              WHERE seq.prop_id = property_id::text;
              
              -- If not found in sequence, use incrementing order
              IF sequence_order IS NULL THEN
                sequence_order := (
                  SELECT COALESCE(MAX(sequence_order), 0) + 1
                  FROM public.group_properties 
                  WHERE group_id = group_record.id
                );
              END IF;
            END IF;
            
            -- Verify the property exists
            IF EXISTS (SELECT 1 FROM public.roofs WHERE id = property_id) THEN
              INSERT INTO public.group_properties (
                group_id,
                roof_id,
                sequence_order,
                assignment_reason,
                assignment_score,
                assigned_at,
                created_at
              ) VALUES (
                group_record.id,
                property_id,
                sequence_order,
                assignment_reason,
                assignment_score,
                group_record.created_at,
                group_record.created_at
              );
              
              properties_count := properties_count + 1;
              sequence_order := sequence_order + 1;
            ELSE
              RAISE NOTICE 'Property % not found in roofs table for group %', property_id, group_record.id;
            END IF;
            
          EXCEPTION WHEN OTHERS THEN
            errors_count := errors_count + 1;
            RAISE NOTICE 'Error processing property for group %: %', group_record.id, SQLERRM;
            CONTINUE;
          END;
        END;
      END LOOP;
      
      -- =====================================================
      -- 3. MIGRATE GROUP RULES
      -- =====================================================
      
      IF group_record.rules IS NOT NULL AND
         jsonb_typeof(group_record.rules) = 'object' THEN
        
        -- Extract rules from the rules object
        FOR rule_record IN 
          SELECT key as rule_name, value as rule_config 
          FROM jsonb_each(group_record.rules)
        LOOP
          BEGIN
            DECLARE
              rule_type TEXT;
              rule_operator TEXT := 'equals';
              rule_field TEXT;
              rule_value TEXT;
              rule_weight NUMERIC := 1.0;
              priority_order INTEGER := 100;
            BEGIN
              -- Parse rule configuration
              IF jsonb_typeof(rule_record.rule_config) = 'object' THEN
                
                -- Extract rule type
                rule_type := COALESCE(
                  rule_record.rule_config->>'type',
                  rule_record.rule_config->>'rule_type',
                  CASE 
                    WHEN rule_record.rule_name ILIKE '%geographic%' THEN 'geographic'
                    WHEN rule_record.rule_name ILIKE '%value%' THEN 'property_value'
                    WHEN rule_record.rule_name ILIKE '%risk%' THEN 'risk_score'
                    WHEN rule_record.rule_name ILIKE '%type%' THEN 'property_type'
                    ELSE 'custom'
                  END
                );
                
                -- Extract operator
                rule_operator := COALESCE(
                  rule_record.rule_config->>'operator',
                  rule_record.rule_config->>'comparison',
                  'equals'
                );
                
                -- Validate operator
                IF rule_operator NOT IN ('equals', 'not_equals', 'greater_than', 'less_than', 
                                       'between', 'in_list', 'not_in_list', 'contains', 
                                       'within_radius', 'regex') THEN
                  rule_operator := 'equals';
                END IF;
                
                -- Extract field
                rule_field := COALESCE(
                  rule_record.rule_config->>'field',
                  rule_record.rule_config->>'property_field',
                  'property_name'
                );
                
                -- Extract value
                rule_value := COALESCE(
                  rule_record.rule_config->>'value',
                  rule_record.rule_config->>'target_value',
                  rule_record.rule_config::text
                );
                
                -- Extract weight
                IF rule_record.rule_config ? 'weight' AND 
                   rule_record.rule_config->>'weight' ~ '^[0-9]+\.?[0-9]*$' THEN
                  rule_weight := (rule_record.rule_config->>'weight')::NUMERIC;
                END IF;
                
                -- Extract priority
                IF rule_record.rule_config ? 'priority' AND 
                   rule_record.rule_config->>'priority' ~ '^[0-9]+$' THEN
                  priority_order := (rule_record.rule_config->>'priority')::INTEGER;
                END IF;
                
              ELSE
                -- Simple rule value
                rule_type := 'custom';
                rule_field := rule_record.rule_name;
                rule_value := rule_record.rule_config::text;
              END IF;
              
              -- Validate required fields
              IF rule_type IS NOT NULL AND rule_field IS NOT NULL AND rule_value IS NOT NULL THEN
                INSERT INTO public.group_rules (
                  group_id,
                  rule_type,
                  rule_operator,
                  rule_field,
                  rule_value,
                  rule_weight,
                  priority_order,
                  created_at
                ) VALUES (
                  group_record.id,
                  rule_type,
                  rule_operator,
                  rule_field,
                  rule_value,
                  rule_weight,
                  priority_order,
                  group_record.created_at
                );
                
                rules_count := rules_count + 1;
              END IF;
              
            EXCEPTION WHEN OTHERS THEN
              errors_count := errors_count + 1;
              RAISE NOTICE 'Error processing rule % for group %: %', 
                          rule_record.rule_name, group_record.id, SQLERRM;
            END;
          END;
        END LOOP;
      END IF;
      
      -- =====================================================
      -- 4. EXTRACT GROUP METADATA
      -- =====================================================
      
      IF group_record.metadata IS NOT NULL AND
         jsonb_typeof(group_record.metadata) = 'object' THEN
        
        -- Extract algorithm type from metadata
        IF group_record.metadata ? 'algorithm_type' THEN
          UPDATE public.campaign_groups SET
            algorithm_type = CASE 
              WHEN group_record.metadata->>'algorithm_type' IN ('manual', 'rule_based', 'geographic', 'optimization', 'hybrid')
              THEN group_record.metadata->>'algorithm_type'
              ELSE 'manual'
            END
          WHERE id = group_record.id;
        END IF;
        
        -- Extract max properties from metadata
        IF group_record.metadata ? 'max_properties' AND 
           group_record.metadata->>'max_properties' ~ '^[0-9]+$' THEN
          UPDATE public.campaign_groups SET
            max_properties = (group_record.metadata->>'max_properties')::INTEGER
          WHERE id = group_record.id;
        END IF;
        
        -- Extract geographic settings
        IF group_record.metadata ? 'geographic_center' THEN
          DECLARE
            center_data JSONB := group_record.metadata->'geographic_center';
          BEGIN
            IF center_data ? 'lat' AND center_data ? 'lng' AND
               center_data->>'lat' ~ '^-?[0-9]+\.?[0-9]*$' AND
               center_data->>'lng' ~ '^-?[0-9]+\.?[0-9]*$' THEN
              
              UPDATE public.campaign_groups SET
                geographic_center = point(
                  (center_data->>'lng')::NUMERIC,
                  (center_data->>'lat')::NUMERIC
                )
              WHERE id = group_record.id;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error processing geographic center for group %', group_record.id;
          END;
        END IF;
        
        -- Extract geographic radius
        IF group_record.metadata ? 'radius_miles' AND 
           group_record.metadata->>'radius_miles' ~ '^[0-9]+\.?[0-9]*$' THEN
          UPDATE public.campaign_groups SET
            geographic_radius_miles = (group_record.metadata->>'radius_miles')::NUMERIC
          WHERE id = group_record.id;
        END IF;
        
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      errors_count := errors_count + 1;
      RAISE NOTICE 'Error processing campaign group %: %', group_record.id, SQLERRM;
    END;
  END LOOP;
  
  -- =====================================================
  -- 5. MIGRATE PROPERTY_GROUPS (IF EXISTS)
  -- =====================================================
  
  -- Check if property_groups table exists and has data
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_groups') THEN
    
    FOR group_record IN 
      SELECT 
        id, 
        properties, 
        metadata,
        created_at
      FROM public.property_groups 
      WHERE properties IS NOT NULL 
        AND jsonb_typeof(properties) = 'array'
    LOOP
      BEGIN
        property_groups_count := property_groups_count + 1;
        sequence_order := 1;
        
        -- Extract properties array for property_groups
        FOR property_record IN 
          SELECT value FROM jsonb_array_elements(group_record.properties)
        LOOP
          BEGIN
            DECLARE
              property_id UUID;
            BEGIN
              -- Handle property ID extraction
              IF jsonb_typeof(property_record.value) = 'string' THEN
                property_id := (property_record.value #>> '{}')::UUID;
              ELSIF jsonb_typeof(property_record.value) = 'object' THEN
                property_id := (property_record.value->>'id')::UUID;
              ELSE
                CONTINUE;
              END IF;
              
              -- Verify the property exists and table exists
              IF EXISTS (SELECT 1 FROM public.roofs WHERE id = property_id) AND
                 EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_group_assignments') THEN
                
                INSERT INTO public.property_group_assignments (
                  property_group_id,
                  roof_id,
                  sequence_order,
                  assignment_reason,
                  created_at
                ) VALUES (
                  group_record.id,
                  property_id,
                  sequence_order,
                  'migration',
                  group_record.created_at
                );
                
                properties_count := properties_count + 1;
                sequence_order := sequence_order + 1;
              END IF;
              
            EXCEPTION WHEN OTHERS THEN
              errors_count := errors_count + 1;
              RAISE NOTICE 'Error processing property for property group %: %', group_record.id, SQLERRM;
              CONTINUE;
            END;
          END;
        END LOOP;
        
      EXCEPTION WHEN OTHERS THEN
        errors_count := errors_count + 1;
        RAISE NOTICE 'Error processing property group %: %', group_record.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  -- =====================================================
  -- 6. UPDATE GROUP STATISTICS
  -- =====================================================
  
  -- Update property and rule counts for all migrated groups
  UPDATE public.campaign_groups SET
    property_count = (
      SELECT COUNT(*)
      FROM public.group_properties gp
      WHERE gp.group_id = campaign_groups.id
        AND gp.is_active = true
    ),
    rule_count = (
      SELECT COUNT(*)
      FROM public.group_rules gr
      WHERE gr.group_id = campaign_groups.id
        AND gr.is_active = true
    ),
    last_executed_at = now()
  WHERE id IN (
    SELECT DISTINCT group_id FROM public.group_properties
  );
  
  -- Return summary statistics
  RETURN QUERY SELECT 
    campaign_groups_count,
    property_groups_count,
    properties_count,
    rules_count,
    errors_count;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. VALIDATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_groups_migration()
RETURNS TABLE (
  metric TEXT,
  original_count BIGINT,
  migrated_count BIGINT,
  difference BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Campaign Groups with properties' as metric,
    COUNT(*)::BIGINT as original_count,
    (SELECT COUNT(DISTINCT group_id) FROM public.group_properties)::BIGINT as migrated_count,
    (SELECT COUNT(DISTINCT group_id) FROM public.group_properties)::BIGINT - COUNT(*)::BIGINT as difference
  FROM public.campaign_groups 
  WHERE properties IS NOT NULL 
    AND jsonb_typeof(properties) = 'array'
    AND jsonb_array_length(properties) > 0
  
  UNION ALL
  
  SELECT 
    'Group Properties' as metric,
    (
      SELECT COALESCE(SUM(jsonb_array_length(properties)), 0)::BIGINT
      FROM public.campaign_groups 
      WHERE properties IS NOT NULL 
        AND jsonb_typeof(properties) = 'array'
    ) as original_count,
    COUNT(*)::BIGINT as migrated_count,
    COUNT(*)::BIGINT - (
      SELECT COALESCE(SUM(jsonb_array_length(properties)), 0)::BIGINT
      FROM public.campaign_groups 
      WHERE properties IS NOT NULL 
        AND jsonb_typeof(properties) = 'array'
    ) as difference
  FROM public.group_properties
  
  UNION ALL
  
  SELECT 
    'Group Rules' as metric,
    0::BIGINT as original_count,
    COUNT(*)::BIGINT as migrated_count,
    COUNT(*)::BIGINT as difference
  FROM public.group_rules;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. CLEANUP FUNCTION (USE WITH CAUTION)
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_groups_json_columns()
RETURNS TEXT AS $$
BEGIN
  -- This function removes the JSON columns after successful migration
  -- Only run this after validating the migration was successful
  
  -- Remove JSON columns from campaign_groups
  ALTER TABLE public.campaign_groups DROP COLUMN IF EXISTS properties;
  ALTER TABLE public.campaign_groups DROP COLUMN IF EXISTS property_sequence;
  ALTER TABLE public.campaign_groups DROP COLUMN IF EXISTS rules;
  ALTER TABLE public.campaign_groups DROP COLUMN IF EXISTS metadata;
  
  -- Remove JSON columns from property_groups if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_groups') THEN
    ALTER TABLE public.property_groups DROP COLUMN IF EXISTS properties;
    ALTER TABLE public.property_groups DROP COLUMN IF EXISTS metadata;
  END IF;
  
  RETURN 'JSON columns removed successfully. Group data is now fully normalized.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.migrate_groups_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_groups_migration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_groups_json_columns() TO authenticated;

-- =====================================================
-- 10. HELPFUL QUERIES FOR MONITORING
-- =====================================================

-- Query to run the migration
-- SELECT * FROM public.migrate_groups_data();

-- Query to validate migration results
-- SELECT * FROM public.validate_groups_migration();

-- Query to see group overview after migration
-- SELECT * FROM public.group_overview ORDER BY property_count DESC LIMIT 10;

-- Query to check rule distribution
-- SELECT 
--   rule_type,
--   rule_operator,
--   COUNT(*) as usage_count,
--   COUNT(CASE WHEN is_active THEN 1 END) as active_count
-- FROM public.group_rules
-- GROUP BY rule_type, rule_operator
-- ORDER BY rule_type, usage_count DESC;