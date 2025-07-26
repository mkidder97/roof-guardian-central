/**
 * WebSocket Manager for Real-time Collaboration
 * Enables live updates, collaborative inspections, and instant notifications
 */

import { inspectorEventBus, INSPECTOR_EVENTS } from './eventBus';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

export interface CollaboratorInfo {
  userId: string;
  name: string;
  role: 'inspector' | 'manager' | 'admin';
  currentActivity: string;
  lastSeen: number;
  isOnline: boolean;
}

export interface InspectionSession {
  sessionId: string;
  propertyId: string;
  propertyName: string;
  leadInspector: string;
  collaborators: CollaboratorInfo[];
  status: 'active' | 'paused' | 'completed';
  createdAt: number;
  lastActivity: number;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private userId: string = '';
  private currentSession: InspectionSession | null = null;
  private isConnected = false;
  private messageQueue: WebSocketMessage[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;

  constructor() {
    this.initializeEventListeners();
  }

  /**
   * Connect to WebSocket server
   */
  async connect(userId: string, authToken: string): Promise<void> {
    this.userId = userId;
    
    try {
      // Use secure WebSocket in production
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/inspector?token=${authToken}&userId=${userId}`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.currentSession = null;
  }

  /**
   * Send message to WebSocket server
   */
  send(type: string, payload: any): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.currentSession?.sessionId
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  /**
   * Join an inspection session
   */
  joinSession(sessionId: string, propertyId: string): void {
    this.send('join_session', {
      sessionId,
      propertyId,
      userInfo: {
        userId: this.userId,
        role: 'inspector', // Could be dynamic based on user
        currentActivity: 'joining'
      }
    });
  }

  /**
   * Leave current inspection session
   */
  leaveSession(): void {
    if (this.currentSession) {
      this.send('leave_session', {
        sessionId: this.currentSession.sessionId
      });
      this.currentSession = null;
    }
  }

  /**
   * Share inspection progress with collaborators
   */
  shareInspectionProgress(data: any): void {
    this.send('inspection_progress', {
      ...data,
      activity: 'inspection_update'
    });
  }

  /**
   * Share photo capture with team
   */
  sharePhotoCapture(photoData: any): void {
    this.send('photo_shared', {
      ...photoData,
      activity: 'photo_capture'
    });
  }

  /**
   * Share deficiency discovery
   */
  shareDeficiency(deficiencyData: any): void {
    this.send('deficiency_shared', {
      ...deficiencyData, 
      activity: 'deficiency_added'
    });
  }

  /**
   * Send typing/activity indicator
   */
  sendActivity(activity: string): void {
    this.send('user_activity', {
      activity,
      timestamp: Date.now()
    });
  }

  /**
   * Request current session state
   */
  requestSessionState(): void {
    this.send('get_session_state', {});
  }

  private handleOpen(): void {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectInterval = 1000;
    
    // Send queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.ws) {
        this.ws.send(JSON.stringify(message));
      }
    }
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Emit connection established event
    inspectorEventBus.emit('websocket.connected', {
      userId: this.userId,
      timestamp: Date.now()
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.processMessage(message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnected = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Emit disconnection event
    inspectorEventBus.emit('websocket.disconnected', {
      code: event.code,
      reason: event.reason,
      timestamp: Date.now()
    });
    
    // Schedule reconnect if not a clean disconnect
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    inspectorEventBus.emit('websocket.error', {
      error: event,
      timestamp: Date.now()
    });
  }

  private processMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'session_joined':
        this.handleSessionJoined(message.payload);
        break;
        
      case 'session_updated':
        this.handleSessionUpdated(message.payload);
        break;
        
      case 'collaborator_joined':
        this.handleCollaboratorJoined(message.payload);
        break;
        
      case 'collaborator_left':
        this.handleCollaboratorLeft(message.payload);
        break;
        
      case 'inspection_progress':
        this.handleInspectionProgress(message.payload);
        break;
        
      case 'photo_shared':
        this.handlePhotoShared(message.payload);
        break;
        
      case 'deficiency_shared':
        this.handleDeficiencyShared(message.payload);
        break;
        
      case 'user_activity':
        this.handleUserActivity(message.payload);
        break;
        
      case 'system_notification':
        this.handleSystemNotification(message.payload);
        break;
        
      case 'heartbeat_response':
        this.lastHeartbeat = Date.now();
        break;
        
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private handleSessionJoined(payload: any): void {
    this.currentSession = payload.session;
    inspectorEventBus.emit('collaboration.session_joined', payload);
  }

  private handleSessionUpdated(payload: any): void {
    if (this.currentSession) {
      this.currentSession = { ...this.currentSession, ...payload.updates };
    }
    inspectorEventBus.emit('collaboration.session_updated', payload);
  }

  private handleCollaboratorJoined(payload: any): void {
    if (this.currentSession) {
      const existingIndex = this.currentSession.collaborators.findIndex(
        c => c.userId === payload.collaborator.userId
      );
      
      if (existingIndex >= 0) {
        this.currentSession.collaborators[existingIndex] = payload.collaborator;
      } else {
        this.currentSession.collaborators.push(payload.collaborator);
      }
    }
    
    inspectorEventBus.emit('collaboration.collaborator_joined', payload);
  }

  private handleCollaboratorLeft(payload: any): void {
    if (this.currentSession) {
      this.currentSession.collaborators = this.currentSession.collaborators.filter(
        c => c.userId !== payload.userId
      );
    }
    
    inspectorEventBus.emit('collaboration.collaborator_left', payload);
  }

  private handleInspectionProgress(payload: any): void {
    // Don't process our own messages
    if (payload.userId === this.userId) return;
    
    inspectorEventBus.emit('collaboration.inspection_progress', payload);
  }

  private handlePhotoShared(payload: any): void {
    if (payload.userId === this.userId) return;
    
    inspectorEventBus.emit('collaboration.photo_shared', payload);
  }

  private handleDeficiencyShared(payload: any): void {
    if (payload.userId === this.userId) return;
    
    inspectorEventBus.emit('collaboration.deficiency_shared', payload);
  }

  private handleUserActivity(payload: any): void {
    if (payload.userId === this.userId) return;
    
    inspectorEventBus.emit('collaboration.user_activity', payload);
  }

  private handleSystemNotification(payload: any): void {
    inspectorEventBus.emit('collaboration.system_notification', payload);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isConnected) {
          // We would need to get the auth token again here
          // For now, emit an event that the UI can handle
          inspectorEventBus.emit('websocket.reconnect_needed', {
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts
          });
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      inspectorEventBus.emit('websocket.reconnect_failed', {
        attempts: this.reconnectAttempts
      });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send('heartbeat', { timestamp: Date.now() });
        
        // Check if we missed a heartbeat response
        if (Date.now() - this.lastHeartbeat > 30000) {
          console.warn('Heartbeat timeout, connection may be stale');
          this.ws?.close();
        }
      }
    }, 15000); // Send heartbeat every 15 seconds
  }

  private initializeEventListeners(): void {
    // Listen for inspector events to share with collaborators
    inspectorEventBus.on(INSPECTOR_EVENTS.INSPECTION_STARTED, (event) => {
      this.shareInspectionProgress({
        type: 'inspection_started',
        propertyId: event.payload.propertyId,
        propertyName: event.payload.propertyName
      });
    });

    inspectorEventBus.on(INSPECTOR_EVENTS.PHOTO_CAPTURED, (event) => {
      this.sharePhotoCapture({
        type: 'photo_captured',
        photoId: event.payload.photoId,
        context: event.payload.context
      });
    });

    inspectorEventBus.on(INSPECTOR_EVENTS.DEFICIENCY_ADDED, (event) => {
      this.shareDeficiency({
        type: 'deficiency_added',
        deficiency: event.payload
      });
    });

    inspectorEventBus.on(INSPECTOR_EVENTS.INSPECTION_COMPLETED, (event) => {
      this.shareInspectionProgress({
        type: 'inspection_completed',
        inspectionData: event.payload
      });
    });
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get session(): InspectionSession | null {
    return this.currentSession;
  }

  get collaborators(): CollaboratorInfo[] {
    return this.currentSession?.collaborators || [];
  }
}

// Create singleton instance
export const webSocketManager = new WebSocketManager();