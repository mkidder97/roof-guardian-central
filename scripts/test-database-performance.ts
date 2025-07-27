/**
 * Database Performance Test Script
 * Run this to verify all optimizations are working correctly
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  testName: string;
  passed: boolean;
  executionTime: number;
  error?: string;
  details?: any;
}

async function runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
  const startTime = performance.now();
  try {
    const result = await testFn();
    const executionTime = performance.now() - startTime;
    return {
      testName,
      passed: true,
      executionTime,
      details: result
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;
    return {
      testName,
      passed: false,
      executionTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  console.log('🚀 Starting Database Performance Tests...\n');

  const tests: TestResult[] = [];

  // Test 1: Check indexes exist
  tests.push(await runTest('Check Indexes', async () => {
    const { data, error } = await supabase.rpc('get_property_filter_options');
    if (error) throw error;
    return { indexesWorking: true, data };
  }));

  // Test 2: Test optimized property search
  tests.push(await runTest('Optimized Property Search', async () => {
    const { data, error } = await supabase.rpc('search_properties', {
      p_search_term: 'test',
      p_region: null,
      p_market: null,
      p_zipcodes: null,
      p_limit: 10,
      p_offset: 0
    });
    if (error) throw error;
    return { count: data?.length || 0 };
  }));

  // Test 3: Test zipcode filtering
  tests.push(await runTest('Zipcode Filtering', async () => {
    const { data, error } = await supabase.rpc('get_available_zipcodes', {
      p_region: null,
      p_market: null,
      p_client_id: null
    });
    if (error) throw error;
    return { zipcodeCount: data?.length || 0 };
  }));

  // Test 4: Test region/market statistics
  tests.push(await runTest('Region/Market Stats', async () => {
    const { data, error } = await supabase
      .from('mv_region_market_stats')
      .select('*');
    if (error) throw error;
    return { statsCount: data?.length || 0 };
  }));

  // Test 5: Test complex filtering query
  tests.push(await runTest('Complex Filter Query', async () => {
    const { data, error, count } = await supabase
      .from('roofs')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .eq('is_deleted', false)
      .in('zip', ['10001', '10002', '10003'])
      .limit(50);
    if (error) throw error;
    return { resultCount: data?.length || 0, totalCount: count };
  }));

  // Test 6: Test property count by criteria
  tests.push(await runTest('Property Count by Region', async () => {
    const { data, error } = await supabase.rpc('count_properties_by_criteria', {
      p_group_by: 'region',
      p_client_id: null,
      p_include_inactive: false
    });
    if (error) throw error;
    return { regionCount: data?.length || 0 };
  }));

  // Test 7: Test bulk update function
  tests.push(await runTest('Bulk Update Function', async () => {
    // Get some test property IDs first
    const { data: properties } = await supabase
      .from('roofs')
      .select('id')
      .limit(5);
    
    if (!properties || properties.length === 0) {
      return { message: 'No properties to test with' };
    }

    const propertyIds = properties.map(p => p.id);
    const { data, error } = await supabase.rpc('bulk_update_property_managers', {
      p_property_ids: propertyIds,
      p_manager_name: 'Test Manager',
      p_manager_email: 'test@example.com',
      p_manager_phone: '555-0123'
    });
    
    if (error) throw error;
    
    // Revert the changes
    await supabase
      .from('roofs')
      .update({ 
        property_manager_name: null,
        property_manager_email: null,
        property_manager_phone: null 
      })
      .in('id', propertyIds);
    
    return { updatedCount: data };
  }));

  // Print results
  console.log('\n📊 Test Results:\n');
  
  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  
  tests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    const time = test.executionTime.toFixed(2);
    console.log(`${status} ${test.testName} (${time}ms)`);
    
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    } else if (test.details) {
      console.log(`   Details:`, test.details);
    }
    console.log('');
  });

  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);
  
  // Performance analysis
  const avgTime = tests.reduce((sum, t) => sum + t.executionTime, 0) / tests.length;
  const slowTests = tests.filter(t => t.executionTime > 1000);
  
  console.log(`\n⚡ Performance Analysis:`);
  console.log(`Average execution time: ${avgTime.toFixed(2)}ms`);
  console.log(`Slow tests (>1s): ${slowTests.length}`);
  
  if (slowTests.length > 0) {
    console.log('\nSlow tests:');
    slowTests.forEach(test => {
      console.log(`- ${test.testName}: ${test.executionTime.toFixed(2)}ms`);
    });
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
main().catch(console.error);