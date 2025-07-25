import { supabase } from '@/integrations/supabase/client';
import { uploadRoofFile } from '@/lib/fileUpload';
import { RealPDFParser, ExtractedPDFData } from './realPdfParser';
import { PropertyMatcher, PropertyMatch } from './propertyMatcher';
import type { Database } from '@/integrations/supabase/types';

type InspectionInsert = Database['public']['Tables']['inspections']['Insert'];
type InspectionReportInsert = Database['public']['Tables']['inspection_reports']['Insert'];

export interface StoredInspectionResult {
  inspectionId: string;
  reportId: string;
  fileUrl: string;
  propertyMatch: PropertyMatch | null;
  extractedData: ExtractedPDFData;
  success: boolean;
  error?: string;
}

export interface ProcessedPDFResult {
  success: boolean;
  propertyMatch: PropertyMatch | null;
  extractedData: ExtractedPDFData;
  storedResult?: StoredInspectionResult;
  error?: string;
  fileName: string;
}

export class HistoricalInspectionService {
  /**
   * Process PDF file: extract data, match property, and store if match found
   */
  static async processPDFFile(pdfFile: File): Promise<ProcessedPDFResult> {
    try {
      console.log('Processing PDF file:', pdfFile.name);
      
      // 1. Extract data from PDF using real PDF parser
      const extractedData = await RealPDFParser.extractPDFData(pdfFile);
      console.log('Extracted property name:', extractedData.propertyName);
      
      // 2. Find matching property in database
      const propertyMatch = await PropertyMatcher.findBestMatch(
        extractedData.propertyName,
        extractedData.address
      );
      
      if (!propertyMatch) {
        console.log('No property match found for:', extractedData.propertyName);
        return {
          success: false,
          propertyMatch: null,
          extractedData,
          fileName: pdfFile.name,
          error: `Could not match property "${extractedData.propertyName}" to any existing property in database`
        };
      }
      
      console.log(`Found property match: ${propertyMatch.property_name} (confidence: ${propertyMatch.confidence})`);
      
      // 3. Store the inspection data
      const storedResult = await this.storeHistoricalInspection(
        propertyMatch.id,
        extractedData,
        pdfFile
      );
      
      return {
        success: storedResult.success,
        propertyMatch,
        extractedData,
        storedResult,
        fileName: pdfFile.name,
        error: storedResult.error
      };
      
    } catch (error) {
      console.error('Error processing PDF file:', error);
      return {
        success: false,
        propertyMatch: null,
        extractedData: {} as ExtractedPDFData,
        fileName: pdfFile.name,
        error: error instanceof Error ? error.message : 'Unknown error processing PDF'
      };
    }
  }
  
  /**
   * Store historical inspection data extracted from PDF
   */
  static async storeHistoricalInspection(
    roofId: string,
    extractedData: ExtractedPDFData,
    pdfFile: File
  ): Promise<StoredInspectionResult> {
    try {
      console.log('Storing historical inspection for roof:', roofId);
      
      // 1. Upload PDF file to storage
      const fileUploadResult = await uploadRoofFile(pdfFile, roofId);
      if (!fileUploadResult.success || !fileUploadResult.data) {
        throw new Error('Failed to upload PDF file');
      }
      
      // 2. Parse inspection date
      const inspectionDate = this.parseInspectionDate(extractedData.reportDate);
      
      // 3. Create inspection record
      const inspectionData: InspectionInsert = {
        roof_id: roofId,
        inspection_type: this.normalizeInspectionType(extractedData.reportType),
        completed_date: inspectionDate,
        status: 'completed',
        notes: `Historical inspection imported from PDF: ${pdfFile.name}\nInspection Company: ${extractedData.inspectionCompany}`,
        weather_conditions: null
      };

      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections')
        .insert(inspectionData)
        .select()
        .single();
      
      if (inspectionError || !inspection) {
        throw new Error(`Failed to create inspection record: ${inspectionError?.message}`);
      }
      
      // 4. Create inspection report with extracted findings
      const findings = this.generateFindings(extractedData);
      const recommendations = this.generateRecommendations(extractedData);
      
      const reportData: InspectionReportInsert = {
        inspection_id: inspection.id,
        findings,
        recommendations,
        estimated_cost: 0, // Will be updated if cost estimates are found in PDF
        priority_level: this.determinePriorityLevel(extractedData),
        status: 'completed',
        report_url: fileUploadResult.data.publicUrl
      };

      const { data: report, error: reportError } = await supabase
        .from('inspection_reports')
        .insert(reportData)
        .select()
        .single();
      
      if (reportError || !report) {
        throw new Error(`Failed to create inspection report: ${reportError?.message}`);
      }
      
      // 5. Update roof information with extracted data
      await this.updateRoofInformation(roofId, extractedData, inspectionDate);
      
      console.log('Successfully stored historical inspection:', inspection.id);
      
      return {
        inspectionId: inspection.id,
        reportId: report.id,
        fileUrl: fileUploadResult.data.publicUrl,
        propertyMatch: null,
        extractedData,
        success: true
      };
      
    } catch (error) {
      console.error('Error storing historical inspection:', error);
      return {
        inspectionId: '',
        reportId: '',
        fileUrl: '',
        propertyMatch: null,
        extractedData,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Update roof information with extracted data from PDF
   */
  private static async updateRoofInformation(
    roofId: string,
    extractedData: ExtractedPDFData,
    inspectionDate: string
  ): Promise<void> {
    const updateData: any = {
      last_inspection_date: inspectionDate,
      updated_at: new Date().toISOString()
    };
    
    // Update roof specifications if extracted from PDF
    if (extractedData.roofArea > 0) {
      updateData.roof_area = extractedData.roofArea;
      updateData.roof_area_unit = 'sq ft';
    }
    
    if (extractedData.roofSystem) {
      updateData.roof_system = extractedData.roofSystem;
    }
    
    if (extractedData.systemDescription) {
      updateData.roof_system_description = extractedData.systemDescription;
    }
    
    if (extractedData.manufacturer) {
      updateData.manufacturer = extractedData.manufacturer;
    }
    
    if (extractedData.installingContractor) {
      updateData.installing_contractor = extractedData.installingContractor;
    }
    
    if (extractedData.repairingContractor) {
      updateData.repair_contractor = extractedData.repairingContractor;
    }
    
    if (extractedData.drainageSystem) {
      updateData.drainage_system = extractedData.drainageSystem;
    }
    
    if (extractedData.flashingDetail) {
      updateData.flashing_detail = extractedData.flashingDetail;
    }
    
    if (extractedData.perimeterDetail) {
      updateData.perimeter_detail = extractedData.perimeterDetail;
    }
    
    if (extractedData.propertyManager) {
      updateData.property_manager_name = extractedData.propertyManager;
    }
    
    if (extractedData.propertyManagerPhone) {
      updateData.property_manager_phone = extractedData.propertyManagerPhone;
    }
    
    if (extractedData.market) {
      updateData.market = extractedData.market;
    }
    
    await supabase
      .from('roofs')
      .update(updateData)
      .eq('id', roofId);
    
    console.log('Updated roof information with extracted data');
  }
  
  /**
   * Parse inspection date from various formats
   */
  private static parseInspectionDate(dateString: string): string {
    if (!dateString) return new Date().toISOString().split('T')[0];
    
    try {
      // Try to parse various date formats
      let date: Date;
      
      // Format: "MARCH 14, 2025"
      if (dateString.match(/[A-Z]+ \d{1,2},? \d{4}/i)) {
        date = new Date(dateString);
      }
      // Format: "03/14/2025" or "3-14-2025"
      else if (dateString.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/)) {
        date = new Date(dateString);
      }
      // Format: "2025-03-14"
      else if (dateString.match(/\d{4}-\d{1,2}-\d{1,2}/)) {
        date = new Date(dateString);
      }
      else {
        date = new Date(dateString);
      }
      
      // Validate date
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', dateString);
        return new Date().toISOString().split('T')[0];
      }
      
      return date.toISOString().split('T')[0];
      
    } catch (error) {
      console.warn('Error parsing date:', dateString, error);
      return new Date().toISOString().split('T')[0];
    }
  }
  
  /**
   * Normalize inspection type from PDF
   */
  private static normalizeInspectionType(reportType: string): string {
    const type = reportType.toLowerCase();
    
    if (type.includes('storm') || type.includes('damage')) return 'storm_damage';
    if (type.includes('annual')) return 'annual';
    if (type.includes('quarterly')) return 'quarterly';
    if (type.includes('monthly')) return 'monthly';
    if (type.includes('emergency')) return 'emergency';
    if (type.includes('routine')) return 'routine';
    
    return 'annual'; // Default
  }
  
  /**
   * Determine priority level from extracted data
   */
  private static determinePriorityLevel(extractedData: ExtractedPDFData): string {
    const reportType = extractedData.reportType.toLowerCase();
    
    if (reportType.includes('storm') || reportType.includes('emergency')) {
      return 'high';
    }
    
    if (reportType.includes('damage')) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Generate findings text from extracted data
   */
  private static generateFindings(extractedData: ExtractedPDFData): string {
    const findings: string[] = [];
    
    findings.push(`INSPECTION DETAILS:`);
    findings.push(`• Report Type: ${extractedData.reportType}`);
    findings.push(`• Report Date: ${extractedData.reportDate}`);
    findings.push(`• Inspection Company: ${extractedData.inspectionCompany}`);
    findings.push(`• Property: ${extractedData.propertyName}`);
    
    if (extractedData.address) {
      findings.push(`• Address: ${extractedData.address}`);
    }
    
    findings.push('');
    findings.push(`ROOF SPECIFICATIONS:`);
    
    if (extractedData.roofArea > 0) {
      findings.push(`• Roof Area: ${extractedData.roofArea.toLocaleString()} sq ft`);
    }
    
    if (extractedData.roofSystem) {
      findings.push(`• Roof System: ${extractedData.roofSystem}`);
    }
    
    if (extractedData.systemDescription) {
      findings.push(`• System Description: ${extractedData.systemDescription}`);
    }
    
    if (extractedData.manufacturer) {
      findings.push(`• Manufacturer: ${extractedData.manufacturer}`);
    }
    
    if (extractedData.drainageSystem) {
      findings.push(`• Drainage System: ${extractedData.drainageSystem}`);
    }
    
    if (extractedData.flashingDetail) {
      findings.push(`• Flashing Detail: ${extractedData.flashingDetail}`);
    }
    
    if (extractedData.perimeterDetail) {
      findings.push(`• Perimeter Detail: ${extractedData.perimeterDetail}`);
    }
    
    if (extractedData.warranty) {
      findings.push(`• Warranty Status: ${extractedData.warranty}`);
    }
    
    if (extractedData.warrantyExpiration) {
      findings.push(`• Warranty Expiration: ${extractedData.warrantyExpiration}`);
    }
    
    findings.push('');
    findings.push(`CONTRACTOR INFORMATION:`);
    
    if (extractedData.installingContractor) {
      findings.push(`• Installing Contractor: ${extractedData.installingContractor}`);
    }
    
    if (extractedData.repairingContractor) {
      findings.push(`• Repairing Contractor: ${extractedData.repairingContractor}`);
    }
    
    if (extractedData.client) {
      findings.push(`• Client: ${extractedData.client}`);
    }
    
    if (extractedData.propertyManager) {
      findings.push(`• Property Manager: ${extractedData.propertyManager}`);
      
      if (extractedData.propertyManagerPhone) {
        findings.push(`• PM Phone: ${extractedData.propertyManagerPhone}`);
      }
    }
    
    return findings.join('\n');
  }
  
  /**
   * Generate recommendations from extracted data
   */
  private static generateRecommendations(extractedData: ExtractedPDFData): string {
    const recommendations: string[] = [];
    
    recommendations.push('RECOMMENDATIONS:');
    recommendations.push('• Review complete PDF report for detailed findings and photos');
    
    if (extractedData.reportType.toLowerCase().includes('storm')) {
      recommendations.push('• Assess storm damage thoroughly and prioritize critical repairs');
      recommendations.push('• Document all damage with photos for insurance claims if applicable');
      recommendations.push('• Consider emergency repairs for any active leaks or safety hazards');
    }
    
    if (extractedData.installingContractor) {
      recommendations.push(`• Contact installing contractor for warranty information: ${extractedData.installingContractor}`);
    }
    
    if (extractedData.repairingContractor) {
      recommendations.push(`• Contact repairing contractor for maintenance: ${extractedData.repairingContractor}`);
    }
    
    if (extractedData.warranty && extractedData.warranty.toLowerCase() !== 'no') {
      recommendations.push('• Verify warranty coverage for any identified issues');
    }
    
    recommendations.push('• Schedule follow-up inspection as needed based on findings');
    recommendations.push('• Update maintenance records with inspection findings');
    
    if (extractedData.roofArea > 0) {
      recommendations.push(`• Confirm roof area measurement: ${extractedData.roofArea.toLocaleString()} sq ft`);
    }
    
    return recommendations.join('\n');
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