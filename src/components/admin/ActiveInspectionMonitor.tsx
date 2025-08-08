import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Clock, 
  User, 
  Camera, 
  FileText,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Phone
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ActiveInspection {
  id: string;
  inspector: {
    name: string;
    id: string;
  };
  property: {
    name: string;
    address: string;
  };
  startTime: Date;
  status: 'in_progress' | 'paused' | 'completing';
  progress: {
    deficiencies: number;
    photos: number;
    completionPercentage: number;
  };
  lastActivity: Date;
  criticalIssues: number;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
}

export function ActiveInspectionMonitor() {
  const [activeInspections, setActiveInspections] = useState<ActiveInspection[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Load active inspections
    loadActiveInspections();
    
    // Set up polling for real-time updates
    const interval = setInterval(loadActiveInspections, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadActiveInspections = async () => {
    try {
      setRefreshing(true);
      
      // TODO: Replace with real API call
      const mockData: ActiveInspection[] = [
        {
          id: '1',
          inspector: {
            name: 'John Smith',
            id: 'inspector-1'
          },
          property: {
            name: 'Oakwood Plaza',
            address: '123 Main St, City'
          },
          startTime: new Date(Date.now() - 1000 * 60 * 90), // Started 90 minutes ago
          status: 'in_progress',
          progress: {
            deficiencies: 3,
            photos: 12,
            completionPercentage: 65
          },
          lastActivity: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
          criticalIssues: 1
        },
        {
          id: '2',
          inspector: {
            name: 'Sarah Johnson',
            id: 'inspector-2'
          },
          property: {
            name: 'Metro Center',
            address: '456 Oak Ave, City'
          },
          startTime: new Date(Date.now() - 1000 * 60 * 45), // Started 45 minutes ago
          status: 'in_progress',
          progress: {
            deficiencies: 1,
            photos: 8,
            completionPercentage: 35
          },
          lastActivity: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
          criticalIssues: 0
        }
      ];
      
      setActiveInspections(mockData);
    } catch (error) {
      console.error('Error loading active inspections:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string, lastActivity: Date) => {
    const minutesAgo = (Date.now() - lastActivity.getTime()) / (1000 * 60);
    
    if (minutesAgo > 30) return 'text-red-600 bg-red-50'; // Stale
    if (status === 'paused') return 'text-yellow-600 bg-yellow-50';
    if (status === 'completing') return 'text-blue-600 bg-blue-50';
    return 'text-green-600 bg-green-50'; // Active
  };

  const getStatusIcon = (status: string, lastActivity: Date) => {
    const minutesAgo = (Date.now() - lastActivity.getTime()) / (1000 * 60);
    
    if (minutesAgo > 30) return <AlertTriangle className="h-4 w-4" />;
    if (status === 'paused') return <Pause className="h-4 w-4" />;
    if (status === 'completing') return <CheckCircle className="h-4 w-4" />;
    return <Play className="h-4 w-4" />;
  };

  const handleContactInspector = (inspectorId: string, inspectorName: string) => {
    // TODO: Implement contact functionality
    console.log('Contacting inspector:', inspectorName);
  };

  if (activeInspections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Active Inspections
            <Button
              variant="ghost"
              size="sm"
              onClick={loadActiveInspections}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No active inspections at this time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Active Inspections
          <div className="flex items-center gap-2">
            <Badge variant="default">{activeInspections.length} Active</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadActiveInspections}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeInspections.map((inspection) => {
          const minutesAgo = (Date.now() - inspection.lastActivity.getTime()) / (1000 * 60);
          const duration = formatDistanceToNow(inspection.startTime, { addSuffix: false });
          
          return (
            <div key={inspection.id} className="border rounded-lg p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {inspection.property.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {inspection.property.address}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {inspection.criticalIssues > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {inspection.criticalIssues} Critical
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(inspection.status, inspection.lastActivity)}`}
                  >
                    {getStatusIcon(inspection.status, inspection.lastActivity)}
                    <span className="ml-1 capitalize">{inspection.status.replace('_', ' ')}</span>
                  </Badge>
                </div>
              </div>

              {/* Inspector & Timing */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{inspection.inspector.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>Duration: {duration}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">{inspection.progress.completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${inspection.progress.completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Activity Stats */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span>{inspection.progress.deficiencies} deficiencies</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Camera className="h-4 w-4 text-gray-400" />
                    <span>{inspection.progress.photos} photos</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${
                    minutesAgo > 30 ? 'text-red-600' : 
                    minutesAgo > 15 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    Last activity: {minutesAgo < 1 ? 'Just now' : `${Math.floor(minutesAgo)}m ago`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleContactInspector(inspection.inspector.id, inspection.inspector.name)}
                  >
                    <Phone className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Warning for stale inspections */}
              {minutesAgo > 30 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>No recent activity - inspector may need assistance</span>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Summary */}
        <div className="pt-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Total active inspections</span>
            <span className="font-medium">{activeInspections.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Critical issues detected</span>
            <span className="font-medium text-red-600">
              {activeInspections.reduce((sum, inspection) => sum + inspection.criticalIssues, 0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}