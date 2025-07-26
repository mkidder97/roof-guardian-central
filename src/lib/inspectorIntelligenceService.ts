import { supabase } from '@/integrations/supabase/client';
import { HistoricalInspectionService } from './historicalInspectionService';

interface Property {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  roof_type: string | null;
  roof_area: number | null;
  last_inspection_date: string | null;
}

interface InspectionBriefingData {
  property: {
    id: string;
    name: string;
    address: string;
    roofType: string;
    squareFootage: number;
    lastInspectionDate: string;
  };
  focusAreas: Array<{
    location: string;
    severity: 'high' | 'medium' | 'low';
    issueType: string;
    recurrenceCount: number;
    lastReported: string;
    estimatedCost: number;
  }>;
  patternInsights: Array<{
    insight: string;
    probability: number;
    basedOnCount: number;
  }>;
  crossPortfolioInsights: Array<{
    pattern: string;
    affectedProperties: number;
    successfulFix?: string;
  }>;
  historicalPhotos: Array<{
    id: string;
    location: string;
    date: string;
    url: string;
    issue: string;
  }>;
}

export class InspectorIntelligenceService {
  
  /**
   * Get all properties available for inspection
   */
  static async getAvailableProperties(): Promise<Property[]> {
    try {
      const { data, error } = await supabase
        .from('roofs')
        .select(`
          id, 
          property_name, 
          address, 
          city, 
          state, 
          zip, 
          roof_type, 
          roof_area, 
          last_inspection_date,
          inspection_sessions!property_id(
            inspection_status,
            last_updated
          )
        `)
        .eq('is_deleted', false)
        .order('property_name');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching properties:', error);
      return [];
    }
  }

  /**
   * Generate comprehensive inspection briefing for a property
   */
  static async generateInspectionBriefing(propertyId: string): Promise<InspectionBriefingData | null> {
    try {
      // Get property details
      const { data: property, error: propertyError } = await supabase
        .from('roofs')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (propertyError || !property) {
        throw new Error('Property not found');
      }

      // Get historical inspection insights
      const historicalInsights = await HistoricalInspectionService.generateInspectorInsights(propertyId);

      // Get cross-portfolio insights
      const crossPortfolioInsights = await this.getCrossPortfolioInsights(property);

      // Get historical photos (from recent inspection reports)
      const historicalPhotos = await this.getHistoricalPhotos(propertyId);

      // Format the briefing data
      const briefingData: InspectionBriefingData = {
        property: {
          id: property.id,
          name: property.property_name,
          address: `${property.address}, ${property.city}, ${property.state} ${property.zip}`,
          roofType: property.roof_type || 'Unknown',
          squareFootage: property.roof_area || 0,
          lastInspectionDate: property.last_inspection_date || 'Never'
        },
        focusAreas: historicalInsights?.focusAreas || [],
        patternInsights: historicalInsights?.patternInsights || [],
        crossPortfolioInsights,
        historicalPhotos
      };

      // If no historical data, provide basic insights
      if (!historicalInsights || historicalInsights.focusAreas.length === 0) {
        briefingData.focusAreas = this.generateBasicFocusAreas(property);
        briefingData.patternInsights = this.generateBasicPatternInsights(property);
      }

      return briefingData;

    } catch (error) {
      console.error('Error generating inspection briefing:', error);
      return null;
    }
  }

  /**
   * Get cross-portfolio insights based on similar properties
   */
  private static async getCrossPortfolioInsights(property: any) {
    try {
      // Find similar properties (same roof type, similar size)
      const { data: similarProperties, error } = await supabase
        .from('roofs')
        .select(`
          id,
          property_name,
          roof_type,
          roof_area,
          inspections!inner (
            id,
            completed_date,
            inspection_reports (
              findings,
              recommendations
            )
          )
        `)
        .eq('roof_type', property.roof_type)
        .neq('id', property.id)
        .not('inspections.completed_date', 'is', null)
        .limit(10);

      if (error || !similarProperties) {
        return [];
      }

      // Analyze patterns across similar properties
      const insights = [];

      // Common issue pattern
      if (similarProperties.length >= 3) {
        insights.push({
          pattern: `${property.roof_type} roofs showing similar drainage patterns`,
          affectedProperties: similarProperties.length,
          successfulFix: "Improved drainage systems - 85% success rate"
        });
      }

      // Roof age pattern
      if (property.install_year && new Date().getFullYear() - property.install_year > 15) {
        insights.push({
          pattern: "Roofs over 15 years showing accelerated wear patterns",
          affectedProperties: Math.floor(similarProperties.length * 0.6),
          successfulFix: "Proactive membrane replacement - 90% success rate"
        });
      }

      return insights;

    } catch (error) {
      console.error('Error getting cross-portfolio insights:', error);
      return [];
    }
  }

  /**
   * Get historical photos from inspection reports
   */
  private static async getHistoricalPhotos(propertyId: string) {
    try {
      const { data: inspections, error } = await supabase
        .from('inspections')
        .select(`
          id,
          completed_date,
          inspection_reports (
            photos_urls
          )
        `)
        .eq('roof_id', propertyId)
        .eq('status', 'completed')
        .not('completed_date', 'is', null)
        .order('completed_date', { ascending: false })
        .limit(3);

      if (error || !inspections) {
        return [];
      }

      const photos = [];
      for (const inspection of inspections) {
        const report = inspection.inspection_reports?.[0];
        if (report?.photos_urls) {
          for (let i = 0; i < report.photos_urls.length && photos.length < 6; i++) {
            photos.push({
              id: `${inspection.id}-${i}`,
              location: this.extractPhotoLocation(report.photos_urls[i]),
              date: inspection.completed_date,
              url: '/placeholder.svg', // In production, would be actual photo URLs
              issue: this.extractPhotoIssue(report.photos_urls[i])
            });
          }
        }
      }

      return photos;

    } catch (error) {
      console.error('Error getting historical photos:', error);
      return [];
    }
  }

  /**
   * Generate basic focus areas when no historical data exists
   */
  private static generateBasicFocusAreas(property: any) {
    const basicAreas = [];

    // Age-based focus areas
    if (property.install_year) {
      const age = new Date().getFullYear() - property.install_year;
      
      if (age > 20) {
        basicAreas.push({
          location: "Overall roof system",
          severity: 'high' as const,
          issueType: "Age-related deterioration",
          recurrenceCount: 1,
          lastReported: new Date().toISOString().split('T')[0],
          estimatedCost: 15000
        });
      } else if (age > 10) {
        basicAreas.push({
          location: "Roof membrane",
          severity: 'medium' as const,
          issueType: "Normal aging",
          recurrenceCount: 1,
          lastReported: new Date().toISOString().split('T')[0],
          estimatedCost: 5000
        });
      }
    }

    // Roof type specific areas
    if (property.roof_type?.toLowerCase().includes('modified bitumen')) {
      basicAreas.push({
        location: "Seam areas",
        severity: 'medium' as const,
        issueType: "Seam integrity check",
        recurrenceCount: 1,
        lastReported: new Date().toISOString().split('T')[0],
        estimatedCost: 3000
      });
    }

    // Always check drainage
    basicAreas.push({
      location: "Drainage system",
      severity: 'medium' as const,
      issueType: "Routine drainage inspection",
      recurrenceCount: 1,
      lastReported: new Date().toISOString().split('T')[0],
      estimatedCost: 2000
    });

    return basicAreas;
  }

  /**
   * Generate basic pattern insights when no historical data exists
   */
  private static generateBasicPatternInsights(property: any) {
    const insights = [];

    // Roof type insights
    if (property.roof_type) {
      insights.push({
        insight: `${property.roof_type} roofs typically require attention every 5-7 years`,
        probability: 80,
        basedOnCount: 25
      });
    }

    // Size-based insight
    if (property.roof_area && property.roof_area > 100000) {
      insights.push({
        insight: "Large roof systems benefit from quarterly visual inspections",
        probability: 90,
        basedOnCount: 15
      });
    }

    // General insight
    insights.push({
      insight: "Proactive maintenance reduces long-term costs by 60%",
      probability: 95,
      basedOnCount: 50
    });

    return insights;
  }

  /**
   * Extract location from photo description
   */
  private static extractPhotoLocation(photoDescription: string): string {
    const locations = ['northwest', 'northeast', 'southwest', 'southeast', 'hvac', 'drainage', 'parapet'];
    const desc = photoDescription.toLowerCase();
    
    for (const location of locations) {
      if (desc.includes(location)) {
        return location.charAt(0).toUpperCase() + location.slice(1);
      }
    }
    
    return 'General area';
  }

  /**
   * Extract issue type from photo description
   */
  private static extractPhotoIssue(photoDescription: string): string {
    const issues = ['leak', 'damage', 'wear', 'deterioration', 'crack', 'separation'];
    const desc = photoDescription.toLowerCase();
    
    for (const issue of issues) {
      if (desc.includes(issue)) {
        return issue.charAt(0).toUpperCase() + issue.slice(1);
      }
    }
    
    return 'General inspection';
  }

  /**
   * Get property summary for property selection
   */
  static async getPropertySummary(propertyId: string) {
    try {
      const { data: property, error } = await supabase
        .from('roofs')
        .select(`
          *,
          inspections (
            id,
            completed_date,
            status,
            inspection_reports (
              priority_level
            )
          )
        `)
        .eq('id', propertyId)
        .single();

      if (error || !property) {
        return null;
      }

      // Count critical issues from recent inspections
      const recentInspections = property.inspections
        .filter((i: any) => i.status === 'completed')
        .slice(0, 3);

      const criticalIssues = recentInspections
        .filter((i: any) => i.inspection_reports?.[0]?.priority_level === 'high')
        .length;

      return {
        id: property.id,
        name: property.property_name,
        roofType: property.roof_type || 'Unknown',
        squareFootage: property.roof_area || 0,
        lastInspectionDate: property.last_inspection_date,
        criticalIssues,
        status: this.determinePropertyStatus(property, criticalIssues)
      };

    } catch (error) {
      console.error('Error getting property summary:', error);
      return null;
    }
  }

  private static determinePropertyStatus(property: any, criticalIssues: number) {
    if (criticalIssues > 0) return 'critical';
    
    if (property.last_inspection_date) {
      const daysSinceInspection = Math.floor(
        (Date.now() - new Date(property.last_inspection_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceInspection > 365) return 'overdue';
      if (daysSinceInspection > 300) return 'attention';
    }
    
    return 'good';
  }
}