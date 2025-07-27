import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { inspectorEventBus, INSPECTOR_EVENTS } from '@/lib/eventBus';
import { useToast } from '@/hooks/use-toast';
import type { InspectionSyncData, InspectionStatus } from '@/types/inspection';

// Debounce utility with cancellation support
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout;
  
  const debounced = ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };
  
  debounced.cancel = () => {
    clearTimeout(timeout);
  };
  
  return debounced;
}

export interface UseInspectionSyncOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTimeSync?: boolean;
  filters?: {
    roofId?: string;
    inspectorId?: string;
    status?: InspectionStatus;
  };
}

export function useInspectionSync(options: UseInspectionSyncOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    enableRealTimeSync = true,
    filters = {}
  } = options;

  const [inspections, setInspections] = useState<InspectionSyncData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'stale'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  // Stabilize dependencies to prevent infinite re-renders
  const stableFilters = useMemo(() => filters || {}, [JSON.stringify(filters)]);
  const toastRef = useRef(toast);
  toastRef.current = toast;

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
          roofs(
            property_name,
            address,
            city,
            state
          ),
          users(
            first_name,
            last_name,
            email
          )
        `)
        .order('scheduled_date', { ascending: false });

      if (stableFilters.roofId) {
        query = query.eq('roof_id', stableFilters.roofId);
      }
      if (stableFilters.inspectorId) {
        query = query.eq('inspector_id', stableFilters.inspectorId);
      }
      if (stableFilters.status) {
        query = query.eq('status', stableFilters.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const transformedData = (data || []).map(inspection => ({
        ...inspection,
        inspection_status: (inspection.status || 'scheduled') as InspectionStatus
      })) as InspectionSyncData[];

      setInspections(transformedData);
      setSyncStatus('idle');
      setLastSyncTime(new Date());

      // Only emit sync event if data actually changed to prevent loops
      if (transformedData.length !== inspections.length || 
          JSON.stringify(transformedData) !== JSON.stringify(inspections)) {
        inspectorEventBus.emit(INSPECTOR_EVENTS.INSPECTION_DATA_SYNC, {
          inspections: transformedData,
          syncTime: new Date(),
          filters: stableFilters
        }, 'inspection_sync_hook');
      }

    } catch (err) {
      console.error('Error fetching inspections:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setSyncStatus('error');
      
      toastRef.current({
        title: "Sync Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [stableFilters, inspections]);

  const updateInspectionStatus = useCallback(async (
    inspectionId: string,
    newStatus: InspectionStatus
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('inspections')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', inspectionId);

      if (updateError) throw updateError;

      // Optimistic update
      setInspections(prev => prev.map(inspection =>
        inspection.id === inspectionId
          ? { ...inspection, status: newStatus, inspection_status: newStatus }
          : inspection
      ));

      // Emit event
      inspectorEventBus.emit(INSPECTOR_EVENTS.inspectionStatusChanged, {
        inspectionId,
        newStatus,
        source: 'useInspectionSync',
        triggeredBy: 'user_action'
      });

    } catch (err) {
      console.error('Error updating inspection status:', err);
      throw err;
    }
  }, []);

  // Create debounced fetch to prevent rapid-fire events
  const debouncedFetch = useMemo(
    () => debounce(() => fetchInspections(false), 500),
    [fetchInspections]
  );

  // Single refresh coordinator to consolidate all refresh mechanisms
  const triggerRefresh = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

  // Unified refresh effect
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchInspections();
    }
  }, [refreshTrigger, fetchInspections]);

  // Real-time event listeners with debouncing
  useEffect(() => {
    if (!enableRealTimeSync) return;

    const eventTypes = [
      INSPECTOR_EVENTS.inspectionCreated,
      INSPECTOR_EVENTS.inspectionUpdated,
      INSPECTOR_EVENTS.dataRefresh
    ];

    const unsubscribers = eventTypes.map(eventType => 
      inspectorEventBus.on(eventType, debouncedFetch)
    );

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      // Clear any pending debounced calls
      debouncedFetch.cancel?.();
    };
  }, [enableRealTimeSync, debouncedFetch]);

  // Auto-refresh timer (separated from event-based refresh)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(triggerRefresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, triggerRefresh]);

  // Initial fetch (only runs once)
  useEffect(() => {
    triggerRefresh();
  }, []); // Empty dependency array ensures this only runs once

  // Calculate statistics
  const scheduledCount = inspections.filter(i => i.status === 'scheduled').length;
  const completedCount = inspections.filter(i => i.status === 'completed').length;
  const inProgressCount = inspections.filter(i => i.status === 'in_progress').length;
  const pastDueCount = inspections.filter(i =>
    i.status === 'scheduled' &&
    i.scheduled_date &&
    new Date(i.scheduled_date) < new Date()
  ).length;

  return {
    inspections,
    loading,
    error,
    syncStatus,
    lastSyncTime,
    refresh: fetchInspections,
    updateInspectionStatus,
    scheduledCount,
    completedCount,
    inProgressCount,
    pastDueCount
  };
}