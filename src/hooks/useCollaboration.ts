import { useState, useEffect, useCallback } from 'react';
import { webSocketManager, CollaboratorInfo, InspectionSession } from '@/lib/websocketManager';
import { useInspectorEventListener } from './useInspectorEvents';

/**
 * Hook for managing real-time collaboration features
 */
export function useCollaboration() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<InspectionSession | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Connection management
  const connect = useCallback(async (userId: string, authToken: string) => {
    try {
      await webSocketManager.connect(userId, authToken);
    } catch (error) {
      console.error('Failed to connect to collaboration service:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    webSocketManager.disconnect();
  }, []);

  // Session management
  const joinSession = useCallback((sessionId: string, propertyId: string) => {
    webSocketManager.joinSession(sessionId, propertyId);
  }, []);

  const leaveSession = useCallback(() => {
    webSocketManager.leaveSession();
  }, []);

  // Activity sharing
  const shareActivity = useCallback((activity: string) => {
    webSocketManager.sendActivity(activity);
  }, []);

  // Listen for collaboration events
  useInspectorEventListener('websocket.connected', useCallback(() => {
    setIsConnected(true);
  }, []));

  useInspectorEventListener('websocket.disconnected', useCallback(() => {
    setIsConnected(false);
    setCurrentSession(null);
    setCollaborators([]);
  }, []));

  useInspectorEventListener('collaboration.session_joined', useCallback((event) => {
    setCurrentSession(event.payload.session);
    setCollaborators(event.payload.session.collaborators);
  }, []));

  useInspectorEventListener('collaboration.session_updated', useCallback((event) => {
    setCurrentSession(prev => prev ? { ...prev, ...event.payload.updates } : null);
  }, []));

  useInspectorEventListener('collaboration.collaborator_joined', useCallback((event) => {
    setCollaborators(prev => {
      const existing = prev.find(c => c.userId === event.payload.collaborator.userId);
      if (existing) {
        return prev.map(c => 
          c.userId === event.payload.collaborator.userId ? event.payload.collaborator : c
        );
      }
      return [...prev, event.payload.collaborator];
    });
  }, []));

  useInspectorEventListener('collaboration.collaborator_left', useCallback((event) => {
    setCollaborators(prev => prev.filter(c => c.userId !== event.payload.userId));
  }, []));

  useInspectorEventListener('collaboration.inspection_progress', useCallback((event) => {
    setRecentActivities(prev => [
      {
        id: Date.now(),
        type: 'inspection_progress',
        user: event.payload.userId,
        data: event.payload,
        timestamp: event.timestamp
      },
      ...prev.slice(0, 49) // Keep last 50 activities
    ]);
  }, []));

  useInspectorEventListener('collaboration.photo_shared', useCallback((event) => {
    setRecentActivities(prev => [
      {
        id: Date.now(),
        type: 'photo_shared',
        user: event.payload.userId,
        data: event.payload,
        timestamp: event.timestamp
      },
      ...prev.slice(0, 49)
    ]);
  }, []));

  useInspectorEventListener('collaboration.deficiency_shared', useCallback((event) => {
    setRecentActivities(prev => [
      {
        id: Date.now(),
        type: 'deficiency_shared',
        user: event.payload.userId,
        data: event.payload,
        timestamp: event.timestamp
      },
      ...prev.slice(0, 49)
    ]);
  }, []));

  useInspectorEventListener('collaboration.user_activity', useCallback((event) => {
    // Update collaborator activity
    setCollaborators(prev => prev.map(collaborator => 
      collaborator.userId === event.payload.userId
        ? { ...collaborator, currentActivity: event.payload.activity, lastSeen: event.timestamp }
        : collaborator
    ));
  }, []));

  return {
    // Connection state
    isConnected,
    currentSession,
    collaborators,
    recentActivities,
    
    // Actions
    connect,
    disconnect,
    joinSession,
    leaveSession,
    shareActivity,
    
    // Computed values
    isCollaborating: currentSession !== null,
    collaboratorCount: collaborators.length,
    onlineCollaborators: collaborators.filter(c => c.isOnline)
  };
}

/**
 * Hook for displaying real-time collaboration status
 */
export function useCollaborationStatus() {
  const { 
    isConnected, 
    isCollaborating, 
    collaborators, 
    onlineCollaborators,
    recentActivities 
  } = useCollaboration();

  const getStatusMessage = useCallback(() => {
    if (!isConnected) return 'Offline - Working locally';
    if (!isCollaborating) return 'Connected - Solo inspection';
    
    const onlineCount = onlineCollaborators.length;
    if (onlineCount === 0) return 'Connected - Solo inspection';
    if (onlineCount === 1) return `Collaborating with ${onlineCount} other inspector`;
    return `Collaborating with ${onlineCount} other inspectors`;
  }, [isConnected, isCollaborating, onlineCollaborators.length]);

  const getRecentActivity = useCallback(() => {
    const recent = recentActivities.slice(0, 5);
    return recent.map(activity => {
      const collaborator = collaborators.find(c => c.userId === activity.user);
      const userName = collaborator?.name || 'Unknown user';
      
      switch (activity.type) {
        case 'photo_shared':
          return `${userName} captured a photo`;
        case 'deficiency_shared':
          return `${userName} documented an issue`;
        case 'inspection_progress':
          return `${userName} updated inspection progress`;
        default:
          return `${userName} performed an action`;
      }
    });
  }, [recentActivities, collaborators]);

  return {
    isConnected,
    isCollaborating,
    statusMessage: getStatusMessage(),
    collaborators,
    onlineCollaborators,
    recentActivities: getRecentActivity()
  };
}

/**
 * Hook for managing collaborative inspection sessions
 */
export function useInspectionCollaboration(propertyId?: string) {
  const { joinSession, leaveSession, currentSession, shareActivity } = useCollaboration();
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Auto-join session when property is selected
  useEffect(() => {
    if (propertyId && !currentSession) {
      const newSessionId = `inspection_${propertyId}_${Date.now()}`;
      setSessionId(newSessionId);
      joinSession(newSessionId, propertyId);
    }
  }, [propertyId, currentSession, joinSession]);

  // Auto-leave session when component unmounts or property changes
  useEffect(() => {
    return () => {
      if (currentSession) {
        leaveSession();
      }
    };
  }, [currentSession, leaveSession]);

  // Share inspection activities
  const shareInspectionStart = useCallback(() => {
    shareActivity('started_inspection');
  }, [shareActivity]);

  const sharePhotoCapture = useCallback((location?: string) => {
    shareActivity(`capturing_photo${location ? `_at_${location}` : ''}`);
  }, [shareActivity]);

  const shareDeficiencyDocumentation = useCallback((type?: string) => {
    shareActivity(`documenting_deficiency${type ? `_${type}` : ''}`);
  }, [shareActivity]);

  const shareInspectionComplete = useCallback(() => {
    shareActivity('completed_inspection');
  }, [shareActivity]);

  return {
    sessionId,
    currentSession,
    shareInspectionStart,
    sharePhotoCapture,
    shareDeficiencyDocumentation,
    shareInspectionComplete
  };
}