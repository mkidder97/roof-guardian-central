import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { ScrollArea } from './scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import { 
  Users, 
  Wifi, 
  WifiOff, 
  Camera, 
  AlertTriangle, 
  Clock,
  MessageCircle,
  Activity,
  Eye,
  CheckCircle
} from 'lucide-react';
import { useCollaborationStatus } from '@/hooks/useCollaboration';

/**
 * Real-time collaboration status indicator
 */
export const CollaborationStatusBadge: React.FC = () => {
  const { isConnected, isCollaborating, onlineCollaborators } = useCollaborationStatus();

  if (!isConnected) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    );
  }

  if (!isCollaborating) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Wifi className="h-3 w-3" />
        Solo
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="flex items-center gap-1">
      <Users className="h-3 w-3" />
      {onlineCollaborators.length + 1} Active
    </Badge>
  );
};

/**
 * Collaboration panel showing active collaborators and recent activities
 */
interface CollaborationPanelProps {
  className?: string;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  className = ''
}) => {
  const { 
    isConnected, 
    isCollaborating, 
    collaborators, 
    onlineCollaborators, 
    recentActivities,
    statusMessage 
  } = useCollaborationStatus();

  const [showActivities, setShowActivities] = useState(false);

  const getActivityIcon = (activity: string) => {
    if (activity.includes('photo')) return <Camera className="h-3 w-3" />;
    if (activity.includes('issue') || activity.includes('deficiency')) return <AlertTriangle className="h-3 w-3" />;
    if (activity.includes('progress')) return <CheckCircle className="h-3 w-3" />;
    return <Activity className="h-3 w-3" />;
  };

  const getCollaboratorInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getActivityTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Collaboration
          </div>
          <CollaborationStatusBadge />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-muted-foreground">{statusMessage}</span>
        </div>

        {/* Active Collaborators */}
        {isCollaborating && onlineCollaborators.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Active Inspectors ({onlineCollaborators.length})
            </h4>
            <div className="space-y-2">
              {onlineCollaborators.map((collaborator) => (
                <div key={collaborator.userId} className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={`/avatars/${collaborator.userId}.jpg`} />
                    <AvatarFallback className="text-xs">
                      {getCollaboratorInitials(collaborator.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{collaborator.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {collaborator.currentActivity}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {collaborator.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activities */}
        {recentActivities.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recent Activity
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActivities(!showActivities)}
                className="h-auto p-0 text-xs"
              >
                {showActivities ? 'Hide' : 'Show All'}
              </Button>
            </div>
            
            <div className="space-y-1">
              {(showActivities ? recentActivities : recentActivities.slice(0, 3)).map((activity, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div className="flex-shrink-0 text-muted-foreground">
                    {getActivityIcon(activity)}
                  </div>
                  <span className="flex-1 text-muted-foreground">{activity}</span>
                  <span className="text-xs text-muted-foreground">
                    {getActivityTimestamp(Date.now() - index * 300000)} {/* Mock timestamps */}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Collaboration State */}
        {!isCollaborating && isConnected && (
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active collaboration session</p>
            <p className="text-xs">Your work will sync in real-time when others join</p>
          </div>
        )}

        {/* Offline State */}
        {!isConnected && (
          <div className="text-center py-4 text-muted-foreground">
            <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Working offline</p>
            <p className="text-xs">Changes will sync when connection is restored</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Floating collaboration indicator for minimal UI presence
 */
export const FloatingCollaborationIndicator: React.FC = () => {
  const { isConnected, onlineCollaborators } = useCollaborationStatus();

  if (!isConnected && onlineCollaborators.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 left-4 z-40 shadow-lg"
        >
          <Users className="h-4 w-4 mr-1" />
          {onlineCollaborators.length + 1}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-80">
        <CollaborationPanel />
      </PopoverContent>
    </Popover>
  );
};

/**
 * Collaboration activity feed for detailed view
 */
interface CollaborationActivityFeedProps {
  className?: string;
}

export const CollaborationActivityFeed: React.FC<CollaborationActivityFeedProps> = ({
  className = ''
}) => {
  const { recentActivities, collaborators } = useCollaborationStatus();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {getActivityTimestamp(Date.now() - index * 300000)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

function getActivityIcon(activity: string) {
  if (activity.includes('photo')) return <Camera className="h-3 w-3 text-blue-600" />;
  if (activity.includes('issue') || activity.includes('deficiency')) return <AlertTriangle className="h-3 w-3 text-red-600" />;
  if (activity.includes('progress')) return <CheckCircle className="h-3 w-3 text-green-600" />;
  return <Activity className="h-3 w-3 text-gray-600" />;
}

function getActivityTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}