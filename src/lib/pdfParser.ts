// PDF Parser for Historical Inspection Reports
// This is a foundation that can be enhanced with real PDF parsing libraries

interface ExtractedInspectionData {
  inspectionDate: string;
  inspector?: string;
  findings: string[];
  issues: Array<{
    location: string;
    severity: 'high' | 'medium' | 'low';
    type: string;
    description: string;
    estimatedCost?: number;
    recurrenceCount?: number;
  }>;
  recommendations: string[];
  totalEstimatedCost?: number;
  photos?: Array<{
    location: string;
    description: string;
    // In real implementation, would extract image data
  }>;
  weatherConditions?: string;
  roofCondition?: string;
  urgentItems?: string[];
}

// Common issue keywords for pattern matching
const ISSUE_PATTERNS = {
  high: [
    'leak', 'active leak', 'water damage', 'structural damage', 
    'immediate attention', 'urgent', 'emergency', 'failing'
  ],
  medium: [
    'deterioration', 'aging', 'wear', 'minor damage', 'monitoring required',
    'sealant', 'caulking', 'ponding', 'drainage issue'
  ],
  low: [
    'routine maintenance', 'preventive', 'cosmetic', 'minor wear',
    'cleaning required', 'inspection recommended'
  ]
};

const LOCATION_PATTERNS = [
  'northwest', 'northeast', 'southwest', 'southeast', 'north', 'south', 'east', 'west',
  'hvac', 'penetration', 'parapet', 'corner', 'edge', 'center', 'perimeter',
  'drainage', 'gutter', 'downspout', 'membrane', 'flashing', 'roof access'
];

const COST_PATTERNS = [
  /\$[\d,]+\.?\d*/g,  // $1,234.56 format
  /\b\d+[\s,]?\d*\s*dollars?\b/gi,  // written dollar amounts
  /cost[:\s]+\$?([\d,]+\.?\d*)/gi  // "cost: $1234" patterns
];

export class PDFInspectionParser {
  
  // Main parsing function - in production would use pdf-parse or similar
  static async extractInspectionData(file: File): Promise<ExtractedInspectionData> {
    try {
      // For demo purposes, we'll simulate PDF parsing with mock data
      // In production, replace with actual PDF text extraction
      const mockText = await this.simulatePDFExtraction(file);
      
      return this.parseInspectionText(mockText, file.name);
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF inspection report');
    }
  }

  // Simulate PDF text extraction (replace with real PDF parser)
  private static async simulatePDFExtraction(file: File): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
    
    // Mock inspection report text based on filename
    const propertyName = this.extractPropertyName(file.name);
    
    return `
INSPECTION REPORT
Property: ${propertyName}
Date: October 15, 2024
Inspector: John Smith, Certified Roof Inspector

EXECUTIVE SUMMARY:
Overall roof condition is fair with several areas requiring attention.
Immediate repairs needed for northwest corner leak.

FINDINGS:
1. Active leak observed in northwest corner near HVAC unit
   - Water staining visible on interior ceiling
   - Estimated repair cost: $8,500
   - Priority: HIGH - Immediate attention required

2. Sealant deterioration around HVAC penetrations
   - Multiple units showing aging sealant
   - Estimated cost: $3,200
   - Priority: MEDIUM - Address within 6 months

3. Ponding water in drainage areas
   - Standing water observed after recent rainfall
   - May lead to membrane degradation
   - Estimated cost: $5,800
   - Priority: MEDIUM

4. Minor membrane wear along parapet walls
   - Normal aging, monitor for progression
   - Estimated cost: $2,100
   - Priority: LOW

RECOMMENDATIONS:
- Immediate repair of northwest corner leak
- Schedule HVAC sealant replacement within 6 months
- Improve drainage in ponding areas
- Continue annual inspection schedule
- Monitor parapet wall conditions

TOTAL ESTIMATED COSTS: $19,600

WEATHER CONDITIONS: Clear, 65°F, No precipitation

PHOTOS TAKEN:
- Northwest corner leak (3 photos)
- HVAC penetrations (5 photos)
- Drainage areas (4 photos)
- Overall roof condition (8 photos)
    `;
  }

  // Extract property name from filename
  private static extractPropertyName(filename: string): string {
    return filename
      .replace(/\.pdf$/i, '')
      .replace(/\s*-\s*(inspection|report|2024|2023).*$/i, '')
      .replace(/[_-]/g, ' ')
      .trim();
  }

  // Parse the extracted text to structured data
  private static parseInspectionText(text: string, filename: string): ExtractedInspectionData {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    
    const data: ExtractedInspectionData = {
      inspectionDate: this.extractDate(text),
      inspector: this.extractInspector(text),
      findings: this.extractFindings(text),
      issues: this.extractIssues(text),
      recommendations: this.extractRecommendations(text),
      totalEstimatedCost: this.extractTotalCost(text),
      weatherConditions: this.extractWeatherConditions(text),
      photos: this.extractPhotoReferences(text)
    };

    return data;
  }

  private static extractDate(text: string): string {
    // Look for date patterns
    const datePatterns = [
      /Date:\s*([^\n]+)/i,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
      /\b\d{1,2}\/\d{1,2}\/\d{4}/,
      /\b\d{4}-\d{2}-\d{2}/
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        // Convert to ISO format for consistency
        const dateStr = match[1] || match[0];
        try {
          return new Date(dateStr).toISOString().split('T')[0];
        } catch {
          return dateStr;
        }
      }
    }

    // Default to current date if no date found
    return new Date().toISOString().split('T')[0];
  }

  private static extractInspector(text: string): string | undefined {
    const inspectorPatterns = [
      /Inspector:\s*([^\n,]+)/i,
      /Inspected by:\s*([^\n,]+)/i,
      /By:\s*([^\n,]+)/i
    ];

    for (const pattern of inspectorPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private static extractFindings(text: string): string[] {
    const findings: string[] = [];
    const findingsSection = this.extractSection(text, 'FINDINGS', 'RECOMMENDATIONS');
    
    if (findingsSection) {
      // Split by numbered items or bullet points
      const items = findingsSection.split(/(?:\d+\.|[-•])\s+/).filter(Boolean);
      findings.push(...items.map(item => item.trim()));
    }

    return findings;
  }

  private static extractIssues(text: string): ExtractedInspectionData['issues'] {
    const issues: ExtractedInspectionData['issues'] = [];
    const findingsSection = this.extractSection(text, 'FINDINGS', 'RECOMMENDATIONS');
    
    if (findingsSection) {
      const items = findingsSection.split(/(?:\d+\.|[-•])\s+/).filter(Boolean);
      
      for (const item of items) {
        const issue = this.parseIssueItem(item);
        if (issue) {
          issues.push(issue);
        }
      }
    }

    return issues;
  }

  private static parseIssueItem(text: string): ExtractedInspectionData['issues'][0] | null {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    const title = lines[0];
    const description = lines.join(' ');

    // Extract location
    const location = this.extractLocation(description) || 'General area';
    
    // Determine severity
    const severity = this.determineSeverity(description);
    
    // Extract issue type
    const type = this.extractIssueType(description);
    
    // Extract cost
    const estimatedCost = this.extractCost(description);

    return {
      location,
      severity,
      type,
      description: description.substring(0, 200), // Limit length
      estimatedCost,
      recurrenceCount: 1 // Default, could be enhanced with historical data
    };
  }

  private static extractLocation(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    for (const location of LOCATION_PATTERNS) {
      if (lowerText.includes(location)) {
        // Return the location with proper capitalization
        const index = lowerText.indexOf(location);
        return text.substring(index, index + location.length);
      }
    }

    return null;
  }

  private static determineSeverity(text: string): 'high' | 'medium' | 'low' {
    const lowerText = text.toLowerCase();
    
    // Check for high priority keywords
    for (const keyword of ISSUE_PATTERNS.high) {
      if (lowerText.includes(keyword)) {
        return 'high';
      }
    }

    // Check for medium priority keywords
    for (const keyword of ISSUE_PATTERNS.medium) {
      if (lowerText.includes(keyword)) {
        return 'medium';
      }
    }

    // Default to low if no specific indicators
    return 'low';
  }

  private static extractIssueType(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Common issue types
    const issueTypes = [
      'leak', 'water damage', 'sealant failure', 'membrane damage',
      'ponding water', 'drainage issue', 'structural damage', 'wear',
      'deterioration', 'cracking', 'separation', 'puncture'
    ];

    for (const type of issueTypes) {
      if (lowerText.includes(type)) {
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
    }

    return 'General issue';
  }

  private static extractCost(text: string): number | undefined {
    for (const pattern of COST_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        const costStr = matches[0].replace(/[^\d.]/g, '');
        const cost = parseFloat(costStr);
        if (!isNaN(cost)) {
          return cost;
        }
      }
    }

    return undefined;
  }

  private static extractRecommendations(text: string): string[] {
    const recommendations: string[] = [];
    const recSection = this.extractSection(text, 'RECOMMENDATIONS', 'TOTAL');
    
    if (recSection) {
      const items = recSection.split(/(?:[-•]|\d+\.)\s+/).filter(Boolean);
      recommendations.push(...items.map(item => item.trim()));
    }

    return recommendations;
  }

  private static extractTotalCost(text: string): number | undefined {
    const totalPatterns = [
      /TOTAL.*?COST[S]?:\s*\$?([\d,]+\.?\d*)/i,
      /Total:\s*\$?([\d,]+\.?\d*)/i
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        const costStr = match[1].replace(/,/g, '');
        const cost = parseFloat(costStr);
        if (!isNaN(cost)) {
          return cost;
        }
      }
    }

    return undefined;
  }

  private static extractWeatherConditions(text: string): string | undefined {
    const weatherPattern = /WEATHER.*?:\s*([^\n]+)/i;
    const match = text.match(weatherPattern);
    return match ? match[1].trim() : undefined;
  }

  private static extractPhotoReferences(text: string): Array<{location: string; description: string}> {
    const photos: Array<{location: string; description: string}> = [];
    const photoSection = this.extractSection(text, 'PHOTOS', null);
    
    if (photoSection) {
      const lines = photoSection.split('\n').filter(Boolean);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('photo')) {
          const location = this.extractLocation(trimmed) || 'General area';
          photos.push({
            location,
            description: trimmed
          });
        }
      }
    }

    return photos;
  }

  private static extractSection(text: string, startMarker: string, endMarker: string | null): string | null {
    const startIndex = text.toUpperCase().indexOf(startMarker.toUpperCase());
    if (startIndex === -1) return null;

    const startPos = startIndex + startMarker.length;
    let endPos = text.length;

    if (endMarker) {
      const endIndex = text.toUpperCase().indexOf(endMarker.toUpperCase(), startPos);
      if (endIndex !== -1) {
        endPos = endIndex;
      }
    }

    return text.substring(startPos, endPos).trim();
  }
}

// Export utility functions for use in components
export const parsePDFInspectionReport = PDFInspectionParser.extractInspectionData;