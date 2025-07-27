import { useState, useEffect, useCallback } from 'react';
import { propertyQueryBuilder } from '@/lib/supabase/property-queries';
import { Property, PropertyFilters } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface UseOptimizedPropertyQueryResult {
  properties: Property[];
  loading: boolean;
  error: Error | null;
  totalCount: number;
  fromCache: boolean;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

export function useOptimizedPropertyQuery(
  filters: PropertyFilters,
  options?: {
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }
): UseOptimizedPropertyQueryResult {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const { toast } = useToast();

  const fetchProperties = useCallback(async () => {
    if (options?.enabled === false) return;

    setLoading(true);
    setError(null);

    try {
      const result = await propertyQueryBuilder.fetchProperties({
        ...filters,
        limit: options?.limit,
        offset: options?.offset
      });

      setProperties(result.data);
      setTotalCount(result.totalCount);
      setFromCache(result.fromCache);

      if (result.fromCache) {
        console.log('Properties loaded from cache');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch properties');
      setError(error);
      console.error('Error fetching properties:', error);
      
      toast({
        title: "Error",
        description: "Failed to load properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, options?.enabled, options?.limit, options?.offset, toast]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const clearCache = useCallback(() => {
    propertyQueryBuilder.clearCache();
  }, []);

  return {
    properties,
    loading,
    error,
    totalCount,
    fromCache,
    refetch: fetchProperties,
    clearCache
  };
}

interface UseAvailableZipcodesResult {
  zipcodes: Array<{ zipcode: string; propertyCount: number }>;
  loading: boolean;
  error: Error | null;
}

export function useAvailableZipcodes(
  filters: Pick<PropertyFilters, 'region' | 'market' | 'clientId'>
): UseAvailableZipcodesResult {
  const [zipcodes, setZipcodes] = useState<Array<{ zipcode: string; propertyCount: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchZipcodes = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await propertyQueryBuilder.fetchAvailableZipcodes(filters);
        setZipcodes(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch zipcodes');
        setError(error);
        console.error('Error fetching zipcodes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchZipcodes();
  }, [filters.region, filters.market, filters.clientId]);

  return { zipcodes, loading, error };
}

interface UseRegionMarketStatsResult {
  stats: Array<{
    region: string;
    market: string;
    propertyCount: number;
    uniqueZipcodes: number;
    uniqueManagers: number;
  }>;
  loading: boolean;
  error: Error | null;
}

export function useRegionMarketStats(): UseRegionMarketStatsResult {
  const [stats, setStats] = useState<UseRegionMarketStatsResult['stats']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await propertyQueryBuilder.fetchRegionMarketStats();
        setStats(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch stats');
        setError(error);
        console.error('Error fetching region/market stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}