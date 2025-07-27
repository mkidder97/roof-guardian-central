import { useState, useEffect, useCallback, useRef } from 'react';
import { inspectorEventBus, InspectorEvent } from '@/lib/eventBus';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InspectionSyncData {
  id: string;
  scheduled_date: string | null;
  completed_date: string | null;
  inspection_type: string | null;
  status: string | null;
  inspection_status?: string;
  notes: string | null;
  weather_conditions: string | null;
  roof_id: string | null;
  inspector_id: string | null;
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

export interface InspectionSyncOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTimeSync?: boolean;
  filters?: {
    roofId?: string;
    inspectorId?: string;
    status?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

/**
 * Hook for managing unified inspection data synchronization across components
 * Provides real-time updates, data consistency, and event-driven architecture
 */
export function useInspectionSync(options: InspectionSyncOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableRealTimeSync = true,
    filters
  } = options;

  const [inspections, setInspections] = useState<InspectionSyncData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'stale'>('idle');
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRefs = useRef<(() => void)[]>([]);
  const { toast } = useToast();

  // Fetch inspections data with comprehensive joins
  const fetchInspections = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
        setSyncStatus('syncing');
      }
      setError(null);

      let query = supabase
        .from('inspections')
        .select(`
          *,
          roofs!roof_id(
            property_name,
            address,
            city,
            state
          ),
          users!inspector_id(
            first_name,
            last_name,
            email
          ),
          inspection_sessions!roof_id(
            inspection_status,
            started_at,
            completed_at
          ),
          inspection_reports!inner(
            id,
            priority_level,
            findings,
            estimated_cost
          )
        `)
        .order('scheduled_date', { ascending: false });

      // Apply filters if provided
      if (filters?.roofId) {
        query = query.eq('roof_id', filters.roofId);
      }
      if (filters?.inspectorId) {
        query = query.eq('inspector_id', filters.inspectorId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dateRange) {
        query = query.gte('scheduled_date', filters.dateRange.start)
                   .lte('scheduled_date', filters.dateRange.end);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const transformedData = (data || []).map(inspection => ({
        ...inspection,
        // Extract inspection status from sessions if available
        inspection_status: inspection.inspection_sessions?.[0]?.inspection_status || inspection.status
      })) as InspectionSyncData[];

      setInspections(transformedData);
      setLastSyncTime(new Date());
      setSyncStatus('idle');

      // Emit sync completion event
      inspectorEventBus.emit(INSPECTOR_EVENTS.INSPECTION_DATA_SYNC, {
        inspections: transformedData,
        syncTime: new Date(),
        filters
      }, 'inspection_sync_hook');

    } catch (err) {
      console.error('Error fetching inspections:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch inspections';
      setError(errorMessage);
      setSyncStatus('error');
      
      // Emit error event
      inspectorEventBus.emit(INSPECTOR_EVENTS.INSPECTION_DATA_ERROR, {
        error: errorMessage,
        filters
      }, 'inspection_sync_hook');

      toast({
        title: "Sync Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [filters, toast]);

  // Handle real-time inspection events
  const handleInspectionEvent = useCallback((event: InspectorEvent) => {
    const { payload } = event;
    
    switch (event.type) {
      case INSPECTOR_EVENTS.INSPECTION_CREATED:
        if (payload?.inspection) {
          setInspections(prev => [payload.inspection, ...prev]);
          toast({
            title: "New Inspection",
            description: `Inspection created for ${payload.inspection.roofs?.property_name || 'property'}`,
          });
        }
        break;

      case INSPECTOR_EVENTS.INSPECTION_UPDATED:
        if (payload?.inspection) {
          setInspections(prev => prev.map(inspection => 
            inspection.id === payload.inspection.id 
              ? { ...inspection, ...payload.inspection }
              : inspection
          ));
        }
        break;

      case INSPECTOR_EVENTS.INSPECTION_DELETED:
        if (payload?.inspectionId) {
          setInspections(prev => prev.filter(inspection => 
            inspection.id !== payload.inspectionId
          ));
          toast({
            title: "Inspection Deleted",
            description: "Inspection has been removed",
          });
        }
        break;

      case INSPECTOR_EVENTS.INSPECTION_STATUS_CHANGED:
        if (payload?.inspectionId && payload?.newStatus) {
          setInspections(prev => prev.map(inspection => 
            inspection.id === payload.inspectionId
              ? { ...inspection, status: payload.newStatus, inspection_status: payload.newStatus }
              : inspection
          ));
          toast({
            title: "Status Updated",
            description: `Inspection status changed to ${payload.newStatus}`,
          });
        }
        break;

      case INSPECTOR_EVENTS.INSPECTION_DATA_REFRESH:
        // Refresh data without showing loading state
        fetchInspections(false);
        break;

      case INSPECTOR_EVENTS.INSPECTION_DATA_STALE:
        setSyncStatus('stale');
        break;
    }
  }, [fetchInspections, toast]);

  // Set up event listeners for real-time synchronization
  useEffect(() => {
    if (!enableRealTimeSync) return;

    const eventTypes = [
      INSPECTOR_EVENTS.INSPECTION_CREATED,
      INSPECTOR_EVENTS.INSPECTION_UPDATED,
      INSPECTOR_EVENTS.INSPECTION_DELETED,
      INSPECTOR_EVENTS.INSPECTION_STATUS_CHANGED,
      INSPECTOR_EVENTS.INSPECTION_DATA_REFRESH,
      INSPECTOR_EVENTS.INSPECTION_DATA_STALE,
      INSPECTOR_EVENTS.BUILDING_INSPECTION_HISTORY_UPDATED,
      INSPECTOR_EVENTS.CAMPAIGN_INSPECTION_ADDED,
      INSPECTOR_EVENTS.CAMPAIGN_INSPECTION_REMOVED
    ];

    eventTypes.forEach(eventType => {
      const unsubscribe = inspectorEventBus.on(eventType, handleInspectionEvent);
      unsubscribeRefs.current.push(unsubscribe);
    });

    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, [enableRealTimeSync, handleInspectionEvent]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    refreshIntervalRef.current = setInterval(() => {
      fetchInspections(false);
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchInspections]);

  // Initial data fetch
  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchInspections(true);
  }, [fetchInspections]);

  // Force sync function
  const forceSync = useCallback(() => {
    inspectorEventBus.emit(INSPECTOR_EVENTS.INSPECTION_DATA_REFRESH, {
      source: 'manual_force_sync',
      filters
    }, 'inspection_sync_hook');
  }, [filters]);

  // Create new inspection with real-time sync
  const createInspection = useCallback(async (inspectionData: Partial<InspectionSyncData>) => {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .insert([inspectionData])
        .select(`
          *,
          roofs!roof_id(property_name, address),
          users!inspector_id(first_name, last_name)
        `)
        .single();

      if (error) throw error;

      // Emit creation event for real-time sync
      inspectorEventBus.emit(INSPECTOR_EVENTS.INSPECTION_CREATED, {
        inspection: data,
        source: 'inspection_sync_hook'
      }, 'inspection_sync_hook');

      return data;
    } catch (err) {
      console.error('Error creating inspection:', err);
      throw err;
    }
  }, []);

  // Update inspection with real-time sync
  const updateInspection = useCallback(async (id: string, updates: Partial<InspectionSyncData>) => {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          roofs!roof_id(property_name, address),
          users!inspector_id(first_name, last_name)
        `)
        .single();

      if (error) throw error;

      // Emit update event for real-time sync
      inspectorEventBus.emit(INSPECTOR_EVENTS.INSPECTION_UPDATED, {
        inspection: data,
        updates,
        source: 'inspection_sync_hook'
      }, 'inspection_sync_hook');

      return data;
    } catch (err) {
      console.error('Error updating inspection:', err);
      throw err;
    }
  }, []);

  // Update inspection status with real-time sync
  const updateInspectionStatus = useCallback(async (id: string, newStatus: string) => {
    try {
      await updateInspection(id, { status: newStatus, inspection_status: newStatus });

      // Emit status change event for real-time sync
      inspectorEventBus.emit(INSPECTOR_EVENTS.INSPECTION_STATUS_CHANGED, {
        inspectionId: id,
        newStatus,
        previousStatus: inspections.find(i => i.id === id)?.status,
        source: 'inspection_sync_hook'
      }, 'inspection_sync_hook');

    } catch (err) {
      console.error('Error updating inspection status:', err);
      throw err;
    }
  }, [updateInspection, inspections]);

  // Delete inspection with real-time sync
  const deleteInspection = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Emit deletion event for real-time sync
      inspectorEventBus.emit(INSPECTOR_EVENTS.INSPECTION_DELETED, {
        inspectionId: id,
        source: 'inspection_sync_hook'
      }, 'inspection_sync_hook');

    } catch (err) {
      console.error('Error deleting inspection:', err);
      throw err;
    }
  }, []);

  return {
    // Data
    inspections,
    loading,
    error,
    lastSyncTime,
    syncStatus,

    // Actions
    refresh,
    forceSync,
    createInspection,
    updateInspection,
    updateInspectionStatus,
    deleteInspection,

    // Utilities
    isStale: syncStatus === 'stale',
    isSyncing: syncStatus === 'syncing',
    hasError: syncStatus === 'error',
    totalInspections: inspections.length,
    
    // Filtered counts for dashboard
    scheduledCount: inspections.filter(i => i.status === 'scheduled').length,
    completedCount: inspections.filter(i => i.status === 'completed').length,
    inProgressCount: inspections.filter(i => i.status === 'in_progress').length,
    pastDueCount: inspections.filter(i => {
      if (!i.scheduled_date || i.completed_date) return false;
      return new Date(i.scheduled_date) < new Date();
    }).length
  };
}

/**
 * Simplified hook for components that only need to listen to inspection updates
 */
export function useInspectionEventListener() {
  const { emit, on } = useInspectorEvents();

  const emitInspectionCreated = useCallback((inspection: InspectionSyncData) => {
    emit(INSPECTOR_EVENTS.INSPECTION_CREATED, { inspection }, 'component');
  }, [emit]);

  const emitInspectionUpdated = useCallback((inspection: InspectionSyncData, updates: Partial<InspectionSyncData>) => {
    emit(INSPECTOR_EVENTS.INSPECTION_UPDATED, { inspection, updates }, 'component');
  }, [emit]);

  const emitInspectionStatusChanged = useCallback((inspectionId: string, newStatus: string, previousStatus?: string) => {
    emit(INSPECTOR_EVENTS.INSPECTION_STATUS_CHANGED, { inspectionId, newStatus, previousStatus }, 'component');
  }, [emit]);

  const emitDataRefresh = useCallback(() => {
    emit(INSPECTOR_EVENTS.INSPECTION_DATA_REFRESH, { source: 'manual_refresh' }, 'component');
  }, [emit]);

  return {
    emitInspectionCreated,
    emitInspectionUpdated,
    emitInspectionStatusChanged,
    emitDataRefresh,
    on
  };
}

// Import useInspectorEvents here to avoid circular dependency
function useInspectorEvents() {
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  useEffect(() => {
    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, []);

  const emit = useCallback((eventType: string, payload?: any, source?: string) => {
    inspectorEventBus.emit(eventType, payload, source);
  }, []);

  const on = useCallback((eventType: string, callback: (event: InspectorEvent) => void) => {
    const unsubscribe = inspectorEventBus.on(eventType, callback);
    unsubscribeRefs.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  return { emit, on };
}