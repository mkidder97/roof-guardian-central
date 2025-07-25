import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TouchInspectionInterface } from "@/components/inspector/TouchInspectionInterface";
import { QuickFieldActions } from "@/components/inspector/QuickFieldActions";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/lib/offline-storage";
import { useSyncService } from "@/lib/sync-service";
import {
  Home,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Battery,
  ArrowLeft,
  Settings,
  Upload,
  Phone
} from "lucide-react";
import { cn } from '@/lib/utils';

interface ActiveInspectionProps {
  propertyId: string;
  propertyName: string;
  onComplete: (inspectionData: any) => void;
  onCancel: () => void;
}

export function ActiveInspectionInterface({ 
  propertyId, 
  propertyName, 
  onComplete, 
  onCancel 
}: ActiveInspectionProps) {
  const { toast } = useToast();
  const { saveInspection, syncInspections } = useOfflineStorage();
  const { isOnline, queuedActions } = useSyncService();
  
  const [currentView, setCurrentView] = useState<'overview' | 'inspection'>('overview');
  const [inspectionStarted, setInspectionStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | undefined>(undefined);
  const [inspectionData, setInspectionData] = useState<any>(null);

  // Get battery level if available
  useEffect(() => {
    const getBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setBatteryLevel(Math.round(battery.level * 100));
          
          // Update battery level periodically
          const updateBattery = () => setBatteryLevel(Math.round(battery.level * 100));
          battery.addEventListener('levelchange', updateBattery);
          
          return () => battery.removeEventListener('levelchange', updateBattery);
        } catch (error) {
          console.warn('Battery API not available');
        }
      }
    };
    
    getBatteryInfo();
  }, []);

  const handleStartInspection = () => {
    setInspectionStarted(true);
    setStartTime(new Date());
    setCurrentView('inspection');
    
    toast({
      title: "Inspection Started",
      description: "Beginning inspection documentation",
    });
  };

  const handleTakePhoto = () => {
    // This would trigger the photo capture system
    toast({
      title: "Photo Capture",
      description: "Opening camera...",
    });
  };

  const handleEmergencyStop = () => {
    if (confirm('Are you sure you want to stop this inspection? This is for emergencies only.')) {
      onCancel();
      toast({
        title: "Emergency Stop",
        description: "Inspection stopped for safety",
        variant: "destructive"
      });
    }
  };

  const handleSyncData = async () => {
    try {
      await syncInspections();
      toast({
        title: "Sync Complete",
        description: "All data synchronized successfully",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Unable to sync data. Will retry when online.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleCallSupport = () => {
    // In a real app, this would initiate a call
    window.open('tel:+15551234567');
  };

  const handleSaveInspection = async (data: any) => {
    try {
      setInspectionData(data);
      
      // Save to offline storage first
      await saveInspection(data);
      
      // Try to sync if online
      if (isOnline) {
        await handleSyncData();
      }
      
      toast({
        title: "Inspection Saved",
        description: isOnline ? "Saved and synced" : "Saved offline",
      });
      
      onComplete(data);
    } catch (error) {
      console.error('Error saving inspection:', error);
      toast({
        title: "Save Error",
        description: "Failed to save inspection data",
        variant: "destructive"
      });
    }
  };

  // If inspection is active, show the touch interface
  if (currentView === 'inspection') {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('overview')}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            
            <div className="flex items-center gap-2 text-sm">
              {isOnline ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="hidden sm:inline">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <WifiOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Offline</span>
                </div>
              )}
              
              {queuedActions > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {queuedActions} pending
                </Badge>
              )}
            </div>
          </div>
        </div>

        <TouchInspectionInterface
          inspectionId={`inspection_${propertyId}_${Date.now()}`}
          propertyName={propertyName}
          inspectorName="Current Inspector"
          onSave={handleSaveInspection}
          offline={!isOnline}
        />
      </div>
    );
  }

  // Overview/Dashboard view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Exit
              </Button>
            </div>
            <h1 className="text-lg font-bold truncate">{propertyName}</h1>
            <div className="flex items-center gap-3 text-xs opacity-90">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>Field Inspection</span>
              </div>
              {startTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Started: {startTime.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}
            
            {batteryLevel !== undefined && (
              <div className="flex items-center gap-1 text-xs">
                <Battery className={cn(
                  "h-4 w-4",
                  batteryLevel > 50 ? "text-green-400" : 
                  batteryLevel > 20 ? "text-yellow-400" : "text-red-400"
                )} />
                <span className="hidden sm:inline">{batteryLevel}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Connection Status Alert */}
        {!isOnline && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <WifiOff className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">Working Offline</p>
                  <p className="text-sm text-orange-600">
                    Data will sync automatically when connection is restored
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inspection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Inspection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!inspectionStarted ? (
              <div className="text-center py-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Ready to Begin Inspection</h3>
                    <p className="text-muted-foreground">
                      All systems are ready. Tap the button below to start documenting your inspection.
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleStartInspection}
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-16 text-lg"
                  >
                    <CheckCircle className="h-6 w-6 mr-2" />
                    Start Inspection
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-600">Inspection Active</p>
                    <p className="text-sm text-muted-foreground">
                      Started at {startTime?.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                </div>
                
                <Button
                  onClick={() => setCurrentView('inspection')}
                  className="w-full"
                  size="lg"
                >
                  Continue Inspection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Field Actions */}
        <QuickFieldActions
          inspectionId={`inspection_${propertyId}_${Date.now()}`}
          propertyId={propertyId}
          onStartInspection={handleStartInspection}
          onTakePhoto={handleTakePhoto}
          onEmergencyStop={handleEmergencyStop}
          onSyncData={handleSyncData}
          onCallSupport={handleCallSupport}
          isOnline={isOnline}
          batteryLevel={batteryLevel}
        />

        {/* Sync Status */}
        {queuedActions > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">
                      {queuedActions} items pending sync
                    </p>
                    <p className="text-sm text-blue-600">
                      Will sync automatically when online
                    </p>
                  </div>
                </div>
                {isOnline && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncData}
                    className="border-blue-200 text-blue-700"
                  >
                    Sync Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Safety Reminder */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Safety Reminder</p>
                <p className="text-sm text-yellow-700">
                  Ensure all safety equipment is in place before beginning inspection. 
                  Use the emergency stop button if any safety concerns arise.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Emergency Support</p>
                <p className="text-sm text-muted-foreground">
                  24/7 technical and safety support
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleCallSupport}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}