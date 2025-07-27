import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/types';

interface PropertyFilters {
  clientId?: string;
  region?: string;
  market?: string;
  zipcodes?: string[];
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

interface QueryPerformanceMetrics {
  queryType: string;
  filters: PropertyFilters;
  executionTimeMs: number;
  rowCount: number;
}

/**
 * Optimized property query builder with caching and performance monitoring
 */
export class PropertyQueryBuilder {
  private static instance: PropertyQueryBuilder;
  private cache: Map<string, { data: Property[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): PropertyQueryBuilder {
    if (!PropertyQueryBuilder.instance) {
      PropertyQueryBuilder.instance = new PropertyQueryBuilder();
    }
    return PropertyQueryBuilder.instance;
  }

  /**
   * Generate cache key from filters
   */
  private getCacheKey(filters: PropertyFilters): string {
    return JSON.stringify({
      clientId: filters.clientId || 'all',
      region: filters.region || 'all',
      market: filters.market || 'all',
      zipcodes: (filters.zipcodes || []).sort().join(','),
      searchTerm: filters.searchTerm || '',
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  /**
   * Log query performance metrics
   */
  private async logPerformance(metrics: QueryPerformanceMetrics): Promise<void> {
    try {
      await supabase.from('query_performance_log').insert({
        query_type: metrics.queryType,
        filters: metrics.filters,
        execution_time_ms: metrics.executionTimeMs,
        row_count: metrics.rowCount
      });
    } catch (error) {
      console.error('Failed to log query performance:', error);
    }
  }

  /**
   * Fetch properties with optimized filtering
   */
  async fetchProperties(filters: PropertyFilters): Promise<{
    data: Property[];
    totalCount: number;
    fromCache: boolean;
  }> {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(filters);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return {
        data: cached.data,
        totalCount: cached.data.length,
        fromCache: true
      };
    }

    try {
      // Use the optimized stored function for complex queries
      if (filters.searchTerm || filters.zipcodes?.length) {
        const { data, error } = await supabase.rpc('search_properties', {
          p_search_term: filters.searchTerm || null,
          p_region: filters.region === 'all' ? null : filters.region,
          p_market: filters.market === 'all' ? null : filters.market,
          p_zipcodes: filters.zipcodes?.length ? filters.zipcodes : null,
          p_client_id: filters.clientId === 'all' ? null : filters.clientId,
          p_limit: filters.limit || 50,
          p_offset: filters.offset || 0
        });

        if (error) throw error;

        const properties = this.transformProperties(data || []);
        const totalCount = data?.[0]?.total_count || 0;

        // Cache the results
        this.cache.set(cacheKey, {
          data: properties,
          timestamp: Date.now()
        });

        // Log performance
        await this.logPerformance({
          queryType: 'search_properties_rpc',
          filters,
          executionTimeMs: performance.now() - startTime,
          rowCount: properties.length
        });

        return {
          data: properties,
          totalCount,
          fromCache: false
        };
      }

      // For simpler queries, use direct Supabase query
      let query = supabase
        .from('roofs')
        .select(`
          id,
          property_name,
          address,
          city,
          state,
          zip,
          market,
          region,
          roof_type,
          roof_area,
          last_inspection_date,
          site_contact_name,
          site_contact_phone,
          roof_access,
          latitude,
          longitude,
          manufacturer_warranty_expiration,
          installer_warranty_expiration,
          client_id,
          status,
          property_manager_name,
          property_manager_email,
          property_manager_phone,
          clients!inner(company_name),
          property_contact_assignments!left(
            assignment_type,
            is_active,
            client_contacts!left(
              id,
              first_name,
              last_name,
              email,
              office_phone,
              mobile_phone,
              role,
              title
            )
          )
        `, { count: 'exact' })
        .eq('status', 'active')
        .eq('is_deleted', false);

      // Apply filters
      if (filters.clientId && filters.clientId !== 'all') {
        query = query.eq('client_id', filters.clientId);
      }
      
      if (filters.region && filters.region !== 'all') {
        query = query.eq('region', filters.region);
      }
      
      if (filters.market && filters.market !== 'all') {
        query = query.eq('market', filters.market);
      }
      
      if (filters.zipcodes && filters.zipcodes.length > 0) {
        query = query.in('zip', filters.zipcodes);
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const properties = this.transformProperties(data || []);

      // Cache the results
      this.cache.set(cacheKey, {
        data: properties,
        timestamp: Date.now()
      });

      // Log performance
      await this.logPerformance({
        queryType: 'direct_query',
        filters,
        executionTimeMs: performance.now() - startTime,
        rowCount: properties.length
      });

      return {
        data: properties,
        totalCount: count || 0,
        fromCache: false
      };
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  }

  /**
   * Fetch available zipcodes based on current filters
   */
  async fetchAvailableZipcodes(filters: {
    region?: string;
    market?: string;
    clientId?: string;
  }): Promise<Array<{ zipcode: string; propertyCount: number }>> {
    try {
      const { data, error } = await supabase.rpc('get_available_zipcodes', {
        p_region: filters.region === 'all' ? null : filters.region,
        p_market: filters.market === 'all' ? null : filters.market,
        p_client_id: filters.clientId === 'all' ? null : filters.clientId
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching available zipcodes:', error);
      return [];
    }
  }

  /**
   * Fetch region/market statistics from materialized view
   */
  async fetchRegionMarketStats(): Promise<Array<{
    region: string;
    market: string;
    propertyCount: number;
    uniqueZipcodes: number;
    uniqueManagers: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from('mv_region_market_stats')
        .select('*')
        .order('region')
        .order('market');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching region/market stats:', error);
      return [];
    }
  }

  /**
   * Transform raw database data to Property type
   */
  private transformProperties(data: any[]): Property[] {
    return data.map(item => ({
      id: item.id,
      property_name: item.property_name,
      address: item.address,
      city: item.city,
      state: item.state,
      zip: item.zip,
      market: item.market || '',
      region: item.region || '',
      roof_type: item.roof_type || '',
      roof_area: item.roof_area || 0,
      last_inspection_date: item.last_inspection_date,
      site_contact_name: item.site_contact_name || '',
      site_contact_phone: item.site_contact_phone || '',
      roof_access: item.roof_access || '',
      latitude: item.latitude,
      longitude: item.longitude,
      manufacturer_warranty_expiration: item.manufacturer_warranty_expiration,
      installer_warranty_expiration: item.installer_warranty_expiration,
      client_id: item.client_id,
      status: item.status,
      property_manager_name: item.property_manager_name || '',
      property_manager_email: item.property_manager_email || '',
      property_manager_phone: item.property_manager_phone || '',
      client_name: item.clients?.company_name || '',
      property_contacts: this.extractPropertyContacts(item.property_contact_assignments || [])
    }));
  }

  /**
   * Extract property contacts from assignments
   */
  private extractPropertyContacts(assignments: any[]): any[] {
    return assignments
      .filter((assignment: any) => assignment.is_active && assignment.client_contacts)
      .map((assignment: any) => ({
        ...assignment.client_contacts,
        assignment_type: assignment.assignment_type
      }));
  }

  /**
   * Clear cache (useful when data is updated)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear specific cache entries by filter criteria
   */
  clearCacheByFilter(filters: Partial<PropertyFilters>): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      const cachedFilters = JSON.parse(key);
      let shouldDelete = false;

      if (filters.clientId && cachedFilters.clientId === filters.clientId) {
        shouldDelete = true;
      }
      if (filters.region && cachedFilters.region === filters.region) {
        shouldDelete = true;
      }
      if (filters.market && cachedFilters.market === filters.market) {
        shouldDelete = true;
      }

      if (shouldDelete) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Export singleton instance
export const propertyQueryBuilder = PropertyQueryBuilder.getInstance();