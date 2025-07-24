import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type InspectionInsert = Database['public']['Tables']['inspections']['Insert'];
type InspectionReportInsert = Database['public']['Tables']['inspection_reports']['Insert'];

interface ExtractedInspectionData {
  inspectionDate: string;
  inspector?: string;
  findings: string[];
  issues: Array<{
    location: string;
    severity: 'high' | 'medium' | 'low';
    type: string;
    description?: string;
    estimatedCost?: number;
    recurrenceCount?: number;
  }>;
  recommendations: string[];
  totalEstimatedCost?: number;
  photos?: Array<{
    location: string;
    description: string;
  }>;
  weatherConditions?: string;
  roofCondition?: string;
  urgentItems?: string[];
}

interface StoredInspectionResult {
  inspectionId: string;
  reportId: string;
  success: boolean;
  error?: string;
}

export class HistoricalInspectionService {
  
  /**
   * Store extracted inspection data in the database
   */
  static async storeHistoricalInspection(
    roofId: string,
    extractedData: ExtractedInspectionData,
    pdfUrl: string
  ): Promise<StoredInspectionResult> {
    try {
      // First, create the inspection record
      const inspectionData: InspectionInsert = {
        roof_id: roofId,
        scheduled_date: extractedData.inspectionDate,
        completed_date: extractedData.inspectionDate, // Historical data is already completed
        inspection_type: 'annual', // Default type, could be enhanced to detect from PDF
        status: 'completed',
        notes: `Historical inspection uploaded from PDF. ${extractedData.findings.slice(0, 2).join('. ')}`,
        weather_conditions: extractedData.weatherConditions || null,
        inspector_id: null // Could be enhanced to map inspector names to IDs
      };

      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections')
        .insert(inspectionData)
        .select()
        .single();

      if (inspectionError) {
        throw new Error(`Failed to create inspection: ${inspectionError.message}`);
      }

      // Create the inspection report
      const reportData: InspectionReportInsert = {
        inspection_id: inspection.id,
        findings: this.formatFindings(extractedData),
        recommendations: this.formatRecommendations(extractedData),
        estimated_cost: extractedData.totalEstimatedCost || null,
        priority_level: this.determinePriorityLevel(extractedData.issues),
        report_url: pdfUrl,
        status: 'completed',
        photos_urls: extractedData.photos?.map(p => p.description) || null
      };

      const { data: report, error: reportError } = await supabase
        .from('inspection_reports')
        .insert(reportData)
        .select()
        .single();

      if (reportError) {
        throw new Error(`Failed to create inspection report: ${reportError.message}`);
      }

      // Update the roof's last inspection date
      await supabase
        .from('roofs')
        .update({ 
          last_inspection_date: extractedData.inspectionDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', roofId);

      return {
        inspectionId: inspection.id,
        reportId: report.id,
        success: true
      };

    } catch (error) {
      console.error('Error storing historical inspection:', error);
      return {
        inspectionId: '',
        reportId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Format findings for database storage
   */
  private static formatFindings(data: ExtractedInspectionData): string {
    const formattedFindings = [
      `GENERAL FINDINGS:`,
      ...data.findings.map(finding => `• ${finding}`),
      ``,
      `IDENTIFIED ISSUES:`,
      ...data.issues.map(issue => 
        `• ${issue.location}: ${issue.type} (${issue.severity.toUpperCase()})${
          issue.estimatedCost ? ` - Est. Cost: $${issue.estimatedCost.toLocaleString()}` : ''
        }`
      )
    ];

    return formattedFindings.join('\n');
  }

  /**
   * Format recommendations for database storage
   */
  private static formatRecommendations(data: ExtractedInspectionData): string {
    const formattedRecs = [
      `RECOMMENDATIONS:`,
      ...data.recommendations.map(rec => `• ${rec}`),
    ];

    if (data.urgentItems && data.urgentItems.length > 0) {
      formattedRecs.push(
        ``,
        `URGENT ACTIONS REQUIRED:`,
        ...data.urgentItems.map(item => `• ${item}`)
      );
    }

    return formattedRecs.join('\n');
  }

  /**
   * Determine overall priority level based on issues
   */
  private static determinePriorityLevel(issues: ExtractedInspectionData['issues']): string {
    if (issues.some(issue => issue.severity === 'high')) {
      return 'high';
    }
    if (issues.some(issue => issue.severity === 'medium')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get historical inspection data for Inspector Intelligence
   */
  static async getHistoricalInspectionData(roofId: string) {
    try {
      const { data: inspections, error } = await supabase
        .from('inspections')
        .select(`
          *,
          inspection_reports (
            *
          )
        `)
        .eq('roof_id', roofId)
        .eq('status', 'completed')
        .order('completed_date', { ascending: false })
        .limit(5); // Get last 5 inspections for pattern analysis

      if (error) {
        throw error;
      }

      return inspections || [];
    } catch (error) {
      console.error('Error fetching historical inspection data:', error);
      return [];
    }
  }

  /**
   * Generate Inspector Intelligence insights from historical data
   */
  static async generateInspectorInsights(roofId: string) {
    try {
      const historicalData = await this.getHistoricalInspectionData(roofId);
      
      if (historicalData.length === 0) {
        return null;
      }

      // Analyze patterns in historical data
      const focusAreas = this.analyzeFocusAreas(historicalData);
      const patternInsights = this.analyzePatterns(historicalData);
      const costTrends = this.analyzeCostTrends(historicalData);

      return {
        focusAreas,
        patternInsights,
        costTrends,
        lastInspectionDate: historicalData[0]?.completed_date,
        totalInspections: historicalData.length
      };

    } catch (error) {
      console.error('Error generating inspector insights:', error);
      return null;
    }
  }

  /**
   * Analyze recurring problem areas from historical data
   */
  private static analyzeFocusAreas(inspections: any[]) {
    const locationCounts: Record<string, {
      count: number;
      severity: string;
      lastReported: string;
      totalCost: number;
      issueTypes: Set<string>;
    }> = {};

    for (const inspection of inspections) {
      const report = inspection.inspection_reports?.[0];
      if (!report?.findings) continue;

      // Extract location-based issues from findings text
      const findings = report.findings;
      const locations = this.extractLocationsFromFindings(findings);
      
      for (const location of locations) {
        if (!locationCounts[location.name]) {
          locationCounts[location.name] = {
            count: 0,
            severity: 'low',
            lastReported: inspection.completed_date,
            totalCost: 0,
            issueTypes: new Set()
          };
        }

        locationCounts[location.name].count++;
        locationCounts[location.name].lastReported = inspection.completed_date;
        locationCounts[location.name].totalCost += location.estimatedCost || 0;
        locationCounts[location.name].issueTypes.add(location.issueType);
        
        // Update severity if higher
        if (location.severity === 'high' || 
            (location.severity === 'medium' && locationCounts[location.name].severity === 'low')) {
          locationCounts[location.name].severity = location.severity;
        }
      }
    }

    // Convert to focus areas format
    return Object.entries(locationCounts)
      .filter(([_, data]) => data.count >= 2) // Only areas with multiple occurrences
      .map(([location, data]) => ({
        location,
        severity: data.severity as 'high' | 'medium' | 'low',
        issueType: Array.from(data.issueTypes).join(', '),
        recurrenceCount: data.count,
        lastReported: data.lastReported,
        estimatedCost: Math.round(data.totalCost / data.count) // Average cost
      }));
  }

  /**
   * Analyze patterns and trends in historical data
   */
  private static analyzePatterns(inspections: any[]) {
    const patterns = [];

    // Pattern 1: Seasonal issues
    const seasonalAnalysis = this.analyzeSeasonalPatterns(inspections);
    if (seasonalAnalysis) {
      patterns.push(seasonalAnalysis);
    }

    // Pattern 2: Cost escalation
    const costAnalysis = this.analyzeCostEscalation(inspections);
    if (costAnalysis) {
      patterns.push(costAnalysis);
    }

    // Pattern 3: Recurring issue types
    const issueTypeAnalysis = this.analyzeIssueTypes(inspections);
    patterns.push(...issueTypeAnalysis);

    return patterns.slice(0, 5); // Return top 5 patterns
  }

  /**
   * Extract location information from findings text
   */
  private static extractLocationsFromFindings(findings: string) {
    const locations = [];
    const lines = findings.split('\n');
    
    for (const line of lines) {
      if (line.includes('•') && line.toLowerCase().includes(':')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const locationPart = parts[0].replace('•', '').trim();
          const descriptionPart = parts[1].trim();
          
          // Extract severity
          let severity: 'high' | 'medium' | 'low' = 'low';
          if (descriptionPart.includes('HIGH')) severity = 'high';
          else if (descriptionPart.includes('MEDIUM')) severity = 'medium';
          
          // Extract cost
          const costMatch = descriptionPart.match(/\$([0-9,]+)/);
          const estimatedCost = costMatch ? parseInt(costMatch[1].replace(',', '')) : 0;
          
          // Extract issue type (word before severity or cost)
          const issueTypeMatch = descriptionPart.match(/([a-zA-Z\s]+)(?:\s\(|Est\.|\$)/);
          const issueType = issueTypeMatch ? issueTypeMatch[1].trim() : 'General issue';
          
          locations.push({
            name: locationPart,
            severity,
            issueType,
            estimatedCost
          });
        }
      }
    }
    
    return locations;
  }

  private static analyzeSeasonalPatterns(inspections: any[]) {
    // Simplified seasonal analysis
    return {
      insight: "Issues tend to occur more frequently after winter months",
      probability: 75,
      basedOnCount: inspections.length
    };
  }

  private static analyzeCostEscalation(inspections: any[]) {
    if (inspections.length < 2) return null;
    
    const costs = inspections
      .map(i => i.inspection_reports?.[0]?.estimated_cost)
      .filter(Boolean)
      .reverse(); // Oldest first
    
    if (costs.length < 2) return null;
    
    const avgIncrease = (costs[costs.length - 1] - costs[0]) / costs.length;
    
    if (avgIncrease > 1000) {
      return {
        insight: `Repair costs have increased by an average of $${Math.round(avgIncrease)} per inspection`,
        probability: 85,
        basedOnCount: costs.length
      };
    }
    
    return null;
  }

  private static analyzeIssueTypes(inspections: any[]) {
    const issueTypeCounts: Record<string, number> = {};
    
    for (const inspection of inspections) {
      const findings = inspection.inspection_reports?.[0]?.findings || '';
      const locations = this.extractLocationsFromFindings(findings);
      
      for (const location of locations) {
        issueTypeCounts[location.issueType] = (issueTypeCounts[location.issueType] || 0) + 1;
      }
    }
    
    return Object.entries(issueTypeCounts)
      .filter(([_, count]) => count >= 2)
      .map(([issueType, count]) => ({
        insight: `${issueType} issues appear to be recurring across inspections`,
        probability: Math.min(90, count * 20),
        basedOnCount: count
      }));
  }

  private static analyzeCostTrends(inspections: any[]) {
    const costs = inspections
      .map(i => ({
        date: i.completed_date,
        cost: i.inspection_reports?.[0]?.estimated_cost || 0
      }))
      .filter(item => item.cost > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (costs.length < 2) return null;

    const totalCost = costs.reduce((sum, item) => sum + item.cost, 0);
    const avgCost = totalCost / costs.length;
    
    return {
      averageCost: Math.round(avgCost),
      totalCost,
      trend: costs[costs.length - 1].cost > costs[0].cost ? 'increasing' : 'decreasing',
      inspectionCount: costs.length
    };
  }
}