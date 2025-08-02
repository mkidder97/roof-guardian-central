interface RoofLayer {
  id: string;
  layer: string;
  material: string;
  thickness: string;
  attachment: string;
}

interface ChecklistItem {
  id: string;
  category: string;
  question: string;
  response: 'YES' | 'NO' | 'NA' | null;
  notes?: string;
  followUpRequired?: boolean;
}

interface InspectionData {
  // Roof composition data
  roofSystem?: string;
  systemDescription?: string;
  installationYear?: number;
  layers?: RoofLayer[];
  
  // Checklist data
  budgetYear?: number;
  standingWater?: 'YES' | 'NO' | null;
  roofAssemblyFailure?: 'YES' | 'NO' | null;
  preventativeRepairsCompleted?: 'YES' | 'NO' | null;
  squareFootageConfirmed?: 'YES' | 'NO' | null;
  hasSolar?: 'YES' | 'NO' | null;
  hasDaylighting?: 'YES' | 'NO' | null;
  daylightFactor?: number;
  checklist?: ChecklistItem[];
  completionPercentage?: number;
}

interface ExecutiveSummaryData {
  overallCondition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  overallRating: number; // 1-5 stars
  summaryText: string;
  keyFindings: string[];
  criticalIssues: string[];
  recommendedActions: string[];
  budgetRecommendation: 'Maintenance Only' | 'Minor Repairs' | 'Major Repairs' | 'Replacement Required';
  nextInspectionDate: string;
  inspectorNotes: string;
  generatedAt: string;
}

interface Deficiency {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  estimatedCost?: number;
}

interface AnalysisContext {
  propertyId?: string;
  inspectionId?: string;
  inspectorName?: string;
  weatherConditions?: string;
  deficiencies?: Deficiency[];
  photoCount?: number;
}

class AIAnalysisService {
  private apiKey: string | null = null;
  private apiEndpoint: string = 'https://api.anthropic.com/v1/messages';

  constructor() {
    // In a real implementation, this would come from environment variables
    // For now, we'll use a mock service that provides intelligent analysis
    this.apiKey = null; // Would be process.env.ANTHROPIC_API_KEY
  }

  /**
   * Generates an AI-powered executive summary of inspection data
   */
  async generateExecutiveSummary(
    data: InspectionData, 
    roof?: any, 
    context?: AnalysisContext
  ): Promise<ExecutiveSummaryData> {
    try {
      // If we have an API key, use real AI service
      if (this.apiKey) {
        return await this.callAnthropicAPI(data, roof, context);
      } else {
        // Use enhanced mock analysis with intelligent patterns
        return this.generateIntelligentMockAnalysis(data, roof, context);
      }
    } catch (error) {
      console.error('AI Analysis failed, falling back to mock analysis:', error);
      return this.generateIntelligentMockAnalysis(data, roof, context);
    }
  }

  /**
   * Enhanced mock analysis that provides intelligent, realistic summaries
   */
  private generateIntelligentMockAnalysis(
    data: InspectionData, 
    roof?: any, 
    context?: AnalysisContext
  ): ExecutiveSummaryData {
    const currentYear = new Date().getFullYear();
    const roofAge = data.installationYear ? currentYear - data.installationYear : 0;
    
    // Analyze critical issues with weighted scoring
    const criticalIssues: string[] = [];
    const keyFindings: string[] = [];
    const recommendedActions: string[] = [];
    let severityScore = 0;
    let maintenanceScore = 0;

    // Check for immediate safety concerns
    if (data.standingWater === 'YES') {
      criticalIssues.push('Standing water detected - immediate drainage system failure');
      recommendedActions.push('Emergency drainage system inspection and repair within 48 hours');
      severityScore += 30;
    }
    
    if (data.roofAssemblyFailure === 'YES') {
      criticalIssues.push('Structural roof assembly failure identified');
      recommendedActions.push('Immediate structural engineering assessment required');
      severityScore += 40;
    }

    // Analyze deficiencies if provided
    if (context?.deficiencies && context.deficiencies.length > 0) {
      const criticalDeficiencies = context.deficiencies.filter(d => d.severity === 'critical');
      const highSeverityDeficiencies = context.deficiencies.filter(d => d.severity === 'high');

      criticalDeficiencies.forEach(def => {
        criticalIssues.push(`Critical ${def.type.toLowerCase()}: ${def.description}`);
        severityScore += 25;
      });

      highSeverityDeficiencies.forEach(def => {
        keyFindings.push(`High-severity ${def.type.toLowerCase()} in ${def.location || 'multiple areas'}`);
        severityScore += 15;
      });

      const totalDeficiencyCost = context.deficiencies.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
      if (totalDeficiencyCost > 50000) {
        keyFindings.push(`Significant repair costs identified: $${totalDeficiencyCost.toLocaleString()}`);
        severityScore += 20;
      }
    }

    // Analyze checklist responses with intelligent interpretation
    const noResponses = data.checklist?.filter(item => item.response === 'NO') || [];
    const naResponses = data.checklist?.filter(item => item.response === 'NA') || [];
    
    // Safety-critical checklist items
    const safetyCriticalItems = noResponses.filter(item => 
      item.category.toLowerCase().includes('safety') ||
      item.question.toLowerCase().includes('fall protection') ||
      item.question.toLowerCase().includes('guardrail') ||
      item.question.toLowerCase().includes('access')
    );

    safetyCriticalItems.forEach(item => {
      criticalIssues.push(`Safety deficiency: ${item.question.toLowerCase()}`);
      recommendedActions.push('Immediate safety remediation required before next inspection');
      severityScore += 20;
    });

    // Maintenance-related findings
    if (data.preventativeRepairsCompleted === 'NO') {
      keyFindings.push('Annual preventative maintenance program incomplete');
      recommendedActions.push('Complete deferred maintenance items within 90 days');
      maintenanceScore += 15;
    }

    // System-specific analysis
    if (data.roofSystem) {
      keyFindings.push(`${data.roofSystem} roof system assessed`);
      
      // System-specific considerations
      if (data.roofSystem.toLowerCase().includes('membrane')) {
        if (roofAge > 15) {
          keyFindings.push('Membrane system nearing end of service life');
          recommendedActions.push('Plan membrane replacement within 3-5 years');
          maintenanceScore += 10;
        }
      } else if (data.roofSystem.toLowerCase().includes('metal')) {
        if (noResponses.some(r => r.question.toLowerCase().includes('corrosion'))) {
          keyFindings.push('Metal roof system showing signs of corrosion');
          recommendedActions.push('Implement enhanced corrosion protection program');
        }
      }
    }

    // Age-based analysis with nuanced recommendations
    if (roofAge > 20) {
      keyFindings.push(`Roof system age: ${roofAge} years - replacement planning critical`);
      recommendedActions.push('Develop comprehensive replacement strategy within 12 months');
      severityScore += 15;
    } else if (roofAge > 15) {
      keyFindings.push(`Roof system age: ${roofAge} years - increased monitoring required`);
      recommendedActions.push('Implement semi-annual inspection program');
      maintenanceScore += 10;
    } else if (roofAge > 10) {
      keyFindings.push(`Roof system age: ${roofAge} years - proactive maintenance phase`);
      recommendedActions.push('Enhanced preventative maintenance program recommended');
      maintenanceScore += 5;
    }

    // Environmental factors
    if (data.hasSolar === 'YES') {
      keyFindings.push('Solar installation requires specialized maintenance coordination');
      recommendedActions.push('Schedule annual solar contractor inspection');
    }
    
    if (data.hasDaylighting === 'YES' && data.daylightFactor) {
      keyFindings.push(`Daylighting system present (${data.daylightFactor}% daylight factor)`);
      if (data.daylightFactor > 15) {
        keyFindings.push('High daylight factor may indicate skylight maintenance needs');
      }
    }

    // Completion percentage analysis
    if (data.completionPercentage && data.completionPercentage < 80) {
      keyFindings.push(`Inspection completion: ${data.completionPercentage}% - follow-up required`);
      recommendedActions.push('Schedule follow-up inspection to complete remaining items');
    }

    // Determine overall condition based on weighted scoring
    let overallCondition: ExecutiveSummaryData['overallCondition'] = 'Good';
    let overallRating = 4;
    let budgetRecommendation: ExecutiveSummaryData['budgetRecommendation'] = 'Maintenance Only';

    const totalScore = severityScore + maintenanceScore;

    if (severityScore > 50 || criticalIssues.length > 2) {
      overallCondition = 'Critical';
      overallRating = 1;
      budgetRecommendation = 'Replacement Required';
    } else if (severityScore > 30 || totalScore > 60) {
      overallCondition = 'Poor';
      overallRating = 2;
      budgetRecommendation = 'Major Repairs';
    } else if (severityScore > 15 || totalScore > 35) {
      overallCondition = 'Fair';
      overallRating = 3;
      budgetRecommendation = 'Minor Repairs';
    } else if (roofAge > 20) {
      overallCondition = 'Fair';
      overallRating = 2;
      budgetRecommendation = 'Replacement Required';
    } else if (maintenanceScore > 20) {
      overallCondition = 'Fair';
      overallRating = 3;
      budgetRecommendation = 'Minor Repairs';
    } else if (roofAge < 5 && severityScore === 0) {
      overallCondition = 'Excellent';
      overallRating = 5;
    }

    // Generate intelligent summary text
    const summaryText = this.generateIntelligentSummaryText({
      roofAge,
      roofSystem: data.roofSystem,
      completionPercentage: data.completionPercentage || 0,
      criticalIssues: criticalIssues.length,
      keyFindings: keyFindings.length,
      overallCondition,
      deficiencyCount: context?.deficiencies?.length || 0,
      photoCount: context?.photoCount || 0,
      weatherConditions: context?.weatherConditions
    });

    // Calculate next inspection date based on condition
    const nextInspectionMonths = this.calculateNextInspectionInterval(overallCondition, roofAge);
    const nextInspection = new Date();
    nextInspection.setMonth(nextInspection.getMonth() + nextInspectionMonths);

    // Add standard recommendations based on findings
    if (recommendedActions.length === 0) {
      recommendedActions.push('Continue current maintenance program');
      recommendedActions.push('Monitor for changes in upcoming inspections');
    }

    return {
      overallCondition,
      overallRating,
      summaryText,
      keyFindings,
      criticalIssues,
      recommendedActions,
      budgetRecommendation,
      nextInspectionDate: nextInspection.toLocaleDateString(),
      inspectorNotes: '',
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generates intelligent, context-aware summary text
   */
  private generateIntelligentSummaryText(analysis: {
    roofAge: number;
    roofSystem?: string;
    completionPercentage: number;
    criticalIssues: number;
    keyFindings: number;
    overallCondition: string;
    deficiencyCount: number;
    photoCount: number;
    weatherConditions?: string;
  }): string {
    const { 
      roofAge, 
      roofSystem, 
      completionPercentage, 
      criticalIssues, 
      keyFindings, 
      overallCondition,
      deficiencyCount,
      photoCount,
      weatherConditions 
    } = analysis;
    
    let summary = `Comprehensive roof inspection completed with ${completionPercentage}% checklist completion`;
    
    if (photoCount > 0) {
      summary += ` and ${photoCount} documentation photos captured`;
    }
    
    if (weatherConditions) {
      summary += ` under ${weatherConditions.toLowerCase()} conditions`;
    }
    
    summary += '. ';
    
    // System description with age context
    if (roofSystem) {
      summary += `The ${roofSystem} roof system, installed approximately ${roofAge} years ago, `;
    } else {
      summary += `The roof system, installed approximately ${roofAge} years ago, `;
    }
    
    // Condition assessment
    summary += `presents an overall condition of "${overallCondition}". `;
    
    // Critical issues
    if (criticalIssues > 0) {
      summary += `${criticalIssues} critical issue${criticalIssues > 1 ? 's' : ''} requiring immediate attention ${criticalIssues > 1 ? 'were' : 'was'} identified, necessitating urgent remediation efforts. `;
    }
    
    // Deficiencies
    if (deficiencyCount > 0) {
      summary += `${deficiencyCount} deficienc${deficiencyCount > 1 ? 'ies were' : 'y was'} documented with photographic evidence and repair cost estimates. `;
    }
    
    // Key findings
    if (keyFindings > 0) {
      summary += `${keyFindings} additional finding${keyFindings > 1 ? 's were' : ' was'} noted for maintenance planning and budget consideration. `;
    }
    
    // Age-based recommendations
    if (roofAge > 20) {
      summary += `Given the advanced age of the roof system, replacement planning should be prioritized within the next 1-2 years to avoid catastrophic failure. `;
    } else if (roofAge > 15) {
      summary += `The roof system is entering its mature service phase, requiring enhanced monitoring and proactive maintenance to extend service life. `;
    } else if (roofAge > 10) {
      summary += `The roof system remains in its productive service phase with preventative maintenance being key to optimal performance. `;
    } else {
      summary += `The roof system is performing well within expected parameters for its age and installation. `;
    }
    
    // Closing recommendations
    if (criticalIssues > 0) {
      summary += `Immediate action is required to address critical safety and structural concerns before further deterioration occurs.`;
    } else if (overallCondition === 'Poor' || overallCondition === 'Fair') {
      summary += `A structured maintenance program with regular monitoring will help prevent minor issues from becoming major problems.`;
    } else {
      summary += `Continuation of current maintenance practices with regular professional inspections will help ensure long-term roof system performance and building protection.`;
    }
    
    return summary;
  }

  /**
   * Calculates appropriate next inspection interval based on condition and age
   */
  private calculateNextInspectionInterval(condition: string, roofAge: number): number {
    // Base intervals by condition
    let months = 12; // Default annual
    
    switch (condition) {
      case 'Critical':
        months = 3; // Quarterly
        break;
      case 'Poor':
        months = 6; // Semi-annual
        break;
      case 'Fair':
        months = roofAge > 15 ? 6 : 9; // Semi-annual or 9 months
        break;
      case 'Good':
        months = roofAge > 20 ? 6 : 12; // Semi-annual for old roofs
        break;
      case 'Excellent':
        months = roofAge < 5 ? 18 : 12; // Extended for new roofs
        break;
    }
    
    return months;
  }

  /**
   * Call to Anthropic's Claude API (when API key is available)
   */
  private async callAnthropicAPI(
    data: InspectionData, 
    roof?: any, 
    context?: AnalysisContext
  ): Promise<ExecutiveSummaryData> {
    const prompt = this.buildAnalysisPrompt(data, roof, context);
    
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const result = await response.json();
    return this.parseAIResponse(result.content[0].text);
  }

  /**
   * Builds a comprehensive prompt for AI analysis
   */
  private buildAnalysisPrompt(data: InspectionData, roof?: any, context?: AnalysisContext): string {
    return `As a professional roof inspection analyst, generate an executive summary based on the following inspection data:

ROOF SYSTEM INFORMATION:
- System Type: ${data.roofSystem || 'Not specified'}
- Installation Year: ${data.installationYear || 'Unknown'}
- System Description: ${data.systemDescription || 'Not provided'}

INSPECTION CHECKLIST RESULTS:
- Completion Percentage: ${data.completionPercentage || 0}%
- Standing Water: ${data.standingWater || 'Not assessed'}
- Roof Assembly Failure: ${data.roofAssemblyFailure || 'Not assessed'}
- Preventative Repairs Completed: ${data.preventativeRepairsCompleted || 'Not assessed'}
- Solar Present: ${data.hasSolar || 'Not assessed'}
- Daylighting Present: ${data.hasDaylighting || 'Not assessed'}

DEFICIENCIES: ${context?.deficiencies?.length || 0} identified
PHOTOS CAPTURED: ${context?.photoCount || 0}
WEATHER CONDITIONS: ${context?.weatherConditions || 'Not reported'}

Please provide a JSON response with: overallCondition, overallRating (1-5), summaryText, keyFindings array, criticalIssues array, recommendedActions array, budgetRecommendation, nextInspectionDate, and inspectorNotes.`;
  }

  /**
   * Parses AI response into structured data
   */
  private parseAIResponse(response: string): ExecutiveSummaryData {
    try {
      // Attempt to parse JSON response
      const parsed = JSON.parse(response);
      
      // Validate and return structured data
      return {
        overallCondition: parsed.overallCondition || 'Fair',
        overallRating: parsed.overallRating || 3,
        summaryText: parsed.summaryText || 'AI-generated summary not available',
        keyFindings: parsed.keyFindings || [],
        criticalIssues: parsed.criticalIssues || [],
        recommendedActions: parsed.recommendedActions || [],
        budgetRecommendation: parsed.budgetRecommendation || 'Minor Repairs',
        nextInspectionDate: parsed.nextInspectionDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        inspectorNotes: parsed.inspectorNotes || '',
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      // Fall back to mock analysis
      throw new Error('AI response parsing failed');
    }
  }
}

// Export singleton instance
export const aiAnalysisService = new AIAnalysisService();
export type { InspectionData, ExecutiveSummaryData, AnalysisContext, Deficiency };