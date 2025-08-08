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
  
  // Enhanced Inspection Type Classification
  const inspectionTypeResult = classifyInspectionType(text, reportType);
  const inspectionType = inspectionTypeResult.type;
  const urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = inspectionTypeResult.urgency;
  
  // Extract issues with enhanced pattern matching
  const issues: ExtractedPDFData['issues'] = [];
  
  // Enhanced deficiency extraction
  const enhancedIssues = extractDeficienciesFromText(text);
  issues.push(...enhancedIssues);
  
  // Legacy patterns as fallback
  const issuePatterns = [
    { pattern: /(?:ponding|standing) water/gi, severity: 'high' as const, type: 'ponding water', location: 'Roof surface' },
    { pattern: /membrane damage/gi, severity: 'high' as const, type: 'membrane damage', location: 'Roof membrane' },
    { pattern: /flashing issues?/gi, severity: 'medium' as const, type: 'flashing issues', location: 'Perimeter flashing' },
    { pattern: /drain(?:age)? problems?/gi, severity: 'medium' as const, type: 'drainage problems', location: 'Roof drains' },
    { pattern: /loose materials?/gi, severity: 'medium' as const, type: 'loose materials', location: 'Roof surface' }
  ];
  
  issuePatterns.forEach(({ pattern, severity, type, location }) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Avoid duplicates from enhanced extraction
        const exists = issues.some(issue => 
          issue.type.toLowerCase().includes(type.toLowerCase()) || 
          issue.description.toLowerCase().includes(match.toLowerCase())
        );
        
        if (!exists) {
          issues.push({
            type: type,
            severity: severity,
            location: location,
            description: match,
            recommendation: `Address ${type} during next maintenance cycle`,
            estimatedCost: severity === 'high' ? 2500 : severity === 'medium' ? 1500 : 800
          });
        }
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
      confidence: inspectionTypeResult.confidence,
      indicators: inspectionTypeResult.indicators
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

/**
 * Enhanced deficiency extraction from PDF text
 */
function extractDeficienciesFromText(text: string): ExtractedPDFData['issues'] {
  const issues: ExtractedPDFData['issues'] = [];
  const lines = text.split('\n');
  
  // Look for structured deficiency patterns
  const deficiencyPatterns = [
    // Pattern 1: "Issue: Description - Location - Severity - Cost"
    /(?:ISSUE|DEFICIENCY|PROBLEM|CONCERN)\s*[:\-]\s*(.+?)\s*\-\s*(.+?)\s*\-\s*(LOW|MEDIUM|HIGH|CRITICAL)\s*\-?\s*\$?(\d+(?:,\d+)?)?/gi,
    
    // Pattern 2: "Location: Issue description (Severity) $Cost"
    /(.+?):\s*(.+?)\s*\((LOW|MEDIUM|HIGH|CRITICAL)\)\s*\$?(\d+(?:,\d+)?)?/gi,
    
    // Pattern 3: Bullet points with issues
    /[•·]\s*(.+?)\s*\-\s*(.+?)\s*\(?(LOW|MEDIUM|HIGH|CRITICAL)\)?/gi,
    
    // Pattern 4: Numbered issues
    /\d+\.\s*(.+?)\s*\-\s*(.+?)(?:\s*\$(\d+(?:,\d+)?)?)?/gi
  ];

  // Search for executive summary section
  const executiveSummaryMatch = text.match(/(?:EXECUTIVE\s+SUMMARY|SUMMARY\s+OF\s+FINDINGS|KEY\s+FINDINGS)([\s\S]*?)(?:\n\n|\n[A-Z\s]{3,}:)/i);
  if (executiveSummaryMatch) {
    const summaryText = executiveSummaryMatch[1];
    issues.push(...extractIssuesFromSection(summaryText, 'Executive Summary'));
  }

  // Search for deficiencies section
  const deficienciesMatch = text.match(/(?:DEFICIENCIES|ISSUES\s+IDENTIFIED|PROBLEMS\s+FOUND|REPAIRS\s+NEEDED)([\s\S]*?)(?:\n\n|\n[A-Z\s]{3,}:)/i);
  if (deficienciesMatch) {
    const deficienciesText = deficienciesMatch[1];
    issues.push(...extractIssuesFromSection(deficienciesText, 'Deficiencies'));
  }

  // Search for findings section
  const findingsMatch = text.match(/(?:FINDINGS|OBSERVATIONS|INSPECTION\s+RESULTS)([\s\S]*?)(?:\n\n|\n[A-Z\s]{3,}:)/i);
  if (findingsMatch) {
    const findingsText = findingsMatch[1];
    issues.push(...extractIssuesFromSection(findingsText, 'Findings'));
  }

  // Search for recommendations that might contain deficiencies
  const recommendationsMatch = text.match(/(?:RECOMMENDATIONS|IMMEDIATE\s+ACTIONS?|PRIORITY\s+REPAIRS?)([\s\S]*?)(?:\n\n|\n[A-Z\s]{3,}:)/i);
  if (recommendationsMatch) {
    const recommendationsText = recommendationsMatch[1];
    issues.push(...extractIssuesFromSection(recommendationsText, 'Recommendations'));
  }

  // Apply general patterns to entire text
  deficiencyPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [, location, description, severity, cost] = match;
      
      if (location && description) {
        const estimatedCost = cost ? parseInt(cost.replace(/,/g, '')) : undefined;
        const normalizedSeverity = normalizeSeverity(severity || 'medium');
        
        // Avoid duplicates
        const exists = issues.some(issue => 
          issue.description.toLowerCase().includes(description.toLowerCase().substring(0, 20)) ||
          issue.location.toLowerCase().includes(location.toLowerCase().substring(0, 20))
        );
        
        if (!exists && description.length > 10) {
          issues.push({
            type: extractIssueType(description),
            severity: normalizedSeverity,
            location: location.trim(),
            description: description.trim(),
            recommendation: `Address ${description.toLowerCase()} during maintenance`,
            estimatedCost: estimatedCost || estimateCostBySeverity(normalizedSeverity)
          });
        }
      }
    }
  });

  // Extract location-specific issues
  const locationPatterns = [
    /(?:NORTH|SOUTH|EAST|WEST|NORTHWEST|NORTHEAST|SOUTHWEST|SOUTHEAST)\s+(?:CORNER|SIDE|SECTION|AREA|WALL)\s*:?\s*([^\n]+)/gi,
    /(?:ROOF\s+)?(?:PERIMETER|EDGE|CENTER|MIDDLE)\s*:?\s*([^\n]+)/gi,
    /(?:HVAC|EQUIPMENT|UNIT)\s*\d*\s*:?\s*([^\n]+)/gi
  ];

  locationPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [fullMatch, description] = match;
      const location = fullMatch.split(':')[0].trim();
      
      if (description && description.length > 10) {
        const severity = determineSeverityFromDescription(description);
        
        const exists = issues.some(issue => 
          issue.location.toLowerCase().includes(location.toLowerCase()) ||
          issue.description.toLowerCase().includes(description.toLowerCase().substring(0, 20))
        );
        
        if (!exists) {
          issues.push({
            type: extractIssueType(description),
            severity: severity,
            location: location,
            description: description.trim(),
            recommendation: `Inspect and repair ${location.toLowerCase()}`,
            estimatedCost: estimateCostBySeverity(severity)
          });
        }
      }
    }
  });

  return issues.slice(0, 25); // Limit to top 25 issues to avoid overwhelming
}

/**
 * Extract issues from a specific section of text
 */
function extractIssuesFromSection(sectionText: string, sectionName: string): ExtractedPDFData['issues'] {
  const issues: ExtractedPDFData['issues'] = [];
  const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  for (const line of lines) {
    // Skip headers and very short lines
    if (line.length < 15 || /^[A-Z\s]{3,}:?$/.test(line)) continue;

    // Look for bullet points or numbered items
    const bulletMatch = line.match(/^[•·\-\*]\s*(.+)/) || line.match(/^\d+\.\s*(.+)/);
    if (bulletMatch) {
      const description = bulletMatch[1];
      const location = extractLocationFromDescription(description);
      const severity = determineSeverityFromDescription(description);
      const type = extractIssueType(description);

      if (description.length > 10) {
        issues.push({
          type: type,
          severity: severity,
          location: location,
          description: description,
          recommendation: `Address issue identified in ${sectionName.toLowerCase()}`,
          estimatedCost: estimateCostBySeverity(severity)
        });
      }
    }
  }

  return issues;
}

/**
 * Normalize severity levels from text
 */
function normalizeSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
  const s = severity.toLowerCase();
  if (s.includes('critical') || s.includes('emergency') || s.includes('immediate')) return 'critical';
  if (s.includes('high') || s.includes('urgent') || s.includes('serious')) return 'high';
  if (s.includes('low') || s.includes('minor')) return 'low';
  return 'medium';
}

/**
 * Determine severity from description content
 */
function determineSeverityFromDescription(description: string): 'low' | 'medium' | 'high' | 'critical' {
  const lower = description.toLowerCase();
  
  // Critical indicators
  if (lower.includes('immediate') || lower.includes('emergency') || lower.includes('critical') ||
      lower.includes('fail') || lower.includes('collapse') || lower.includes('danger') ||
      lower.includes('leak') && lower.includes('active')) {
    return 'critical';
  }
  
  // High severity indicators
  if (lower.includes('severe') || lower.includes('major') || lower.includes('significant') ||
      lower.includes('damage') || lower.includes('deteriorat') || lower.includes('wear') ||
      lower.includes('crack') || lower.includes('tear') || lower.includes('missing')) {
    return 'high';
  }
  
  // Low severity indicators
  if (lower.includes('minor') || lower.includes('cosmetic') || lower.includes('clean') ||
      lower.includes('maintain') || lower.includes('monitor') || lower.includes('observe')) {
    return 'low';
  }
  
  return 'medium';
}

/**
 * Extract issue type from description
 */
function extractIssueType(description: string): string {
  const lower = description.toLowerCase();
  
  if (lower.includes('membrane') || lower.includes('surface')) return 'membrane issues';
  if (lower.includes('flash')) return 'flashing issues';
  if (lower.includes('drain') || lower.includes('water') && !lower.includes('ponding')) return 'drainage issues';
  if (lower.includes('ponding')) return 'ponding water';
  if (lower.includes('penetrat')) return 'penetration issues';
  if (lower.includes('equipment') || lower.includes('hvac')) return 'equipment issues';
  if (lower.includes('gutter')) return 'gutter issues';
  if (lower.includes('debris')) return 'debris';
  if (lower.includes('structural') || lower.includes('support')) return 'structural issues';
  if (lower.includes('curb')) return 'curb issues';
  
  return 'general maintenance';
}

/**
 * Extract location from description
 */
function extractLocationFromDescription(description: string): string {
  const locationKeywords = [
    'north', 'south', 'east', 'west', 'northwest', 'northeast', 'southwest', 'southeast',
    'corner', 'edge', 'center', 'middle', 'perimeter', 'roof', 'equipment', 'hvac',
    'drain', 'gutter', 'flashing', 'membrane', 'surface'
  ];
  
  const lower = description.toLowerCase();
  for (const keyword of locationKeywords) {
    if (lower.includes(keyword)) {
      // Try to extract the context around the keyword
      const words = description.split(' ');
      const keywordIndex = words.findIndex(word => word.toLowerCase().includes(keyword));
      if (keywordIndex >= 0) {
        const startIndex = Math.max(0, keywordIndex - 1);
        const endIndex = Math.min(words.length, keywordIndex + 2);
        return words.slice(startIndex, endIndex).join(' ');
      }
      return keyword;
    }
  }
  
  return 'General roof area';
}

/**
 * Estimate cost based on severity
 */
function estimateCostBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): number {
  switch (severity) {
    case 'critical': return 5000;
    case 'high': return 2500;
    case 'medium': return 1200;
    case 'low': return 500;
    default: return 1000;
  }
}

/**
 * Enhanced inspection type classification
 */
function classifyInspectionType(text: string, reportType: string): {
  type: 'annual' | 'storm' | 'due_diligence' | 'survey' | 'unknown';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  indicators: string[];
} {
  const lowerText = text.toLowerCase();
  const lowerReportType = reportType.toLowerCase();
  const indicators: string[] = [];
  let confidence = 0;
  
  // Storm damage indicators (highest priority)
  const stormIndicators = [
    'storm damage', 'hail damage', 'wind damage', 'hurricane', 'tornado',
    'insurance claim', 'claim inspection', 'storm assessment', 'weather damage',
    'emergency repair', 'immediate repair', 'storm report', 'damage assessment'
  ];
  
  const stormScore = stormIndicators.reduce((score, indicator) => {
    if (lowerText.includes(indicator) || lowerReportType.includes(indicator)) {
      indicators.push(indicator);
      return score + (indicator.includes('storm') ? 20 : 15);
    }
    return score;
  }, 0);
  
  // Annual inspection indicators
  const annualIndicators = [
    'annual inspection', 'yearly inspection', 'routine inspection',
    'scheduled inspection', 'maintenance inspection', 'annual report',
    'yearly assessment', 'periodic inspection', 'regular inspection'
  ];
  
  const annualScore = annualIndicators.reduce((score, indicator) => {
    if (lowerText.includes(indicator) || lowerReportType.includes(indicator)) {
      indicators.push(indicator);
      return score + 15;
    }
    return score;
  }, 0);
  
  // Due diligence indicators
  const dueDiligenceIndicators = [
    'due diligence', 'property acquisition', 'purchase inspection',
    'pre-purchase', 'acquisition report', 'property assessment',
    'investment analysis', 'property evaluation', 'buyer inspection'
  ];
  
  const dueDiligenceScore = dueDiligenceIndicators.reduce((score, indicator) => {
    if (lowerText.includes(indicator) || lowerReportType.includes(indicator)) {
      indicators.push(indicator);
      return score + 15;
    }
    return score;
  }, 0);
  
  // Survey indicators
  const surveyIndicators = [
    'roof survey', 'condition survey', 'property survey',
    'baseline inspection', 'roof assessment', 'condition assessment',
    'survey report', 'comprehensive survey'
  ];
  
  const surveyScore = surveyIndicators.reduce((score, indicator) => {
    if (lowerText.includes(indicator) || lowerReportType.includes(indicator)) {
      indicators.push(indicator);
      return score + 10;
    }
    return score;
  }, 0);
  
  // Additional context clues
  const contextClues = {
    storm: [
      'recent storm', 'after storm', 'post storm', 'claim adjuster',
      'insurance adjuster', 'adjuster', 'claim number', 'policy number'
    ],
    annual: [
      'annual contract', 'maintenance contract', 'service agreement',
      'yearly service', 'scheduled maintenance', 'routine maintenance'
    ],
    dueDiligence: [
      'potential buyer', 'prospective purchase', 'closing date',
      'transaction', 'sale', 'purchase price', 'investment'
    ]
  };
  
  // Apply context clues
  contextClues.storm.forEach(clue => {
    if (lowerText.includes(clue)) {
      indicators.push(clue);
      confidence += 5;
    }
  });
  
  contextClues.annual.forEach(clue => {
    if (lowerText.includes(clue)) {
      indicators.push(clue);
      confidence += 5;
    }
  });
  
  contextClues.dueDiligence.forEach(clue => {
    if (lowerText.includes(clue)) {
      indicators.push(clue);
      confidence += 5;
    }
  });
  
  // Determine inspection type based on scores
  const scores = {
    storm: stormScore,
    annual: annualScore,
    due_diligence: dueDiligenceScore,
    survey: surveyScore
  };
  
  const maxScore = Math.max(...Object.values(scores));
  let type: 'annual' | 'storm' | 'due_diligence' | 'survey' | 'unknown' = 'unknown';
  let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  
  if (maxScore >= 15) {
    if (scores.storm === maxScore) {
      type = 'storm';
      urgency = 'high';
      confidence = Math.min(95, 40 + stormScore);
    } else if (scores.annual === maxScore) {
      type = 'annual';
      urgency = 'low';
      confidence = Math.min(90, 30 + annualScore);
    } else if (scores.due_diligence === maxScore) {
      type = 'due_diligence';
      urgency = 'medium';
      confidence = Math.min(90, 30 + dueDiligenceScore);
    } else if (scores.survey === maxScore) {
      type = 'survey';
      urgency = 'low';
      confidence = Math.min(85, 25 + surveyScore);
    }
  }
  
  // Fallback to filename/reportType analysis if no clear indicators
  if (type === 'unknown' || confidence < 30) {
    const filename = reportType;
    
    if (/storm|damage|claim|emergency/i.test(filename)) {
      type = 'storm';
      urgency = 'high';
      confidence = Math.max(confidence, 60);
      indicators.push('filename indicates storm');
    } else if (/annual|yearly|routine/i.test(filename)) {
      type = 'annual';
      urgency = 'low';
      confidence = Math.max(confidence, 60);
      indicators.push('filename indicates annual');
    } else if (/survey|assessment|condition/i.test(filename)) {
      type = 'survey';
      urgency = 'low';
      confidence = Math.max(confidence, 50);
      indicators.push('filename indicates survey');
    }
  }
  
  // Final adjustments based on urgency keywords in text
  if (lowerText.includes('immediate') || lowerText.includes('emergency') || lowerText.includes('critical')) {
    if (urgency !== 'high' && urgency !== 'critical') {
      urgency = 'high' as 'low' | 'medium' | 'high' | 'critical';
    }
    if (type === 'unknown') {
      type = 'storm'; // Emergency situations are usually storm-related
      confidence = Math.max(confidence, 70);
    }
  }
  
  return {
    type,
    urgency,
    confidence: Math.round(confidence) / 100,
    indicators: indicators.slice(0, 10) // Limit indicators
  };
}

// Export RealPDFParser class for backward compatibility
export class RealPDFParser {
  static async extractPDFData(file: File): Promise<ExtractedPDFData> {
    return extractPDFData(file);
  }
}