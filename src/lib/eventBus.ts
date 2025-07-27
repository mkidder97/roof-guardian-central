/**
 * Centralized Event Bus for Inspector Interface
 * Inspired by Google Maps event handling architecture
 */

export interface InspectorEvent {
  type: string;
  payload?: any;
  timestamp: number;
  source?: string;
}

export interface EventListener {
  id: string;
  callback: (event: InspectorEvent) => void;
  once?: boolean;
}

class InspectorEventBus {
  private listeners: Map<string, EventListener[]> = new Map();
  private eventHistory: InspectorEvent[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to an event type
   */
  on(eventType: string, callback: (event: InspectorEvent) => void, options?: { once?: boolean }): () => void {
    const listener: EventListener = {
      id: this.generateId(),
      callback,
      once: options?.once || false
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType)!.push(listener);

    // Return unsubscribe function
    return () => this.off(eventType, listener.id);
  }

  /**
   * Subscribe to an event once
   */
  once(eventType: string, callback: (event: InspectorEvent) => void): () => void {
    return this.on(eventType, callback, { once: true });
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType: string, listenerId?: string): void {
    const listeners = this.listeners.get(eventType);
    if (!listeners) return;

    if (listenerId) {
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      // Remove all listeners for this event type
      this.listeners.delete(eventType);
    }
  }

  /**
   * Emit an event
   */
  emit(eventType: string, payload?: any, source?: string): void {
    const event: InspectorEvent = {
      type: eventType,
      payload,
      timestamp: Date.now(),
      source
    };

    // Add to history
    this.addToHistory(event);

    // Get listeners and execute callbacks
    const listeners = this.listeners.get(eventType);
    if (!listeners) return;

    // Create a copy to avoid issues if listeners are modified during execution
    const listenersToExecute = [...listeners];

    listenersToExecute.forEach(listener => {
      try {
        listener.callback(event);
        
        // Remove one-time listeners
        if (listener.once) {
          this.off(eventType, listener.id);
        }
      } catch (error) {
        console.error(`Error executing event listener for ${eventType}:`, error);
      }
    });
  }

  /**
   * Get event history
   */
  getHistory(eventType?: string): InspectorEvent[] {
    if (eventType) {
      return this.eventHistory.filter(event => event.type === eventType);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get all active listeners
   */
  getActiveListeners(): { [eventType: string]: number } {
    const result: { [eventType: string]: number } = {};
    this.listeners.forEach((listeners, eventType) => {
      result[eventType] = listeners.length;
    });
    return result;
  }

  private addToHistory(event: InspectorEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  private generateId(): string {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
export const inspectorEventBus = new InspectorEventBus();

// Predefined event types for type safety
export const INSPECTOR_EVENTS = {
  // Property selection events
  PROPERTY_SELECTED: 'property.selected',
  PROPERTY_DESELECTED: 'property.deselected',
  PROPERTY_NAVIGATE: 'property.navigate',

  // New typed events for inspection management
  inspectionCreated: 'inspectionCreated',
  inspectionUpdated: 'inspectionUpdated',
  inspectionStatusChanged: 'inspectionStatusChanged',
  inspectionDeleted: 'inspectionDeleted',
  dataRefresh: 'dataRefresh',
  buildingInspectionHistoryUpdated: 'buildingInspectionHistoryUpdated',
  
  // Inspection events
  INSPECTION_STARTED: 'inspection.started',
  INSPECTION_PAUSED: 'inspection.paused',
  INSPECTION_RESUMED: 'inspection.resumed',
  INSPECTION_COMPLETED: 'inspection.completed',
  INSPECTION_CANCELLED: 'inspection.cancelled',
  INSPECTION_START_REQUESTED: 'inspection.start_requested',
  INSPECTION_SCHEDULE_REQUESTED: 'inspection.schedule_requested',
  INSPECTION_SAVE_REQUESTED: 'inspection.save_requested',
  INSPECTION_COMPLETE_REQUESTED: 'inspection.complete_requested',
  INSPECTION_PAUSE_TOGGLE_REQUESTED: 'inspection.pause_toggle_requested',
  INSPECTION_EXPORT_REQUESTED: 'inspection.export_requested',
  INSPECTION_EMERGENCY_SAVE_REQUESTED: 'inspection.emergency_save_requested',
  
  // Photo events
  PHOTO_CAPTURED: 'photo.captured',
  PHOTO_DELETED: 'photo.deleted',
  PHOTO_ANNOTATED: 'photo.annotated',
  PHOTO_CAPTURE_REQUESTED: 'photo.capture_requested',
  PHOTO_EMERGENCY_REQUESTED: 'photo.emergency_requested',
  
  // Deficiency events
  DEFICIENCY_ADDED: 'deficiency.added',
  DEFICIENCY_UPDATED: 'deficiency.updated',
  DEFICIENCY_DELETED: 'deficiency.deleted',
  DEFICIENCY_ADD_REQUESTED: 'deficiency.add_requested',
  
  // Voice note events
  VOICE_NOTE_STARTED: 'voice_note.started',
  VOICE_NOTE_STOPPED: 'voice_note.stopped',
  VOICE_NOTE_SAVED: 'voice_note.saved',
  VOICE_NOTE_TOGGLE_REQUESTED: 'voice_note.toggle_requested',
  
  // Navigation events
  TAB_CHANGED: 'navigation.tab_changed',
  DIALOG_OPENED: 'navigation.dialog_opened',
  DIALOG_CLOSED: 'navigation.dialog_closed',
  NAVIGATION_COMMAND_PALETTE_OPENED: 'navigation.command_palette_opened',
  NAVIGATION_HELP_OPENED: 'navigation.help_opened',
  NAVIGATION_REFRESH_REQUESTED: 'navigation.refresh_requested',
  NAVIGATION_SEARCH_OPENED: 'navigation.search_opened',
  
  // Emergency events
  EMERGENCY_CONTACT_REQUESTED: 'emergency.contact_requested',
  EMERGENCY_CALL_REQUESTED: 'emergency.call_requested',
  
  // Report events
  REPORT_URGENT_REQUESTED: 'report.urgent_requested',
  REPORT_GENERATE_REQUESTED: 'report.generate_requested',
  
  // Findings events
  FINDINGS_SHARE_REQUESTED: 'findings.share_requested',
  
  // Quote events
  QUOTE_REQUEST_REQUESTED: 'quote.request_requested',
  
  // Maintenance events
  MAINTENANCE_SCHEDULE_REQUESTED: 'maintenance.schedule_requested',
  
  // Vendor events
  VENDOR_CONTACT_REQUESTED: 'vendor.contact_requested',
  
  // Collaboration events
  COLLABORATION_SESSION_JOINED: 'collaboration.session_joined',
  COLLABORATION_SESSION_UPDATED: 'collaboration.session_updated',
  COLLABORATION_COLLABORATOR_JOINED: 'collaboration.collaborator_joined',
  COLLABORATION_COLLABORATOR_LEFT: 'collaboration.collaborator_left',
  COLLABORATION_INSPECTION_PROGRESS: 'collaboration.inspection_progress',
  COLLABORATION_PHOTO_SHARED: 'collaboration.photo_shared',
  COLLABORATION_DEFICIENCY_SHARED: 'collaboration.deficiency_shared',
  COLLABORATION_USER_ACTIVITY: 'collaboration.user_activity',
  
  // WebSocket events
  WEBSOCKET_CONNECTED: 'websocket.connected',
  WEBSOCKET_DISCONNECTED: 'websocket.disconnected',
  
  // Data sync events
  DATA_SYNC_STARTED: 'data.sync_started',
  DATA_SYNC_COMPLETED: 'data.sync_completed',
  DATA_SYNC_FAILED: 'data.sync_failed',
  
  // Offline events
  OFFLINE_MODE_ENABLED: 'offline.enabled',
  OFFLINE_MODE_DISABLED: 'offline.disabled',
  OFFLINE_DATA_QUEUED: 'offline.data_queued',
  
  // Keyboard shortcuts
  SHORTCUT_TRIGGERED: 'keyboard.shortcut_triggered',
  
  // Unified inspection synchronization events
  INSPECTION_CREATED: 'inspection.created',
  INSPECTION_UPDATED: 'inspection.updated',
  INSPECTION_DELETED: 'inspection.deleted',
  INSPECTION_STATUS_CHANGED: 'inspection.status_changed',
  INSPECTION_ASSIGNED: 'inspection.assigned',
  INSPECTION_UNASSIGNED: 'inspection.unassigned',
  INSPECTION_RESCHEDULED: 'inspection.rescheduled',
  INSPECTION_REPORT_GENERATED: 'inspection.report_generated',
  INSPECTION_REPORT_UPDATED: 'inspection.report_updated',
  
  // Inspection data synchronization
  INSPECTION_DATA_SYNC: 'inspection.data_sync',
  INSPECTION_DATA_REFRESH: 'inspection.data_refresh',
  INSPECTION_DATA_STALE: 'inspection.data_stale',
  INSPECTION_DATA_ERROR: 'inspection.data_error',
  
  // Campaign events for unified sync
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_UPDATED: 'campaign.updated',
  CAMPAIGN_INSPECTION_ADDED: 'campaign.inspection_added',
  CAMPAIGN_INSPECTION_REMOVED: 'campaign.inspection_removed',
  
  // Building/Property related inspection events
  BUILDING_INSPECTION_HISTORY_UPDATED: 'building.inspection_history_updated',
  BUILDING_INSPECTION_SCHEDULED: 'building.inspection_scheduled',
  BUILDING_INSPECTION_STATUS_CHANGED: 'building.inspection_status_changed',
  
  // Real-time collaboration for inspection data
  INSPECTION_COLLABORATION_START: 'inspection.collaboration_start',
  INSPECTION_COLLABORATION_UPDATE: 'inspection.collaboration_update',
  INSPECTION_COLLABORATION_END: 'inspection.collaboration_end',
  
  // Component refresh events
  INSPECTIONS_TAB_REFRESH: 'inspections_tab.refresh',
  INSPECTION_HISTORY_REFRESH: 'inspection_history.refresh',
  INSPECTOR_INTERFACE_REFRESH: 'inspector_interface.refresh'
} as const;

export type InspectorEventType = typeof INSPECTOR_EVENTS[keyof typeof INSPECTOR_EVENTS];