-- Fix campaign creation issues
-- Add missing generate_campaign_name RPC function

CREATE OR REPLACE FUNCTION public.generate_campaign_name(
  p_market TEXT DEFAULT 'Multi-Market',
  p_inspection_type TEXT DEFAULT 'annual',
  p_total_properties INTEGER DEFAULT 0
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  campaign_name TEXT;
  inspection_type_formatted TEXT;
BEGIN
  -- Format inspection type for display
  inspection_type_formatted := CASE
    WHEN p_inspection_type = 'annual' THEN 'Annual'
    WHEN p_inspection_type = 'preventative' THEN 'Preventative'
    WHEN p_inspection_type = 'emergency' THEN 'Emergency'
    ELSE INITCAP(p_inspection_type)
  END;
  
  -- Generate campaign name with format: "Market - Type Campaign - Count Properties (Date)"
  campaign_name := format(
    '%s - %s Campaign - %s Properties (%s)',
    COALESCE(p_market, 'Multi-Market'),
    inspection_type_formatted,
    p_total_properties,
    to_char(now(), 'MM/DD/YYYY')
  );
  
  RETURN campaign_name;
END;
$$;

-- Add function to generate unique campaign IDs
CREATE OR REPLACE FUNCTION public.generate_campaign_id() RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  campaign_id TEXT;
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  -- Generate timestamp part (milliseconds since epoch)
  timestamp_part := extract(epoch from now() * 1000)::bigint::text;
  
  -- Generate random alphanumeric part (8 characters)
  random_part := upper(substring(md5(random()::text) from 1 for 8));
  
  -- Combine parts: CAMP-{timestamp}-{random}
  campaign_id := format('CAMP-%s-%s', timestamp_part, random_part);
  
  RETURN campaign_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_campaign_name(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_campaign_id() TO authenticated;
