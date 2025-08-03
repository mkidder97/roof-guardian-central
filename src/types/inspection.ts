/**
 * Unified Inspection Type Definitions
 * Provides type-safe interfaces for the inspection management system
 */

// Import Property type from property module to avoid duplication
import type { Property } from './property';

// Core inspection status type
export type InspectionStatus = 'scheduled' | 'in_progress' | 'ready_for_review' | 'completed' | 'cancelled';

// Inspection type and priority enums
export type InspectionType = 'routine' | 'emergency' | 'follow-up';
export type InspectionPriority = 'low' | 'medium' | 'high';

// Unified inspection interface - main data structure
export interface UnifiedInspection {
  id: string;
  roof_id: string;
  inspector_id: string;
  scheduled_date: string | null;
  completed_date: string | null;
  status: InspectionStatus;
  inspection_type: InspectionType;
  priority: InspectionPriority;
  notes: string | null;
  weather_conditions: string | null;
  created_at: string;
  updated_at?: string;
  session_data?: Record<string, any>;
  archived_at?: string | null;

  // Joined data from related tables
  roofs?: {
    id: string;
    property_name: string;
    address: string;
    city: string;
    state: string;
  } | null;
  users?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

// Legacy Inspection interface for backward compatibility
export interface Inspection {
  id: string;
  roof_id: string;
  inspector_id: string;
  scheduled_date: string | null;
  completed_date: string | null;
  status: InspectionStatus;
  inspection_status?: InspectionStatus;
  inspection_type?: InspectionType;
  priority?: InspectionPriority;
  notes: string | null;
  weather_conditions: string | null;
  created_at: string;
  updated_at?: string;

  // Joined data
  roofs?: {
    property_name: string;
    address?: string;
  } | null;
  users?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

// Inspection session interface
export interface InspectionSession {
  id: string;
  property_id: string;
  inspector_id: string;
  inspection_status: InspectionStatus;
  session_data: Record<string, any>;
  expires_at: string | null;
  last_updated: string;
  created_at: string;
}

// InspectionSyncData interface for the sync hook
export interface InspectionSyncData {
  id: string;
  scheduled_date: string | null;
  completed_date: string | null;
  inspection_type: string | null;
  status: InspectionStatus | string | null;
  inspection_status?: InspectionStatus;
  notes: string | null;
  weather_conditions: string | null;
  roof_id: string | null;
  inspector_id: string | null;
  created_at: string;
  updated_at?: string;
  priority?: InspectionPriority;
  session_data?: Record<string, any>;
  archived_at?: string | null;
  
  // Joined data
  roofs?: {
    property_name: string;
    address?: string;
    city?: string;
    state?: string;
  } | null;
  users?: {
    first_name: string | null;
    last_name: string | null;
    email?: string;
  } | null;
}

// InspectionItem interface for dashboard components
export interface InspectionItem {
  id: string;
  property_id: string;
  inspection_status: InspectionStatus;
  property_name: string;
  full_address: string;
  inspector_name: string;
  scheduled_date: string | null;
  priority: InspectionPriority;
  inspection_type: InspectionType;
  notes?: string;
}

// Event payload types for type-safe event handling
export interface InspectionEventPayloads {
  inspectionCreated: {
    inspection: UnifiedInspection;
    source: string;
    triggeredBy?: string;
  };

  inspectionUpdated: {
    inspection: UnifiedInspection;
    updates: Partial<UnifiedInspection>;
    source: string;
    triggeredBy?: string;
  };

  inspectionStatusChanged: {
    inspectionId: string;
    newStatus: InspectionStatus;
    previousStatus?: InspectionStatus;
    source: string;
    triggeredBy?: string;
  };

  inspectionDeleted: {
    inspectionId: string;
    source: string;
    triggeredBy?: string;
  };

  dataRefresh: {
    source: string;
    components?: string[];
    filters?: any;
  };

  buildingInspectionHistoryUpdated: {
    roofId: string;
    inspections: UnifiedInspection[];
    source: string;
  };
}

// Direct inspection data interface
export interface DirectInspectionData {
  selectedProperty: Property | null;
  inspector: Inspector | null;
  scheduledDate: string;
  scheduledTime: string;
  inspectionType: InspectionType;
  priority: InspectionPriority;
  notes: string;
}


// Inspector interface
export interface Inspector {
  id: string;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  role: string;
}

// Workflow progress interface
export interface WorkflowProgress {
  isProcessing: boolean;
  processedCount: number;
  totalCount: number;
  currentCampaign: string;
  results: ProcessingResult[];
}

// Processing result interface
export interface ProcessingResult {
  success: boolean;
  attempts: number;
  campaignData?: {
    campaign_id: string;
    campaign_name: string;
    client_name: string;
    property_manager_email: string;
    region: string;
    market: string;
    inspector_id: string;
    inspector_name: string;
    inspector_email: string;
    properties: any[];
  };
  error?: string;
}

// Utility type transformation functions
export function toUnifiedInspection(inspection: InspectionSyncData): UnifiedInspection {
  return {
    id: inspection.id,
    roof_id: inspection.roof_id || '',
    inspector_id: inspection.inspector_id || '',
    scheduled_date: inspection.scheduled_date,
    completed_date: inspection.completed_date,
    status: (inspection.inspection_status || inspection.status || 'scheduled') as InspectionStatus,
    session_data: inspection.session_data,
    archived_at: inspection.archived_at,
    inspection_type: (inspection.inspection_type || 'routine') as InspectionType,
    priority: (inspection.priority || 'medium') as InspectionPriority,
    notes: inspection.notes,
    weather_conditions: inspection.weather_conditions,
    created_at: inspection.created_at,
    updated_at: inspection.updated_at,
    roofs: inspection.roofs ? {
      id: inspection.roof_id || '',
      property_name: inspection.roofs.property_name,
      address: inspection.roofs.address || '',
      city: '',
      state: ''
    } : null,
    users: inspection.users ? {
      id: 'inspector-1',
      first_name: inspection.users.first_name,
      last_name: inspection.users.last_name,
      email: 'inspector@example.com'
    } : null
  };
}

export function toInspectionItem(inspection: UnifiedInspection): InspectionItem {
  return {
    id: inspection.id,
    property_id: inspection.roof_id,
    inspection_status: inspection.status,
    property_name: inspection.roofs?.property_name || 'Unknown Property',
    full_address: inspection.roofs?.address || 'Unknown Address',
    inspector_name: inspection.users ? `${inspection.users.first_name || ''} ${inspection.users.last_name || ''}`.trim() : 'Unknown Inspector',
    scheduled_date: inspection.scheduled_date,
    priority: inspection.priority,
    inspection_type: inspection.inspection_type,
    notes: inspection.notes || undefined
  };
}

export function toLegacyInspection(inspection: UnifiedInspection): Inspection {
  return {
    id: inspection.id,
    roof_id: inspection.roof_id,
    inspector_id: inspection.inspector_id,
    scheduled_date: inspection.scheduled_date,
    completed_date: inspection.completed_date,
    status: inspection.status,
    inspection_status: inspection.status,
    inspection_type: inspection.inspection_type,
    priority: inspection.priority,
    notes: inspection.notes,
    weather_conditions: inspection.weather_conditions,
    created_at: inspection.created_at,
    updated_at: inspection.updated_at,
    roofs: inspection.roofs ? {
      property_name: inspection.roofs.property_name,
      address: inspection.roofs.address
    } : null,
    users: inspection.users
  };
}