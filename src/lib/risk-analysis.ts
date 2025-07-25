import { supabase } from '@/integrations/supabase/client';

export interface RiskAnalysis {
  propertyId: string;
  propertyName: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedMaintenanceDate: string;
  recommendations: Recommendation[];
  trends: TrendAnalysis[];
  costEstimate: number;
  confidenceScore: number;
}

export interface Recommendation {
  id: string;
  type: 'preventive' | 'corrective' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedCost: number;
  timeframe: string; // e.g., "3-6 months"
  riskReduction: number; // 0-100
}

export interface TrendAnalysis {
  metric: string;
  direction: 'improving' | 'stable' | 'declining';
  changeRate: number; // percentage change
  timeframe: string;
  significanceLevel: number; // 0-1
}

export interface InspectionData {
  id: string;
  date: string;
  property_id: string;
  property_name?: string;
  findings: string[];
  condition_score?: number;
  weather_damage?: boolean;
  age_years?: number;
  roof_type?: string;
  last_maintenance?: string;
  warranty_status?: 'active' | 'expired';
  inspection_reports?: {
    findings: string;
    recommendations: string;
    priority_level: string;
    estimated_cost: number;
  }[];
}

class RiskAnalysisEngine {
  private readonly RISK_FACTORS = {
    age: {
      weight: 0.25,
      thresholds: { low: 5, medium: 15, high: 25, critical: 35 }
    },
    condition: {
      weight: 0.30,
      thresholds: { excellent: 90, good: 75, fair: 60, poor: 40 }
    },
    weatherDamage: {
      weight: 0.20,
      severityMultiplier: { minor: 1.1, moderate: 1.3, severe: 1.8 }
    },
    maintenanceFrequency: {
      weight: 0.15,
      optimalInterval: 12 // months
    },
    warrantyStatus: {
      weight: 0.10,
      expiredPenalty: 0.15
    }
  };

  async analyzeProperty(propertyId: string): Promise<RiskAnalysis | null> {
    try {
      const inspectionData = await this.getInspectionHistory(propertyId);
      
      if (inspectionData.length === 0) {
        return null;
      }

      const riskScore = this.calculateRiskScore(inspectionData);
      const riskLevel = this.determineRiskLevel(riskScore);
      const trends = this.analyzeTrends(inspectionData);
      const recommendations = this.generateRecommendations(inspectionData, riskScore);
      const predictedMaintenanceDate = this.predictMaintenanceDate(inspectionData, trends);
      const costEstimate = this.estimateMaintenanceCost(inspectionData, recommendations);
      const confidenceScore = this.calculateConfidenceScore(inspectionData);

      return {
        propertyId,
        propertyName: inspectionData[0]?.property_name || 'Unknown Property',
        riskScore,
        riskLevel,
        predictedMaintenanceDate,
        recommendations,
        trends,
        costEstimate,
        confidenceScore
      };
    } catch (error) {
      console.error('Risk analysis failed:', error);
      return null;
    }
  }

  async analyzePortfolio(): Promise<RiskAnalysis[]> {
    try {
      // Get all properties with inspection data
      const { data: properties, error } = await supabase
        .from('roofs')
        .select('id, property_name')
        .not('id', 'is', null);

      if (error || !properties) {
        throw error;
      }

      const analyses: RiskAnalysis[] = [];
      
      for (const property of properties) {
        const analysis = await this.analyzeProperty(property.id);
        if (analysis) {
          analyses.push(analysis);
        }
      }

      return analyses.sort((a, b) => b.riskScore - a.riskScore);
    } catch (error) {
      console.error('Portfolio analysis failed:', error);
      return [];
    }
  }

  private async getInspectionHistory(propertyId: string): Promise<InspectionData[]> {
    const { data: inspections, error } = await supabase
      .from('inspections')
      .select(`
        id,
        scheduled_date,
        completed_date,
        inspection_type,
        status,
        notes,
        weather_conditions,
        roof_id,
        roofs!roof_id(
          property_name,
          roof_age,
          roof_type,
          last_maintenance_date,
          warranty_expiration
        ),
        inspection_reports(
          findings,
          recommendations,
          priority_level,
          estimated_cost
        )
      `)
      .eq('roof_id', propertyId)
      .not('completed_date', 'is', null)
      .order('completed_date', { ascending: false });

    if (error) {
      throw error;
    }

    return this.transformInspectionData(inspections || []);
  }

  private transformInspectionData(rawData: any[]): InspectionData[] {
    return rawData.map(item => ({
      id: item.id,
      date: item.completed_date,
      property_id: item.roof_id,
      property_name: item.roofs?.property_name,
      findings: this.extractFindings(item.notes, item.inspection_reports),
      condition_score: this.calculateConditionScore(item),
      weather_damage: this.detectWeatherDamage(item.weather_conditions, item.notes),
      age_years: item.roofs?.roof_age,
      roof_type: item.roofs?.roof_type,
      last_maintenance: item.roofs?.last_maintenance_date,
      warranty_status: this.getWarrantyStatus(item.roofs?.warranty_expiration),
      inspection_reports: item.inspection_reports
    }));
  }

  private extractFindings(notes: string, reports: any[]): string[] {
    const findings: string[] = [];
    
    if (notes) {
      findings.push(notes);
    }
    
    if (reports) {
      reports.forEach(report => {
        if (report.findings) {
          findings.push(report.findings);
        }
      });
    }
    
    return findings;
  }

  private calculateConditionScore(inspection: any): number {
    // Base score
    let score = 80;
    
    // Analyze findings severity
    const findings = inspection.notes?.toLowerCase() || '';
    const reports = inspection.inspection_reports || [];
    
    // Negative indicators
    const severeIssues = ['leak', 'damage', 'missing', 'cracked', 'broken', 'deteriorated'];
    const moderateIssues = ['wear', 'aging', 'discoloration', 'loose', 'minor'];
    const positiveIndicators = ['good', 'excellent', 'well-maintained', 'no issues'];
    
    severeIssues.forEach(issue => {
      if (findings.includes(issue)) score -= 15;
    });
    
    moderateIssues.forEach(issue => {
      if (findings.includes(issue)) score -= 8;
    });
    
    positiveIndicators.forEach(indicator => {
      if (findings.includes(indicator)) score += 5;
    });
    
    // Factor in priority levels from reports
    reports.forEach(report => {
      if (report.priority_level === 'high') score -= 20;
      else if (report.priority_level === 'medium') score -= 10;
      else if (report.priority_level === 'low') score -= 5;
    });
    
    return Math.max(0, Math.min(100, score));
  }

  private detectWeatherDamage(weather: string, notes: string): boolean {
    const damageIndicators = [
      'storm', 'hail', 'wind', 'weather', 'hurricane', 'tornado',
      'rain damage', 'water damage', 'ice damage'
    ];
    
    const text = `${weather || ''} ${notes || ''}`.toLowerCase();
    return damageIndicators.some(indicator => text.includes(indicator));
  }

  private getWarrantyStatus(expirationDate: string): 'active' | 'expired' {
    if (!expirationDate) return 'expired';
    return new Date(expirationDate) > new Date() ? 'active' : 'expired';
  }

  private calculateRiskScore(inspections: InspectionData[]): number {
    if (inspections.length === 0) return 50;
    
    const latest = inspections[0];
    let riskScore = 0;
    
    // Age factor
    const age = latest.age_years || 0;
    const ageRisk = Math.min(100, (age / 40) * 100);
    riskScore += ageRisk * this.RISK_FACTORS.age.weight;
    
    // Condition factor
    const condition = latest.condition_score || 50;
    const conditionRisk = 100 - condition;
    riskScore += conditionRisk * this.RISK_FACTORS.condition.weight;
    
    // Weather damage factor
    if (latest.weather_damage) {
      riskScore += 30 * this.RISK_FACTORS.weatherDamage.weight;
    }
    
    // Maintenance frequency factor
    const daysSinceLastMaintenance = this.getDaysSinceLastMaintenance(latest.last_maintenance);
    const maintenanceRisk = Math.min(100, (daysSinceLastMaintenance / 730) * 100); // 2 years = max risk
    riskScore += maintenanceRisk * this.RISK_FACTORS.maintenanceFrequency.weight;
    
    // Warranty factor
    if (latest.warranty_status === 'expired') {
      riskScore += 25 * this.RISK_FACTORS.warrantyStatus.weight;
    }
    
    return Math.min(100, Math.max(0, riskScore));
  }

  private getDaysSinceLastMaintenance(lastMaintenance?: string): number {
    if (!lastMaintenance) return 999; // No maintenance recorded
    
    const maintenanceDate = new Date(lastMaintenance);
    const now = new Date();
    return Math.floor((now.getTime() - maintenanceDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 35) return 'medium';
    return 'low';
  }

  private analyzeTrends(inspections: InspectionData[]): TrendAnalysis[] {
    if (inspections.length < 2) return [];
    
    const trends: TrendAnalysis[] = [];
    
    // Condition trend
    const conditionTrend = this.calculateTrend(
      inspections.map(i => i.condition_score || 50)
    );
    
    trends.push({
      metric: 'Overall Condition',
      direction: conditionTrend.direction,
      changeRate: conditionTrend.changeRate,
      timeframe: `${inspections.length} inspections`,
      significanceLevel: conditionTrend.significance
    });
    
    // Weather damage frequency
    const weatherDamageCount = inspections.filter(i => i.weather_damage).length;
    const weatherTrend = weatherDamageCount / inspections.length;
    
    trends.push({
      metric: 'Weather Damage Frequency',
      direction: weatherTrend > 0.3 ? 'declining' : 'stable',
      changeRate: weatherTrend * 100,
      timeframe: `${inspections.length} inspections`,
      significanceLevel: weatherTrend > 0.5 ? 0.8 : 0.4
    });
    
    return trends;
  }

  private calculateTrend(values: number[]): {
    direction: 'improving' | 'stable' | 'declining';
    changeRate: number;
    significance: number;
  } {
    if (values.length < 2) {
      return { direction: 'stable', changeRate: 0, significance: 0 };
    }
    
    const first = values[values.length - 1]; // oldest
    const last = values[0]; // newest
    const changeRate = ((last - first) / first) * 100;
    
    const direction = changeRate > 5 ? 'improving' : 
                     changeRate < -5 ? 'declining' : 'stable';
    
    const significance = Math.min(1, Math.abs(changeRate) / 50);
    
    return { direction, changeRate, significance };
  }

  private generateRecommendations(inspections: InspectionData[], riskScore: number): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const latest = inspections[0];
    
    // Age-based recommendations
    if (latest.age_years && latest.age_years > 20) {
      recommendations.push({
        id: 'age-replacement',
        type: 'preventive',
        priority: latest.age_years > 30 ? 'high' : 'medium',
        description: 'Consider roof replacement due to age',
        estimatedCost: this.estimateReplacementCost(latest.roof_type),
        timeframe: latest.age_years > 30 ? '1-2 years' : '3-5 years',
        riskReduction: 70
      });
    }
    
    // Condition-based recommendations
    if ((latest.condition_score || 50) < 60) {
      recommendations.push({
        id: 'condition-repair',
        type: 'corrective',
        priority: (latest.condition_score || 50) < 40 ? 'high' : 'medium',
        description: 'Address identified condition issues',
        estimatedCost: 5000 + (60 - (latest.condition_score || 50)) * 200,
        timeframe: '3-6 months',
        riskReduction: 40
      });
    }
    
    // Weather damage recommendations
    if (latest.weather_damage) {
      recommendations.push({
        id: 'weather-repair',
        type: 'emergency',
        priority: 'critical',
        description: 'Repair weather-related damage immediately',
        estimatedCost: 3000,
        timeframe: '1-2 weeks',
        riskReduction: 50
      });
    }
    
    // Maintenance recommendations
    const daysSinceLastMaintenance = this.getDaysSinceLastMaintenance(latest.last_maintenance);
    if (daysSinceLastMaintenance > 365) {
      recommendations.push({
        id: 'routine-maintenance',
        type: 'preventive',
        priority: daysSinceLastMaintenance > 730 ? 'medium' : 'low',
        description: 'Schedule routine maintenance inspection',
        estimatedCost: 500,
        timeframe: '1-3 months',
        riskReduction: 25
      });
    }
    
    // Warranty recommendations
    if (latest.warranty_status === 'expired') {
      recommendations.push({
        id: 'warranty-renewal',
        type: 'preventive',
        priority: 'medium',
        description: 'Consider extending or renewing warranty coverage',
        estimatedCost: 2000,
        timeframe: '6-12 months',
        riskReduction: 20
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private estimateReplacementCost(roofType?: string): number {
    const baseCosts = {
      'asphalt': 8000,
      'metal': 15000,
      'tile': 12000,
      'slate': 20000,
      'rubber': 10000
    };
    
    return baseCosts[roofType?.toLowerCase() as keyof typeof baseCosts] || 10000;
  }

  private predictMaintenanceDate(inspections: InspectionData[], trends: TrendAnalysis[]): string {
    const latest = inspections[0];
    const conditionTrend = trends.find(t => t.metric === 'Overall Condition');
    
    let monthsToMaintenance = 12; // Default 1 year
    
    // Adjust based on condition
    if ((latest.condition_score || 50) < 40) {
      monthsToMaintenance = 3;
    } else if ((latest.condition_score || 50) < 60) {
      monthsToMaintenance = 6;
    }
    
    // Adjust based on trend
    if (conditionTrend?.direction === 'declining') {
      monthsToMaintenance = Math.max(1, monthsToMaintenance * 0.7);
    } else if (conditionTrend?.direction === 'improving') {
      monthsToMaintenance = Math.min(24, monthsToMaintenance * 1.3);
    }
    
    const maintenanceDate = new Date();
    maintenanceDate.setMonth(maintenanceDate.getMonth() + monthsToMaintenance);
    
    return maintenanceDate.toISOString();
  }

  private estimateMaintenanceCost(inspections: InspectionData[], recommendations: Recommendation[]): number {
    const baseCost = recommendations.reduce((sum, rec) => sum + rec.estimatedCost, 0);
    
    // Add buffer for unexpected issues
    return Math.round(baseCost * 1.15);
  }

  private calculateConfidenceScore(inspections: InspectionData[]): number {
    let confidence = 0.5; // Base confidence
    
    // More inspections = higher confidence
    confidence += Math.min(0.3, inspections.length * 0.05);
    
    // Recent inspections = higher confidence
    const latestInspection = new Date(inspections[0]?.date);
    const daysSinceLatest = (Date.now() - latestInspection.getTime()) / (1000 * 60 * 60 * 24);
    confidence += Math.max(0, 0.2 - (daysSinceLatest / 365) * 0.1);
    
    return Math.min(1, Math.max(0, confidence));
  }
}

// Singleton instance
export const riskAnalysisEngine = new RiskAnalysisEngine();