/**
 * Manual test utility for n8n workflow triggers
 * Add this to browser console to test workflows directly
 */

import { supabase } from '@/integrations/supabase/client';

// Test data
const createTestInspectionData = () => ({
  id: 'test-inspection-' + Date.now(),
  property_name: 'Test Property - Dallas Corporate Center 1',
  property_address: '123 Test Street, Dallas, TX',
  status: 'completed',
  deficiencies: [
    {
      id: 'test-def-1',
      category: 'Membrane System',
      description: 'membrane failure detected in northeast corner of building',
      location: 'Northeast Corner',
      severity: 'high' as const,
      estimatedCost: 15000,
      budgetAmount: 15000,
      isImmediateRepair: false,
      photos: []
    },
    {
      id: 'test-def-2', 
      category: 'Immediate Repair',
      description: 'immediate repair needed for damaged flashing',
      location: 'South Wall',
      severity: 'high' as const,
      estimatedCost: 2500,
      budgetAmount: 2500,
      isImmediateRepair: true,
      photos: []
    }
  ],
  overviewPhotos: [
    { type: 'overview', url: 'https://example.com/photo1.jpg' },
    { type: 'overview', url: 'https://example.com/photo2.jpg' }
  ],
  users: {
    first_name: 'Test',
    last_name: 'Inspector',
    email: 'test@roofmind.app'
  }
});

// Direct webhook test function
async function testDirectWebhook() {
  console.log('🧪 Testing DIRECT webhook to n8n...');
  
  const testData = createTestInspectionData();
  const webhookUrl = 'https://mkidder97.app.n8n.cloud/webhook/roofmind-deficiency-alerts';
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inspection_id: testData.id,
        property_name: testData.property_name,
        property_address: testData.property_address,
        inspector_name: `${testData.users.first_name} ${testData.users.last_name}`,
        deficiencies: testData.deficiencies
      })
    });

    console.log('✅ Direct webhook response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (response.ok) {
      const result = await response.text();
      console.log('📄 Response body:', result);
    } else {
      const error = await response.text();
      console.log('❌ Error response:', error);
    }

  } catch (error) {
    console.error('❌ Direct webhook failed:', error);
  }
}

// Supabase proxy test function
async function testSupabaseProxy() {
  console.log('🧪 Testing SUPABASE PROXY to n8n...');
  
  const testData = createTestInspectionData();
  
  try {
    const { data, error } = await supabase.functions.invoke('trigger-workflow', {
      body: {
        workflow: 'deficiency-alerts',
        payload: {
          inspection_id: testData.id,
          property_name: testData.property_name,
          property_address: testData.property_address,
          inspector_name: `${testData.users.first_name} ${testData.users.last_name}`,
          deficiencies: testData.deficiencies
        }
      }
    });

    if (error) {
      console.error('❌ Supabase proxy error:', error);
    } else {
      console.log('✅ Supabase proxy success:', data);
    }

  } catch (error) {
    console.error('❌ Supabase proxy failed:', error);
  }
}

// Test both methods
async function runN8nTests() {
  console.log('🚀 Starting n8n workflow tests...');
  console.log('Environment config:', {
    USE_SUPABASE_PROXY: import.meta.env.VITE_USE_SUPABASE_PROXY,
    N8N_WEBHOOK_BASE: import.meta.env.VITE_N8N_WEBHOOK_BASE
  });

  // Test based on current configuration
  if (import.meta.env.VITE_USE_SUPABASE_PROXY === 'true') {
    await testSupabaseProxy();
  } else {
    await testDirectWebhook();
  }
}

// Make functions available globally for console testing
(window as any).testN8nWorkflows = {
  runTests: runN8nTests,
  testDirect: testDirectWebhook,
  testProxy: testSupabaseProxy,
  createTestData: createTestInspectionData
};

console.log('🧪 n8n Test Functions Available:');
console.log('  - testN8nWorkflows.runTests() - Run test based on current config');
console.log('  - testN8nWorkflows.testDirect() - Test direct webhook');
console.log('  - testN8nWorkflows.testProxy() - Test Supabase proxy');
console.log('  - testN8nWorkflows.createTestData() - Generate test data');

export { runN8nTests, testDirectWebhook, testSupabaseProxy };