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
      return this.extractFromFilename(file.name);
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
      repairingContractor: ''
    };
  }
}