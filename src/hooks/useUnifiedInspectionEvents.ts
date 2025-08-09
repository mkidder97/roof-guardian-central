import { useCallback, useEffect, useRef } from 'react';
import { inspectorEventBus, INSPECTOR_EVENTS, InspectorEvent } from '@/lib/eventBus';
import { useInspectorEvents, useInspectionState, usePropertySelection } from '@/hooks/useInspectorEvents';
import { useInspectionSync } from '@/hooks/useInspectionSync';
import type { InspectionSyncData, InspectionStatus } from '@/types/inspection';
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedInspectionEventPayloads {
  // Inspection lifecycle events
  inspectionCreated: {
    inspection: InspectionSyncData;
    source: string;
    triggeredBy?: string;
  };
  
  inspectionUpdated: {
    inspection: InspectionSyncData;
    updates: Partial<InspectionSyncData>;
    source: string;
    triggeredBy?: string;
  };
  
  inspectionStatusChanged: {
    inspectionId: string;
    newStatus: string;
    previousStatus?: string;
    inspection?: InspectionSyncData;
    source: string;
    triggeredBy?: string;
  };
  
  inspectionDeleted: {
    inspectionId: string;
    inspection?: InspectionSyncData;
    source: string;
    triggeredBy?: string;
  };
  
  // Building/Property sync events
  buildingInspectionHistoryUpdated: {
    roofId: string;
    inspections: InspectionSyncData[];
    source: string;
  };
  
  // Campaign sync events
  campaignInspectionAdded: {
    campaignId: string;
    inspection: InspectionSyncData;
    source: string;
  };
  
  campaignInspectionRemoved: {
    campaignId: string;
    inspectionId: string;
    source: string;
  };
  
  // Data synchronization events
  dataSync: {
    inspections: InspectionSyncData[];
    syncTime: Date;
    filters?: any;
    source: string;
  };
  
  dataRefresh: {
    source: string;
    filters?: any;
    components?: string[];
  };
  
  dataStale: {
    reason: string;
    affectedComponents: string[];
    source: string;
  };
  
  dataError: {
    error: string;
    context?: any;
    source: string;
  };
}

/**
 * Unified hook for managing all inspection-related events across the application
 * Extends existing hooks and provides centralized event coordination
 */
export function useUnifiedInspectionEvents() {
  // Base event system
  const { emit: baseEmit, on: baseOn } = useInspectorEvents();
  const inspectionState = useInspectionState();
  const propertySelection = usePropertySelection();
  
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  // Enhanced emit function with type safety and automatic logging
  const emit = useCallback(<K extends keyof UnifiedInspectionEventPayloads>(
    eventType: K,
    payload: UnifiedInspectionEventPayloads[K],
    options?: {
      suppressToast?: boolean;
      logLevel?: 'debug' | 'info' | 'warn' | 'error';
      persistent?: boolean;
    }
  ) => {
    const { logLevel = 'info', persistent = false } = options || {};
    
    // Log event for debugging
    console[logLevel](`Unified Inspection Event: ${eventType}`, payload);
    
    // Emit to event bus using the correct event key
    const eventKey = getEventKey(eventType);
    baseEmit(eventKey as any, payload, payload.source);
    
    // Store in persistent history if requested
    if (persistent) {
      storeEventHistory(eventType, payload);
    }
  }, [baseEmit]);

  // Enhanced listener with automatic cleanup and type safety
  const on = useCallback(<K extends keyof UnifiedInspectionEventPayloads>(
    eventType: K,
    callback: (payload: UnifiedInspectionEventPayloads[K], event: InspectorEvent) => void,
    options?: {
      once?: boolean;
      filter?: (payload: UnifiedInspectionEventPayloads[K]) => boolean;
    }
  ) => {
    const { once = false, filter } = options || {};
    
    const wrappedCallback = (event: InspectorEvent) => {
      const payload = event.payload as UnifiedInspectionEventPayloads[K];
      
      // Apply filter if provided
      if (filter && !filter(payload)) {
        return;
      }
      
      callback(payload, event);
    };
    
    const eventKey = getEventKey(eventType);
    const unsubscribe = once 
      ? inspectorEventBus.once(eventKey, wrappedCallback)
      : inspectorEventBus.on(eventKey, wrappedCallback);
    
    unsubscribeRefs.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  // Inspection lifecycle management
  const inspectionLifecycle = {
    // Create inspection with full event chain
    create: useCallback(async (inspectionData: Partial<InspectionSyncData>) => {
      try {
        // Create in database
        const { data, error } = await supabase
          .from('inspections')
          .insert([inspectionData])
          .select(`
            *,
            roofs!roof_id(property_name, address, city, state),
            users!inspector_id(first_name, last_name, email)
          `)
          .single();

        if (error) throw error;

        const inspection = data as InspectionSyncData;

        // Emit creation event
        emit('inspectionCreated', {
          inspection,
          source: 'unified_inspection_events',
          triggeredBy: 'create_action'
        });

        // Update building history if applicable
        if (inspection.roof_id) {
          emit('buildingInspectionHistoryUpdated', {
            roofId: inspection.roof_id,
            inspections: [inspection],
            source: 'unified_inspection_events'
          });
        }

        // Trigger data refresh for all components
        emit('dataRefresh', {
          source: 'inspection_created',
          components: ['inspections_tab', 'inspection_history', 'inspector_interface']
        });

        return inspection;
      } catch (error) {
        emit('dataError', {
          error: error instanceof Error ? error.message : 'Failed to create inspection',
          context: { inspectionData },
          source: 'unified_inspection_events'
        });
        throw error;
      }
    }, [emit]),

    // Update inspection with event chain
    update: useCallback(async (id: string, updates: Partial<InspectionSyncData>) => {
      try {
        const { data, error } = await supabase
          .from('inspections')
          .update(updates)
          .eq('id', id)
          .select(`
            *,
            roofs!roof_id(property_name, address, city, state),
            users!inspector_id(first_name, last_name, email)
          `)
          .single();

        if (error) {
          // Log detailed error information
          console.error('❌ [useUnifiedInspectionEvents] Database update error:', {
            error,
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
            updates,
            id
          });
          throw error;
        }

        const inspection = data as InspectionSyncData;

        // Emit update event
        emit('inspectionUpdated', {
          inspection,
          updates,
          source: 'unified_inspection_events',
          triggeredBy: 'update_action'
        });

        // Check if status changed
        if (updates.status || updates.inspection_status) {
          const newStatus = updates.status || updates.inspection_status || inspection.status;
          emit('inspectionStatusChanged', {
            inspectionId: id,
            newStatus: newStatus!,
            inspection,
            source: 'unified_inspection_events',
            triggeredBy: 'status_update'
          });
        }

        // Update building history
        if (inspection.roof_id) {
          emit('buildingInspectionHistoryUpdated', {
            roofId: inspection.roof_id,
            inspections: [inspection],
            source: 'unified_inspection_events'
          });
        }

        // Trigger data refresh
        emit('dataRefresh', {
          source: 'inspection_updated',
          components: ['inspections_tab', 'inspection_history']
        });

        return inspection;
      } catch (error) {
        emit('dataError', {
          error: error instanceof Error ? error.message : 'Failed to update inspection',
          context: { id, updates },
          source: 'unified_inspection_events'
        });
        throw error;
      }
    }, [emit]),

    // Delete inspection with event chain
    delete: useCallback(async (id: string, inspection?: InspectionSyncData) => {
      try {
        const { error } = await supabase
          .from('inspections')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Emit deletion event
        emit('inspectionDeleted', {
          inspectionId: id,
          inspection,
          source: 'unified_inspection_events',
          triggeredBy: 'delete_action'
        });

        // Update building history
        if (inspection?.roof_id) {
          emit('buildingInspectionHistoryUpdated', {
            roofId: inspection.roof_id,
            inspections: [],
            source: 'unified_inspection_events'
          });
        }

        // Trigger data refresh
        emit('dataRefresh', {
          source: 'inspection_deleted',
          components: ['inspections_tab', 'inspection_history']
        });

      } catch (error) {
        emit('dataError', {
          error: error instanceof Error ? error.message : 'Failed to delete inspection',
          context: { id, inspection },
          source: 'unified_inspection_events'
        });
        throw error;
      }
    }, [emit]),

    // Change status with validation and event chain
    changeStatus: useCallback(async (id: string, newStatus: string, currentInspection?: InspectionSyncData) => {
      try {
        const previousStatus = currentInspection?.status;
        
        // Validate status transition
        if (!isValidStatusTransition(previousStatus, newStatus)) {
          throw new Error(`Invalid status transition from ${previousStatus} to ${newStatus}`);
        }

        // Update in database - only update the 'status' column (inspection_status doesn't exist)
        const updatedInspection = await inspectionLifecycle.update(id, { 
          status: newStatus as InspectionStatus
        });

        // Additional status-specific actions
        await handleStatusChangeActions(newStatus, updatedInspection);

        return updatedInspection;
      } catch (error) {
        emit('dataError', {
          error: error instanceof Error ? error.message : 'Failed to change inspection status',
          context: { id, newStatus, currentInspection },
          source: 'unified_inspection_events'
        });
        throw error;
      }
    }, [emit])
  };

  // Data synchronization utilities
  const dataSync = {
    // Force refresh all inspection data
    refreshAll: useCallback(() => {
      emit('dataRefresh', {
        source: 'manual_refresh_all',
        components: ['inspections_tab', 'inspection_history', 'inspector_interface']
      });
    }, [emit]),

    // Mark data as stale
    markStale: useCallback((reason: string, components: string[] = []) => {
      emit('dataStale', {
        reason,
        affectedComponents: components,
        source: 'unified_inspection_events'
      });
    }, [emit]),

    // Sync specific building's inspection history
    syncBuildingHistory: useCallback(async (roofId: string) => {
      try {
        const { data, error } = await supabase
          .from('inspections')
          .select(`
            *,
            roofs!roof_id(property_name, address),
            users!inspector_id(first_name, last_name)
          `)
          .eq('roof_id', roofId)
          .order('scheduled_date', { ascending: false });

        if (error) throw error;

        emit('buildingInspectionHistoryUpdated', {
          roofId,
          inspections: data as InspectionSyncData[],
          source: 'unified_inspection_events'
        });

        return data as InspectionSyncData[];
      } catch (error) {
        emit('dataError', {
          error: error instanceof Error ? error.message : 'Failed to sync building history',
          context: { roofId },
          source: 'unified_inspection_events'
        });
        throw error;
      }
    }, [emit])
  };

  // Campaign integration
  const campaignIntegration = {
    addInspectionToCampaign: useCallback((campaignId: string, inspection: InspectionSyncData) => {
      emit('campaignInspectionAdded', {
        campaignId,
        inspection,
        source: 'unified_inspection_events'
      });
    }, [emit]),

    removeInspectionFromCampaign: useCallback((campaignId: string, inspectionId: string) => {
      emit('campaignInspectionRemoved', {
        campaignId,
        inspectionId,
        source: 'unified_inspection_events'
      });
    }, [emit])
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, []);

  return {
    // Core event functions
    emit,
    on,
    
    // Inspection lifecycle
    inspectionLifecycle,
    
    // Data synchronization
    dataSync,
    
    // Campaign integration
    campaignIntegration,
    
    // Legacy compatibility
    ...inspectionState,
    ...propertySelection,
    
    // Event constants
    EVENTS: INSPECTOR_EVENTS
  };
}

// Helper function to map event types to event keys
function getEventKey(eventType: keyof UnifiedInspectionEventPayloads): string {
  const mapping: Record<keyof UnifiedInspectionEventPayloads, string> = {
    inspectionCreated: INSPECTOR_EVENTS.INSPECTION_CREATED,
    inspectionUpdated: INSPECTOR_EVENTS.INSPECTION_UPDATED,
    inspectionStatusChanged: INSPECTOR_EVENTS.INSPECTION_STATUS_CHANGED,
    inspectionDeleted: INSPECTOR_EVENTS.INSPECTION_DELETED,
    buildingInspectionHistoryUpdated: INSPECTOR_EVENTS.BUILDING_INSPECTION_HISTORY_UPDATED,
    campaignInspectionAdded: INSPECTOR_EVENTS.CAMPAIGN_INSPECTION_ADDED,
    campaignInspectionRemoved: INSPECTOR_EVENTS.CAMPAIGN_INSPECTION_REMOVED,
    dataSync: INSPECTOR_EVENTS.INSPECTION_DATA_SYNC,
    dataRefresh: INSPECTOR_EVENTS.INSPECTION_DATA_REFRESH,
    dataStale: INSPECTOR_EVENTS.INSPECTION_DATA_STALE,
    dataError: INSPECTOR_EVENTS.INSPECTION_DATA_ERROR
  };
  
  return mapping[eventType];
}

// Store event history for debugging/analysis
function storeEventHistory(eventType: string, payload: any) {
  const historyKey = `inspection_events_${eventType}`;
  const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
  
  history.unshift({
    timestamp: new Date().toISOString(),
    eventType,
    payload
  });
  
  // Keep only last 50 events
  if (history.length > 50) {
    history.splice(50);
  }
  
  localStorage.setItem(historyKey, JSON.stringify(history));
}

// Validate status transitions
function isValidStatusTransition(currentStatus: string | null | undefined, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'draft': ['scheduled', 'cancelled'],
    'scheduled': ['in_progress', 'cancelled', 'rescheduled'],
    'in_progress': ['completed', 'paused', 'cancelled'],
    'paused': ['in_progress', 'cancelled'],
    'completed': ['scheduled'], // Allow re-inspection
    'cancelled': ['scheduled'], // Allow rescheduling
    'rescheduled': ['scheduled', 'cancelled']
  };
  
  if (!currentStatus) {
    return ['draft', 'scheduled'].includes(newStatus);
  }
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

// Handle status-specific actions
async function handleStatusChangeActions(newStatus: string, inspection: InspectionSyncData) {
  switch (newStatus) {
    case 'completed':
      // Could trigger report generation, notifications, etc.
      break;
    case 'cancelled':
      // Could trigger rescheduling workflows
      break;
    case 'in_progress':
      // Could start tracking, notifications, etc.
      break;
  }
}

/**
 * Simplified hook for components that only need basic event emission
 */
export function useInspectionEventEmitter() {
  const { emit } = useUnifiedInspectionEvents();
  
  return {
    emitInspectionCreated: useCallback((inspection: InspectionSyncData) => {
      emit('inspectionCreated', {
        inspection,
        source: 'component_emitter',
        triggeredBy: 'user_action'
      });
    }, [emit]),
    
    emitInspectionUpdated: useCallback((inspection: InspectionSyncData, updates: Partial<InspectionSyncData>) => {
      emit('inspectionUpdated', {
        inspection,
        updates,
        source: 'component_emitter',
        triggeredBy: 'user_action'
      });
    }, [emit]),
    
    emitStatusChanged: useCallback((inspectionId: string, newStatus: string, previousStatus?: string) => {
      emit('inspectionStatusChanged', {
        inspectionId,
        newStatus,
        previousStatus,
        source: 'component_emitter',
        triggeredBy: 'user_action'
      });
    }, [emit]),
    
    emitDataRefresh: useCallback((components?: string[]) => {
      emit('dataRefresh', {
        source: 'component_emitter',
        components: components || ['inspections_tab', 'inspection_history']
      });
    }, [emit])
  };
}
