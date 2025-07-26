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
  
  // Inspection events
  INSPECTION_STARTED: 'inspection.started',
  INSPECTION_PAUSED: 'inspection.paused',
  INSPECTION_RESUMED: 'inspection.resumed',
  INSPECTION_COMPLETED: 'inspection.completed',
  INSPECTION_CANCELLED: 'inspection.cancelled',
  
  // Photo events
  PHOTO_CAPTURED: 'photo.captured',
  PHOTO_DELETED: 'photo.deleted',
  PHOTO_ANNOTATED: 'photo.annotated',
  
  // Deficiency events
  DEFICIENCY_ADDED: 'deficiency.added',
  DEFICIENCY_UPDATED: 'deficiency.updated',
  DEFICIENCY_DELETED: 'deficiency.deleted',
  
  // Voice note events
  VOICE_NOTE_STARTED: 'voice_note.started',
  VOICE_NOTE_STOPPED: 'voice_note.stopped',
  VOICE_NOTE_SAVED: 'voice_note.saved',
  
  // Navigation events
  TAB_CHANGED: 'navigation.tab_changed',
  DIALOG_OPENED: 'navigation.dialog_opened',
  DIALOG_CLOSED: 'navigation.dialog_closed',
  
  // Data sync events
  DATA_SYNC_STARTED: 'data.sync_started',
  DATA_SYNC_COMPLETED: 'data.sync_completed',
  DATA_SYNC_FAILED: 'data.sync_failed',
  
  // Offline events
  OFFLINE_MODE_ENABLED: 'offline.enabled',
  OFFLINE_MODE_DISABLED: 'offline.disabled',
  OFFLINE_DATA_QUEUED: 'offline.data_queued',
  
  // Keyboard shortcuts
  SHORTCUT_TRIGGERED: 'keyboard.shortcut_triggered'
} as const;

export type InspectorEventType = typeof INSPECTOR_EVENTS[keyof typeof INSPECTOR_EVENTS];