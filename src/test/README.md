# Direct Inspection Mode Test Suite

This document describes the comprehensive test suite for the Direct Inspection Mode filtering and selection system.

## Overview

The Direct Mode test suite ensures that the Direct Inspection Mode works exactly like Campaign Mode while providing proper single-property selection functionality. The tests cover unit testing, integration testing, performance testing, and end-to-end workflows.

## Test Structure

### 1. Unit Tests (`unit/directModeFilters.test.tsx`)

Tests individual components and their isolated functionality:

- **Filter Dropdown Components**
  - Region, Market, Inspection Type, Zipcode dropdowns
  - Default value initialization
  - Filter value updates and validation

- **Property Search Functionality**
  - Multi-field search (name, address, city, manager)
  - Case-insensitive search
  - Real-time filtering
  - Empty state handling

- **Single Property Selection**
  - Radio button behavior (single selection)
  - Visual selection indicators
  - Property details population
  - Selection clearing

- **Pagination Controls**
  - Page navigation
  - Boundary conditions
  - Page size handling
  - State persistence

- **Property List Rendering**
  - Property detail display
  - Inspection date formatting
  - Contact information display
  - Property metrics

### 2. Integration Tests (`integration/directModeIntegration.test.tsx`)

Tests component interactions and data flow:

- **Filter Application with Backend Queries**
  - Multiple filter combinations
  - API call optimization
  - Result filtering accuracy
  - Cache invalidation

- **Property Search Across Multiple Fields**
  - Combined search and filter operations
  - Search result accuracy
  - Performance under load

- **State Management Between Filter Changes**
  - Filter state persistence
  - Selection state management
  - Search state handling
  - Pagination state

- **Property Selection and Form Population**
  - Property detail extraction
  - Form field population
  - Validation handling
  - Error states

- **Cache Functionality and Performance**
  - Query result caching
  - Cache invalidation strategies
  - Memory management
  - Performance optimization

### 3. Comparison Tests (`comparison/directVsCampaignMode.test.tsx`)

Ensures Direct Mode functionality matches Campaign Mode exactly:

- **Filter Behavior Comparison**
  - Identical filter results
  - Same API queries
  - Consistent performance
  - Filter independence

- **Property Display Differences**
  - Multi-select vs single-select
  - Selection UI differences
  - Information parity

- **State Isolation Between Modes**
  - Independent selections
  - Separate search terms
  - Isolated pagination
  - Mode-specific state

- **Performance Parity**
  - Load time comparison
  - Filter performance
  - Search responsiveness
  - Memory usage

### 4. User Workflow Tests (`workflow/directInspectionUserFlow.test.tsx`)

Tests complete user workflows and scenarios:

- **Complete Direct Inspection Creation Workflow**
  - Filter → Search → Select → Create flow
  - Inspector assignment
  - Form validation
  - Success confirmation

- **Error Handling in Workflow**
  - API error recovery
  - Validation error display
  - User feedback
  - Graceful degradation

- **Form Validation and Edge Cases**
  - Date validation
  - Required field validation
  - Input sanitization
  - Error messaging

- **Performance During Workflow**
  - UI responsiveness
  - Fast user interactions
  - State consistency

### 5. Performance Tests (`performance/directModePerformance.test.tsx`)

Tests system performance under various conditions:

- **Large Dataset Filtering (288+ properties)**
  - Load time thresholds
  - Filter application speed
  - Search responsiveness
  - Complex filter combinations

- **Search Performance**
  - Real-time search response
  - Rapid typing handling
  - Large dataset search
  - Multi-field search optimization

- **Memory Usage During Operations**
  - Memory leak detection
  - Efficient pagination
  - Cache memory management
  - Garbage collection

- **UI Responsiveness Under Load**
  - Non-blocking operations
  - Responsive interactions
  - Mode switching performance
  - Error recovery speed

### 6. End-to-End Tests (`e2e/directInspectionE2E.test.tsx`)

Tests complete application workflows:

- **Complete Direct Inspection Lifecycle**
  - Scheduling to completion
  - Cross-component integration
  - Database consistency
  - Status transitions

- **Error Scenarios and Recovery**
  - Partial failure handling
  - Network failure recovery
  - Data consistency
  - User error recovery

- **Cross-Component Integration**
  - Modal to dashboard integration
  - Inspector interface integration
  - Data synchronization
  - Status propagation

## Test Configuration

### Performance Thresholds

```typescript
performance: {
  maxLoadTime: 3000,        // 3 seconds for initial load
  maxFilterTime: 2000,      // 2 seconds for filter application
  maxSearchTime: 500,       // 500ms for search response
  maxMemoryIncrease: 50,    // 50% memory increase threshold
  maxUIResponseTime: 1000   // 1 second for UI responsiveness
}
```

### Dataset Sizes

- **Small**: 50 properties (quick tests)
- **Medium**: 288 properties (realistic production size)
- **Large**: 1000 properties (stress testing)
- **XLarge**: 5000 properties (extreme stress testing)

### Test Timeouts

- **Unit**: 5 seconds
- **Integration**: 10 seconds
- **Workflow**: 15 seconds
- **Performance**: 30 seconds
- **E2E**: 60 seconds

## Running Tests

### All Direct Mode Tests
```bash
npm run test:direct-mode
# or
vitest run src/test/**/*direct*.test.tsx
```

### By Category
```bash
# Unit tests
npm run test:direct-unit
vitest run src/test/unit/directModeFilters.test.tsx

# Integration tests
npm run test:direct-integration
vitest run src/test/integration/directMode*.test.tsx

# Comparison tests
npm run test:direct-comparison
vitest run src/test/comparison/directVsCampaignMode.test.tsx

# Workflow tests
npm run test:direct-workflow
vitest run src/test/workflow/directInspectionUserFlow.test.tsx

# Performance tests
npm run test:direct-performance
vitest run src/test/performance/directModePerformance.test.tsx

# End-to-end tests
npm run test:direct-e2e
vitest run src/test/e2e/directInspectionE2E.test.tsx
```

### Development Mode
```bash
# Watch mode for active development
npm run test:direct-watch
vitest src/test/**/*direct*.test.tsx

# Coverage report
npm run test:direct-coverage
vitest run --coverage src/test/**/*direct*.test.tsx
```

## Test Data and Mocks

### Mock Data Generation

The test suite uses dynamic mock data generation for realistic testing:

```typescript
// Generate properties for testing
const mockProperties = testUtils.createMockProperties(288, {
  regions: ['Central', 'East', 'West', 'North', 'South'],
  markets: ['Dallas', 'Houston', 'Austin', 'San Antonio'],
  zipcodes: ['75001', '75002', '75003', '75004']
})
```

### Supabase Mocking

Advanced Supabase mocking that simulates real query behavior:

```typescript
// Mock with realistic filtering
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table) => ({
      select: () => queryBuilder,
      eq: (field, value) => applyFilter(field, value),
      order: () => executeQuery()
    })
  }
}))
```

## Test Scenarios

### Filter Scenarios
- Single region filter
- Region and market combination
- Multiple zipcode selection
- Complex multi-parameter filtering

### Search Scenarios
- Property name exact match
- City name search
- Property manager search
- Partial address search

### Error Scenarios
- API failure handling
- Empty result sets
- Invalid form data
- Network timeouts

## Performance Monitoring

### Key Metrics Tracked
- Initial load time
- Filter application time
- Search response time
- Memory usage patterns
- UI responsiveness

### Performance Reports
Tests generate detailed performance reports including:
- Operation timings
- Memory usage patterns
- API call efficiency
- User interaction responsiveness

## Best Practices

### Writing New Tests

1. **Follow the AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Test Names**: Clearly describe what is being tested
3. **Mock External Dependencies**: Use consistent mocking patterns
4. **Test Edge Cases**: Include error conditions and boundary cases
5. **Measure Performance**: Include timing assertions for critical operations

### Mock Data Guidelines

1. **Realistic Data**: Use data that resembles production
2. **Consistent Patterns**: Follow established mock data structures
3. **Scalable Generation**: Use functions to generate large datasets
4. **Edge Cases**: Include null values, empty strings, and boundary conditions

### Performance Testing

1. **Set Clear Thresholds**: Define acceptable performance limits
2. **Test Various Loads**: Test with different dataset sizes
3. **Monitor Memory**: Track memory usage patterns
4. **Measure Real Operations**: Time actual user interactions

## Continuous Integration

The test suite is designed to run in CI/CD pipelines with:

- **Parallel Execution**: Tests can run in parallel for faster feedback
- **Retry Logic**: Flaky tests are automatically retried
- **Performance Regression Detection**: Performance metrics are tracked over time
- **Coverage Requirements**: Minimum coverage thresholds are enforced

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase timeout values for slow operations
2. **Mock Data Issues**: Verify mock data matches expected format
3. **Performance Failures**: Check if thresholds need adjustment for CI environment
4. **Flaky Tests**: Add proper wait conditions and retries

### Debug Mode

Run tests with debug information:
```bash
DEBUG=true vitest run src/test/**/*direct*.test.tsx
```

## Contributing

When adding new Direct Mode functionality:

1. **Add Unit Tests**: Test individual components
2. **Add Integration Tests**: Test component interactions
3. **Update Comparison Tests**: Ensure parity with Campaign Mode
4. **Add Performance Tests**: Verify performance requirements
5. **Update Documentation**: Keep this README current

## Future Enhancements

Planned test suite improvements:

- **Visual Regression Testing**: Screenshot comparison tests
- **Accessibility Testing**: Screen reader and keyboard navigation tests
- **Mobile Responsiveness**: Touch interaction and responsive design tests
- **Load Testing**: Concurrent user simulation
- **Cross-Browser Testing**: Multi-browser compatibility validation