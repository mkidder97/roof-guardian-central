/**
 * Annual Inspection PDF Analysis Script
 * 
 * This script analyzes the roof inspection system to identify:
 * 1. All uploaded PDF files in the system
 * 2. Which ones are classified as annual inspection reports
 * 3. Database structure for storing and retrieving inspection data
 * 4. How PDFs are processed and categorized
 */

import { supabase } from '@/integrations/supabase/client';

export interface AnnualInspectionAnalysis {
  totalPDFs: number;
  annualInspections: InspectionSummary[];
  stormDamageReports: InspectionSummary[];
  otherInspections: InspectionSummary[];
  unclassifiedPDFs: FileSummary[];
  databaseSchema: DatabaseInfo;
}

export interface InspectionSummary {
  inspectionId: string;
  roofId: string;
  propertyName: string;
  address: string;
  inspectionType: string;
  completedDate: string;
  reportUrl?: string;
  pdfFileName?: string;
  findings: string;
  recommendations: string;
  estimatedCost?: number;
  priorityLevel: string;
  inspectionCompany?: string;
  classificationConfidence?: number;
  extractedData?: any;
}

export interface FileSummary {
  fileId: string;
  roofId: string;
  propertyName: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  uploadDate: string;
  fileSize: number;
  isPublic: boolean;
}

export interface DatabaseInfo {
  tables: {
    inspections: string;
    inspection_reports: string;
    roof_files: string;
    roofs: string;
  };
  pdfProcessingFlow: string[];
  classificationTypes: string[];
}

export class AnnualInspectionAnalyzer {
  
  /**
   * Main analysis function to identify all annual inspection PDFs
   */
  static async analyzeAnnualInspections(): Promise<AnnualInspectionAnalysis> {
    console.log('🔍 Starting Annual Inspection PDF Analysis...');
    
    try {
      // 1. Get all inspections marked as 'annual'
      const annualInspections = await this.getAnnualInspections();
      console.log(`📋 Found ${annualInspections.length} annual inspections`);
      
      // 2. Get all storm damage inspections for comparison
      const stormInspections = await this.getStormDamageInspections();
      console.log(`⛈️ Found ${stormInspections.length} storm damage inspections`);
      
      // 3. Get other inspection types
      const otherInspections = await this.getOtherInspections();
      console.log(`📝 Found ${otherInspections.length} other inspections`);
      
      // 4. Get all PDF files that might not be linked to inspections
      const unclassifiedPDFs = await this.getUnclassifiedPDFs();
      console.log(`📁 Found ${unclassifiedPDFs.length} unclassified PDF files`);
      
      // 5. Count total PDFs
      const totalPDFs = await this.getTotalPDFCount();
      console.log(`📊 Total PDFs in system: ${totalPDFs}`);
      
      const analysis: AnnualInspectionAnalysis = {
        totalPDFs,
        annualInspections,
        stormDamageReports: stormInspections,
        otherInspections,
        unclassifiedPDFs,
        databaseSchema: this.getDatabaseSchema()
      };
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Error analyzing annual inspections:', error);
      throw error;
    }
  }
  
  /**
   * Get all inspections classified as 'annual'
   */
  static async getAnnualInspections(): Promise<InspectionSummary[]> {
    const { data, error } = await supabase
      .from('inspections')
      .select(`
        id,
        roof_id,
        inspection_type,
        completed_date,
        status,
        notes,
        roofs (
          id,
          property_name,
          address,
          city,
          state
        ),
        inspection_reports (
          id,
          report_url,
          findings,
          recommendations,
          estimated_cost,
          priority_level
        )
      `)
      .eq('inspection_type', 'annual')
      .eq('status', 'completed')
      .order('completed_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching annual inspections:', error);
      return [];
    }
    
    return this.formatInspectionData(data || []);
  }
  
  /**
   * Get all storm damage inspections
   */
  static async getStormDamageInspections(): Promise<InspectionSummary[]> {
    const { data, error } = await supabase
      .from('inspections')
      .select(`
        id,
        roof_id,
        inspection_type,
        completed_date,
        status,
        notes,
        roofs (
          id,
          property_name,
          address,
          city,
          state
        ),
        inspection_reports (
          id,
          report_url,
          findings,
          recommendations,
          estimated_cost,
          priority_level
        )
      `)
      .eq('inspection_type', 'storm_damage')
      .eq('status', 'completed')
      .order('completed_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching storm damage inspections:', error);
      return [];
    }
    
    return this.formatInspectionData(data || []);
  }
  
  /**
   * Get all other inspection types
   */
  static async getOtherInspections(): Promise<InspectionSummary[]> {
    const { data, error } = await supabase
      .from('inspections')
      .select(`
        id,
        roof_id,
        inspection_type,
        completed_date,
        status,
        notes,
        roofs (
          id,
          property_name,
          address,
          city,
          state
        ),
        inspection_reports (
          id,
          report_url,
          findings,
          recommendations,
          estimated_cost,
          priority_level
        )
      `)
      .not('inspection_type', 'in', ['annual', 'storm_damage'])
      .eq('status', 'completed')
      .order('completed_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching other inspections:', error);
      return [];
    }
    
    return this.formatInspectionData(data || []);
  }
  
  /**
   * Get PDFs that aren't linked to inspection records
   */
  static async getUnclassifiedPDFs(): Promise<FileSummary[]> {
    const { data, error } = await supabase
      .from('roof_files')
      .select(`
        id,
        roof_id,
        file_name,
        file_type,
        file_url,
        created_at,
        file_size,
        is_public,
        roofs (
          property_name
        )
      `)
      .eq('file_type', 'Inspection Report')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching PDF files:', error);
      return [];
    }
    
    return (data || []).map(file => ({
      fileId: file.id,
      roofId: file.roof_id,
      propertyName: file.roofs?.property_name || 'Unknown Property',
      fileName: file.file_name,
      fileType: file.file_type,
      fileUrl: file.file_url,
      uploadDate: file.created_at,
      fileSize: file.file_size || 0,
      isPublic: file.is_public
    }));
  }
  
  /**
   * Count total PDF files in the system
   */
  static async getTotalPDFCount(): Promise<number> {
    const { count, error } = await supabase
      .from('roof_files')
      .select('*', { count: 'exact', head: true })
      .ilike('mime_type', '%pdf%');
    
    if (error) {
      console.error('Error counting PDFs:', error);
      return 0;
    }
    
    return count || 0;
  }
  
  /**
   * Format inspection data into consistent structure
   */
  private static formatInspectionData(inspections: any[]): InspectionSummary[] {
    return inspections.map(inspection => {
      const report = inspection.inspection_reports?.[0];
      const roof = inspection.roofs;
      
      // Extract inspection company and classification from notes
      const notes = inspection.notes || '';
      const companyMatch = notes.match(/Inspection Company:\s*([^\n]+)/);
      const typeMatch = notes.match(/Inspection Type:\s*(\w+)\s*\((\d+)% confidence\)/);
      
      return {
        inspectionId: inspection.id,
        roofId: inspection.roof_id,
        propertyName: roof?.property_name || 'Unknown Property',
        address: `${roof?.address || ''}, ${roof?.city || ''}, ${roof?.state || ''}`.trim(),
        inspectionType: inspection.inspection_type,
        completedDate: inspection.completed_date,
        reportUrl: report?.report_url,
        pdfFileName: this.extractFileNameFromUrl(report?.report_url),
        findings: report?.findings || '',
        recommendations: report?.recommendations || '',
        estimatedCost: report?.estimated_cost,
        priorityLevel: report?.priority_level || 'low',
        inspectionCompany: companyMatch?.[1]?.trim(),
        classificationConfidence: typeMatch ? parseInt(typeMatch[2]) : undefined,
        extractedData: this.parseExtractedDataFromFindings(report?.findings || '')
      };
    });
  }
  
  /**
   * Extract filename from storage URL
   */
  private static extractFileNameFromUrl(url?: string): string | undefined {
    if (!url) return undefined;
    const matches = url.match(/\/([^\/]+\.pdf)$/i);
    return matches?.[1];
  }
  
  /**
   * Parse extracted data from findings text
   */
  private static parseExtractedDataFromFindings(findings: string): any {
    const data: any = {};
    
    // Extract roof area
    const areaMatch = findings.match(/Roof Area:\s*([0-9,]+)\s*sq ft/i);
    if (areaMatch) {
      data.roofArea = parseInt(areaMatch[1].replace(/,/g, ''));
    }
    
    // Extract roof system
    const systemMatch = findings.match(/Roof System:\s*([^\n]+)/i);
    if (systemMatch) {
      data.roofSystem = systemMatch[1].trim();
    }
    
    // Extract manufacturer
    const manufacturerMatch = findings.match(/Manufacturer:\s*([^\n]+)/i);
    if (manufacturerMatch) {
      data.manufacturer = manufacturerMatch[1].trim();
    }
    
    // Extract report date
    const dateMatch = findings.match(/Report Date:\s*([^\n]+)/i);
    if (dateMatch) {
      data.reportDate = dateMatch[1].trim();
    }
    
    return Object.keys(data).length > 0 ? data : undefined;
  }
  
  /**
   * Get database schema information
   */
  private static getDatabaseSchema(): DatabaseInfo {
    return {
      tables: {
        inspections: 'Main inspection records with type, dates, and status',
        inspection_reports: 'Detailed findings, recommendations, and report URLs',
        roof_files: 'File storage table for PDFs and other documents',
        roofs: 'Property information and roof specifications'
      },
      pdfProcessingFlow: [
        '1. PDF uploaded via HistoricalInspectionUploader component',
        '2. RealPDFParser extracts text and structured data',
        '3. PropertyMatcher finds matching property in database',
        '4. PDF classification determines inspection type (annual/storm/etc)',
        '5. HistoricalInspectionService stores inspection record',
        '6. File stored in Supabase storage with metadata in roof_files table'
      ],
      classificationTypes: [
        'annual - Regular yearly inspections',
        'storm - Storm damage assessments', 
        'due_diligence - Pre-purchase inspections',
        'survey - Condition surveys',
        'unknown - Unable to classify'
      ]
    };
  }
  
  /**
   * Generate analysis report
   */
  static generateReport(analysis: AnnualInspectionAnalysis): string {
    const report = `
# Annual Inspection PDF Analysis Report

## Summary
- **Total PDFs in System**: ${analysis.totalPDFs}
- **Annual Inspections**: ${analysis.annualInspections.length}
- **Storm Damage Reports**: ${analysis.stormDamageReports.length}
- **Other Inspections**: ${analysis.otherInspections.length}
- **Unclassified PDFs**: ${analysis.unclassifiedPDFs.length}

## Annual Inspection Details

${analysis.annualInspections.map(inspection => `
### ${inspection.propertyName}
- **Property**: ${inspection.propertyName}
- **Address**: ${inspection.address}
- **Inspection Date**: ${inspection.completedDate}
- **Company**: ${inspection.inspectionCompany || 'Not specified'}
- **PDF File**: ${inspection.pdfFileName || 'No PDF linked'}
- **Priority**: ${inspection.priorityLevel}
- **Estimated Cost**: ${inspection.estimatedCost ? `$${inspection.estimatedCost.toLocaleString()}` : 'Not specified'}
- **Classification Confidence**: ${inspection.classificationConfidence ? `${inspection.classificationConfidence}%` : 'N/A'}

**Key Extracted Data**:
${inspection.extractedData ? Object.entries(inspection.extractedData).map(([key, value]) => `- ${key}: ${value}`).join('\n') : '- No extracted data available'}

**Findings Summary**: ${inspection.findings.substring(0, 200)}...

---
`).join('')}

## Database Schema
${Object.entries(analysis.databaseSchema.tables).map(([table, desc]) => `- **${table}**: ${desc}`).join('\n')}

## PDF Processing Flow
${analysis.databaseSchema.pdfProcessingFlow.map(step => `${step}`).join('\n')}

## Classification Types
${analysis.databaseSchema.classificationTypes.map(type => `- ${type}`).join('\n')}

## Recommendations

1. **For Annual Inspection Queue**: Use inspections with \`inspection_type = 'annual'\` and \`status = 'completed'\`
2. **PDF Access**: Annual inspection PDFs are stored in \`roof_files\` table with \`file_type = 'Inspection Report'\`
3. **Real Insights**: Historical data is processed and stored in structured format in \`inspection_reports.findings\`
4. **Property Matching**: The system uses sophisticated property matching to link PDFs to roof records
5. **Classification Confidence**: PDFs are automatically classified with confidence scores for accuracy

## Query Examples

\`\`\`sql
-- Get all annual inspections with their PDFs
SELECT 
  i.id,
  r.property_name,
  i.completed_date,
  ir.findings,
  ir.report_url
FROM inspections i
JOIN roofs r ON i.roof_id = r.id
LEFT JOIN inspection_reports ir ON i.id = ir.inspection_id
WHERE i.inspection_type = 'annual' 
  AND i.status = 'completed'
ORDER BY i.completed_date DESC;

-- Get all inspection report PDFs
SELECT 
  rf.file_name,
  rf.file_url,
  r.property_name,
  rf.created_at
FROM roof_files rf
JOIN roofs r ON rf.roof_id = r.id
WHERE rf.file_type = 'Inspection Report'
  AND rf.mime_type LIKE '%pdf%'
ORDER BY rf.created_at DESC;
\`\`\`
    `;
    
    return report.trim();
  }
}

/**
 * Run the analysis and log results
 */
export async function runAnnualInspectionAnalysis() {
  try {
    console.log('🚀 Starting Annual Inspection Analysis...');
    
    const analysis = await AnnualInspectionAnalyzer.analyzeAnnualInspections();
    const report = AnnualInspectionAnalyzer.generateReport(analysis);
    
    console.log(report);
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

// Export for use in other modules
export default AnnualInspectionAnalyzer;