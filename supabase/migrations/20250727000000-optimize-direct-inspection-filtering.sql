-- Migration: Optimize database for Direct Inspection Mode filtering
-- Purpose: Add indexes and optimize queries for comprehensive property filtering
-- Date: 2025-07-27

-- 1. Add missing indexes for efficient filtering
-- These are critical for performance with 288+ properties

-- Zipcode index (most commonly filtered field)
CREATE INDEX IF NOT EXISTS idx_roofs_zip ON public.roofs(zip);

-- Property status index (active/inactive filtering)
CREATE INDEX IF NOT EXISTS idx_roofs_status ON public.roofs(status);

-- Deleted flag index (exclude deleted properties)
CREATE INDEX IF NOT EXISTS idx_roofs_is_deleted ON public.roofs(is_deleted);

-- Property manager assignment indexes
CREATE INDEX IF NOT EXISTS idx_roofs_property_manager_name ON public.roofs(property_manager_name);
CREATE INDEX IF NOT EXISTS idx_roofs_property_manager_email ON public.roofs(property_manager_email);

-- Composite indexes for common filter combinations
-- Region + Market + Status (most common filter pattern)
CREATE INDEX IF NOT EXISTS idx_roofs_region_market_status 
  ON public.roofs(region, market, status) 
  WHERE is_deleted = false;

-- Client + Region + Market (for client-specific queries)
CREATE INDEX IF NOT EXISTS idx_roofs_client_region_market 
  ON public.roofs(client_id, region, market) 
  WHERE status = 'active' AND is_deleted = false;

-- Zipcode array operations (for IN queries)
CREATE INDEX IF NOT EXISTS idx_roofs_zip_btree 
  ON public.roofs USING btree(zip) 
  WHERE status = 'active' AND is_deleted = false;

-- 2. Add GIN index for full-text search on property names and addresses
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_roofs_property_name_trgm 
  ON public.roofs USING gin(property_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_roofs_address_trgm 
  ON public.roofs USING gin(address gin_trgm_ops);

-- 3. Create materialized view for region/market statistics
-- This will speed up loading available regions/markets
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_region_market_stats AS
SELECT 
  region,
  market,
  COUNT(*) as property_count,
  COUNT(DISTINCT zip) as unique_zipcodes,
  COUNT(DISTINCT property_manager_name) as unique_managers
FROM roofs
WHERE status = 'active' 
  AND is_deleted = false
GROUP BY region, market
ORDER BY region, market;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_region_market_stats_region 
  ON mv_region_market_stats(region);
CREATE INDEX IF NOT EXISTS idx_mv_region_market_stats_market 
  ON mv_region_market_stats(market);

-- 4. Create function to efficiently get available zipcodes for filtering
CREATE OR REPLACE FUNCTION get_available_zipcodes(
  p_region TEXT DEFAULT NULL,
  p_market TEXT DEFAULT NULL,
  p_client_id UUID DEFAULT NULL
)
RETURNS TABLE (zipcode TEXT, property_count INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    zip as zipcode,
    COUNT(*)::INTEGER as property_count
  FROM roofs
  WHERE status = 'active' 
    AND is_deleted = false
    AND (p_region IS NULL OR p_region = 'all' OR region = p_region)
    AND (p_market IS NULL OR p_market = 'all' OR market = p_market)
    AND (p_client_id IS NULL OR client_id = p_client_id)
  GROUP BY zip
  HAVING zip IS NOT NULL
  ORDER BY zip;
END;
$$;

-- 5. Create function for optimized property search with filtering
CREATE OR REPLACE FUNCTION search_properties(
  p_search_term TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_market TEXT DEFAULT NULL,
  p_zipcodes TEXT[] DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  property_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  market TEXT,
  region TEXT,
  property_manager_name TEXT,
  property_manager_email TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_search_pattern TEXT;
BEGIN
  -- Prepare search pattern for ILIKE
  v_search_pattern := '%' || COALESCE(p_search_term, '') || '%';
  
  RETURN QUERY
  WITH filtered_properties AS (
    SELECT 
      r.id,
      r.property_name,
      r.address,
      r.city,
      r.state,
      r.zip,
      r.market,
      r.region,
      r.property_manager_name,
      r.property_manager_email,
      COUNT(*) OVER() as total_count
    FROM roofs r
    WHERE r.status = 'active' 
      AND r.is_deleted = false
      AND (p_region IS NULL OR p_region = 'all' OR r.region = p_region)
      AND (p_market IS NULL OR p_market = 'all' OR r.market = p_market)
      AND (p_zipcodes IS NULL OR array_length(p_zipcodes, 1) = 0 OR r.zip = ANY(p_zipcodes))
      AND (p_client_id IS NULL OR r.client_id = p_client_id)
      AND (
        p_search_term IS NULL OR p_search_term = '' OR (
          r.property_name ILIKE v_search_pattern OR
          r.address ILIKE v_search_pattern OR
          r.city ILIKE v_search_pattern OR
          r.market ILIKE v_search_pattern OR
          r.region ILIKE v_search_pattern OR
          r.property_manager_name ILIKE v_search_pattern
        )
      )
    ORDER BY r.property_name
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT * FROM filtered_properties;
END;
$$;

-- 6. Add table for caching filter combinations
-- This helps with frequently used filter combinations
CREATE TABLE IF NOT EXISTS filter_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  region TEXT,
  market TEXT,
  zipcodes TEXT[],
  client_id UUID,
  property_count INTEGER NOT NULL,
  properties JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '15 minutes')
);

CREATE INDEX IF NOT EXISTS idx_filter_cache_key ON filter_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_filter_cache_expires_at ON filter_cache(expires_at);

-- 7. Create function to manage filter cache
CREATE OR REPLACE FUNCTION manage_filter_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Clear cache entries when properties are modified
  DELETE FROM filter_cache WHERE expires_at < now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to invalidate cache on property changes
CREATE TRIGGER invalidate_filter_cache_on_update
  AFTER UPDATE ON roofs
  FOR EACH STATEMENT
  EXECUTE FUNCTION manage_filter_cache();

CREATE TRIGGER invalidate_filter_cache_on_insert
  AFTER INSERT ON roofs
  FOR EACH STATEMENT
  EXECUTE FUNCTION manage_filter_cache();

CREATE TRIGGER invalidate_filter_cache_on_delete
  AFTER DELETE ON roofs
  FOR EACH STATEMENT
  EXECUTE FUNCTION manage_filter_cache();

-- 8. Add function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_region_market_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_region_market_stats;
END;
$$ LANGUAGE plpgsql;

-- 9. Performance monitoring table
CREATE TABLE IF NOT EXISTS query_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_type TEXT NOT NULL,
  filters JSONB,
  execution_time_ms NUMERIC,
  row_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_performance_log_created_at 
  ON query_performance_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_log_query_type 
  ON query_performance_log(query_type);

-- 10. Grant permissions
GRANT SELECT ON mv_region_market_stats TO authenticated;
GRANT SELECT, INSERT, DELETE ON filter_cache TO authenticated;
GRANT SELECT, INSERT ON query_performance_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_zipcodes TO authenticated;
GRANT EXECUTE ON FUNCTION search_properties TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_region_market_stats TO authenticated;

-- 11. Initial data population
REFRESH MATERIALIZED VIEW mv_region_market_stats;

-- Add comment for documentation
COMMENT ON MATERIALIZED VIEW mv_region_market_stats IS 'Cached statistics for region/market combinations to speed up filter loading';
COMMENT ON FUNCTION get_available_zipcodes IS 'Efficiently retrieve available zipcodes based on current filter criteria';
COMMENT ON FUNCTION search_properties IS 'Optimized property search with support for complex filtering and pagination';
COMMENT ON TABLE filter_cache IS 'Short-term cache for frequently used filter combinations to improve performance';