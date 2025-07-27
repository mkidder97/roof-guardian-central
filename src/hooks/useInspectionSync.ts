import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { inspectorEventBus, INSPECTOR_EVENTS } from '@/lib/eventBus';
import { useToast } from '@/hooks/use-toast';
import type { InspectionSyncData, InspectionStatus } from '@/types/inspection';

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
  const { toast } = useToast();
  const unsubscribeRefs = useRef<(() => void)[]>([]);

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
          )
        `)
        .order('scheduled_date', { ascending: false });

      if (filters.roofId) {
        query = query.eq('roof_id', filters.roofId);
      }
      if (filters.inspectorId) {
        query = query.eq('inspector_id', filters.inspectorId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
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

      // Emit sync completion event
      inspectorEventBus.emit(INSPECTOR_EVENTS.INSPECTION_DATA_SYNC, {
        inspections: transformedData,
        syncTime: new Date(),
        filters
      }, 'inspection_sync_hook');

    } catch (err) {
      console.error('Error fetching inspections:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setSyncStatus('error');
      
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

  // Real-time event listeners
  useEffect(() => {
    if (!enableRealTimeSync) return;

    const unsubscribeCreated = inspectorEventBus.on(INSPECTOR_EVENTS.inspectionCreated, () => {
      fetchInspections(false);
    });

    const unsubscribeUpdated = inspectorEventBus.on(INSPECTOR_EVENTS.inspectionUpdated, () => {
      fetchInspections(false);
    });

    const unsubscribeDataRefresh = inspectorEventBus.on(INSPECTOR_EVENTS.dataRefresh, () => {
      fetchInspections(false);
    });

    unsubscribeRefs.current.push(unsubscribeCreated, unsubscribeUpdated, unsubscribeDataRefresh);

    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, [enableRealTimeSync, fetchInspections]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => fetchInspections(false), refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchInspections]);

  // Initial fetch
  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

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