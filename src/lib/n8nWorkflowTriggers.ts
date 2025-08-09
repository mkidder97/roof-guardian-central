/**
 * n8n Workflow Triggers for RoofMind Automation
 * Handles triggering of deficiency alerts and AI inspection reviews
 */

import { supabase } from '@/integrations/supabase/client';

// Configuration: All calls go through secure edge proxy

export interface DeficiencyAlertPayload {
  inspection_id: string;
  property_name: string;
  property_address?: string;
  inspector_name?: string;
  deficiencies: Array<{
    id: string;
    category: string;
    description: string;
    location: string;
    budgetAmount?: number;
    estimatedCost?: number;
    severity: 'low' | 'medium' | 'high';
    isImmediateRepair?: boolean;
    needsSupervisorAlert?: boolean;
    criticalityScore?: number;
    detectionTimestamp?: string;
    photos?: Array<{
      id?: string;
      url?: string;
      publicUrl?: string;
    }>;
  }>;
}

export interface InspectionReviewPayload {
  inspection_id: string;
  property_name: string;
  property_address?: string;
  inspector_name?: string;
  status: string;
  executiveSummary?: {
    summaryText: string;
    overallCondition: string;
    overallRating: number;
    keyFindings: string[];
    criticalIssues: string[];
    recommendedActions: string[];
    budgetRecommendation: string;
    nextInspectionDate?: string;
    inspectorNotes?: string;
  };
  deficiencies?: Array<{
    id: string;
    category: string;
    description: string;
    location: string;
    budgetAmount?: number;
    estimatedCost?: number;
    severity: string;
    photos?: Array<{
      url: string;
      type: string;
    }>;
  }>;
  capitalExpenses?: Array<{
    description: string;
    year: number;
    estimatedCost: number;
    priority: string;
  }>;
  photos?: Array<{
    type: 'overview' | 'deficiency';
    url: string;
  }>;
  notes?: string;
  weather_conditions?: string;
}

class N8nWorkflowTriggers {
  /**
   * Trigger deficiency alert workflow
   * Detects membrane failures and immediate repairs
   */
  async triggerDeficiencyAlerts(payload: DeficiencyAlertPayload): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('trigger-workflow', {
        body: { workflow: 'deficiency-alerts', payload }
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to trigger deficiency alerts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Trigger AI inspection review workflow
   * Performs quality analysis and generates enhanced reports
   */
  async triggerInspectionReview(payload: InspectionReviewPayload): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('trigger-workflow', {
        body: { workflow: 'inspection-review', payload }
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Failed to trigger AI inspection review:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Combined workflow trigger for inspection completion
   * Handles both deficiency alerts and AI review
   */
  async triggerInspectionWorkflows(inspectionData: any): Promise<{
    deficiencyAlerts: { success: boolean; data?: any; error?: string };
    aiReview: { success: boolean; data?: any; error?: string };
  }> {
    const results = {
      deficiencyAlerts: { success: true, data: null },
      aiReview: { success: true, data: null }
    };

    // Trigger deficiency alerts if deficiencies exist
    if (inspectionData.deficiencies?.length > 0) {
      results.deficiencyAlerts = await this.triggerDeficiencyAlerts({
        inspection_id: inspectionData.id,
        property_name: inspectionData.property_name || inspectionData.roofs?.property_name,
        property_address: this.buildPropertyAddress(inspectionData),
        inspector_name: this.getInspectorName(inspectionData),
        deficiencies: this.formatDeficiencies(inspectionData.deficiencies)
      });
    }

    // Trigger AI review if inspection is completed or ready
    if (this.shouldTriggerAIReview(inspectionData)) {
      results.aiReview = await this.triggerInspectionReview({
        inspection_id: inspectionData.id,
        property_name: inspectionData.property_name || inspectionData.roofs?.property_name,
        property_address: this.buildPropertyAddress(inspectionData),
        inspector_name: this.getInspectorName(inspectionData),
        status: inspectionData.status,
        executiveSummary: inspectionData.executiveSummary,
        deficiencies: this.formatDeficiencies(inspectionData.deficiencies),
        capitalExpenses: inspectionData.capitalExpenses,
        photos: this.formatPhotos(inspectionData.overviewPhotos, inspectionData.deficiencies),
        notes: inspectionData.inspectionNotes || inspectionData.notes,
        weather_conditions: inspectionData.weather_conditions
      });
    }

    return results;
  }

    /**
   * Helper methods
   */
  private buildPropertyAddress(inspectionData: any): string {
    const roof = inspectionData.roofs || inspectionData.roof;
    if (!roof) return inspectionData.property_address || '';
    const parts = [roof.address, roof.city, roof.state].filter(Boolean);
    return parts.join(', ');
  }

  private getInspectorName(inspectionData: any): string {
    const user = inspectionData.users || inspectionData.inspector;
    if (!user) return inspectionData.inspector_name || 'Unknown Inspector';
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    
    return `${firstName} ${lastName}`.trim() || 'Unknown Inspector';
  }

  private shouldTriggerAIReview(inspectionData: any): boolean {
    const status = inspectionData.status;
    const readyToSend = inspectionData.ready_to_send;
    
    return (
      status === 'completed' || 
      status === 'ready_for_review' || 
      readyToSend === true
    );
  }

  private formatDeficiencies(deficiencies: any[]): any[] {
    if (!Array.isArray(deficiencies)) return [];
    
    return deficiencies.map(def => ({
      id: def.id,
      category: def.category,
      description: def.description || '',
      location: def.location || '',
      budgetAmount: def.budgetAmount || def.estimatedBudget,
      estimatedCost: def.estimatedCost,
      severity: def.severity || 'medium',
      isImmediateRepair: def.isImmediateRepair || false,
      needsSupervisorAlert: def.needsSupervisorAlert || false,
      criticalityScore: def.criticalityScore,
      detectionTimestamp: def.detectionTimestamp,
      photos: (def.photos || []).map((photo: any) => ({
        id: photo.id,
        url: photo.url || photo.publicUrl,
        publicUrl: photo.publicUrl || photo.url
      }))
    }));
  }

  private formatPhotos(overviewPhotos: any[], deficiencies: any[]): any[] {
    const photos: any[] = [];
    
    // Add overview photos
    if (Array.isArray(overviewPhotos)) {
      overviewPhotos.forEach(photo => {
        photos.push({
          type: 'overview',
          url: photo.url || photo.publicUrl
        });
      });
    }
    
    // Add deficiency photos
    if (Array.isArray(deficiencies)) {
      deficiencies.forEach(def => {
        if (Array.isArray(def.photos)) {
          def.photos.forEach((photo: any) => {
            photos.push({
              type: 'deficiency',
              url: photo.url || photo.publicUrl
            });
          });
        }
      });
    }
    
    return photos.filter(photo => photo.url);
  }

  /**
   * Test workflow connectivity
   */
  async testWorkflowConnectivity(): Promise<{
    deficiencyAlerts: boolean;
    aiReview: boolean;
  }> {
    const results = {
      deficiencyAlerts: false,
      aiReview: false
    };

    // Test deficiency alerts workflow
    try {
      const response = await supabase.functions.invoke('trigger-workflow', {
        body: { workflow: 'deficiency-alerts', payload: {
          inspection_id: 'connectivity-test',
          property_name: 'Test Property',
          deficiencies: []
        } }
      });
      results.deficiencyAlerts = response.status < 500;
    } catch (error) {
      console.warn('Deficiency alerts workflow not accessible:', error);
    }

    // Test AI review workflow
    try {
      const response = await supabase.functions.invoke('trigger-workflow', {
        body: { workflow: 'inspection-review', payload: {
          inspection_id: 'connectivity-test',
          property_name: 'Test Property',
          status: 'completed'
        } }
      });
      results.aiReview = response.status < 500;
    } catch (error) {
      console.warn('AI review workflow not accessible:', error);
    }

    return results;
  }
}

// Export singleton instance
export const n8nWorkflowTriggers = new N8nWorkflowTriggers();