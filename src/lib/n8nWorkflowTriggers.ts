/**
 * Enhanced n8n Workflow Triggers for RoofMind Automation
 * Senior Engineer's Solution - Debug-First Approach
 * Handles triggering of deficiency alerts and AI inspection reviews
 */

import { supabase } from '@/integrations/supabase/client';

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

export interface WorkflowResponse {
  success: boolean;
  data?: any;
  error?: string;
  debug?: {
    method: 'edge_function' | 'direct_webhook';
    edgeResponse?: any;
    webhookResponse?: any;
    payload_preview?: any;
  };
}

class N8nWorkflowTriggers {
  /**
   * Enhanced workflow trigger with comprehensive debugging
   * Always uses Edge Function for CORS-free operation
   */
  async triggerDeficiencyAlerts(payload: DeficiencyAlertPayload): Promise<WorkflowResponse> {
    console.log('🚀 [n8nWorkflowTriggers] Starting deficiency alerts workflow...');
    console.log('📋 [n8nWorkflowTriggers] Payload preview:', {
      inspection_id: payload.inspection_id,
      property_name: payload.property_name,
      deficiency_count: payload.deficiencies?.length || 0,
      has_membrane_failure: payload.deficiencies?.some(d => 
        d.description?.toLowerCase().includes('membrane failure')
      ) || false,
      immediate_repairs: payload.deficiencies?.filter(d => d.isImmediateRepair).length || 0
    });

    try {
      // Call the enhanced edge function
      const { data, error } = await supabase.functions.invoke('trigger-workflow', {
        body: payload  // Send payload directly (edge function handles routing)
      });

      if (error) {
        console.error('❌ [n8nWorkflowTriggers] Edge function error:', error);
        throw error;
      }

      console.log('✅ [n8nWorkflowTriggers] Edge function response:', data);

      return {
        success: data?.success || false,
        data: data,
        debug: {
          method: 'edge_function',
          edgeResponse: data,
          payload_preview: {
            inspection_id: payload.inspection_id,
            deficiency_count: payload.deficiencies?.length
          }
        }
      };

    } catch (error) {
      console.error('💥 [n8nWorkflowTriggers] Fatal error in deficiency alerts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown workflow error',
        debug: {
          method: 'edge_function',
          payload_preview: {
            inspection_id: payload.inspection_id,
            deficiency_count: payload.deficiencies?.length
          }
        }
      };
    }
  }

  /**
   * Enhanced AI review workflow trigger
   */
  async triggerInspectionReview(payload: InspectionReviewPayload): Promise<WorkflowResponse> {
    console.log('🔍 [n8nWorkflowTriggers] Starting AI review workflow...');
    console.log('📋 [n8nWorkflowTriggers] Review payload preview:', {
      inspection_id: payload.inspection_id,
      property_name: payload.property_name,
      status: payload.status,
      has_deficiencies: (payload.deficiencies?.length || 0) > 0,
      has_photos: (payload.photos?.length || 0) > 0
    });

    try {
      const { data, error } = await supabase.functions.invoke('trigger-workflow', {
        body: payload  // Send payload directly
      });

      if (error) {
        console.error('❌ [n8nWorkflowTriggers] AI review edge function error:', error);
        throw error;
      }

      console.log('✅ [n8nWorkflowTriggers] AI review response:', data);

      return {
        success: data?.success || false,
        data: data,
        debug: {
          method: 'edge_function',
          edgeResponse: data,
          payload_preview: {
            inspection_id: payload.inspection_id,
            status: payload.status
          }
        }
      };

    } catch (error) {
      console.error('💥 [n8nWorkflowTriggers] Fatal error in AI review:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown AI review error',
        debug: {
          method: 'edge_function',
          payload_preview: {
            inspection_id: payload.inspection_id,
            status: payload.status
          }
        }
      };
    }
  }

  /**
   * Enhanced combined workflow trigger
   * Comprehensive debugging and error tracking
   */
  async triggerInspectionWorkflows(inspectionData: any): Promise<{
    deficiencyAlerts: WorkflowResponse;
    aiReview: WorkflowResponse;
    summary: {
      total_triggered: number;
      successful: number;
      failed: number;
      should_have_triggered_deficiency: boolean;
      should_have_triggered_ai_review: boolean;
    };
  }> {
    console.log('🎯 [n8nWorkflowTriggers] === STARTING COMBINED WORKFLOWS ===');
    console.log('📊 [n8nWorkflowTriggers] Inspection data summary:', {
      id: inspectionData.id,
      property_name: inspectionData.property_name || inspectionData.roofs?.property_name,
      status: inspectionData.status,
      deficiency_count: inspectionData.deficiencies?.length || 0,
      has_immediate_repairs: inspectionData.deficiencies?.some((d: any) => d.isImmediateRepair) || false
    });

    const results = {
      deficiencyAlerts: { success: false, data: null, error: 'Not triggered' } as WorkflowResponse,
      aiReview: { success: false, data: null, error: 'Not triggered' } as WorkflowResponse,
      summary: {
        total_triggered: 0,
        successful: 0,
        failed: 0,
        should_have_triggered_deficiency: false,
        should_have_triggered_ai_review: false
      }
    };

    // Check if deficiency alerts should trigger
    const shouldTriggerDeficiency = (inspectionData.deficiencies?.length || 0) > 0;
    results.summary.should_have_triggered_deficiency = shouldTriggerDeficiency;

    if (shouldTriggerDeficiency) {
      console.log('📧 [n8nWorkflowTriggers] Triggering deficiency alerts...');
      results.summary.total_triggered++;
      
      results.deficiencyAlerts = await this.triggerDeficiencyAlerts({
        inspection_id: inspectionData.id,
        property_name: inspectionData.property_name || inspectionData.roofs?.property_name,
        property_address: this.buildPropertyAddress(inspectionData),
        inspector_name: this.getInspectorName(inspectionData),
        deficiencies: this.formatDeficiencies(inspectionData.deficiencies)
      });

      if (results.deficiencyAlerts.success) {
        results.summary.successful++;
        console.log('✅ [n8nWorkflowTriggers] Deficiency alerts succeeded');
      } else {
        results.summary.failed++;
        console.error('❌ [n8nWorkflowTriggers] Deficiency alerts failed:', results.deficiencyAlerts.error);
      }
    } else {
      console.log('⏭️ [n8nWorkflowTriggers] Skipping deficiency alerts (no deficiencies)');
    }

    // Check if AI review should trigger
    const shouldTriggerAI = this.shouldTriggerAIReview(inspectionData);
    results.summary.should_have_triggered_ai_review = shouldTriggerAI;

    if (shouldTriggerAI) {
      console.log('🤖 [n8nWorkflowTriggers] Triggering AI review...');
      results.summary.total_triggered++;
      
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

      if (results.aiReview.success) {
        results.summary.successful++;
        console.log('✅ [n8nWorkflowTriggers] AI review succeeded');
      } else {
        results.summary.failed++;
        console.error('❌ [n8nWorkflowTriggers] AI review failed:', results.aiReview.error);
      }
    } else {
      console.log('⏭️ [n8nWorkflowTriggers] Skipping AI review (conditions not met)');
    }

    console.log('📊 [n8nWorkflowTriggers] === WORKFLOW SUMMARY ===');
    console.log('📈 [n8nWorkflowTriggers] Results:', results.summary);
    console.log('🏁 [n8nWorkflowTriggers] === WORKFLOWS COMPLETE ===');

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
   * Enhanced connectivity test with full debugging
   */
  async testWorkflowConnectivity(): Promise<{
    edgeFunctionReachable: boolean;
    n8nWebhooksReachable: boolean;
    deficiencyAlertsTest: WorkflowResponse;
    aiReviewTest: WorkflowResponse;
    summary: {
      total_tests: number;
      passed: number;
      failed: number;
      edge_function_working: boolean;
    };
  }> {
    console.log('🧪 [n8nWorkflowTriggers] === STARTING CONNECTIVITY TESTS ===');

    const results = {
      edgeFunctionReachable: false,
      n8nWebhooksReachable: false,
      deficiencyAlertsTest: { success: false, error: 'Not tested' } as WorkflowResponse,
      aiReviewTest: { success: false, error: 'Not tested' } as WorkflowResponse,
      summary: {
        total_tests: 2,
        passed: 0,
        failed: 0,
        edge_function_working: false
      }
    };

    // Test 1: Deficiency alerts workflow
    console.log('🧪 [n8nWorkflowTriggers] Testing deficiency alerts...');
    try {
      results.deficiencyAlertsTest = await this.triggerDeficiencyAlerts({
        inspection_id: 'connectivity-test',
        property_name: 'Test Property - Connectivity Check',
        property_address: '123 Test Street',
        inspector_name: 'Test Inspector',
        deficiencies: [{
          id: 'test-deficiency-1',
          category: 'Test Category',
          description: 'Connectivity test deficiency',
          location: 'Test Area',
          severity: 'low' as const,
          isImmediateRepair: false
        }]
      });
      
      if (results.deficiencyAlertsTest.success) {
        results.summary.passed++;
        results.edgeFunctionReachable = true;
        console.log('✅ [n8nWorkflowTriggers] Deficiency alerts test PASSED');
      } else {
        results.summary.failed++;
        console.log('❌ [n8nWorkflowTriggers] Deficiency alerts test FAILED:', results.deficiencyAlertsTest.error);
      }
    } catch (error) {
      results.summary.failed++;
      console.error('💥 [n8nWorkflowTriggers] Deficiency alerts test CRASHED:', error);
    }

    // Test 2: AI review workflow
    console.log('🧪 [n8nWorkflowTriggers] Testing AI review...');
    try {
      results.aiReviewTest = await this.triggerInspectionReview({
        inspection_id: 'connectivity-test',
        property_name: 'Test Property - AI Review Check',
        property_address: '123 Test Street',
        inspector_name: 'Test Inspector',
        status: 'completed'
      });
      
      if (results.aiReviewTest.success) {
        results.summary.passed++;
        results.edgeFunctionReachable = true;
        console.log('✅ [n8nWorkflowTriggers] AI review test PASSED');
      } else {
        results.summary.failed++;
        console.log('❌ [n8nWorkflowTriggers] AI review test FAILED:', results.aiReviewTest.error);
      }
    } catch (error) {
      results.summary.failed++;
      console.error('💥 [n8nWorkflowTriggers] AI review test CRASHED:', error);
    }

    // Determine overall connectivity status
    results.summary.edge_function_working = results.edgeFunctionReachable;
    results.n8nWebhooksReachable = results.summary.passed > 0;

    console.log('📊 [n8nWorkflowTriggers] === CONNECTIVITY TEST RESULTS ===');
    console.log('📈 [n8nWorkflowTriggers] Summary:', results.summary);
    console.log('🔗 [n8nWorkflowTriggers] Edge Function:', results.edgeFunctionReachable ? 'WORKING' : 'FAILED');
    console.log('🌐 [n8nWorkflowTriggers] n8n Webhooks:', results.n8nWebhooksReachable ? 'REACHABLE' : 'UNREACHABLE');
    console.log('🏁 [n8nWorkflowTriggers] === CONNECTIVITY TESTS COMPLETE ===');

    return results;
  }

  /**
   * Manual trigger for browser console debugging
   * Usage: n8nWorkflowTriggers.manualTrigger('test-inspection-id')
   */
  async manualTrigger(inspectionId: string = 'manual-test'): Promise<any> {
    console.log('🔧 [n8nWorkflowTriggers] === MANUAL DEBUGGING TRIGGER ===');
    
    const testData = {
      id: inspectionId,
      property_name: 'Manual Test Property',
      status: 'completed',
      deficiencies: [{
        id: 'manual-test-deficiency',
        category: 'Manual Test',
        description: 'membrane failure test for manual trigger',
        location: 'Test Area',
        severity: 'high' as const,
        isImmediateRepair: true
      }],
      roofs: {
        property_name: 'Manual Test Property',
        address: '123 Debug Street',
        city: 'Test City',
        state: 'TS'
      },
      users: {
        first_name: 'Debug',
        last_name: 'User'
      }
    };

    const result = await this.triggerInspectionWorkflows(testData);
    
    console.log('🔧 [n8nWorkflowTriggers] Manual trigger result:', result);
    console.log('🔧 [n8nWorkflowTriggers] === MANUAL TRIGGER COMPLETE ===');
    
    return result;
  }
}

// Export singleton instance
export const n8nWorkflowTriggers = new N8nWorkflowTriggers();