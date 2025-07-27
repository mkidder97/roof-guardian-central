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
    // Mock performance logging since table doesn't exist yet
    console.log('Query Performance:', {
      type: metrics.queryType,
      time: `${metrics.executionTimeMs.toFixed(2)}ms`,
      rows: metrics.rowCount,
      filters: metrics.filters
    });
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
      // Use direct query since RPC functions don't exist yet
      if (filters.searchTerm || filters.zipcodes?.length) {
        // Build search query manually
        let query = supabase
          .from('roofs')
          .select(`
            id, property_name, address, city, state, zip, market, region,
            roof_type, roof_area, last_inspection_date, site_contact_name,
            site_contact_phone, roof_access, latitude, longitude,
            manufacturer_warranty_expiration, installer_warranty_expiration,
            client_id, status, property_manager_name, property_manager_email,
            property_manager_phone, clients!inner(company_name),
            property_contact_assignments!left(
              assignment_type, is_active,
              client_contacts!left(id, first_name, last_name, email, office_phone, mobile_phone, role, title)
            )
          `, { count: 'exact' })
          .eq('status', 'active')
          .eq('is_deleted', false);

        if (filters.searchTerm) {
          query = query.or(`property_name.ilike.%${filters.searchTerm}%,address.ilike.%${filters.searchTerm}%`);
        }
        if (filters.region && filters.region !== 'all') {
          query = query.eq('region', filters.region);
        }
        if (filters.market && filters.market !== 'all') {
          query = query.eq('market', filters.market);
        }
        if (filters.zipcodes?.length) {
          query = query.in('zip', filters.zipcodes);
        }
        if (filters.clientId && filters.clientId !== 'all') {
          query = query.eq('client_id', filters.clientId);
        }

        if (filters.limit) {
          query = query.limit(filters.limit);
        }
        if (filters.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        const properties = this.transformProperties(data || []);
        const totalCount = count || 0;

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
      // Manual query since RPC doesn't exist yet
      let query = supabase
        .from('roofs')
        .select('zip')
        .eq('status', 'active')
        .eq('is_deleted', false)
        .not('zip', 'is', null);

      if (filters.region && filters.region !== 'all') {
        query = query.eq('region', filters.region);
      }
      if (filters.market && filters.market !== 'all') {
        query = query.eq('market', filters.market);
      }
      if (filters.clientId && filters.clientId !== 'all') {
        query = query.eq('client_id', filters.clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by zipcode and count
      const zipcodeCounts = (data || []).reduce((acc: Record<string, number>, item: any) => {
        if (item.zip) {
          acc[item.zip] = (acc[item.zip] || 0) + 1;
        }
        return acc;
      }, {});

      return Object.entries(zipcodeCounts).map(([zipcode, propertyCount]) => ({
        zipcode,
        propertyCount
      }));
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
      // Manual query since materialized view doesn't exist yet
      const { data, error } = await supabase
        .from('roofs')
        .select('region, market, zip, property_manager_name')
        .eq('status', 'active')
        .eq('is_deleted', false)
        .not('region', 'is', null)
        .not('market', 'is', null);

      if (error) throw error;

      // Group and aggregate data manually
      const stats = (data || []).reduce((acc: Record<string, any>, item: any) => {
        const key = `${item.region}-${item.market}`;
        if (!acc[key]) {
          acc[key] = {
            region: item.region,
            market: item.market,
            propertyCount: 0,
            zipcodes: new Set(),
            managers: new Set()
          };
        }
        acc[key].propertyCount++;
        if (item.zip) acc[key].zipcodes.add(item.zip);
        if (item.property_manager_name) acc[key].managers.add(item.property_manager_name);
        return acc;
      }, {});

      return Object.values(stats).map((stat: any) => ({
        region: stat.region,
        market: stat.market,
        propertyCount: stat.propertyCount,
        uniqueZipcodes: stat.zipcodes.size,
        uniqueManagers: stat.managers.size
      }));
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