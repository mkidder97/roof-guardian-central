/**
 * RoofMind State Manager Hook
 * Centralized state management for inspections, properties, and user data
 */

import { useState, useEffect, useCallback, useReducer } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { roofmindApi } from '@/lib/api/roofmindApi';
import { offlineManager } from '@/lib/offlineManager';
import { inspectorEventBus, INSPECTOR_EVENTS } from '@/lib/eventBus';

interface RoofMindState {
  inspections: any[];
  properties: any[];
  criticalIssues: any[];
  currentInspection: any | null;
  loading: {
    inspections: boolean;
    properties: boolean;
    criticalIssues: boolean;
  };
  offline: {
    isOffline: boolean;
    pendingSync: number;
    lastSyncTime: number | null;
  };
  filters: {
    status: string[];
    priority: string[];
    inspector: string[];
    dateRange: [Date | null, Date | null];
  };
}

type StateAction = 
  | { type: 'SET_LOADING'; payload: { key: keyof RoofMindState['loading']; value: boolean } }
  | { type: 'SET_INSPECTIONS'; payload: any[] }
  | { type: 'SET_PROPERTIES'; payload: any[] }
  | { type: 'SET_CRITICAL_ISSUES'; payload: any[] }
  | { type: 'SET_CURRENT_INSPECTION'; payload: any | null }
  | { type: 'ADD_INSPECTION'; payload: any }
  | { type: 'UPDATE_INSPECTION'; payload: { id: string; data: any } }
  | { type: 'ADD_CRITICAL_ISSUE'; payload: any }
  | { type: 'SET_OFFLINE_STATUS'; payload: Partial<RoofMindState['offline']> }
  | { type: 'SET_FILTERS'; payload: Partial<RoofMindState['filters']> };

const initialState: RoofMindState = {
  inspections: [],
  properties: [],
  criticalIssues: [],
  currentInspection: null,
  loading: {
    inspections: false,
    properties: false,
    criticalIssues: false
  },
  offline: {
    isOffline: false,
    pendingSync: 0,
    lastSyncTime: null
  },
  filters: {
    status: [],
    priority: [],
    inspector: [],
    dateRange: [null, null]
  }
};

function stateReducer(state: RoofMindState, action: StateAction): RoofMindState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      };

    case 'SET_INSPECTIONS':
      return {
        ...state,
        inspections: action.payload
      };

    case 'SET_PROPERTIES':
      return {
        ...state,
        properties: action.payload
      };

    case 'SET_CRITICAL_ISSUES':
      return {
        ...state,
        criticalIssues: action.payload
      };

    case 'SET_CURRENT_INSPECTION':
      return {
        ...state,
        currentInspection: action.payload
      };

    case 'ADD_INSPECTION':
      return {
        ...state,
        inspections: [action.payload, ...state.inspections]
      };

    case 'UPDATE_INSPECTION':
      return {
        ...state,
        inspections: state.inspections.map(inspection =>
          inspection.id === action.payload.id
            ? { ...inspection, ...action.payload.data }
            : inspection
        ),
        currentInspection: state.currentInspection?.id === action.payload.id
          ? { ...state.currentInspection, ...action.payload.data }
          : state.currentInspection
      };

    case 'ADD_CRITICAL_ISSUE':
      return {
        ...state,
        criticalIssues: [action.payload, ...state.criticalIssues]
      };

    case 'SET_OFFLINE_STATUS':
      return {
        ...state,
        offline: {
          ...state.offline,
          ...action.payload
        }
      };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        }
      };

    default:
      return state;
  }
}

export function useRoofMindState() {
  const [state, dispatch] = useReducer(stateReducer, initialState);
  const { user } = useAuth();

  // Load initial data
  useEffect(() => {
    if (user) {
      loadInspections();
      loadProperties();
      loadCriticalIssues();
      setupOfflineStatusMonitoring();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  // Setup offline status monitoring
  const setupOfflineStatusMonitoring = useCallback(async () => {
    const status = offlineManager.getConnectivityStatus();
    dispatch({ 
      type: 'SET_OFFLINE_STATUS', 
      payload: { 
        isOffline: !status.isOnline,
        pendingSync: status.unsyncedItems,
        lastSyncTime: state.offline.lastSyncTime
      } 
    });

    // Listen to connectivity and sync events via event bus
    const offEnabled = inspectorEventBus.on(INSPECTOR_EVENTS.OFFLINE_MODE_ENABLED, () => {
      const s = offlineManager.getConnectivityStatus();
      dispatch({ type: 'SET_OFFLINE_STATUS', payload: { isOffline: true, pendingSync: s.unsyncedItems } });
    });

    const offDisabled = inspectorEventBus.on(INSPECTOR_EVENTS.OFFLINE_MODE_DISABLED, () => {
      const s = offlineManager.getConnectivityStatus();
      dispatch({ type: 'SET_OFFLINE_STATUS', payload: { isOffline: false, pendingSync: s.unsyncedItems } });
      // Refresh data when back online
      loadInspections();
      loadCriticalIssues();
    });

    const offSynced = inspectorEventBus.on(INSPECTOR_EVENTS.DATA_SYNC_COMPLETED, () => {
      const s = offlineManager.getConnectivityStatus();
      dispatch({ type: 'SET_OFFLINE_STATUS', payload: { pendingSync: s.unsyncedItems, lastSyncTime: Date.now() } });
    });

    return () => {
      offEnabled();
      offDisabled();
      offSynced();
    };
  }, [loadInspections, loadCriticalIssues, state.offline.lastSyncTime]);

  // Setup real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    // Subscribe to inspection changes
    const inspectionSub = roofmindApi.subscribeToInspections((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      switch (eventType) {
        case 'INSERT':
          dispatch({ type: 'ADD_INSPECTION', payload: newRecord });
          break;
        case 'UPDATE':
          dispatch({ type: 'UPDATE_INSPECTION', payload: { id: newRecord.id, data: newRecord } });
          break;
        // Handle DELETE if needed
      }
    });

    // Subscribe to critical issues
    const criticalSub = roofmindApi.subscribeToCriticalIssues((payload) => {
      if (payload.eventType === 'INSERT') {
        dispatch({ type: 'ADD_CRITICAL_ISSUE', payload: payload.new });
        
        // Emit event for real-time alerts
        inspectorEventBus.emit(INSPECTOR_EVENTS.DEFICIENCY_ADDED, {
          issue: payload.new,
          timestamp: Date.now()
        });
      }
    });

    return () => {
      inspectionSub.unsubscribe();
      criticalSub.unsubscribe();
    };
  }, []);

  // Data loading functions
  async function loadInspections() {
    dispatch({ type: 'SET_LOADING', payload: { key: 'inspections', value: true } });
    try {
      const response = await roofmindApi.getInspections();
      dispatch({ type: 'SET_INSPECTIONS', payload: response.data || [] });
      if (response.offline) {
        console.log('Using offline inspection data');
      }
    } catch (error) {
      console.error('Failed to load inspections:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'inspections', value: false } });
    }
  }

  async function loadProperties() {
    dispatch({ type: 'SET_LOADING', payload: { key: 'properties', value: true } });
    try {
      const response = await roofmindApi.getProperties();
      dispatch({ type: 'SET_PROPERTIES', payload: response.data || [] });
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'properties', value: false } });
    }
  }

  async function loadCriticalIssues() {
    dispatch({ type: 'SET_LOADING', payload: { key: 'criticalIssues', value: true } });
    try {
      const response = await roofmindApi.getCriticalIssues();
      dispatch({ type: 'SET_CRITICAL_ISSUES', payload: response.data || [] });
    } catch (error) {
      console.error('Failed to load critical issues:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { key: 'criticalIssues', value: false } });
    }
  }

  // Inspection operations
  const createInspection = useCallback(async (inspectionData: any) => {
    try {
      const response = await roofmindApi.createInspection(inspectionData, {
        priority: 'high',
        offline: true
      });
      
      dispatch({ type: 'ADD_INSPECTION', payload: response.data });
      
      // Emit event
      inspectorEventBus.emit(INSPECTOR_EVENTS.inspectionCreated, {
        payload: { inspection: response.data }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create inspection:', error);
      throw error;
    }
  }, []);

  const updateInspection = useCallback(async (id: string, data: any) => {
    try {
      const response = await roofmindApi.updateInspection(id, data, {
        priority: 'medium',
        offline: true
      });
      
      dispatch({ type: 'UPDATE_INSPECTION', payload: { id, data: response.data } });
      
      // Emit event
      inspectorEventBus.emit(INSPECTOR_EVENTS.inspectionStatusChanged, {
        payload: { inspectionId: id, newStatus: data.status }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to update inspection:', error);
      throw error;
    }
  }, []);

  const setCurrentInspection = useCallback((inspection: any) => {
    dispatch({ type: 'SET_CURRENT_INSPECTION', payload: inspection });
  }, []);

  // Critical issue operations
  const createCriticalIssue = useCallback(async (issueData: any) => {
    try {
      const response = await roofmindApi.createCriticalIssue(issueData);
      dispatch({ type: 'ADD_CRITICAL_ISSUE', payload: response.data });
      
      // Emit event for immediate alerts
      inspectorEventBus.emit(INSPECTOR_EVENTS.DEFICIENCY_ADDED, {
        issue: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create critical issue:', error);
      throw error;
    }
  }, []);

  // Photo operations
  const uploadPhoto = useCallback(async (file: File, inspectionId: string, metadata: any = {}) => {
    try {
      const response = await roofmindApi.uploadPhoto(file, inspectionId, metadata);
      return response.data;
    } catch (error) {
      console.error('Failed to upload photo:', error);
      throw error;
    }
  }, []);

  // Filtering
  const setFilters = useCallback((filters: Partial<RoofMindState['filters']>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const getFilteredInspections = useCallback(() => {
    let filtered = state.inspections;

    // Apply status filter
    if (state.filters.status.length > 0) {
      filtered = filtered.filter(inspection =>
        state.filters.status.includes(inspection.status)
      );
    }

    // Apply priority filter
    if (state.filters.priority.length > 0) {
      filtered = filtered.filter(inspection =>
        state.filters.priority.includes(inspection.priority || 'medium')
      );
    }

    // Apply inspector filter
    if (state.filters.inspector.length > 0) {
      filtered = filtered.filter(inspection =>
        state.filters.inspector.includes(inspection.inspector_id)
      );
    }

    // Apply date range filter
    if (state.filters.dateRange[0] && state.filters.dateRange[1]) {
      filtered = filtered.filter(inspection => {
        const date = new Date(inspection.scheduled_date);
        return date >= state.filters.dateRange[0]! && date <= state.filters.dateRange[1]!;
      });
    }

    return filtered;
  }, [state.inspections, state.filters]);

  // Sync operations
  const forcSync = useCallback(async () => {
    if (state.offline.isOffline) return;
    
    await offlineManager.syncOfflineData();
    
    // Refresh data after sync
    await loadInspections();
    await loadCriticalIssues();
    
    const status = offlineManager.getConnectivityStatus();
    dispatch({ 
      type: 'SET_OFFLINE_STATUS', 
      payload: { 
        isOffline: !status.isOnline,
        pendingSync: status.unsyncedItems,
        lastSyncTime: Date.now()
      } 
    });
  }, [state.offline.isOffline, loadInspections, loadCriticalIssues]);

  return {
    // State
    ...state,
    filteredInspections: getFilteredInspections(),
    
    // Actions
    loadInspections,
    loadProperties,
    loadCriticalIssues,
    createInspection,
    updateInspection,
    setCurrentInspection,
    createCriticalIssue,
    uploadPhoto,
    setFilters,
    forcSync,
    
    // Computed
    totalInspections: state.inspections.length,
    activeInspections: state.inspections.filter(i => i.status === 'in_progress').length,
    pendingInspections: state.inspections.filter(i => i.status === 'scheduled').length,
    completedInspections: state.inspections.filter(i => i.status === 'completed').length,
    criticalIssueCount: state.criticalIssues.length
  };
}