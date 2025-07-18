import { supabase } from "@/integrations/supabase/client";

export interface Property {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  property_manager_name?: string;
  property_manager_email?: string;
  property_manager_phone?: string;
  roof_area?: number;
  last_inspection_date?: string;
  warranty_expiration?: string;
  market?: string;
  region?: string;
  client_id?: string;
  roof_rating?: number;
  safety_concerns?: boolean;
  customer_sensitivity?: string;
}

export interface PropertyGroup {
  id: string;
  name: string;
  group_type: 'geographic' | 'property_manager' | 'seasonal' | 'risk_based' | 'custom';
  properties: Property[];
  metadata: {
    center_lat?: number;
    center_lng?: number;
    total_area?: number;
    average_distance?: number;
    property_manager?: string;
    risk_score?: number;
    seasonal_preferences?: string[];
    optimization_score?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface GroupingConfiguration {
  id: string;
  client_id?: string;
  name: string;
  rules: {
    max_group_size?: number;
    max_distance_miles?: number;
    prefer_same_pm?: boolean;
    avoid_weather_conditions?: string[];
    priority_by_risk?: boolean;
    seasonal_restrictions?: {
      avoid_months?: number[];
      preferred_months?: number[];
    };
  };
  is_active: boolean;
  priority: number;
}

export interface RouteOptimization {
  inspector_id: string;
  route_date: string;
  property_sequence: string[];
  estimated_travel_time: number; // minutes
  total_distance: number; // miles
  optimization_score: number;
}

export class IntelligentGroupingService {
  
  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Group properties by geographic proximity
   */
  static async groupByGeographicProximity(
    properties: Property[],
    config: { maxGroupSize: number; maxDistance: number }
  ): Promise<PropertyGroup[]> {
    const groups: PropertyGroup[] = [];
    const processed = new Set<string>();

    // Filter properties with valid coordinates
    const validProperties = properties.filter(p => p.latitude && p.longitude);

    for (const property of validProperties) {
      if (processed.has(property.id)) continue;

      const group: PropertyGroup = {
        id: `geo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Geographic Group - ${property.city}, ${property.state}`,
        group_type: 'geographic',
        properties: [property],
        metadata: {
          center_lat: property.latitude!,
          center_lng: property.longitude!,
          total_area: property.roof_area || 0,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      processed.add(property.id);

      // Find nearby properties
      for (const candidate of validProperties) {
        if (processed.has(candidate.id) || group.properties.length >= config.maxGroupSize) {
          continue;
        }

        const distance = this.calculateDistance(
          property.latitude!,
          property.longitude!,
          candidate.latitude!,
          candidate.longitude!
        );

        if (distance <= config.maxDistance) {
          group.properties.push(candidate);
          processed.add(candidate.id);
          
          // Update group metadata
          group.metadata.total_area = (group.metadata.total_area || 0) + (candidate.roof_area || 0);
        }
      }

      // Calculate group center and optimization score
      this.updateGroupMetadata(group);
      groups.push(group);
    }

    return groups;
  }

  /**
   * Group properties by property manager
   */
  static async groupByPropertyManager(properties: Property[]): Promise<PropertyGroup[]> {
    const pmGroups = new Map<string, Property[]>();

    // Group by property manager
    properties.forEach(property => {
      const pm = property.property_manager_name || 'Unassigned';
      if (!pmGroups.has(pm)) {
        pmGroups.set(pm, []);
      }
      pmGroups.get(pm)!.push(property);
    });

    const groups: PropertyGroup[] = [];
    
    pmGroups.forEach((props, pmName) => {
      const group: PropertyGroup = {
        id: `pm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `PM Group - ${pmName}`,
        group_type: 'property_manager',
        properties: props,
        metadata: {
          property_manager: pmName,
          total_area: props.reduce((sum, p) => sum + (p.roof_area || 0), 0),
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.updateGroupMetadata(group);
      groups.push(group);
    });

    return groups;
  }

  /**
   * Group properties by risk assessment
   */
  static async groupByRisk(properties: Property[]): Promise<PropertyGroup[]> {
    const riskGroups = new Map<string, Property[]>();

    properties.forEach(property => {
      let riskLevel = 'low';
      
      // Calculate risk based on various factors
      const riskScore = this.calculateRiskScore(property);
      
      if (riskScore >= 80) riskLevel = 'high';
      else if (riskScore >= 60) riskLevel = 'medium';
      
      if (!riskGroups.has(riskLevel)) {
        riskGroups.set(riskLevel, []);
      }
      riskGroups.get(riskLevel)!.push(property);
    });

    const groups: PropertyGroup[] = [];
    
    riskGroups.forEach((props, riskLevel) => {
      const group: PropertyGroup = {
        id: `risk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `Risk Group - ${riskLevel.toUpperCase()}`,
        group_type: 'risk_based',
        properties: props,
        metadata: {
          risk_score: props.reduce((sum, p) => sum + this.calculateRiskScore(p), 0) / props.length,
          total_area: props.reduce((sum, p) => sum + (p.roof_area || 0), 0),
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.updateGroupMetadata(group);
      groups.push(group);
    });

    return groups;
  }

  /**
   * Calculate risk score for a property
   */
  private static calculateRiskScore(property: Property): number {
    let score = 0;

    // Age-based risk (if last inspection is old)
    if (property.last_inspection_date) {
      const lastInspection = new Date(property.last_inspection_date);
      const monthsSinceInspection = (Date.now() - lastInspection.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSinceInspection > 24) score += 30;
      else if (monthsSinceInspection > 12) score += 20;
      else if (monthsSinceInspection > 6) score += 10;
    } else {
      score += 40; // No inspection data
    }

    // Warranty expiration risk
    if (property.warranty_expiration) {
      const warrantyExpiry = new Date(property.warranty_expiration);
      const monthsToExpiry = (warrantyExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsToExpiry < 0) score += 25; // Expired
      else if (monthsToExpiry < 6) score += 15; // Expiring soon
    }

    // Safety concerns
    if (property.safety_concerns) score += 20;

    // Customer sensitivity
    if (property.customer_sensitivity === 'High') score += 15;
    else if (property.customer_sensitivity === 'Medium') score += 10;

    // Roof rating (if available)
    if (property.roof_rating) {
      if (property.roof_rating <= 3) score += 20;
      else if (property.roof_rating <= 5) score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Update group metadata with calculated values
   */
  private static updateGroupMetadata(group: PropertyGroup): void {
    const properties = group.properties;
    
    if (properties.length === 0) return;

    // Calculate center point for geographic groups
    if (group.group_type === 'geographic') {
      const validCoords = properties.filter(p => p.latitude && p.longitude);
      if (validCoords.length > 0) {
        group.metadata.center_lat = validCoords.reduce((sum, p) => sum + p.latitude!, 0) / validCoords.length;
        group.metadata.center_lng = validCoords.reduce((sum, p) => sum + p.longitude!, 0) / validCoords.length;
        
        // Calculate average distance from center
        const distances = validCoords.map(p => 
          this.calculateDistance(
            group.metadata.center_lat!,
            group.metadata.center_lng!,
            p.latitude!,
            p.longitude!
          )
        );
        group.metadata.average_distance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
      }
    }

    // Calculate optimization score
    group.metadata.optimization_score = this.calculateOptimizationScore(group);
  }

  /**
   * Calculate optimization score for a group
   */
  private static calculateOptimizationScore(group: PropertyGroup): number {
    let score = 100;

    // Penalize for large groups
    if (group.properties.length > 10) score -= (group.properties.length - 10) * 5;

    // Bonus for same property manager
    if (group.group_type === 'property_manager') score += 20;

    // Penalize for large geographic spread
    if (group.metadata.average_distance && group.metadata.average_distance > 25) {
      score -= Math.min(30, (group.metadata.average_distance - 25) * 2);
    }

    // Bonus for high-risk properties grouped together
    if (group.group_type === 'risk_based' && group.metadata.risk_score && group.metadata.risk_score > 70) {
      score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get seasonal scheduling recommendations
   */
  static async getSeasonalRecommendations(
    clientId?: string,
    region?: string
  ): Promise<{ month: number; recommended: boolean; conditions: string[] }[]> {
    try {
      const { data, error } = await supabase
        .from('seasonal_preferences')
        .select('*')
        .eq('client_id', clientId)
        .eq('region', region);

      if (error) throw error;

      // Default seasonal recommendations if no specific preferences
      if (!data || data.length === 0) {
        return [
          { month: 1, recommended: false, conditions: ['Cold weather', 'Snow/Ice'] },
          { month: 2, recommended: false, conditions: ['Cold weather', 'Snow/Ice'] },
          { month: 3, recommended: true, conditions: ['Mild weather'] },
          { month: 4, recommended: true, conditions: ['Optimal conditions'] },
          { month: 5, recommended: true, conditions: ['Optimal conditions'] },
          { month: 6, recommended: true, conditions: ['Good weather'] },
          { month: 7, recommended: false, conditions: ['Hot weather'] },
          { month: 8, recommended: false, conditions: ['Hot weather'] },
          { month: 9, recommended: true, conditions: ['Optimal conditions'] },
          { month: 10, recommended: true, conditions: ['Optimal conditions'] },
          { month: 11, recommended: true, conditions: ['Mild weather'] },
          { month: 12, recommended: false, conditions: ['Cold weather'] },
        ];
      }

      // Process actual preferences
      const preferences = data[0];
      return Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        return {
          month,
          recommended: preferences.preferred_months?.includes(month) || false,
          conditions: preferences.avoid_conditions || []
        };
      });
    } catch (error) {
      console.error('Error fetching seasonal recommendations:', error);
      return [];
    }
  }

  /**
   * Optimize inspector routes
   */
  static async optimizeInspectorRoute(
    properties: Property[],
    startLat: number,
    startLng: number
  ): Promise<{ optimizedOrder: Property[]; totalDistance: number; estimatedTime: number }> {
    if (properties.length === 0) {
      return { optimizedOrder: [], totalDistance: 0, estimatedTime: 0 };
    }

    // Simple nearest-neighbor algorithm for route optimization
    const unvisited = [...properties];
    const optimizedOrder: Property[] = [];
    let currentLat = startLat;
    let currentLng = startLng;
    let totalDistance = 0;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      // Find nearest unvisited property
      unvisited.forEach((property, index) => {
        if (property.latitude && property.longitude) {
          const distance = this.calculateDistance(
            currentLat,
            currentLng,
            property.latitude,
            property.longitude
          );
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
          }
        }
      });

      const nearest = unvisited.splice(nearestIndex, 1)[0];
      optimizedOrder.push(nearest);
      
      if (nearest.latitude && nearest.longitude) {
        totalDistance += nearestDistance;
        currentLat = nearest.latitude;
        currentLng = nearest.longitude;
      }
    }

    // Estimate time (assume 30 mph average + 45 minutes per inspection)
    const estimatedTime = (totalDistance / 30) * 60 + (optimizedOrder.length * 45);

    return {
      optimizedOrder,
      totalDistance,
      estimatedTime
    };
  }
}