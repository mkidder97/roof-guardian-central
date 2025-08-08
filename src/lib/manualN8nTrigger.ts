/**
 * Manual n8n trigger for testing
 * Run this in the browser console to manually trigger webhooks
 */

import { n8nWorkflowTriggers } from './n8nWorkflowTriggers';

// Add this to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).testN8n = {
    // Test with the Dallas Corporate Center data
    async triggerDallasTest() {
      console.log('🚀 Triggering n8n workflows for Dallas Corporate Center test...');
      
      const testData = {
        id: 'dallas-test-' + Date.now(),
        property_name: 'Dallas Corporate Center 1',
        property_address: 'Dallas, TX',
        status: 'completed',
        deficiencies: [
          {
            id: 'def-1',
            category: 'Immediate Repair',
            description: 'Prep area and apply large heat welded TPO membrane repairs to the gouges within the roof and remove debris around drainage system to allow for proper water flow.',
            location: 'Throughout field of roof',
            budgetAmount: 0,
            severity: 'high',
            isImmediateRepair: true,
            photos: []
          },
          {
            id: 'def-2',
            category: 'Membrane Failures',
            description: 'Membrane fracturing located at field laps and fasteners. Should be a warrantable item.',
            location: 'Throughout field',
            budgetAmount: 0,
            severity: 'high',
            isImmediateRepair: false,
            photos: []
          }
        ],
        executiveSummary: {
          summaryText: 'Roof inspection completed for Dallas Corporate Center',
          overallCondition: 'Fair',
          overallRating: 3,
          keyFindings: ['Immediate repairs needed', 'Membrane failures detected'],
          criticalIssues: ['Membrane fracturing'],
          recommendedActions: ['Apply TPO membrane repairs', 'Clear drainage system'],
          budgetRecommendation: 'Immediate Repairs Required'
        },
        roofs: {
          property_name: 'Dallas Corporate Center 1',
          address: 'Dallas, TX'
        },
        users: {
          first_name: 'Michael',
          last_name: 'Kidder',
          email: 'michaelkidder2@gmail.com'
        }
      };
      
      const results = await n8nWorkflowTriggers.triggerInspectionWorkflows(testData);
      console.log('✅ n8n workflow results:', results);
      
      return results;
    },
    
    // Test connectivity
    async testConnectivity() {
      console.log('🔌 Testing n8n webhook connectivity...');
      const results = await n8nWorkflowTriggers.testWorkflowConnectivity();
      console.log('Connectivity results:', results);
      return results;
    },
    
    // Show current configuration
    showConfig() {
      console.log('📋 Current n8n configuration:');
      console.log('USE_SUPABASE_PROXY:', import.meta.env.VITE_USE_SUPABASE_PROXY);
      console.log('N8N_WEBHOOK_BASE:', import.meta.env.VITE_N8N_WEBHOOK_BASE);
      console.log('Deficiency webhook:', `${import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://mkidder97.app.n8n.cloud/webhook'}/roofmind-deficiency-alerts`);
      console.log('AI Review webhook:', `${import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://mkidder97.app.n8n.cloud/webhook'}/roofmind-inspection-review`);
    }
  };
  
  console.log('🎯 n8n test utilities loaded! Use these commands in the console:');
  console.log('- testN8n.showConfig() - Show current configuration');
  console.log('- testN8n.testConnectivity() - Test webhook connectivity');
  console.log('- testN8n.triggerDallasTest() - Send Dallas Corporate Center test data');
}

export {};