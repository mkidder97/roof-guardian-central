/**
 * Immediate Repair type definitions for critical issue management
 */

import type { Photo } from './deficiency';

// Urgency levels for immediate repairs
export type RepairUrgency = 'low' | 'medium' | 'high' | 'critical' | 'emergency';

// Status of immediate repair requests
export type RepairStatus = 'pending' | 'acknowledged' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

// Main immediate repair interface
export interface ImmediateRepair {
  id: string;
  inspection_id: string;
  deficiency_id?: string; // Optional link to specific deficiency
  property_id: string;
  property_name: string;
  property_address: string;
  
  // Repair details
  title: string;
  description: string;
  urgency: RepairUrgency;
  estimated_cost?: number;
  
  // Safety and risk assessment
  safetyRisk: boolean;
  structuralRisk: boolean;
  weatherExposureRisk: boolean;
  accessibilityIssues?: string;
  
  // Documentation
  photos: Photo[];
  supportingDocuments?: string[]; // URLs to documents
  
  // Workflow tracking
  status: RepairStatus;
  priority_score: number; // 0-100 calculated priority
  
  // People involved
  reported_by: string; // Inspector user ID
  reported_at: string;
  assigned_to?: string; // Repair team member ID
  assigned_at?: string;
  supervisor_id?: string;
  supervisor_notified_at?: string;
  supervisor_acknowledged_at?: string;
  
  // Contact information
  emergency_contact_required: boolean;
  emergency_contact_made?: boolean;
  emergency_contact_at?: string;
  emergency_contact_notes?: string;
  
  // Resolution
  resolution_notes?: string;
  completed_at?: string;
  completed_by?: string;
  final_cost?: number;
  follow_up_required?: boolean;
  follow_up_date?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Interface for creating new immediate repair requests
export interface CreateImmediateRepairRequest {
  inspection_id: string;
  deficiency_id?: string;
  title: string;
  description: string;
  urgency: RepairUrgency;
  estimated_cost?: number;
  safetyRisk: boolean;
  structuralRisk: boolean;
  weatherExposureRisk: boolean;
  accessibilityIssues?: string;
  photos: File[];
  emergency_contact_required: boolean;
}

// Interface for updating immediate repair status
export interface UpdateImmediateRepairRequest {
  status?: RepairStatus;
  assigned_to?: string;
  supervisor_acknowledged_at?: string;
  emergency_contact_made?: boolean;
  emergency_contact_notes?: string;
  resolution_notes?: string;
  final_cost?: number;
  follow_up_required?: boolean;
  follow_up_date?: string;
}

// Summary interface for dashboard display
export interface ImmediateRepairSummary {
  id: string;
  title: string;
  property_name: string;
  urgency: RepairUrgency;
  status: RepairStatus;
  priority_score: number;
  reported_at: string;
  estimated_cost?: number;
  safetyRisk: boolean;
  structuralRisk: boolean;
  emergency_contact_required: boolean;
}

// Filter and search criteria
export interface ImmediateRepairFilters {
  urgency?: RepairUrgency[];
  status?: RepairStatus[];
  safetyRisk?: boolean;
  structuralRisk?: boolean;
  weatherExposureRisk?: boolean;
  emergency_contact_required?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  propertyIds?: string[];
  inspectorIds?: string[];
  assignedTo?: string[];
}

// Repair team assignment interface
export interface RepairTeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialties: string[];
  availability: 'available' | 'busy' | 'unavailable';
  currentWorkload: number; // Number of active repairs
}

// Alert configuration for different urgency levels
export interface RepairAlertConfig {
  urgency: RepairUrgency;
  alertChannels: ('email' | 'sms' | 'push' | 'phone')[];
  escalationTimeMinutes: number;
  requiresImmediate: boolean;
  autoAssignCriteria?: {
    specialty?: string;
    maxWorkload?: number;
    proximityRadius?: number; // miles
  };
}

// Emergency escalation workflow
export interface EmergencyEscalation {
  repair_id: string;
  escalation_level: number; // 1-5, increasing urgency
  triggered_at: string;
  triggered_by: 'system' | 'user';
  contacts_notified: string[];
  acknowledgment_required: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolution_deadline: string;
}