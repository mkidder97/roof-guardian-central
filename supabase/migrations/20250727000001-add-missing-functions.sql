-- Migration: Add missing database functions and procedures
-- Purpose: Ensure all required functions exist for the application
-- Date: 2025-07-27

-- 1. Function to efficiently count properties by various criteria
CREATE OR REPLACE FUNCTION count_properties_by_criteria(
  p_group_by TEXT DEFAULT 'region', -- 'region', 'market', 'manager', 'status'
  p_client_id UUID DEFAULT NULL,
  p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  group_key TEXT,
  property_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  CASE p_group_by
    WHEN 'region' THEN
      SELECT 
        COALESCE(region, 'Unknown') as group_key,
        COUNT(*) as property_count
      FROM roofs
      WHERE (p_client_id IS NULL OR client_id = p_client_id)
        AND (p_include_inactive OR status = 'active')
        AND is_deleted = false
      GROUP BY region
      ORDER BY region
      
    WHEN 'market' THEN
      SELECT 
        COALESCE(market, 'Unknown') as group_key,
        COUNT(*) as property_count
      FROM roofs
      WHERE (p_client_id IS NULL OR client_id = p_client_id)
        AND (p_include_inactive OR status = 'active')
        AND is_deleted = false
      GROUP BY market
      ORDER BY market
      
    WHEN 'manager' THEN
      SELECT 
        COALESCE(property_manager_name, 'Unassigned') as group_key,
        COUNT(*) as property_count
      FROM roofs
      WHERE (p_client_id IS NULL OR client_id = p_client_id)
        AND (p_include_inactive OR status = 'active')
        AND is_deleted = false
      GROUP BY property_manager_name
      ORDER BY property_manager_name
      
    WHEN 'status' THEN
      SELECT 
        COALESCE(status, 'Unknown') as group_key,
        COUNT(*) as property_count
      FROM roofs
      WHERE (p_client_id IS NULL OR client_id = p_client_id)
        AND is_deleted = false
      GROUP BY status
      ORDER BY status
      
    ELSE
      SELECT 
        'Total' as group_key,
        COUNT(*) as property_count
      FROM roofs
      WHERE (p_client_id IS NULL OR client_id = p_client_id)
        AND (p_include_inactive OR status = 'active')
        AND is_deleted = false
  END CASE;
END;
$$;

-- 2. Function to get property filter options dynamically
CREATE OR REPLACE FUNCTION get_property_filter_options(
  p_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
  regions TEXT[],
  markets TEXT[],
  managers TEXT[],
  statuses TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ARRAY_AGG(DISTINCT region ORDER BY region) FILTER (WHERE region IS NOT NULL) as regions,
    ARRAY_AGG(DISTINCT market ORDER BY market) FILTER (WHERE market IS NOT NULL) as markets,
    ARRAY_AGG(DISTINCT property_manager_name ORDER BY property_manager_name) FILTER (WHERE property_manager_name IS NOT NULL) as managers,
    ARRAY_AGG(DISTINCT status ORDER BY status) FILTER (WHERE status IS NOT NULL) as statuses
  FROM roofs
  WHERE (p_client_id IS NULL OR client_id = p_client_id)
    AND is_deleted = false;
END;
$$;

-- 3. Function to validate and clean property data
CREATE OR REPLACE FUNCTION validate_property_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure required fields are not null
  IF NEW.property_name IS NULL OR NEW.property_name = '' THEN
    RAISE EXCEPTION 'Property name is required';
  END IF;
  
  IF NEW.address IS NULL OR NEW.address = '' THEN
    RAISE EXCEPTION 'Address is required';
  END IF;
  
  -- Standardize text fields
  NEW.property_name = TRIM(NEW.property_name);
  NEW.address = TRIM(NEW.address);
  NEW.city = TRIM(NEW.city);
  NEW.state = UPPER(TRIM(NEW.state));
  NEW.zip = TRIM(NEW.zip);
  
  -- Standardize region and market
  IF NEW.region IS NOT NULL THEN
    NEW.region = TRIM(NEW.region);
  END IF;
  
  IF NEW.market IS NOT NULL THEN
    NEW.market = TRIM(NEW.market);
  END IF;
  
  -- Validate email format if provided
  IF NEW.property_manager_email IS NOT NULL AND NEW.property_manager_email != '' THEN
    IF NOT NEW.property_manager_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format for property manager';
    END IF;
  END IF;
  
  -- Set default status if not provided
  IF NEW.status IS NULL THEN
    NEW.status = 'active';
  END IF;
  
  -- Set is_deleted to false if not provided
  IF NEW.is_deleted IS NULL THEN
    NEW.is_deleted = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for property validation
DROP TRIGGER IF EXISTS validate_property_data_trigger ON roofs;
CREATE TRIGGER validate_property_data_trigger
  BEFORE INSERT OR UPDATE ON roofs
  FOR EACH ROW
  EXECUTE FUNCTION validate_property_data();

-- 4. Function to bulk update property managers
CREATE OR REPLACE FUNCTION bulk_update_property_managers(
  p_property_ids UUID[],
  p_manager_name TEXT,
  p_manager_email TEXT,
  p_manager_phone TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE roofs
  SET 
    property_manager_name = p_manager_name,
    property_manager_email = p_manager_email,
    property_manager_phone = p_manager_phone,
    updated_at = NOW()
  WHERE id = ANY(p_property_ids)
    AND is_deleted = false;
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to get property inspection history
CREATE OR REPLACE FUNCTION get_property_inspection_history(
  p_property_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  inspection_id UUID,
  inspection_date DATE,
  inspection_type TEXT,
  status TEXT,
  inspector_name TEXT,
  findings_summary TEXT,
  priority_level TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as inspection_id,
    COALESCE(i.completed_date, i.scheduled_date) as inspection_date,
    i.inspection_type,
    i.status,
    u.first_name || ' ' || u.last_name as inspector_name,
    LEFT(ir.findings, 200) as findings_summary,
    ir.priority_level
  FROM inspections i
  LEFT JOIN users u ON i.inspector_id = u.id
  LEFT JOIN inspection_reports ir ON ir.inspection_id = i.id
  WHERE i.roof_id = p_property_id
  ORDER BY COALESCE(i.completed_date, i.scheduled_date) DESC
  LIMIT p_limit;
END;
$$;

-- 6. Function to calculate property risk scores
CREATE OR REPLACE FUNCTION calculate_property_risk_score(
  p_property_id UUID
)
RETURNS TABLE (
  risk_score NUMERIC,
  risk_level TEXT,
  risk_factors JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_roof_age INTEGER;
  v_days_since_inspection INTEGER;
  v_warranty_expired BOOLEAN;
  v_recent_issues INTEGER;
  v_score NUMERIC := 0;
  v_factors JSONB := '{}';
BEGIN
  -- Get property data
  SELECT 
    EXTRACT(YEAR FROM age(CURRENT_DATE, install_date))::INTEGER,
    EXTRACT(DAY FROM age(CURRENT_DATE, last_inspection_date))::INTEGER,
    CASE 
      WHEN manufacturer_warranty_expiration < CURRENT_DATE 
        OR installer_warranty_expiration < CURRENT_DATE 
      THEN true 
      ELSE false 
    END
  INTO v_roof_age, v_days_since_inspection, v_warranty_expired
  FROM roofs
  WHERE id = p_property_id;
  
  -- Get recent inspection issues
  SELECT COUNT(*)
  INTO v_recent_issues
  FROM inspection_reports ir
  JOIN inspections i ON ir.inspection_id = i.id
  WHERE i.roof_id = p_property_id
    AND i.completed_date > CURRENT_DATE - INTERVAL '1 year'
    AND ir.priority_level IN ('high', 'critical');
  
  -- Calculate risk score
  -- Roof age factor (0-30 points)
  IF v_roof_age > 20 THEN
    v_score := v_score + 30;
    v_factors := v_factors || jsonb_build_object('roof_age', 'Very old (20+ years)');
  ELSIF v_roof_age > 15 THEN
    v_score := v_score + 20;
    v_factors := v_factors || jsonb_build_object('roof_age', 'Old (15-20 years)');
  ELSIF v_roof_age > 10 THEN
    v_score := v_score + 10;
    v_factors := v_factors || jsonb_build_object('roof_age', 'Aging (10-15 years)');
  ELSE
    v_factors := v_factors || jsonb_build_object('roof_age', 'Relatively new');
  END IF;
  
  -- Inspection recency factor (0-25 points)
  IF v_days_since_inspection > 365 THEN
    v_score := v_score + 25;
    v_factors := v_factors || jsonb_build_object('inspection_overdue', 'Overdue (>1 year)');
  ELSIF v_days_since_inspection > 270 THEN
    v_score := v_score + 15;
    v_factors := v_factors || jsonb_build_object('inspection_due', 'Due soon');
  ELSE
    v_factors := v_factors || jsonb_build_object('inspection_current', 'Up to date');
  END IF;
  
  -- Warranty factor (0-20 points)
  IF v_warranty_expired THEN
    v_score := v_score + 20;
    v_factors := v_factors || jsonb_build_object('warranty', 'Expired');
  ELSE
    v_factors := v_factors || jsonb_build_object('warranty', 'Active');
  END IF;
  
  -- Recent issues factor (0-25 points)
  IF v_recent_issues > 3 THEN
    v_score := v_score + 25;
    v_factors := v_factors || jsonb_build_object('recent_issues', 'Multiple critical issues');
  ELSIF v_recent_issues > 1 THEN
    v_score := v_score + 15;
    v_factors := v_factors || jsonb_build_object('recent_issues', 'Some critical issues');
  ELSIF v_recent_issues = 1 THEN
    v_score := v_score + 10;
    v_factors := v_factors || jsonb_build_object('recent_issues', 'One critical issue');
  ELSE
    v_factors := v_factors || jsonb_build_object('recent_issues', 'No critical issues');
  END IF;
  
  -- Determine risk level
  RETURN QUERY
  SELECT 
    v_score,
    CASE 
      WHEN v_score >= 70 THEN 'critical'
      WHEN v_score >= 50 THEN 'high'
      WHEN v_score >= 30 THEN 'medium'
      ELSE 'low'
    END,
    v_factors;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION count_properties_by_criteria TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_filter_options TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_property_managers TO authenticated;
GRANT EXECUTE ON FUNCTION get_property_inspection_history TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_property_risk_score TO authenticated;