/**
 * Direct Inspection Mode Test Suite
 * 
 * Comprehensive test suite for the Direct Inspection Mode filtering and selection system.
 * This file serves as an index and configuration for all Direct Mode tests.
 */

// Test Categories
export const testCategories = {
  unit: {
    description: 'Unit tests for individual components and functions',
    files: [
      'unit/directModeFilters.test.tsx'
    ]
  },
  integration: {
    description: 'Integration tests for component interactions and data flow',
    files: [
      'integration/directModeIntegration.test.tsx',
      'integration/directInspectionWorkflow.test.tsx'
    ]
  },
  comparison: {
    description: 'Comparison tests ensuring Direct Mode matches Campaign Mode functionality',
    files: [
      'comparison/directVsCampaignMode.test.tsx'
    ]
  },
  workflow: {
    description: 'End-to-end user workflow tests',
    files: [
      'workflow/directInspectionUserFlow.test.tsx'
    ]
  },
  performance: {
    description: 'Performance and scalability tests',
    files: [
      'performance/directModePerformance.test.tsx'
    ]
  },
  e2e: {
    description: 'End-to-end tests across the entire application',
    files: [
      'e2e/directInspectionE2E.test.tsx'
    ]
  }
}

// Test Configuration
export const testConfig = {
  // Performance thresholds
  performance: {
    maxLoadTime: 3000, // 3 seconds for initial load
    maxFilterTime: 2000, // 2 seconds for filter application
    maxSearchTime: 500, // 500ms for search response
    maxMemoryIncrease: 50, // 50% memory increase threshold
    maxUIResponseTime: 1000 // 1 second for UI responsiveness
  },
  
  // Dataset sizes for testing
  datasets: {
    small: 50,
    medium: 288, // Realistic production size
    large: 1000, // Stress test size
    xlarge: 5000 // Extreme stress test
  },
  
  // Test timeouts
  timeouts: {
    unit: 5000, // 5 seconds
    integration: 10000, // 10 seconds
    workflow: 15000, // 15 seconds
    performance: 30000, // 30 seconds
    e2e: 60000 // 60 seconds
  },
  
  // Retry configuration
  retry: {
    flaky: 2, // Retry flaky tests 2 times
    performance: 1, // Retry performance tests 1 time
    e2e: 3 // Retry e2e tests 3 times
  }
}

// Test Utilities
export const testUtils = {
  /**
   * Creates a mock property dataset
   */
  createMockProperties: (count: number, options: any = {}) => {
    const defaults = {
      regions: ['Central', 'East', 'West', 'North', 'South'],
      markets: ['Dallas', 'Houston', 'Austin', 'San Antonio'],
      zipcodes: ['75001', '75002', '75003', '75004']
    }
    
    const config = { ...defaults, ...options }
    
    return Array.from({ length: count }, (_, i) => ({
      id: `prop-${i}`,
      property_name: `Property ${i}`,
      address: `${100 + i} Main St`,
      city: config.markets[i % config.markets.length],
      state: 'TX',
      zip: config.zipcodes[i % config.zipcodes.length],
      market: config.markets[i % config.markets.length],
      region: config.regions[i % config.regions.length],
      roof_type: ['Modified Bitumen', 'TPO', 'EPDM'][i % 3],
      roof_area: 10000 + (i * 500),
      last_inspection_date: i % 3 === 0 ? '2024-01-15' : null,
      site_contact_name: `Contact ${i}`,
      site_contact_phone: `555-${1000 + i}`,
      roof_access: 'ladder',
      latitude: 32.7767,
      longitude: -96.7970,
      manufacturer_warranty_expiration: '2025-12-31',
      installer_warranty_expiration: '2025-06-30',
      client_id: `client-${i % 5}`,
      status: 'active',
      property_manager_name: `Manager ${i}`,
      property_manager_email: `manager${i}@test.com`,
      property_manager_phone: `555-${2000 + i}`,
      clients: {
        company_name: `Company ${i % 5}`
      }
    }))
  },
  
  /**
   * Creates mock inspectors
   */
  createMockInspectors: () => [
    {
      id: 'inspector-1',
      email: 'mkidder@southernroof.biz',
      full_name: 'Michael Kidder',
      first_name: 'Michael',
      last_name: 'Kidder',
      phone: '555-9999',
      role: 'inspector'
    },
    {
      id: 'inspector-2',
      email: 'inspector2@test.com',
      full_name: 'Test Inspector',
      first_name: 'Test',
      last_name: 'Inspector',
      phone: '555-8888',
      role: 'inspector'
    }
  ],
  
  /**
   * Performance measurement utility
   */
  measurePerformance: async (name: string, operation: () => Promise<void>) => {
    const start = performance.now()
    await operation()
    const end = performance.now()
    const duration = end - start
    
    return {
      name,
      duration,
      timestamp: new Date().toISOString()
    }
  },
  
  /**
   * Wait for specific condition with timeout
   */
  waitForCondition: async (
    condition: () => boolean, 
    timeout: number = 5000,
    interval: number = 100
  ) => {
    const start = Date.now()
    
    while (Date.now() - start < timeout) {
      if (condition()) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    
    throw new Error(`Condition not met within ${timeout}ms`)
  }
}

// Test Scenarios
export const testScenarios = {
  /**
   * Basic filtering scenarios
   */
  filtering: [
    {
      name: 'single_region_filter',
      description: 'Filter by single region',
      filters: { region: 'Central' },
      expectedResult: 'properties in Central region only'
    },
    {
      name: 'region_and_market_filter',
      description: 'Filter by region and market',
      filters: { region: 'Central', market: 'Dallas' },
      expectedResult: 'properties in Central region and Dallas market'
    },
    {
      name: 'zipcode_filter',
      description: 'Filter by multiple zipcodes',
      filters: { zipcodes: ['75001', '75002'] },
      expectedResult: 'properties in specified zipcodes only'
    },
    {
      name: 'complex_filter_combination',
      description: 'Complex filter with all parameters',
      filters: { 
        region: 'Central', 
        market: 'Dallas', 
        inspectionType: 'annual',
        zipcodes: ['75001'] 
      },
      expectedResult: 'properties matching all filter criteria'
    }
  ],
  
  /**
   * Search scenarios
   */
  search: [
    {
      name: 'property_name_search',
      description: 'Search by property name',
      searchTerm: 'Property 5',
      expectedResult: 'exact property match'
    },
    {
      name: 'city_search',
      description: 'Search by city name',
      searchTerm: 'Dallas',
      expectedResult: 'all properties in Dallas'
    },
    {
      name: 'manager_search',
      description: 'Search by property manager',
      searchTerm: 'Manager 10',
      expectedResult: 'properties managed by Manager 10'
    },
    {
      name: 'partial_address_search',
      description: 'Search by partial address',
      searchTerm: '123',
      expectedResult: 'properties with 123 in address'
    }
  ],
  
  /**
   * Error scenarios
   */
  errors: [
    {
      name: 'api_failure',
      description: 'Handle API failure gracefully',
      mockError: 'Database connection failed',
      expectedBehavior: 'show error message, do not crash'
    },
    {
      name: 'empty_results',
      description: 'Handle no results found',
      filters: { region: 'NonexistentRegion' },
      expectedBehavior: 'show empty state message'
    },
    {
      name: 'invalid_form_data',
      description: 'Handle invalid form submission',
      formData: { property: null, date: '' },
      expectedBehavior: 'show validation errors'
    }
  ]
}

// Test Reports Configuration
export const reportConfig = {
  coverage: {
    threshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    exclude: [
      'src/test/**/*',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}'
    ]
  },
  
  performance: {
    outputFile: 'test-results/performance-report.json',
    thresholds: testConfig.performance
  },
  
  e2e: {
    outputDir: 'test-results/e2e',
    video: true,
    screenshots: true
  }
}

// Export test commands
export const testCommands = {
  // Run all Direct Mode tests
  all: 'vitest run src/test/**/*direct*.test.tsx',
  
  // Run by category
  unit: 'vitest run src/test/unit/directModeFilters.test.tsx',
  integration: 'vitest run src/test/integration/directMode*.test.tsx',
  comparison: 'vitest run src/test/comparison/directVsCampaignMode.test.tsx',
  workflow: 'vitest run src/test/workflow/directInspectionUserFlow.test.tsx',
  performance: 'vitest run src/test/performance/directModePerformance.test.tsx',
  e2e: 'vitest run src/test/e2e/directInspectionE2E.test.tsx',
  
  // Watch mode
  watch: 'vitest src/test/**/*direct*.test.tsx',
  
  // Coverage
  coverage: 'vitest run --coverage src/test/**/*direct*.test.tsx',
  
  // Performance only
  perf: 'vitest run src/test/performance/directModePerformance.test.tsx --reporter=verbose'
}

export default {
  testCategories,
  testConfig,
  testUtils,
  testScenarios,
  reportConfig,
  testCommands
}