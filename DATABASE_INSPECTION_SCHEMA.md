# Database Schema Updates for Direct Inspection Scheduling

## Overview
This document outlines the database schema changes implemented to support both campaign-based and direct inspection scheduling workflows. The changes ensure seamless integration between the `inspections` and `inspection_sessions` tables while maintaining data consistency.

## Key Schema Changes

### 1. Enhanced Table Relationships

#### `inspections` table additions:
- `campaign_id UUID` - Links to `inspection_campaigns(id)`, NULL for direct inspections
- Enables differentiation between campaign-created and direct-created inspections

#### `inspection_sessions` table additions:
- `inspection_id UUID` - Links to `inspections(id)` for one-to-one relationship
- Maintains bidirectional synchronization between inspection metadata and session data

### 2. Automated Workflow Integration

#### Trigger Functions:
- `auto_create_inspection_session()` - Automatically creates session when inspection is created
- `sync_inspection_status()` - Bidirectional status synchronization
- Data consistency validation triggers

#### Status Management:
- Unified status tracking across both tables
- Automatic status history logging
- Expiration and cleanup automation

## Core Functions

### Direct Inspection Creation
```sql
-- Main creation function
SELECT * FROM public.create_direct_inspection(
  p_roof_id := 'property-uuid',
  p_inspector_id := 'inspector-uuid',
  p_scheduled_date := '2025-07-27',
  p_inspection_type := 'Routine Inspection',
  p_notes := 'Scheduled via direct workflow'
);

-- Frontend-friendly RPC
SELECT * FROM public.schedule_direct_inspection(
  property_id := 'property-uuid',
  inspector_id := 'inspector-uuid',
  scheduled_date := '2025-07-27',
  inspection_type := 'Emergency Inspection'
);
```

### Data Retrieval Functions
```sql
-- Get complete inspection with session data
SELECT * FROM public.get_inspection_with_session('inspection-uuid');

-- Get inspector's active inspections
SELECT * FROM public.get_inspector_active_inspections('inspector-uuid');

-- Update inspection progress
SELECT public.update_inspection_progress(
  p_session_id := 'session-uuid',
  p_session_data := '{"step": "inspection", "photos": ["img1.jpg"]}',
  p_new_status := 'in_progress'
);
```

## Enhanced Views

### `inspection_status_dashboard`
Unified view combining both campaign and direct inspections:
- Complete property and inspector information
- Campaign details (when applicable)
- Status tracking and history
- Source identification (campaign vs direct)

### `inspection_summary_stats`
High-level statistics for monitoring:
- Total inspections by source type
- Status distribution
- Performance metrics
- Active inspector counts

### `inspection_status_summary`
Quick status overview for dashboards:
- Count by status
- Inspector and property counts
- Timestamp ranges
- Source type breakdown

## Data Consistency Features

### Validation Functions
- `validate_inspection_consistency()` - Identifies data integrity issues
- `fix_inspection_consistency()` - Automatically repairs common issues
- `inspection_system_health_check()` - Comprehensive system status

### Maintenance Functions
- `cleanup_orphaned_sessions()` - Removes invalid session records
- `run_inspection_maintenance()` - Complete automated maintenance
- Scheduled cleanup jobs (with pg_cron if available)

### Data Protection
- Cascade deletion rules for proper cleanup
- Referential integrity constraints
- Property/inspector ID consistency validation
- Protected deletion of linked sessions

## Migration Files

1. **20250726190000-add-direct-inspection-support.sql**
   - Core schema changes and relationships
   - Automatic session creation triggers
   - Status synchronization system
   - Main creation and sync functions

2. **20250726191000-add-inspection-helpers.sql**
   - Helper functions for data retrieval
   - Progress update mechanisms
   - Statistical views
   - Frontend integration functions

3. **20250726192000-inspection-data-consistency.sql**
   - Data validation and repair functions
   - Consistency enforcement triggers
   - Health monitoring system
   - Automated maintenance tools

## Usage Examples

### Creating a Direct Inspection
```sql
-- Simple creation
SELECT * FROM public.schedule_direct_inspection(
  '12345678-1234-5678-9012-123456789012'::UUID, -- property_id
  '87654321-4321-8765-2109-876543210987'::UUID, -- inspector_id
  '2025-07-28'::DATE,                            -- scheduled_date
  'Emergency Inspection',                        -- inspection_type
  'Reported leak after storm'                    -- notes
);
```

### Monitoring System Health
```sql
-- Quick health check
SELECT public.inspection_system_health_check();

-- Detailed consistency report
SELECT * FROM public.validate_inspection_consistency();

-- Status summary
SELECT * FROM public.inspection_status_summary;
```

### Inspector Dashboard Data
```sql
-- Get inspector's active work
SELECT * FROM public.get_inspector_active_inspections(auth.uid());

-- Update inspection progress
SELECT public.update_inspection_progress(
  'session-uuid',
  '{"step": "roof_assessment", "notes": ["Started inspection"], "photos": ["roof1.jpg"]}',
  'in_progress'::inspection_status
);
```

## Security and Permissions

- Row Level Security (RLS) enabled on all tables
- Role-based access control with proper policies
- Inspector ownership validation
- Manager/admin override capabilities
- Secure function execution with proper permission checks

## Benefits

1. **Unified Workflow**: Both campaign and direct inspections use the same underlying system
2. **Data Integrity**: Automatic validation and repair mechanisms
3. **Real-time Sync**: Bidirectional status updates between tables
4. **Comprehensive Monitoring**: Health checks and statistical reporting
5. **Flexible API**: Multiple functions for different use cases
6. **Automated Maintenance**: Self-healing data consistency
7. **Audit Trail**: Complete status change history
8. **Performance Optimized**: Proper indexing for efficient queries

## Future Considerations

- Integration with campaign workflow updates
- Enhanced notification system for status changes
- Advanced reporting and analytics
- Mobile app optimization
- Bulk operation support
- Integration with external scheduling systems