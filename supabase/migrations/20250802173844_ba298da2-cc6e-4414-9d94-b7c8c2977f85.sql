-- Update get_inspector_inspections function to filter out only review status
CREATE OR REPLACE FUNCTION public.get_inspector_inspections(p_inspector_id uuid)
 RETURNS TABLE(inspection_id uuid, property_id uuid, property_name text, property_address text, city text, state text, roof_type text, roof_area numeric, scheduled_date date, completed_date date, status text, inspection_type text, notes text, session_id uuid, session_status text, session_data jsonb, last_inspection_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as inspection_id,
    r.id as property_id,
    r.property_name,
    r.address as property_address,
    r.city,
    r.state,
    r.roof_type,
    r.roof_area,
    i.scheduled_date,
    i.completed_date,
    i.status,
    i.inspection_type,
    i.notes,
    s.id as session_id,
    s.status as session_status,
    s.session_data,
    r.last_inspection_date
  FROM public.inspections i
  LEFT JOIN public.roofs r ON i.roof_id = r.id
  LEFT JOIN public.inspection_sessions s ON s.property_id = r.id AND s.inspector_id = i.inspector_id
  WHERE i.inspector_id = p_inspector_id
    AND i.status NOT IN ('ready_for_review', 'cancelled')
  ORDER BY i.scheduled_date DESC NULLS LAST, i.created_at DESC;
END;
$function$