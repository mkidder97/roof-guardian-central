# Direct Inspection Workflow Test Suite

This directory contains comprehensive tests for the direct inspection scheduling workflow feature. The test suite ensures that the feature works correctly across all areas of the software.

## Test Overview

The test suite validates the entire direct inspection workflow including:
- Modal-based inspection creation
- Database consistency between `inspections` and `inspection_sessions` tables
- Status transitions and synchronization
- Display in both main dashboard and inspector interface
- Error handling and edge cases

## Test Structure

```
src/test/
├── setup.ts                           # Global test setup and configuration
├── mocks/
│   └── supabase.ts                    # Mock data and Supabase client
├── utils/
│   └── test-utils.tsx                 # Custom render functions and utilities
├── integration/
│   ├── directInspectionWorkflow.test.tsx    # Integration tests for direct inspection creation
│   └── statusTransitions.test.tsx           # Status transition integration tests
├── e2e/
│   └── directInspectionE2E.test.tsx         # End-to-end workflow tests
└── database/
    └── consistency.test.ts                  # Database consistency validation tests

components/
├── inspections/__tests__/
│   └── InspectionSchedulingModal.test.tsx   # Unit tests for scheduling modal
├── dashboard/__tests__/
│   └── InspectionsTab.test.tsx              # Unit tests for dashboard display
└── pages/__tests__/
    └── InspectorInterface.test.tsx          # Unit tests for inspector interface
```

## Test Categories

### 1. Unit Tests
- **InspectionSchedulingModal**: Tests the direct inspection creation modal
- **InspectionsTab**: Tests inspection display in the main dashboard
- **InspectorInterface**: Tests inspection display in the inspector interface

### 2. Integration Tests
- **Direct Inspection Workflow**: Tests the complete flow from creation to database storage
- **Status Transitions**: Tests status changes and synchronization between tables

### 3. Database Consistency Tests
- Tests data integrity between `inspections` and `inspection_sessions` tables
- Validates foreign key relationships and status synchronization
- Tests cascade operations and constraint enforcement

### 4. End-to-End Tests
- Complete workflow validation from UI interaction to database storage
- Cross-component integration testing
- Error handling and recovery scenarios

## Key Test Scenarios

### Direct Inspection Creation
- ✅ Modal display and form interaction
- ✅ Property and inspector selection
- ✅ Date/time scheduling
- ✅ Form validation (required fields)
- ✅ Database record creation
- ✅ Success/error notifications

### Database Consistency
- ✅ Inspection and session records are created simultaneously
- ✅ Property ID consistency (`roof_id` = `property_id`)
- ✅ Inspector ID consistency
- ✅ Status synchronization
- ✅ Data integrity validation using RPC functions

### Status Transitions
- ✅ Valid transition paths: scheduled → in_progress → ready_for_review → completed
- ✅ Cancellation from any status
- ✅ Status synchronization between tables
- ✅ Bulk status operations
- ✅ Status history tracking

### Dashboard Integration
- ✅ Inspections appear in main dashboard
- ✅ Correct status badge display
- ✅ Priority indicators
- ✅ Search and filtering functionality
- ✅ Export capabilities

### Inspector Interface Integration
- ✅ Inspections appear in assigned inspector's interface
- ✅ Property selection and briefing generation
- ✅ Inspection start/completion workflow
- ✅ Real-time status updates

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Database consistency tests only
npm run test:database
```

### Feature-Specific Tests
```bash
# Direct inspection workflow tests
npm run test:direct-inspection

# Status transition tests
npm run test:status-transitions

# Data consistency tests
npm run test:consistency
```

### Development Testing
```bash
# Watch mode for development
npm run test:watch

# Test with UI
npm run test:ui

# Coverage report
npm run test:coverage
```

## Test Configuration

### Vitest Configuration
- **Environment**: jsdom for DOM testing
- **Setup**: Automatic mock setup and cleanup
- **Coverage**: v8 provider with HTML reports
- **Globals**: Enabled for convenience

### Mock Strategy
- **Supabase Client**: Comprehensive mocking with operation tracking
- **React Router**: Navigation mocking
- **Toast Notifications**: Interaction tracking
- **External Services**: Service layer mocking

### Test Data
Mock data includes:
- **Properties**: Sample property records with various configurations
- **Inspectors**: Sample inspector users with different roles
- **Inspections**: Sample inspection records in different states
- **Sessions**: Sample session records with various status configurations

## Validation Coverage

### Frontend Validation
- ✅ Form field validation
- ✅ Required field enforcement
- ✅ Date/time validation
- ✅ User role permissions
- ✅ Error message display

### Backend Validation
- ✅ Database constraint enforcement
- ✅ Foreign key integrity
- ✅ Status transition rules
- ✅ Data consistency checks
- ✅ Cascade operations

### Cross-System Validation
- ✅ UI state synchronization
- ✅ Real-time updates
- ✅ Offline functionality
- ✅ Error recovery
- ✅ Performance under load

## Error Scenarios Tested

### Network/Database Errors
- ✅ Connection failures
- ✅ Timeout handling
- ✅ Partial operation failures
- ✅ Retry mechanisms
- ✅ Graceful degradation

### Data Validation Errors
- ✅ Invalid input handling
- ✅ Missing required fields
- ✅ Constraint violations
- ✅ Orphaned record detection
- ✅ Status inconsistencies

### User Experience Errors
- ✅ Permission denied scenarios
- ✅ Concurrent modification conflicts
- ✅ Outdated data handling
- ✅ Session timeout recovery
- ✅ Browser compatibility issues

## Performance Testing

### Load Testing
- ✅ Large dataset handling (100+ inspections)
- ✅ Concurrent user operations
- ✅ Bulk operations efficiency
- ✅ Memory usage optimization
- ✅ Render performance

### Scalability Testing
- ✅ Database query optimization
- ✅ Component re-render minimization
- ✅ Memory leak prevention
- ✅ Network request batching
- ✅ Cache effectiveness

## Accessibility Testing

### Screen Reader Support
- ✅ ARIA label compliance
- ✅ Focus management
- ✅ Keyboard navigation
- ✅ Status announcements
- ✅ Error message accessibility

### Keyboard Navigation
- ✅ Tab order consistency
- ✅ Shortcut functionality
- ✅ Modal focus trapping
- ✅ Form navigation
- ✅ Context-sensitive help

## Continuous Integration

### Pre-commit Hooks
Tests are automatically run before commits to ensure:
- All existing tests pass
- New code meets coverage requirements
- No regressions are introduced
- Code quality standards are maintained

### CI/CD Pipeline
- **Pull Request**: Full test suite execution
- **Main Branch**: Regression testing and deployment validation
- **Release**: Comprehensive testing including manual verification
- **Hotfix**: Critical path testing for urgent fixes

## Test Maintenance

### Regular Updates
- Mock data kept current with schema changes
- Test scenarios updated with new features
- Performance benchmarks adjusted for growth
- Accessibility standards compliance verification

### Coverage Goals
- **Unit Tests**: 90%+ coverage
- **Integration Tests**: All critical paths covered
- **E2E Tests**: Complete user journeys validated
- **Database Tests**: All data integrity rules verified

## Troubleshooting

### Common Issues
1. **Mock Data Inconsistency**: Ensure mock data matches current schema
2. **Test Timeouts**: Increase timeout for complex operations
3. **Race Conditions**: Use proper waiting mechanisms
4. **Memory Leaks**: Clean up resources in test teardown
5. **Flaky Tests**: Identify and fix non-deterministic behavior

### Debugging Tips
- Use `test:ui` for interactive debugging
- Add `console.log` statements for state inspection
- Use `waitFor` for asynchronous operations
- Check mock function call history
- Verify test isolation and cleanup

## Contributing

When adding new features to the direct inspection workflow:

1. **Add Unit Tests**: Test individual components and functions
2. **Add Integration Tests**: Test feature interactions
3. **Update Mock Data**: Include relevant test data
4. **Document Changes**: Update this README with new test scenarios
5. **Verify Coverage**: Ensure adequate test coverage for new code

For questions or issues with the test suite, please refer to the project's main documentation or contact the development team.