import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set worker path for pdfjs-dist
GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.min.js`;

export interface ExtractedPDFData {
  // Property Information
  propertyName: string;
  address: string;
  client: string;
  propertyManager: string;
  propertyManagerPhone: string;
  market: string;

  // Report Information
  reportType: string;
  reportDate: string;
  inspectionCompany: string;

  // Advanced Inspection Classification
  roofType: string;
  roofSystem: string; // Added for backward compatibility
  roofArea: number;
  inspectionType: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Inspection Type Classification (for backward compatibility)
  inspectionTypeClassification: {
    primaryType: 'annual' | 'storm' | 'due_diligence' | 'survey' | 'unknown';
    confidence: number;
    indicators: string[];
  };

  // Roof Specifications (for backward compatibility)
  systemDescription: string;
  estimatedLTTRValue: string;
  perimeterDetail: string;
  flashingDetail: string;
  drainageSystem: string;
  manufacturer: string;
  warranty: string;
  warrantyExpiration: string;
  installingContractor: string;
  repairingContractor: string;

  // Issues and Conditions
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    location: string;
    description: string;
    recommendation: string;
    estimatedCost?: number;
  }>;

  // Summary and Recommendations
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  priorityActions: string[];
  estimatedRepairCost: number;
  recommendedTimeframe: string;

  // Raw extracted text for reference
  rawText: string;
  extractedText: string; // Added for backward compatibility (alias for rawText)
  pageCount: number; // Added for backward compatibility
}

export async function extractPDFData(file: File): Promise<ExtractedPDFData> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // CHANGED: Use named import instead of star import
    const pdf = await getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    // Parse the extracted text using AI-powered extraction
    const extractedData = await parseInspectionReport(fullText);

    return {
      ...extractedData,
      rawText: fullText,
      extractedText: fullText, // Backward compatibility alias
      pageCount: pdf.numPages
    };
  } catch (error) {
    console.error('Error extracting PDF data:', error);
    throw new Error(`Failed to extract PDF data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function parseInspectionReport(text: string): Promise<Omit<ExtractedPDFData, 'rawText' | 'extractedText' | 'pageCount'>> {
  const lowerText = text.toLowerCase();
  
  // Property Name - look for patterns like "Dallas Corporate Center 2"
  const propertyNameMatch = text.match(/(?:Dallas Corporate Center|DFW Corporate Center|Commerce Center|Distribution Center|Logistics Center|Corporate Center|Data Center)[\s\d]*/i) ||
                           text.match(/Property:\s*([^\n]+)/i) ||
                           text.match(/Building:\s*([^\n]+)/i);
  const propertyName = propertyNameMatch ? propertyNameMatch[0].trim() : '';
  
  // Address - look for street addresses
  const addressMatch = text.match(/\d+\s+[A-Za-z\s]+(?:Drive|Dr|Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Center|Ctr|Circle|Cir|Plaza|Way)\s*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s+\d{5}/i);
  const address = addressMatch ? addressMatch[0].trim() : '';
  
  // Client - look for client patterns
  const clientMatch = text.match(/Client\s*:?\s*([^\n]+)/i) ||
                     text.match(/Property Owner\s*:?\s*([^\n]+)/i) ||
                     text.match(/(Prologis|CBRE|Cushman|JLL|Colliers)/i);
  const client = clientMatch ? clientMatch[1]?.trim() || clientMatch[0]?.trim() : '';
  
  // Property Manager
  const pmMatch = text.match(/Property Manager\s*:?\s*([^\n]+)/i) ||
                 text.match(/PM\s*:?\s*([^\n]+)/i);
  const propertyManager = pmMatch ? pmMatch[1]?.trim() : '';
  
  // Property Manager Phone
  const phoneMatch = text.match(/(?:Phone|Office|Tel)\s*:?\s*(\d{3}[-.]?\d{3}[-.]?\d{4})/i);
  const propertyManagerPhone = phoneMatch ? phoneMatch[1] : '';
  
  // Market
  const marketMatch = text.match(/Market\s*:?\s*([^\n]+)/i) ||
                     text.match(/(Dallas|Houston|Austin|San Antonio|Fort Worth|Atlanta|Phoenix|Denver|Chicago|New York)/i);
  const market = marketMatch ? marketMatch[1]?.trim() || marketMatch[0]?.trim() : '';
  
  // Report Type
  const reportTypeMatch = text.match(/(STORM DAMAGE|ANNUAL|QUARTERLY|MONTHLY|EMERGENCY|ROUTINE)\s+(?:DAMAGE\s+)?INSPECTION\s+REPORT/i) ||
                         text.match(/Report Type\s*:?\s*([^\n]+)/i);
  const reportType = reportTypeMatch ? reportTypeMatch[0]?.trim() || reportTypeMatch[1]?.trim() : 'INSPECTION REPORT';
  
  // Report Date
  const dateMatch = text.match(/(?:MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{1,2},?\s+\d{4}/i) ||
                   text.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/i) ||
                   text.match(/Date\s*:?\s*([^\n]+)/i);
  const reportDate = dateMatch ? dateMatch[0]?.trim() || dateMatch[1]?.trim() : '';
  
  // Inspection Company
  const inspectionCompanyMatch = text.match(/ROOF CONTROLLER|RoofController|Roof Controller/i) ||
                                text.match(/Inspector\s*:?\s*([^\n]+)/i);
  const inspectionCompany = inspectionCompanyMatch ? inspectionCompanyMatch[0]?.trim() || inspectionCompanyMatch[1]?.trim() : 'ROOF CONTROLLER';
  
  // Roof Area - look for square footage
  const roofAreaMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*(?:sq\s*)?ft[²2]?/i) ||
                       text.match(/Roof Area\s*:?\s*(\d+(?:,\d+)*)/i);
  const roofAreaStr = roofAreaMatch ? roofAreaMatch[1].replace(/,/g, '') : '0';
  const roofArea = parseInt(roofAreaStr) || 0;
  
  // Roof Type/System
  const roofTypeMatch = text.match(/Roof System\s*:?\s*([^\n]+)/i) ||
                       text.match(/(BUR|TPO|EPDM|Modified Bitumen|PVC|Metal|Shingle|Tile)/i);
  const roofType = roofTypeMatch ? roofTypeMatch[1]?.trim() || roofTypeMatch[0]?.trim() : '';
  
  // Inspection Type Classification
  let inspectionType = 'unknown';
  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  
  if (lowerText.includes('storm') || lowerText.includes('damage')) {
    inspectionType = 'storm';
    urgencyLevel = 'high';
  } else if (lowerText.includes('annual') || lowerText.includes('routine')) {
    inspectionType = 'annual';
    urgencyLevel = 'low';
  } else if (lowerText.includes('emergency')) {
    inspectionType = 'emergency';
    urgencyLevel = 'critical';
  }
  
  // Extract issues (simplified)
  const issues: ExtractedPDFData['issues'] = [];
  
  // Look for common issue patterns
  const issuePatterns = [
    /(?:ponding|standing) water/gi,
    /membrane damage/gi,
    /flashing issues?/gi,
    /drain(?:age)? problems?/gi,
    /loose materials?/gi
  ];
  
  issuePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        issues.push({
          type: match.toLowerCase(),
          severity: 'medium',
          location: 'Roof surface',
          description: match,
          recommendation: 'Further inspection recommended'
        });
      });
    }
  });
  
  // Overall condition assessment
  let overallCondition: ExtractedPDFData['overallCondition'] = 'fair';
  if (lowerText.includes('excellent') || lowerText.includes('like new')) {
    overallCondition = 'excellent';
  } else if (lowerText.includes('good condition')) {
    overallCondition = 'good';
  } else if (lowerText.includes('poor') || lowerText.includes('deteriorated')) {
    overallCondition = 'poor';
  } else if (lowerText.includes('critical') || lowerText.includes('immediate')) {
    overallCondition = 'critical';
  }
  
  // Priority actions
  const priorityActions: string[] = [];
  if (issues.length > 0) {
    priorityActions.push('Address identified issues');
  }
  if (lowerText.includes('leak')) {
    priorityActions.push('Investigate potential leaks');
  }
  
  // Estimated repair cost (simplified calculation)
  const estimatedRepairCost = issues.length * 1000; // Basic estimate
  
  // Recommended timeframe
  let recommendedTimeframe = '6-12 months';
  if (urgencyLevel === 'critical') {
    recommendedTimeframe = 'Immediate';
  } else if (urgencyLevel === 'high') {
    recommendedTimeframe = '1-3 months';
  }

  return {
    propertyName,
    address,
    client,
    propertyManager,
    propertyManagerPhone,
    market,
    reportType,
    reportDate,
    inspectionCompany,
    roofType,
    roofSystem: roofType, // Use roofType as roofSystem for compatibility
    roofArea,
    inspectionType,
    urgencyLevel,
    inspectionTypeClassification: {
      primaryType: inspectionType as any,
      confidence: urgencyLevel === 'critical' ? 0.9 : urgencyLevel === 'high' ? 0.7 : 0.5,
      indicators: [inspectionType, urgencyLevel]
    },
    // Additional fields for backward compatibility
    systemDescription: '',
    estimatedLTTRValue: '',
    perimeterDetail: '',
    flashingDetail: '',
    drainageSystem: '',
    manufacturer: '',
    warranty: '',
    warrantyExpiration: '',
    installingContractor: '',
    repairingContractor: '',
    issues,
    overallCondition,
    priorityActions,
    estimatedRepairCost,
    recommendedTimeframe
  };
}

// Export RealPDFParser class for backward compatibility
export class RealPDFParser {
  static async extractPDFData(file: File): Promise<ExtractedPDFData> {
    return extractPDFData(file);
  }
}