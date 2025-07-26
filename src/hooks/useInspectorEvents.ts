import { useEffect, useCallback, useRef } from 'react';
import { inspectorEventBus, INSPECTOR_EVENTS, InspectorEvent, InspectorEventType } from '@/lib/eventBus';

/**
 * Custom hook for managing inspector events
 * Provides a clean interface for components to interact with the event bus
 */
export function useInspectorEvents() {
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  // Clean up subscriptions on unmount
  useEffect(() => {
    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRefs.current = [];
    };
  }, []);

  const emit = useCallback((eventType: InspectorEventType, payload?: any, source?: string) => {
    inspectorEventBus.emit(eventType, payload, source);
  }, []);

  const on = useCallback((eventType: InspectorEventType, callback: (event: InspectorEvent) => void) => {
    const unsubscribe = inspectorEventBus.on(eventType, callback);
    unsubscribeRefs.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  const once = useCallback((eventType: InspectorEventType, callback: (event: InspectorEvent) => void) => {
    const unsubscribe = inspectorEventBus.once(eventType, callback);
    unsubscribeRefs.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  const getHistory = useCallback((eventType?: InspectorEventType) => {
    return inspectorEventBus.getHistory(eventType);
  }, []);

  return {
    emit,
    on,
    once,
    getHistory,
    EVENTS: INSPECTOR_EVENTS
  };
}

/**
 * Hook for listening to specific inspector events with automatic cleanup
 */
export function useInspectorEventListener(
  eventType: InspectorEventType,
  callback: (event: InspectorEvent) => void,
  deps: React.DependencyList = []
) {
  const { on } = useInspectorEvents();

  useEffect(() => {
    return on(eventType, callback);
  }, [eventType, on, ...deps]);
}

/**
 * Hook for inspection state management using events
 */
export function useInspectionState() {
  const { emit, on } = useInspectorEvents();

  const startInspection = useCallback((propertyId: string, propertyName: string) => {
    emit(INSPECTOR_EVENTS.INSPECTION_STARTED, { propertyId, propertyName }, 'inspection_manager');
  }, [emit]);

  const pauseInspection = useCallback(() => {
    emit(INSPECTOR_EVENTS.INSPECTION_PAUSED, {}, 'inspection_manager');
  }, [emit]);

  const resumeInspection = useCallback(() => {
    emit(INSPECTOR_EVENTS.INSPECTION_RESUMED, {}, 'inspection_manager');
  }, [emit]);

  const completeInspection = useCallback((inspectionData: any) => {
    emit(INSPECTOR_EVENTS.INSPECTION_COMPLETED, inspectionData, 'inspection_manager');
  }, [emit]);

  const cancelInspection = useCallback(() => {
    emit(INSPECTOR_EVENTS.INSPECTION_CANCELLED, {}, 'inspection_manager');
  }, [emit]);

  const addDeficiency = useCallback((deficiency: any) => {
    emit(INSPECTOR_EVENTS.DEFICIENCY_ADDED, deficiency, 'deficiency_manager');
  }, [emit]);

  const capturePhoto = useCallback((photo: any) => {
    emit(INSPECTOR_EVENTS.PHOTO_CAPTURED, photo, 'photo_manager');
  }, [emit]);

  const startVoiceNote = useCallback(() => {
    emit(INSPECTOR_EVENTS.VOICE_NOTE_STARTED, {}, 'voice_manager');
  }, [emit]);

  const stopVoiceNote = useCallback((note: any) => {
    emit(INSPECTOR_EVENTS.VOICE_NOTE_STOPPED, note, 'voice_manager');
  }, [emit]);

  return {
    startInspection,
    pauseInspection,
    resumeInspection,
    completeInspection,
    cancelInspection,
    addDeficiency,
    capturePhoto,
    startVoiceNote,
    stopVoiceNote,
    on
  };
}

/**
 * Hook for property selection management using events
 */
export function usePropertySelection() {
  const { emit, on } = useInspectorEvents();

  const selectProperty = useCallback((propertyId: string, propertyData?: any) => {
    emit(INSPECTOR_EVENTS.PROPERTY_SELECTED, { propertyId, propertyData }, 'property_selector');
  }, [emit]);

  const deselectProperty = useCallback(() => {
    emit(INSPECTOR_EVENTS.PROPERTY_DESELECTED, {}, 'property_selector');
  }, [emit]);

  return {
    selectProperty,
    deselectProperty,
    on
  };
}