import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Camera,
  MapPin,
  Clock,
  FileText,
  AlertTriangle,
  Zap,
  Wifi,
  WifiOff,
  Battery,
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Navigation,
  Phone,
  Upload,
  Download,
  Home,
  User,
  CheckCircle,
  X,
  Play,
  Pause,
  Square,
  RotateCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  disabled?: boolean;
  badge?: string;
  color?: string;
}

interface WeatherData {
  temperature: number;
  condition: string;
  windSpeed: number;
  humidity: number;
  visibility: number;
  icon: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy: number;
}

interface QuickFieldActionsProps {
  inspectionId: string;
  propertyId: string;
  onStartInspection: () => void;
  onTakePhoto: () => void;
  onEmergencyStop: () => void;
  onSyncData: () => void;
  onCallSupport: () => void;
  isOnline: boolean;
  batteryLevel?: number;
}

export function QuickFieldActions({
  inspectionId,
  propertyId,
  onStartInspection,
  onTakePhoto,
  onEmergencyStop,
  onSyncData,
  onCallSupport,
  isOnline,
  batteryLevel
}: QuickFieldActionsProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [inspectionTimer, setInspectionTimer] = useState(0);
  const [isInspectionActive, setIsInspectionActive] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');

  // Timer for active inspection
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInspectionActive) {
      interval = setInterval(() => {
        setInspectionTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInspectionActive]);

  // Get current location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      // Try to get address from reverse geocoding (mock for now)
      locationData.address = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
      
      setLocation(locationData);
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Get weather data (mock implementation)
  const getWeatherData = async () => {
    // In real app, this would call a weather API
    const mockWeather: WeatherData = {
      temperature: 72,
      condition: 'Partly Cloudy',
      windSpeed: 5,
      humidity: 65,
      visibility: 10,
      icon: 'partly-cloudy'
    };
    setWeather(mockWeather);
  };

  // Start inspection with timer
  const startInspection = () => {
    setIsInspectionActive(true);
    setInspectionTimer(0);
    onStartInspection();
  };

  // Stop inspection
  const stopInspection = () => {
    setIsInspectionActive(false);
    setInspectionTimer(0);
  };

  // Sync data with server
  const syncData = async () => {
    setSyncStatus('syncing');
    try {
      await onSyncData();
      setSyncStatus('completed');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize data on mount
  useEffect(() => {
    getCurrentLocation();
    getWeatherData();
  }, []);

  // Define quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'inspection',
      label: isInspectionActive ? 'Stop Inspection' : 'Start Inspection',
      icon: isInspectionActive ? Square : Play,
      action: isInspectionActive ? stopInspection : startInspection,
      variant: isInspectionActive ? 'destructive' : 'default',
      color: isInspectionActive ? 'bg-red-500' : 'bg-green-500'
    },
    {
      id: 'photo',
      label: 'Quick Photo',
      icon: Camera,
      action: onTakePhoto,
      variant: 'outline',
      color: 'bg-blue-500'
    },
    {
      id: 'emergency',
      label: 'Emergency Stop',
      icon: AlertTriangle,
      action: onEmergencyStop,
      variant: 'destructive',
      color: 'bg-red-600'
    },
    {
      id: 'sync',
      label: syncStatus === 'syncing' ? 'Syncing...' : 'Sync Data',
      icon: syncStatus === 'syncing' ? RotateCw : Upload,
      action: syncData,
      variant: 'outline',
      disabled: !isOnline || syncStatus === 'syncing',
      badge: syncStatus === 'completed' ? 'Done' : syncStatus === 'error' ? 'Error' : undefined,
      color: 'bg-purple-500'
    },
    {
      id: 'location',
      label: isGettingLocation ? 'Getting Location...' : 'Update Location',
      icon: isGettingLocation ? RotateCw : MapPin,
      action: getCurrentLocation,
      variant: 'outline',
      disabled: isGettingLocation,
      color: 'bg-orange-500'
    },
    {
      id: 'support',
      label: 'Call Support',
      icon: Phone,
      action: onCallSupport,
      variant: 'outline',
      color: 'bg-indigo-500'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Offline</span>
                </>
              )}
            </div>

            {/* Battery Level */}
            {batteryLevel !== undefined && (
              <div className="flex items-center gap-2">
                <Battery className={cn(
                  "h-4 w-4",
                  batteryLevel > 50 ? "text-green-500" : 
                  batteryLevel > 20 ? "text-yellow-500" : "text-red-500"
                )} />
                <span>{batteryLevel}%</span>
              </div>
            )}

            {/* Weather */}
            {weather && (
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-blue-500" />
                <span>{weather.temperature}°F</span>
              </div>
            )}

            {/* Location */}
            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-500" />
                <span className="truncate">GPS Ready</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inspection Timer */}
      {isInspectionActive && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium">Inspection Active</span>
              </div>
              <div className="text-xl font-mono font-bold text-green-700">
                {formatTime(inspectionTimer)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size="lg"
                className={cn(
                  "h-20 flex-col gap-2 relative overflow-hidden",
                  action.disabled && "opacity-50"
                )}
                onClick={action.action}
                disabled={action.disabled}
              >
                <div className={cn(
                  "absolute inset-0 opacity-10",
                  action.color
                )} />
                <action.icon className={cn(
                  "h-6 w-6 z-10",
                  action.id === 'sync' && syncStatus === 'syncing' && "animate-spin"
                )} />
                <span className="text-xs font-medium z-10 text-center leading-tight">
                  {action.label}
                </span>
                {action.badge && (
                  <Badge className="absolute top-1 right-1 text-xs">
                    {action.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weather Details */}
      {weather && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Weather Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Temperature</p>
                <p className="font-medium">{weather.temperature}°F</p>
              </div>
              <div>
                <p className="text-muted-foreground">Condition</p>
                <p className="font-medium">{weather.condition}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Wind Speed</p>
                <p className="font-medium">{weather.windSpeed} mph</p>
              </div>
              <div>
                <p className="text-muted-foreground">Visibility</p>
                <p className="font-medium">{weather.visibility} mi</p>
              </div>
            </div>
            
            {/* Weather Warnings */}
            {(weather.windSpeed > 15 || weather.condition.includes('Rain')) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Weather Advisory</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  {weather.windSpeed > 15 && "High winds detected. "}
                  {weather.condition.includes('Rain') && "Wet conditions may affect inspection safety."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Location Details */}
      {location && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Current Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-sm">Coordinates</p>
                <p className="font-mono text-sm">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Accuracy</p>
                <p className="text-sm">{Math.round(location.accuracy)} meters</p>
              </div>
              {location.address && (
                <div>
                  <p className="text-muted-foreground text-sm">Address</p>
                  <p className="text-sm">{location.address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Safety Checklist */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Safety Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SafetyChecklist />
        </CardContent>
      </Card>
    </div>
  );
}

// Safety Checklist Component
function SafetyChecklist() {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const safetyItems = [
    { id: 'ladder', label: 'Ladder secured and stable' },
    { id: 'harness', label: 'Safety harness worn' },
    { id: 'weather', label: 'Weather conditions acceptable' },
    { id: 'tools', label: 'Tools and equipment ready' },
    { id: 'communication', label: 'Communication device working' }
  ];

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const allChecked = safetyItems.length === checkedItems.length;

  return (
    <div className="space-y-3">
      {safetyItems.map((item) => {
        const isChecked = checkedItems.includes(item.id);
        return (
          <div
            key={item.id}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted"
            onClick={() => toggleItem(item.id)}
          >
            <div className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center",
              isChecked ? "bg-green-500 border-green-500" : "border-gray-300"
            )}>
              {isChecked && <CheckCircle className="h-3 w-3 text-white" />}
            </div>
            <span className={cn(
              "text-sm",
              isChecked ? "line-through text-muted-foreground" : ""
            )}>
              {item.label}
            </span>
          </div>
        );
      })}
      
      {allChecked && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">All safety checks complete!</span>
          </div>
        </div>
      )}
    </div>
  );
}