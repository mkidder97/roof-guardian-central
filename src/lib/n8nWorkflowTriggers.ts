/**
 * n8n Workflow Triggers for RoofMind Automation
 * Handles triggering of deficiency alerts and AI inspection reviews
 */

import { supabase } from '@/integrations/supabase/client';

// Configuration
const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://mkidder97.app.n8n.cloud/webhook';
const USE_SUPABASE_PROXY = import.meta.env.VITE_USE_SUPABASE_PROXY === 'true';

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
  private deficiencyAlertsUrl = `${N8N_BASE_URL}/roofmind-deficiency-alerts`;
  private inspectionReviewUrl = `${N8N_BASE_URL}/roofmind-inspection-review`;

  /**
   * Trigger deficiency alert workflow
   * Detects membrane failures and immediate repairs
   */
  async triggerDeficiencyAlerts(payload: DeficiencyAlertPayload): Promise<{
    success: boolean;
    data: any;
    error?: string;
  }> {
    try {
      console.log('Triggering deficiency alerts workflow:', {
        inspection_id: payload.inspection_id,
        deficiency_count: payload.deficiencies.length,
        membrane_failures: payload.deficiencies.filter(d => 
          d.description.toLowerCase().includes('membrane failure')
        ).length,
        immediate_repairs: payload.deficiencies.filter(d => 
          d.isImmediateRepair === true
        ).length
      });

      if (USE_SUPABASE_PROXY) {
        // Use Supabase edge function proxy
        const { data, error } = await supabase.functions.invoke('trigger-workflow', {
          body: { workflow: 'deficiency-alerts', payload }
        });
        if (error) throw error;
        return { success: true, data: data || {} };
      } else {
        // Direct webhook call
        const response = await fetch(this.deficiencyAlertsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Deficiency alerts workflow completed:', result);

        return {
          success: true,
          data: result
        };
      }
    } catch (error) {
      console.error('Failed to trigger deficiency alerts:', error);
      return {
        success: false,
        data: {},
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
    data: any;
    error?: string;
  }> {
    try {
      console.log('Triggering AI inspection review workflow:', {
        inspection_id: payload.inspection_id,
        property: payload.property_name,
        status: payload.status,
        has_executive_summary: !!payload.executiveSummary,
        deficiency_count: payload.deficiencies?.length || 0,
        photo_count: payload.photos?.length || 0
      });

      if (USE_SUPABASE_PROXY) {
        // Use Supabase edge function proxy
        const { data, error } = await supabase.functions.invoke('trigger-workflow', {
          body: { workflow: 'inspection-review', payload }
        });
        if (error) throw error;
        return { success: true, data: data || {} };
      } else {
        // Direct webhook call
        const response = await fetch(this.inspectionReviewUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('AI inspection review workflow completed:', result);

        return {
          success: true,
          data: result
        };
      }
    } catch (error) {
      console.error('Failed to trigger AI inspection review:', error);
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Combined workflow trigger for inspection completion
   * Handles both deficiency alerts and AI review
   */
  async triggerInspectionWorkflows(inspectionData: any): Promise<{
    deficiencyAlerts: { success: boolean; data: any; error?: string };
    aiReview: { success: boolean; data: any; error?: string };
  }> {
    const results = {
      deficiencyAlerts: { success: true, data: {} },
      aiReview: { success: true, data: {} }
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

    if (USE_SUPABASE_PROXY) {
      // Test via Supabase proxy
      try {
        const { data, error } = await supabase.functions.invoke('trigger-workflow', {
          body: { workflow: 'deficiency-alerts', payload: {
            inspection_id: 'connectivity-test',
            property_name: 'Test Property',
            deficiencies: []
          } }
        });
        results.deficiencyAlerts = !error;
      } catch (error) {
        console.warn('Deficiency alerts workflow not accessible:', error);
      }

      try {
        const { data, error } = await supabase.functions.invoke('trigger-workflow', {
          body: { workflow: 'inspection-review', payload: {
            inspection_id: 'connectivity-test',
            property_name: 'Test Property',
            status: 'completed'
          } }
        });
        results.aiReview = !error;
      } catch (error) {
        console.warn('AI review workflow not accessible:', error);
      }
    } else {
      // Test direct webhooks
      try {
        const response = await fetch(this.deficiencyAlertsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inspection_id: 'connectivity-test',
            property_name: 'Test Property',
            deficiencies: []
          })
        });
        results.deficiencyAlerts = response.status < 500;
      } catch (error) {
        console.warn('Deficiency alerts workflow not accessible:', error);
      }

      try {
        const response = await fetch(this.inspectionReviewUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inspection_id: 'connectivity-test',
            property_name: 'Test Property',
            status: 'completed'
          })
        });
        results.aiReview = response.status < 500;
      } catch (error) {
        console.warn('AI review workflow not accessible:', error);
      }
    }

    return results;
  }
}

// Export singleton instance
export const n8nWorkflowTriggers = new N8nWorkflowTriggers();