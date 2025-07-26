/**
 * Priority Engine for Intelligent Issue Classification
 * Automatically assigns priority levels based on multiple factors
 */

import { Priority, Status } from '@/components/ui/priority-indicators';

export interface PriorityFactors {
  // Safety factors
  structuralRisk: number; // 0-10 scale
  safetyHazard: number; // 0-10 scale
  accessibilityRisk: number; // 0-10 scale

  // Business impact factors  
  operationalImpact: number; // 0-10 scale
  financialExposure: number; // Dollar amount
  tenantImpact: number; // Number of affected tenants

  // Environmental factors
  weatherExposure: number; // 0-10 scale
  seasonalFactor: number; // 0-10 scale (higher in winter/storm season)
  
  // Historical factors
  recurrenceCount: number; // Number of previous occurrences
  deteriorationRate: number; // Rate of condition decline (0-10)
  
  // Timing factors
  ageOfIssue: number; // Days since first reported
  lastInspectionDays: number; // Days since last inspection
  
  // Location factors
  criticalLocation: boolean; // Is it in a critical building area?
  accessibilityDifficulty: number; // 0-10 scale for repair difficulty
}

export interface PriorityResult {
  priority: Priority;
  score: number;
  factors: string[];
  urgencyScore: number;
  riskScore: number;
  recommendedAction: string;
  timeframe: string;
}

export class PriorityEngine {
  private static readonly CRITICAL_THRESHOLD = 85;
  private static readonly HIGH_THRESHOLD = 70;
  private static readonly MEDIUM_THRESHOLD = 50;
  private static readonly LOW_THRESHOLD = 25;

  /**
   * Calculate priority based on multiple weighted factors
   */
  static calculatePriority(factors: Partial<PriorityFactors>): PriorityResult {
    const safetyScore = this.calculateSafetyScore(factors);
    const businessScore = this.calculateBusinessScore(factors);
    const urgencyScore = this.calculateUrgencyScore(factors);
    const riskScore = this.calculateRiskScore(factors);

    // Weighted calculation - safety has highest weight
    const totalScore = (
      safetyScore * 0.4 +      // 40% weight - safety is paramount
      businessScore * 0.25 +   // 25% weight - business impact
      urgencyScore * 0.20 +    // 20% weight - timing urgency  
      riskScore * 0.15         // 15% weight - general risk
    );

    const priority = this.scoreToPriority(totalScore);
    const contributingFactors = this.identifyContributingFactors(factors, {
      safety: safetyScore,
      business: businessScore,
      urgency: urgencyScore,
      risk: riskScore
    });

    return {
      priority,
      score: Math.round(totalScore),
      factors: contributingFactors,
      urgencyScore: Math.round(urgencyScore),
      riskScore: Math.round(riskScore),
      recommendedAction: this.getRecommendedAction(priority, factors),
      timeframe: this.getTimeframe(priority, urgencyScore)
    };
  }

  /**
   * Calculate safety-related score (0-100)
   */
  private static calculateSafetyScore(factors: Partial<PriorityFactors>): number {
    let score = 0;
    
    // Structural risk is the highest safety concern
    if (factors.structuralRisk) {
      score += factors.structuralRisk * 12; // Max 120 points, but capped at 100
    }
    
    // Direct safety hazards
    if (factors.safetyHazard) {
      score += factors.safetyHazard * 10;
    }
    
    // Accessibility risks
    if (factors.accessibilityRisk) {
      score += factors.accessibilityRisk * 8;
    }
    
    // Critical location multiplier
    if (factors.criticalLocation) {
      score *= 1.3;
    }
    
    return Math.min(100, score);
  }

  /**
   * Calculate business impact score (0-100)
   */
  private static calculateBusinessScore(factors: Partial<PriorityFactors>): number {
    let score = 0;
    
    // Operational impact
    if (factors.operationalImpact) {
      score += factors.operationalImpact * 10;
    }
    
    // Financial exposure (scaled logarithmically)
    if (factors.financialExposure) {
      const financialScore = Math.min(40, Math.log10(factors.financialExposure / 1000) * 10);
      score += Math.max(0, financialScore);
    }
    
    // Tenant impact
    if (factors.tenantImpact) {
      score += Math.min(30, factors.tenantImpact * 5);
    }
    
    return Math.min(100, score);
  }

  /**
   * Calculate urgency score based on timing factors (0-100)
   */
  private static calculateUrgencyScore(factors: Partial<PriorityFactors>): number {
    let score = 0;
    
    // Age of issue - older issues become more urgent
    if (factors.ageOfIssue) {
      if (factors.ageOfIssue > 30) score += 30; // Over 30 days is urgent
      else if (factors.ageOfIssue > 7) score += 20; // Over 7 days is concerning
      else if (factors.ageOfIssue > 1) score += 10; // Over 1 day gets some points
    }
    
    // Time since last inspection
    if (factors.lastInspectionDays) {
      if (factors.lastInspectionDays > 365) score += 25; // Over a year
      else if (factors.lastInspectionDays > 180) score += 15; // Over 6 months
      else if (factors.lastInspectionDays > 90) score += 10; // Over 3 months
    }
    
    // Recurrence - repeated issues are urgent
    if (factors.recurrenceCount) {
      score += Math.min(25, factors.recurrenceCount * 8);
    }
    
    // Deterioration rate
    if (factors.deteriorationRate) {
      score += factors.deteriorationRate * 3;
    }
    
    // Seasonal factors
    if (factors.seasonalFactor) {
      score += factors.seasonalFactor * 2;
    }
    
    return Math.min(100, score);
  }

  /**
   * Calculate general risk score (0-100)  
   */
  private static calculateRiskScore(factors: Partial<PriorityFactors>): number {
    let score = 0;
    
    // Weather exposure risk
    if (factors.weatherExposure) {
      score += factors.weatherExposure * 8;
    }
    
    // Difficulty of access/repair affects risk
    if (factors.accessibilityDifficulty) {
      score += factors.accessibilityDifficulty * 6;
    }
    
    // Base risk from various factors
    score += (factors.structuralRisk || 0) * 2;
    score += (factors.operationalImpact || 0) * 3;
    
    return Math.min(100, score);
  }

  /**
   * Convert numerical score to priority level
   */
  private static scoreToPriority(score: number): Priority {
    if (score >= this.CRITICAL_THRESHOLD) return 'critical';
    if (score >= this.HIGH_THRESHOLD) return 'high';
    if (score >= this.MEDIUM_THRESHOLD) return 'medium';  
    if (score >= this.LOW_THRESHOLD) return 'low';
    return 'info';
  }

  /**
   * Identify which factors contributed most to the priority
   */
  private static identifyContributingFactors(
    factors: Partial<PriorityFactors>, 
    scores: { safety: number; business: number; urgency: number; risk: number }
  ): string[] {
    const contributors: string[] = [];
    
    // Safety contributors
    if (scores.safety > 70) {
      if (factors.structuralRisk && factors.structuralRisk > 7) {
        contributors.push('High structural risk detected');
      }
      if (factors.safetyHazard && factors.safetyHazard > 6) {
        contributors.push('Safety hazard present');
      }
      if (factors.criticalLocation) {
        contributors.push('Located in critical building area');
      }
    }
    
    // Business contributors
    if (scores.business > 60) {
      if (factors.operationalImpact && factors.operationalImpact > 7) {
        contributors.push('High operational impact');
      }
      if (factors.financialExposure && factors.financialExposure > 50000) {
        contributors.push('Significant financial exposure');
      }
      if (factors.tenantImpact && factors.tenantImpact > 10) {
        contributors.push('Multiple tenants affected');
      }
    }
    
    // Urgency contributors
    if (scores.urgency > 50) {  
      if (factors.ageOfIssue && factors.ageOfIssue > 30) {
        contributors.push('Issue has been pending for over 30 days');
      }
      if (factors.recurrenceCount && factors.recurrenceCount > 2) {
        contributors.push('Recurring issue - multiple occurrences');
      }
      if (factors.deteriorationRate && factors.deteriorationRate > 7) {
        contributors.push('Rapid deterioration detected');
      }
    }
    
    // Risk contributors
    if (scores.risk > 50) {
      if (factors.weatherExposure && factors.weatherExposure > 7) {
        contributors.push('High weather exposure risk');
      }
      if (factors.accessibilityDifficulty && factors.accessibilityDifficulty > 7) {
        contributors.push('Difficult access may delay repairs');
      }
    }
    
    return contributors;
  }

  /**
   * Get recommended action based on priority
   */
  private static getRecommendedAction(priority: Priority, factors: Partial<PriorityFactors>): string {
    switch (priority) {
      case 'critical':
        if (factors.safetyHazard && factors.safetyHazard > 8) {
          return 'IMMEDIATE SAFETY RESPONSE REQUIRED - Contact emergency services';
        }
        return 'Immediate action required - dispatch emergency repair team';
        
      case 'high':
        return 'Schedule urgent repair within 24-48 hours';
        
      case 'medium':
        return 'Schedule repair within 1-2 weeks, monitor condition';
        
      case 'low':
        return 'Include in next routine maintenance cycle';
        
      default:
        return 'Monitor and document for future reference';
    }
  }

  /**
   * Get timeframe based on priority and urgency
   */
  private static getTimeframe(priority: Priority, urgencyScore: number): string {
    switch (priority) {
      case 'critical':
        return urgencyScore > 80 ? 'Immediate (0-4 hours)' : 'Same day (0-24 hours)';
      case 'high':
        return urgencyScore > 70 ? 'Within 24 hours' : 'Within 48 hours';
      case 'medium':
        return urgencyScore > 60 ? 'Within 1 week' : 'Within 2 weeks';
      case 'low':
        return 'Within 1 month';
      default:
        return 'As needed';
    }
  }

  /**
   * Calculate status based on time factors
   */
  static calculateStatus(
    priority: Priority, 
    ageOfIssue: number, 
    lastInspectionDays: number
  ): Status {
    const timeframes = {
      critical: 1,
      high: 2, 
      medium: 7,
      low: 30,
      info: 90
    };
    
    const expectedTimeframe = timeframes[priority];
    
    if (ageOfIssue > expectedTimeframe * 2) {
      return 'overdue';
    } else if (ageOfIssue > expectedTimeframe) {
      return 'urgent';
    } else if (lastInspectionDays > 365) {
      return 'attention';
    } else if (priority === 'critical' || priority === 'high') {
      return 'attention';
    } else {
      return 'good';
    }
  }

  /**
   * Batch process multiple items for priority calculation
   */
  static batchCalculatePriorities(
    items: Array<{ id: string; factors: Partial<PriorityFactors> }>
  ): Array<{ id: string; result: PriorityResult }> {
    return items.map(item => ({
      id: item.id,
      result: this.calculatePriority(item.factors)
    }));
  }
}