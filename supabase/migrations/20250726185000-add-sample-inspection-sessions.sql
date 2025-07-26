-- Add sample inspection sessions to demonstrate status system
-- This migration creates sample data for testing the status badges

-- First, get some property IDs (using the first few properties)
DO $$ 
DECLARE
    property_ids UUID[];
    user_id UUID;
BEGIN
    -- Get the first authenticated user (or create a sample one)
    SELECT id INTO user_id FROM auth.users LIMIT 1;
    
    -- If no users exist, we'll use a placeholder UUID
    IF user_id IS NULL THEN
        user_id := gen_random_uuid();
    END IF;
    
    -- Get first 5 property IDs
    SELECT ARRAY(SELECT id FROM public.roofs WHERE is_deleted = false LIMIT 5) INTO property_ids;
    
    -- Create sample inspection sessions with different statuses
    IF array_length(property_ids, 1) >= 1 THEN
        -- Property 1: Scheduled
        INSERT INTO public.inspection_sessions (
            property_id,
            inspector_id,
            session_data,
            status,
            inspection_status,
            last_updated,
            expires_at
        ) VALUES (
            property_ids[1],
            user_id,
            '{"step": "briefing", "notes": [], "photos": []}'::jsonb,
            'active',
            'scheduled',
            now(),
            now() + INTERVAL '7 days'
        ) ON CONFLICT (property_id, inspector_id) DO UPDATE SET
            inspection_status = 'scheduled',
            last_updated = now();
    END IF;
    
    IF array_length(property_ids, 1) >= 2 THEN
        -- Property 2: In Progress
        INSERT INTO public.inspection_sessions (
            property_id,
            inspector_id,
            session_data,
            status,
            inspection_status,
            last_updated,
            expires_at
        ) VALUES (
            property_ids[2],
            user_id,
            '{"step": "inspection", "notes": ["Started roof inspection"], "photos": ["photo1.jpg"]}'::jsonb,
            'active',
            'in_progress',
            now(),
            now() + INTERVAL '7 days'
        ) ON CONFLICT (property_id, inspector_id) DO UPDATE SET
            inspection_status = 'in_progress',
            last_updated = now();
    END IF;
    
    IF array_length(property_ids, 1) >= 3 THEN
        -- Property 3: Ready for Review
        INSERT INTO public.inspection_sessions (
            property_id,
            inspector_id,
            session_data,
            status,
            inspection_status,
            last_updated,
            expires_at
        ) VALUES (
            property_ids[3],
            user_id,
            '{"step": "completed", "notes": ["Inspection completed", "Found minor drainage issues"], "photos": ["photo1.jpg", "photo2.jpg"]}'::jsonb,
            'active',
            'ready_for_review',
            now(),
            now() + INTERVAL '7 days'
        ) ON CONFLICT (property_id, inspector_id) DO UPDATE SET
            inspection_status = 'ready_for_review',
            last_updated = now();
    END IF;
    
    IF array_length(property_ids, 1) >= 4 THEN
        -- Property 4: Completed
        INSERT INTO public.inspection_sessions (
            property_id,
            inspector_id,
            session_data,
            status,
            inspection_status,
            last_updated,
            expires_at
        ) VALUES (
            property_ids[4],
            user_id,
            '{"step": "finalized", "notes": ["Inspection completed and approved"], "photos": ["photo1.jpg", "photo2.jpg", "photo3.jpg"]}'::jsonb,
            'completed',
            'completed',
            now(),
            now() + INTERVAL '90 days'
        ) ON CONFLICT (property_id, inspector_id) DO UPDATE SET
            inspection_status = 'completed',
            last_updated = now();
    END IF;
    
    IF array_length(property_ids, 1) >= 5 THEN
        -- Property 5: Another In Progress
        INSERT INTO public.inspection_sessions (
            property_id,
            inspector_id,
            session_data,
            status,
            inspection_status,
            last_updated,
            expires_at
        ) VALUES (
            property_ids[5],
            user_id,
            '{"step": "inspection", "notes": ["Inspection ongoing"], "photos": []}'::jsonb,
            'active',
            'in_progress',
            now(),
            now() + INTERVAL '7 days'
        ) ON CONFLICT (property_id, inspector_id) DO UPDATE SET
            inspection_status = 'in_progress',
            last_updated = now();
    END IF;
    
END $$;

-- Add some status history entries for the sample sessions
INSERT INTO public.inspection_status_history (
    inspection_session_id,
    previous_status,
    new_status,
    changed_by,
    change_reason,
    created_at
)
SELECT 
    i.id,
    'scheduled'::inspection_status,
    i.inspection_status,
    i.inspector_id,
    'Sample data initialization',
    now() - INTERVAL '1 hour'
FROM public.inspection_sessions i
WHERE i.inspection_status != 'scheduled'
ON CONFLICT DO NOTHING;

-- Add some sample inspections data to the main inspections table as well
INSERT INTO public.inspections (
    roof_id,
    inspector_id,
    scheduled_date,
    completed_date,
    inspection_type,
    status,
    notes,
    weather_conditions,
    created_at
)
SELECT 
    i.property_id,
    i.inspector_id,
    CASE 
        WHEN i.inspection_status = 'scheduled' THEN now() + INTERVAL '3 days'
        WHEN i.inspection_status = 'in_progress' THEN now()
        WHEN i.inspection_status = 'ready_for_review' THEN now() - INTERVAL '1 day'
        WHEN i.inspection_status = 'completed' THEN now() - INTERVAL '3 days'
    END,
    CASE 
        WHEN i.inspection_status = 'completed' THEN now() - INTERVAL '1 day'
        ELSE NULL
    END,
    'Routine Inspection',
    CASE 
        WHEN i.inspection_status = 'completed' THEN 'completed'
        WHEN i.inspection_status = 'in_progress' THEN 'in-progress'
        ELSE 'scheduled'
    END,
    'Sample inspection data for testing status badges',
    CASE 
        WHEN i.inspection_status = 'completed' THEN 'Clear, 65°F'
        WHEN i.inspection_status = 'in_progress' THEN 'Partly Cloudy, 72°F'
        ELSE NULL
    END,
    now()
FROM public.inspection_sessions i
ON CONFLICT DO NOTHING;

-- Add a comment for reference
COMMENT ON MIGRATION IS 'Creates sample inspection session data to demonstrate the status badge system in both the Inspector Interface and main dashboard';