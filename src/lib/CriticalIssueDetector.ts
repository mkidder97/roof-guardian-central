/**
 * CriticalIssueDetector - Automated detection and scoring of critical inspection issues
 * 
 * This utility class provides centralized logic for analyzing deficiencies and inspections
 * to identify critical issues that require immediate attention or supervisor alerts.
 */

import type { Deficiency } from '@/types/deficiency';
import type { UnifiedInspection } from '@/types/inspection';
import type { RepairUrgency } from '@/types/immediate-repair';

// Configuration interface for detection rules
export interface CriticalityConfig {
  criticalKeywords: string[];
  highPriorityKeywords: string[];
  structuralKeywords: string[];
  safetyKeywords: string[];
  emergencyKeywords: string[];
  
  // Score thresholds
  immediateRepairThreshold: number;
  supervisorAlertThreshold: number;
  emergencyThreshold: number;
  
  // Severity multipliers
  severityMultipliers: {
    low: number;
    medium: number;
    high: number;
  };
  
  // Type multipliers
  typeMultipliers: Record<string, number>;
}

// Default configuration - can be customized per client
const DEFAULT_CONFIG: CriticalityConfig = {
  criticalKeywords: [
    'roof failure', 'membrane failure', 'structural damage', 'structural failure',
    'collapse', 'falling', 'dangerous', 'unsafe', 'emergency', 'immediate',
    'leak severe', 'water intrusion', 'mold', 'electrical hazard',
    'safety hazard', 'injury risk', 'slip hazard', 'fall hazard',
    'imminent failure', 'catastrophic', 'life threatening', 'urgent repair'
  ],
  
  highPriorityKeywords: [
    'leak', 'water damage', 'ponding', 'cracking', 'separation',
    'deterioration', 'wear', 'aging', 'maintenance needed', 'damaged',
    'broken', 'missing', 'loose', 'corroded', 'rusted'
  ],
  
  structuralKeywords: [
    'beam', 'joist', 'deck', 'support', 'foundation', 'wall',
    'structural', 'load bearing', 'stability', 'deflection'
  ],
  
  safetyKeywords: [
    'trip', 'slip', 'fall', 'sharp', 'exposed', 'hazard',
    'dangerous', 'unsafe', 'accident', 'injury'
  ],
  
  emergencyKeywords: [
    'emergency', 'immediate', 'urgent', 'asap', 'now',
    'critical', 'severe', 'major', 'catastrophic'
  ],
  
  immediateRepairThreshold: 80,
  supervisorAlertThreshold: 60,
  emergencyThreshold: 90,
  
  severityMultipliers: {
    low: 1.0,
    medium: 1.5,
    high: 2.0
  },
  
  typeMultipliers: {
    'structural': 2.0,
    'safety': 1.8,
    'membrane': 1.5,
    'flashing': 1.3,
    'drainage': 1.2,
    'penetration': 1.1,
    'accessory': 1.0
  }
};

// Analysis result interface
export interface CriticalityAnalysis {
  score: number;
  isImmediateRepair: boolean;
  needsSupervisorAlert: boolean;
  isEmergency: boolean;
  urgencyLevel: RepairUrgency;
  triggeredKeywords: string[];
  riskFactors: {
    structural: boolean;
    safety: boolean;
    weatherExposure: boolean;
    electrical: boolean;
  };
  recommendedActions: string[];
  confidenceLevel: number; // 0-100
}

// Inspection-level critical analysis
export interface InspectionCriticalAnalysis {
  hasCriticalIssues: boolean;
  criticalIssueCount: number;
  highestCriticalityScore: number;
  emergencyIssueCount: number;
  totalRiskScore: number;
  recommendedInspectionActions: string[];
  requiresImmediateResponse: boolean;
}

export class CriticalIssueDetector {
  private config: CriticalityConfig;

  constructor(customConfig?: Partial<CriticalityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
  }

  /**
   * Analyzes a single deficiency for criticality
   */
  analyzeDeficiency(deficiency: Deficiency): CriticalityAnalysis {
    const description = this.normalizeText(deficiency.description);
    const location = this.normalizeText(deficiency.location);
    const type = this.normalizeText(deficiency.type || deficiency.category);
    const combinedText = `${description} ${location} ${type}`;

    // Calculate base score from severity
    let score = this.getBaseSeverityScore(deficiency.severity);

    // Analyze keywords and add scores
    const keywordAnalysis = this.analyzeKeywords(combinedText);
    score += keywordAnalysis.score;

    // Apply type multiplier
    const typeMultiplier = this.getTypeMultiplier(type);
    score *= typeMultiplier;

    // Apply severity multiplier
    const severityMultiplier = this.config.severityMultipliers[deficiency.severity];
    score *= severityMultiplier;

    // Cap score at 100
    score = Math.min(100, Math.round(score));

    // Determine flags based on thresholds
    const isEmergency = score >= this.config.emergencyThreshold;
    const isImmediateRepair = score >= this.config.immediateRepairThreshold;
    const needsSupervisorAlert = score >= this.config.supervisorAlertThreshold;

    // Determine urgency level
    const urgencyLevel = this.calculateUrgencyLevel(score, keywordAnalysis.hasEmergencyKeywords);

    // Analyze risk factors
    const riskFactors = {
      structural: keywordAnalysis.hasStructuralKeywords,
      safety: keywordAnalysis.hasSafetyKeywords,
      weatherExposure: this.hasWeatherExposureRisk(combinedText),
      electrical: this.hasElectricalRisk(combinedText)
    };

    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(score, riskFactors, keywordAnalysis);

    // Calculate confidence level
    const confidenceLevel = this.calculateConfidenceLevel(keywordAnalysis.matchCount, description.length);

    return {
      score,
      isImmediateRepair,
      needsSupervisorAlert,
      isEmergency,
      urgencyLevel,
      triggeredKeywords: keywordAnalysis.matchedKeywords,
      riskFactors,
      recommendedActions,
      confidenceLevel
    };
  }

  /**
   * Analyzes an entire inspection for critical issues
   */
  analyzeInspection(inspection: UnifiedInspection, deficiencies: Deficiency[]): InspectionCriticalAnalysis {
    const analyses = deficiencies.map(def => this.analyzeDeficiency(def));
    
    const criticalAnalyses = analyses.filter(a => a.isImmediateRepair || a.needsSupervisorAlert);
    const emergencyAnalyses = analyses.filter(a => a.isEmergency);
    
    const highestCriticalityScore = analyses.length > 0 ? Math.max(...analyses.map(a => a.score)) : 0;
    const totalRiskScore = analyses.reduce((sum, a) => sum + a.score, 0);
    
    const hasCriticalIssues = criticalAnalyses.length > 0;
    const requiresImmediateResponse = emergencyAnalyses.length > 0;

    // Generate inspection-level recommendations
    const recommendedInspectionActions = this.generateInspectionRecommendations(
      hasCriticalIssues,
      requiresImmediateResponse,
      criticalAnalyses,
      emergencyAnalyses
    );

    return {
      hasCriticalIssues,
      criticalIssueCount: criticalAnalyses.length,
      highestCriticalityScore,
      emergencyIssueCount: emergencyAnalyses.length,
      totalRiskScore,
      recommendedInspectionActions,
      requiresImmediateResponse
    };
  }

  /**
   * Updates a deficiency object with criticality analysis
   */
  enhanceDeficiencyWithAnalysis(deficiency: Deficiency): Deficiency {
    const analysis = this.analyzeDeficiency(deficiency);
    
    return {
      ...deficiency,
      isImmediateRepair: analysis.isImmediateRepair,
      needsSupervisorAlert: analysis.needsSupervisorAlert,
      criticalityScore: analysis.score,
      detectionTimestamp: new Date().toISOString()
    };
  }

  /**
   * Batch process multiple deficiencies
   */
  enhanceDeficienciesWithAnalysis(deficiencies: Deficiency[]): Deficiency[] {
    return deficiencies.map(def => this.enhanceDeficiencyWithAnalysis(def));
  }

  // Private helper methods

  private normalizeText(text: string): string {
    return (text || '').toLowerCase().trim();
  }

  private getBaseSeverityScore(severity: 'low' | 'medium' | 'high'): number {
    switch (severity) {
      case 'high': return 40;
      case 'medium': return 20;
      case 'low': return 10;
      default: return 0;
    }
  }

  private getTypeMultiplier(type: string): number {
    const normalizedType = type.toLowerCase();
    
    // Find the best matching type multiplier
    for (const [key, multiplier] of Object.entries(this.config.typeMultipliers)) {
      if (normalizedType.includes(key.toLowerCase())) {
        return multiplier;
      }
    }
    
    return 1.0;
  }

  private analyzeKeywords(text: string): {
    score: number;
    matchedKeywords: string[];
    matchCount: number;
    hasEmergencyKeywords: boolean;
    hasStructuralKeywords: boolean;
    hasSafetyKeywords: boolean;
  } {
    let score = 0;
    const matchedKeywords: string[] = [];
    
    // Check critical keywords (highest score)
    const criticalMatches = this.findMatchingKeywords(text, this.config.criticalKeywords);
    if (criticalMatches.length > 0) {
      score += 30;
      matchedKeywords.push(...criticalMatches);
    }
    
    // Check high priority keywords
    const highPriorityMatches = this.findMatchingKeywords(text, this.config.highPriorityKeywords);
    if (highPriorityMatches.length > 0) {
      score += 15;
      matchedKeywords.push(...highPriorityMatches);
    }
    
    // Check specific risk categories
    const emergencyMatches = this.findMatchingKeywords(text, this.config.emergencyKeywords);
    const structuralMatches = this.findMatchingKeywords(text, this.config.structuralKeywords);
    const safetyMatches = this.findMatchingKeywords(text, this.config.safetyKeywords);
    
    if (emergencyMatches.length > 0) {
      score += 25;
      matchedKeywords.push(...emergencyMatches);
    }
    
    if (structuralMatches.length > 0) {
      score += 20;
      matchedKeywords.push(...structuralMatches);
    }
    
    if (safetyMatches.length > 0) {
      score += 20;
      matchedKeywords.push(...safetyMatches);
    }

    return {
      score,
      matchedKeywords: [...new Set(matchedKeywords)], // Remove duplicates
      matchCount: matchedKeywords.length,
      hasEmergencyKeywords: emergencyMatches.length > 0,
      hasStructuralKeywords: structuralMatches.length > 0,
      hasSafetyKeywords: safetyMatches.length > 0
    };
  }

  private findMatchingKeywords(text: string, keywords: string[]): string[] {
    return keywords.filter(keyword => text.includes(keyword.toLowerCase()));
  }

  private calculateUrgencyLevel(score: number, hasEmergencyKeywords: boolean): RepairUrgency {
    if (score >= 90 || hasEmergencyKeywords) return 'emergency';
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private hasWeatherExposureRisk(text: string): boolean {
    const weatherKeywords = ['leak', 'water', 'rain', 'snow', 'wind', 'storm', 'weather', 'exposure'];
    return weatherKeywords.some(keyword => text.includes(keyword));
  }

  private hasElectricalRisk(text: string): boolean {
    const electricalKeywords = ['electrical', 'electric', 'wire', 'cable', 'power', 'voltage', 'shock'];
    return electricalKeywords.some(keyword => text.includes(keyword));
  }

  private generateRecommendedActions(
    score: number,
    riskFactors: any,
    keywordAnalysis: any
  ): string[] {
    const actions: string[] = [];

    if (score >= 90) {
      actions.push('EMERGENCY: Contact supervisor immediately');
      actions.push('Evacuate area if necessary');
      actions.push('Document with photos and detailed notes');
    } else if (score >= 80) {
      actions.push('Schedule immediate repair within 24 hours');
      actions.push('Notify supervisor and property manager');
      actions.push('Monitor for worsening conditions');
    } else if (score >= 60) {
      actions.push('Alert supervisor for review and prioritization');
      actions.push('Schedule repair within 1 week');
    }

    if (riskFactors.safety) {
      actions.push('Implement safety barriers or warnings');
    }

    if (riskFactors.structural) {
      actions.push('Restrict access to affected area');
      actions.push('Schedule structural engineer review');
    }

    if (riskFactors.weatherExposure) {
      actions.push('Implement temporary weather protection');
    }

    return actions;
  }

  private generateInspectionRecommendations(
    hasCriticalIssues: boolean,
    requiresImmediateResponse: boolean,
    criticalAnalyses: CriticalityAnalysis[],
    emergencyAnalyses: CriticalityAnalysis[]
  ): string[] {
    const recommendations: string[] = [];

    if (requiresImmediateResponse) {
      recommendations.push('URGENT: This inspection contains emergency issues requiring immediate response');
      recommendations.push('Contact emergency repair team and supervisor immediately');
    } else if (hasCriticalIssues) {
      recommendations.push('This inspection contains critical issues requiring supervisor attention');
      recommendations.push(`${criticalAnalyses.length} critical issues identified`);
    }

    if (emergencyAnalyses.length > 0) {
      recommendations.push(`${emergencyAnalyses.length} emergency-level issues require immediate action`);
    }

    return recommendations;
  }

  private calculateConfidenceLevel(matchCount: number, descriptionLength: number): number {
    // Base confidence on keyword matches and description detail
    const confidence = Math.min(100, (matchCount * 20) + (Math.min(descriptionLength / 10, 40)));
    return Math.round(confidence);
  }

  /**
   * Updates configuration with custom rules
   */
  updateConfig(newConfig: Partial<CriticalityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current configuration
   */
  getConfig(): CriticalityConfig {
    return { ...this.config };
  }
}

// Export default instance and class
export const criticalIssueDetector = new CriticalIssueDetector();
export default CriticalIssueDetector;