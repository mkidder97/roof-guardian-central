/**
 * Example integration for n8n workflows
 * Shows how to trigger deficiency alerts and AI reviews
 */

import { n8nWorkflowTriggers } from '@/lib/n8nWorkflowTriggers';
import type { DeficiencyAlertPayload, InspectionReviewPayload } from '@/lib/n8nWorkflowTriggers';

/**
 * Example: Trigger workflows after inspection completion
 */
export async function handleInspectionCompletion(inspectionData: any) {
  // Prepare the deficiency alert payload
  if (inspectionData.deficiencies?.length > 0) {
    const deficiencyPayload: DeficiencyAlertPayload = {
      inspection_id: inspectionData.id,
      property_name: inspectionData.property_name || inspectionData.roofs?.property_name || 'Unknown Property',
      property_address: buildPropertyAddress(inspectionData),
      inspector_name: getInspectorName(inspectionData),
      deficiencies: inspectionData.deficiencies.map((def: any) => ({
        id: def.id,
        category: def.category,
        description: def.description,
        location: def.location,
        budgetAmount: def.budgetAmount || def.estimatedBudget,
        estimatedCost: def.estimatedCost,
        severity: def.severity,
        isImmediateRepair: def.isImmediateRepair || false,
        needsSupervisorAlert: def.needsSupervisorAlert || false,
        criticalityScore: def.criticalityScore,
        detectionTimestamp: def.detectionTimestamp || new Date().toISOString(),
        photos: (def.photos || []).map((photo: any) => ({
          id: photo.id,
          url: photo.url || photo.publicUrl,
          publicUrl: photo.publicUrl || photo.url
        }))
      }))
    };

    // Trigger deficiency alerts
    const alertResult = await n8nWorkflowTriggers.triggerDeficiencyAlerts(deficiencyPayload);
    console.log('Deficiency alerts result:', alertResult);
  }

  // Prepare the AI review payload if inspection is ready
  if (inspectionData.status === 'completed' || inspectionData.ready_to_send) {
    const reviewPayload: InspectionReviewPayload = {
      inspection_id: inspectionData.id,
      property_name: inspectionData.property_name || inspectionData.roofs?.property_name || 'Unknown Property',
      property_address: buildPropertyAddress(inspectionData),
      inspector_name: getInspectorName(inspectionData),
      status: inspectionData.status,
      executiveSummary: inspectionData.executiveSummary ? {
        summaryText: inspectionData.executiveSummary.summaryText || '',
        overallCondition: inspectionData.executiveSummary.overallCondition || 'Fair',
        overallRating: inspectionData.executiveSummary.overallRating || 3,
        keyFindings: inspectionData.executiveSummary.keyFindings || [],
        criticalIssues: inspectionData.executiveSummary.criticalIssues || [],
        recommendedActions: inspectionData.executiveSummary.recommendedActions || [],
        budgetRecommendation: inspectionData.executiveSummary.budgetRecommendation || 'Minor Repairs',
        nextInspectionDate: inspectionData.executiveSummary.nextInspectionDate,
        inspectorNotes: inspectionData.executiveSummary.inspectorNotes
      } : undefined,
      deficiencies: (inspectionData.deficiencies || []).map((def: any) => ({
        id: def.id,
        category: def.category,
        description: def.description,
        location: def.location,
        budgetAmount: def.budgetAmount || def.estimatedBudget,
        estimatedCost: def.estimatedCost,
        severity: def.severity,
        photos: (def.photos || []).map((photo: any) => ({
          url: photo.url || photo.publicUrl,
          type: photo.type || 'deficiency'
        }))
      })),
      capitalExpenses: inspectionData.capitalExpenses,
      photos: formatPhotos(inspectionData),
      notes: inspectionData.notes || inspectionData.inspectionNotes,
      weather_conditions: inspectionData.weather_conditions
    };

    // Trigger AI review
    const reviewResult = await n8nWorkflowTriggers.triggerInspectionReview(reviewPayload);
    console.log('AI review result:', reviewResult);
  }
}

/**
 * Example: Test connectivity before triggering workflows
 */
export async function testWorkflowConnectivity() {
  const connectivity = await n8nWorkflowTriggers.testWorkflowConnectivity();
  
  console.log('Workflow connectivity test:', {
    deficiencyAlerts: connectivity.deficiencyAlerts ? '✅ Connected' : '❌ Not connected',
    aiReview: connectivity.aiReview ? '✅ Connected' : '❌ Not connected'
  });
  
  return connectivity;
}

/**
 * Example: Trigger workflows with combined helper
 */
export async function triggerAllWorkflows(inspectionData: any) {
  const results = await n8nWorkflowTriggers.triggerInspectionWorkflows(inspectionData);
  
  console.log('Workflow trigger results:', {
    deficiencyAlerts: results.deficiencyAlerts.success ? '✅ Success' : '❌ Failed',
    aiReview: results.aiReview.success ? '✅ Success' : '❌ Failed'
  });
  
  return results;
}

// Helper functions
function buildPropertyAddress(inspectionData: any): string {
  const roof = inspectionData.roofs || inspectionData.roof;
  if (!roof) return inspectionData.property_address || '';
  
  const parts = [
    roof.address,
    roof.city,
    roof.state
  ].filter(Boolean);
  
  return parts.join(', ');
}

function getInspectorName(inspectionData: any): string {
  const user = inspectionData.users || inspectionData.inspector;
  if (!user) return inspectionData.inspector_name || 'Unknown Inspector';
  
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  
  return `${firstName} ${lastName}`.trim() || 'Unknown Inspector';
}

function formatPhotos(inspectionData: any): any[] {
  const photos: any[] = [];
  
  // Add overview photos
  if (Array.isArray(inspectionData.overviewPhotos)) {
    inspectionData.overviewPhotos.forEach((photo: any) => {
      photos.push({
        type: 'overview',
        url: photo.url || photo.publicUrl
      });
    });
  }
  
  // Add deficiency photos
  if (Array.isArray(inspectionData.deficiencies)) {
    inspectionData.deficiencies.forEach((def: any) => {
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