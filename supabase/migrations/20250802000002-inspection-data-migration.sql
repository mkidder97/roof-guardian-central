-- Phase 1 Data Migration: Extract JSON data from inspection_sessions.session_data
-- This migration safely extracts data from existing JSON blobs into normalized tables

-- =====================================================
-- 1. DATA MIGRATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.migrate_inspection_session_data()
RETURNS TABLE (
  sessions_processed INTEGER,
  deficiencies_created INTEGER,
  photos_created INTEGER,
  notes_created INTEGER,
  expenses_created INTEGER,
  errors_encountered INTEGER
) AS $$
DECLARE
  session_record RECORD;
  deficiency_record RECORD;
  photo_record RECORD;
  note_record RECORD;
  expense_record RECORD;
  
  sessions_count INTEGER := 0;
  deficiencies_count INTEGER := 0;
  photos_count INTEGER := 0;
  notes_count INTEGER := 0;
  expenses_count INTEGER := 0;
  errors_count INTEGER := 0;
  
  deficiency_id UUID;
  
BEGIN
  -- Loop through all inspection sessions with JSON data
  FOR session_record IN 
    SELECT id, session_data, inspector_id, created_at 
    FROM public.inspection_sessions 
    WHERE session_data IS NOT NULL 
      AND session_data != '{}'::jsonb
      AND jsonb_typeof(session_data) = 'object'
  LOOP
    BEGIN
      sessions_count := sessions_count + 1;
      
      -- =====================================================
      -- 2. EXTRACT DEFICIENCIES
      -- =====================================================
      
      IF session_record.session_data ? 'deficiencies' AND 
         jsonb_typeof(session_record.session_data->'deficiencies') = 'array' THEN
        
        FOR deficiency_record IN 
          SELECT value FROM jsonb_array_elements(session_record.session_data->'deficiencies')
        LOOP
          BEGIN
            INSERT INTO public.inspection_deficiencies (
              inspection_session_id,
              category,
              description,
              severity,
              location_description,
              estimated_cost,
              priority_level,
              created_at
            ) VALUES (
              session_record.id,
              COALESCE(deficiency_record.value->>'category', 'Other'),
              COALESCE(deficiency_record.value->>'description', 'No description provided'),
              CASE 
                WHEN deficiency_record.value->>'severity' IN ('low', 'medium', 'high', 'critical') 
                THEN deficiency_record.value->>'severity'
                ELSE 'medium'
              END,
              deficiency_record.value->>'location',
              CASE 
                WHEN deficiency_record.value->>'estimated_cost' ~ '^[0-9]+\.?[0-9]*$'
                THEN (deficiency_record.value->>'estimated_cost')::numeric
                ELSE NULL
              END,
              CASE 
                WHEN deficiency_record.value->>'priority' IN ('low', 'medium', 'high', 'urgent')
                THEN deficiency_record.value->>'priority'
                ELSE 'medium'
              END,
              session_record.created_at
            ) RETURNING id INTO deficiency_id;
            
            deficiencies_count := deficiencies_count + 1;
            
            -- =====================================================
            -- 3. EXTRACT DEFICIENCY-RELATED PHOTOS
            -- =====================================================
            
            IF deficiency_record.value ? 'photos' AND 
               jsonb_typeof(deficiency_record.value->'photos') = 'array' THEN
              
              FOR photo_record IN 
                SELECT value FROM jsonb_array_elements(deficiency_record.value->'photos')
              LOOP
                BEGIN
                  INSERT INTO public.inspection_photos (
                    inspection_session_id,
                    deficiency_id,
                    photo_type,
                    file_url,
                    storage_path,
                    caption,
                    metadata,
                    created_at
                  ) VALUES (
                    session_record.id,
                    deficiency_id,
                    'deficiency',
                    COALESCE(photo_record.value->>'url', photo_record.value->>'path', ''),
                    COALESCE(photo_record.value->>'path', photo_record.value->>'url', ''),
                    photo_record.value->>'caption',
                    CASE 
                      WHEN photo_record.value ? 'metadata' 
                      THEN photo_record.value->'metadata'
                      ELSE '{}'::jsonb
                    END,
                    session_record.created_at
                  );
                  
                  photos_count := photos_count + 1;
                  
                EXCEPTION WHEN OTHERS THEN
                  errors_count := errors_count + 1;
                  RAISE NOTICE 'Error inserting deficiency photo for session %: %', session_record.id, SQLERRM;
                END;
              END LOOP;
            END IF;
            
          EXCEPTION WHEN OTHERS THEN
            errors_count := errors_count + 1;
            RAISE NOTICE 'Error inserting deficiency for session %: %', session_record.id, SQLERRM;
          END;
        END LOOP;
      END IF;
      
      -- =====================================================
      -- 4. EXTRACT GENERAL PHOTOS
      -- =====================================================
      
      IF session_record.session_data ? 'photos' AND 
         jsonb_typeof(session_record.session_data->'photos') = 'array' THEN
        
        FOR photo_record IN 
          SELECT value FROM jsonb_array_elements(session_record.session_data->'photos')
        LOOP
          BEGIN
            INSERT INTO public.inspection_photos (
              inspection_session_id,
              deficiency_id,
              photo_type,
              file_url,
              storage_path,
              caption,
              metadata,
              created_at
            ) VALUES (
              session_record.id,
              NULL, -- General photos not linked to specific deficiencies
              COALESCE(photo_record.value->>'type', 'general'),
              COALESCE(photo_record.value->>'url', photo_record.value->>'path', ''),
              COALESCE(photo_record.value->>'path', photo_record.value->>'url', ''),
              photo_record.value->>'caption',
              CASE 
                WHEN photo_record.value ? 'metadata' 
                THEN photo_record.value->'metadata'
                ELSE '{}'::jsonb
              END,
              session_record.created_at
            );
            
            photos_count := photos_count + 1;
            
          EXCEPTION WHEN OTHERS THEN
            errors_count := errors_count + 1;
            RAISE NOTICE 'Error inserting general photo for session %: %', session_record.id, SQLERRM;
          END;
        END LOOP;
      END IF;
      
      -- =====================================================
      -- 5. EXTRACT NOTES
      -- =====================================================
      
      IF session_record.session_data ? 'notes' THEN
        
        -- Handle both array of notes and simple text notes
        IF jsonb_typeof(session_record.session_data->'notes') = 'array' THEN
          FOR note_record IN 
            SELECT value FROM jsonb_array_elements(session_record.session_data->'notes')
          LOOP
            BEGIN
              INSERT INTO public.inspection_notes (
                inspection_session_id,
                note_type,
                content,
                inspector_id,
                created_at
              ) VALUES (
                session_record.id,
                COALESCE(note_record.value->>'type', 'general'),
                COALESCE(note_record.value->>'content', note_record.value::text, ''),
                session_record.inspector_id,
                session_record.created_at
              );
              
              notes_count := notes_count + 1;
              
            EXCEPTION WHEN OTHERS THEN
              errors_count := errors_count + 1;
              RAISE NOTICE 'Error inserting note for session %: %', session_record.id, SQLERRM;
            END;
          END LOOP;
          
        ELSIF jsonb_typeof(session_record.session_data->'notes') = 'string' THEN
          -- Handle simple string notes
          INSERT INTO public.inspection_notes (
            inspection_session_id,
            note_type,
            content,
            inspector_id,
            created_at
          ) VALUES (
            session_record.id,
            'general',
            session_record.session_data->>'notes',
            session_record.inspector_id,
            session_record.created_at
          );
          
          notes_count := notes_count + 1;
        END IF;
      END IF;
      
      -- =====================================================
      -- 6. EXTRACT CAPITAL EXPENSES
      -- =====================================================
      
      IF session_record.session_data ? 'capital_expenses' AND 
         jsonb_typeof(session_record.session_data->'capital_expenses') = 'array' THEN
        
        FOR expense_record IN 
          SELECT value FROM jsonb_array_elements(session_record.session_data->'capital_expenses')
        LOOP
          BEGIN
            INSERT INTO public.inspection_capital_expenses (
              inspection_session_id,
              expense_category,
              description,
              estimated_cost,
              priority,
              recommended_timeline,
              created_at
            ) VALUES (
              session_record.id,
              COALESCE(expense_record.value->>'category', 'Preventive Maintenance'),
              COALESCE(expense_record.value->>'description', 'No description provided'),
              CASE 
                WHEN expense_record.value->>'estimated_cost' ~ '^[0-9]+\.?[0-9]*$'
                THEN (expense_record.value->>'estimated_cost')::numeric
                ELSE 0
              END,
              CASE 
                WHEN expense_record.value->>'priority' IN ('low', 'medium', 'high', 'critical')
                THEN expense_record.value->>'priority'
                ELSE 'medium'
              END,
              expense_record.value->>'timeline',
              session_record.created_at
            );
            
            expenses_count := expenses_count + 1;
            
          EXCEPTION WHEN OTHERS THEN
            errors_count := errors_count + 1;
            RAISE NOTICE 'Error inserting capital expense for session %: %', session_record.id, SQLERRM;
          END;
        END LOOP;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      errors_count := errors_count + 1;
      RAISE NOTICE 'Error processing session %: %', session_record.id, SQLERRM;
    END;
  END LOOP;
  
  -- Return summary statistics
  RETURN QUERY SELECT 
    sessions_count,
    deficiencies_count,
    photos_count,
    notes_count,
    expenses_count,
    errors_count;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. VALIDATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_inspection_migration()
RETURNS TABLE (
  metric TEXT,
  original_count BIGINT,
  migrated_count BIGINT,
  difference BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH migration_stats AS (
    SELECT 
      'Sessions with JSON data' as metric,
      COUNT(*) as original_count,
      (SELECT COUNT(*) FROM public.inspection_deficiencies) +
      (SELECT COUNT(*) FROM public.inspection_photos) +
      (SELECT COUNT(*) FROM public.inspection_notes) +
      (SELECT COUNT(*) FROM public.inspection_capital_expenses) as migrated_count
    FROM public.inspection_sessions 
    WHERE session_data IS NOT NULL 
      AND session_data != '{}'::jsonb
      AND jsonb_typeof(session_data) = 'object'
  )
  SELECT 
    ms.metric,
    ms.original_count,
    ms.migrated_count,
    ms.migrated_count - ms.original_count as difference
  FROM migration_stats ms
  
  UNION ALL
  
  SELECT 
    'Inspection Deficiencies' as metric,
    0::bigint as original_count,
    COUNT(*) as migrated_count,
    COUNT(*) as difference
  FROM public.inspection_deficiencies
  
  UNION ALL
  
  SELECT 
    'Inspection Photos' as metric,
    0::bigint as original_count,
    COUNT(*) as migrated_count,
    COUNT(*) as difference
  FROM public.inspection_photos
  
  UNION ALL
  
  SELECT 
    'Inspection Notes' as metric,
    0::bigint as original_count,
    COUNT(*) as migrated_count,
    COUNT(*) as difference
  FROM public.inspection_notes
  
  UNION ALL
  
  SELECT 
    'Capital Expenses' as metric,
    0::bigint as original_count,
    COUNT(*) as migrated_count,
    COUNT(*) as difference
  FROM public.inspection_capital_expenses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.migrate_inspection_session_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_inspection_migration() TO authenticated;

-- =====================================================
-- 9. HELPFUL QUERIES FOR MONITORING
-- =====================================================

-- Query to check migration progress
-- SELECT * FROM public.migrate_inspection_session_data();

-- Query to validate migration results
-- SELECT * FROM public.validate_inspection_migration();

-- Query to see sample migrated data
-- SELECT 
--   s.id as session_id,
--   COUNT(d.id) as deficiencies,
--   COUNT(p.id) as photos,
--   COUNT(n.id) as notes,
--   COUNT(ce.id) as capital_expenses
-- FROM public.inspection_sessions s
-- LEFT JOIN public.inspection_deficiencies d ON s.id = d.inspection_session_id
-- LEFT JOIN public.inspection_photos p ON s.id = p.inspection_session_id
-- LEFT JOIN public.inspection_notes n ON s.id = n.inspection_session_id
-- LEFT JOIN public.inspection_capital_expenses ce ON s.id = ce.inspection_session_id
-- GROUP BY s.id
-- ORDER BY s.created_at DESC
-- LIMIT 10;