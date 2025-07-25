import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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
  inspectionTypeClassification: {
    primaryType: 'annual' | 'storm' | 'due_diligence' | 'survey' | 'unknown';
    confidence: number;
    indicators: string[];
  };
  
  // Roof Specifications
  roofArea: number;
  roofSystem: string;
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
  
  // Additional Data
  extractedText: string;
  pageCount: number;
}

export class RealPDFParser {
  /**
   * Extract text and structured data from PDF file
   */
  static async extractPDFData(file: File): Promise<ExtractedPDFData> {
    try {
      console.log('Starting PDF extraction for file:', file.name);
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log('PDF loaded successfully, pages:', pdf.numPages);
      
      // Extract text from all pages
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      console.log('Extracted text length:', fullText.length);
      console.log('Sample text:', fullText.substring(0, 500));
      
      // Parse structured data from extracted text
      const parsedData = this.parseStructuredData(fullText, file.name);
      
      return {
        ...parsedData,
        extractedText: fullText,
        pageCount: pdf.numPages
      };
      
    } catch (error) {
      console.error('Error extracting PDF data:', error);
      
      // Fallback to filename-based extraction if PDF parsing fails
      console.log('Falling back to filename-based extraction');
      const fallbackData = this.extractFromFilename(file.name);
      return {
        ...fallbackData,
        extractedText: '',
        pageCount: 0
      };
    }
  }
  
  /**
   * Parse structured data from extracted PDF text
   */
  private static parseStructuredData(text: string, filename: string): Omit<ExtractedPDFData, 'extractedText' | 'pageCount'> {
    console.log('Parsing structured data from PDF text');
    
    // Property Name - look for patterns like "Dallas Corporate Center 2"
    const propertyNameMatch = text.match(/(?:Dallas Corporate Center|DFW Corporate Center|Commerce Center|Distribution Center|Logistics Center|Corporate Center|Data Center)[\s\d]*/i) ||
                             text.match(/Property:\s*([^\n]+)/i) ||
                             text.match(/Building:\s*([^\n]+)/i);
    const propertyName = propertyNameMatch ? propertyNameMatch[0].trim() : this.extractPropertyFromFilename(filename);
    
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
    
    // Roof System
    const roofSystemMatch = text.match(/Roof System\s*:?\s*([^\n]+)/i) ||
                           text.match(/(BUR|TPO|EPDM|Modified Bitumen|PVC|Metal|Shingle|Tile)/i);
    const roofSystem = roofSystemMatch ? roofSystemMatch[1]?.trim() || roofSystemMatch[0]?.trim() : '';
    
    // System Description
    const systemDescMatch = text.match(/System Description\s*:?\s*([^\n]+)/i) ||
                           text.match(/(\d+-Ply\s+[^\n]+)/i);
    const systemDescription = systemDescMatch ? systemDescMatch[1]?.trim() || systemDescMatch[0]?.trim() : '';
    
    // LTTR Value
    const lttrMatch = text.match(/(?:Estimated\s+)?LTTR[^:\n]*:?\s*([^\n]+)/i);
    const estimatedLTTRValue = lttrMatch ? lttrMatch[1]?.trim() : '';
    
    // Perimeter Detail
    const perimeterMatch = text.match(/Perimeter Detail\s*:?\s*([^\n]+)/i);
    const perimeterDetail = perimeterMatch ? perimeterMatch[1]?.trim() : '';
    
    // Flashing Detail
    const flashingMatch = text.match(/Flashing Detail\s*:?\s*([^\n]+)/i);
    const flashingDetail = flashingMatch ? flashingMatch[1]?.trim() : '';
    
    // Drainage System
    const drainageMatch = text.match(/Drainage System\s*:?\s*([^\n]+)/i);
    const drainageSystem = drainageMatch ? drainageMatch[1]?.trim() : '';
    
    // Manufacturer
    const manufacturerMatch = text.match(/Manufacturer\s*:?\s*([^\n]+)/i) ||
                             text.match(/(Johns Manville|GAF|Firestone|Carlisle|Sika|Tremco)/i);
    const manufacturer = manufacturerMatch ? manufacturerMatch[1]?.trim() || manufacturerMatch[0]?.trim() : '';
    
    // Warranty
    const warrantyMatch = text.match(/Warranty\s*:?\s*([^\n]+)/i);
    const warranty = warrantyMatch ? warrantyMatch[1]?.trim() : '';
    
    // Warranty Expiration
    const warrantyExpMatch = text.match(/(?:Warranty\s+)?Expiration\s*:?\s*([^\n]+)/i);
    const warrantyExpiration = warrantyExpMatch ? warrantyExpMatch[1]?.trim() : '';
    
    // Installing Contractor
    const installingMatch = text.match(/Installing Contractor\s*:?\s*([^\n]+)/i);
    const installingContractor = installingMatch ? installingMatch[1]?.trim() : '';
    
    // Repairing Contractor
    const repairingMatch = text.match(/Repairing Contractor\s*:?\s*([^\n]+)/i);
    const repairingContractor = repairingMatch ? repairingMatch[1]?.trim() : '';
    
    console.log('Parsed property name:', propertyName);
    console.log('Parsed address:', address);
    console.log('Parsed roof area:', roofArea);
    
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
      inspectionTypeClassification: this.classifyInspectionType(fullText, reportType),
      roofArea,
      roofSystem,
      systemDescription,
      estimatedLTTRValue,
      perimeterDetail,
      flashingDetail,
      drainageSystem,
      manufacturer,
      warranty,
      warrantyExpiration,
      installingContractor,
      repairingContractor
    };
  }
  
  /**
   * Extract property name from filename as fallback
   */
  private static extractPropertyFromFilename(filename: string): string {
    // Remove file extension
    let cleanName = filename.replace(/\.[^/.]+$/, '');
    
    // Remove common report suffixes
    cleanName = cleanName.replace(/_?(STORM_DAMAGE|ANNUAL|QUARTERLY|MONTHLY)_Report.*$/i, '');
    cleanName = cleanName.replace(/_?\d{4}-\d{2}-\d{2}_\d{4}$/i, '');
    
    // Replace underscores with spaces
    cleanName = cleanName.replace(/_/g, ' ');
    
    // Clean up multiple spaces
    cleanName = cleanName.replace(/\s+/g, ' ').trim();
    
    return cleanName;
  }
  
  /**
   * Fallback extraction if PDF parsing fails
   */
  private static extractFromFilename(filename: string): Omit<ExtractedPDFData, 'extractedText' | 'pageCount'> {
    const propertyName = this.extractPropertyFromFilename(filename);
    
    return {
      propertyName,
      address: '',
      client: '',
      propertyManager: '',
      propertyManagerPhone: '',
      market: '',
      reportType: 'INSPECTION REPORT',
      reportDate: '',
      inspectionCompany: '',
      roofArea: 0,
      roofSystem: '',
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
      inspectionTypeClassification: {
        primaryType: 'unknown',
        confidence: 0,
        indicators: []
      }
    };
  }
  
  /**
   * Classify inspection type based on content analysis
   */
  private static classifyInspectionType(text: string, reportType: string): ExtractedPDFData['inspectionTypeClassification'] {
    const lowerText = text.toLowerCase();
    const lowerReportType = reportType.toLowerCase();
    const indicators: string[] = [];
    
    // Define patterns for each inspection type
    const typePatterns = {
      storm: {
        keywords: ['storm', 'hurricane', 'hail', 'wind damage', 'storm damage', 'weather event', 'catastrophic', 'emergency'],
        weight: 3
      },
      annual: {
        keywords: ['annual', 'yearly', 'routine', 'scheduled', 'preventive', 'maintenance', 'regular'],
        weight: 2
      },
      due_diligence: {
        keywords: ['due diligence', 'acquisition', 'purchase', 'transaction', 'assessment', 'property condition', 'pca', 'buyer'],
        weight: 3
      },
      survey: {
        keywords: ['survey', 'condition survey', 'roof survey', 'assessment survey', 'comprehensive survey', 'detailed survey'],
        weight: 2
      }
    };
    
    // Score each type
    const scores: Record<string, number> = {
      storm: 0,
      annual: 0,
      due_diligence: 0,
      survey: 0
    };
    
    // Check patterns in both report type and full text
    for (const [type, pattern] of Object.entries(typePatterns)) {
      for (const keyword of pattern.keywords) {
        // Check in report type (higher weight)
        if (lowerReportType.includes(keyword)) {
          scores[type] += pattern.weight * 2;
          indicators.push(`Report type contains "${keyword}"`);
        }
        // Check in full text
        if (lowerText.includes(keyword)) {
          scores[type] += pattern.weight;
          const count = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
          if (count > 1) {
            scores[type] += pattern.weight * (count - 1) * 0.5;
            indicators.push(`Found "${keyword}" ${count} times in document`);
          }
        }
      }
    }
    
    // Additional context-based scoring
    if (lowerText.includes('damage assessment') || lowerText.includes('storm event')) {
      scores.storm += 5;
      indicators.push('Contains damage assessment or storm event references');
    }
    
    if (lowerText.match(/\d{4}\s*annual\s*inspection/i)) {
      scores.annual += 5;
      indicators.push('Contains year + annual inspection pattern');
    }
    
    if (lowerText.includes('property acquisition') || lowerText.includes('real estate transaction')) {
      scores.due_diligence += 5;
      indicators.push('Contains acquisition or transaction references');
    }
    
    if (lowerText.includes('roof condition survey') || lowerText.includes('comprehensive roof survey')) {
      scores.survey += 5;
      indicators.push('Contains roof survey terminology');
    }
    
    // Find the type with highest score
    let bestType: 'annual' | 'storm' | 'due_diligence' | 'survey' | 'unknown' = 'unknown';
    let bestScore = 0;
    
    for (const [type, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type as any;
      }
    }
    
    // Calculate confidence (0-1 scale)
    const maxPossibleScore = 30; // Approximate maximum score
    const confidence = Math.min(1, bestScore / maxPossibleScore);
    
    // If confidence is too low, mark as unknown
    if (confidence < 0.2 || bestScore === 0) {
      bestType = 'unknown';
    }
    
    return {
      primaryType: bestType,
      confidence: bestScore > 0 ? confidence : 0,
      indicators: indicators.slice(0, 5) // Keep top 5 indicators
    };
  }
}