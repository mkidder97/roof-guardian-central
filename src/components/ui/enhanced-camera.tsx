import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Camera, 
  Square, 
  RotateCcw, 
  ZapOff, 
  Zap, 
  MapPin,
  Tag,
  Save,
  X,
  Image as ImageIcon,
  Compass,
  Thermometer,
  Wind,
  Eye
} from 'lucide-react';
import { useInspectorEvents } from '@/hooks/useInspectorEvents';
import { offlineManager } from '@/lib/offlineManager';

interface PhotoMetadata {
  // Location data
  latitude?: number;
  longitude?: number; 
  altitude?: number;
  accuracy?: number;
  
  // Device orientation
  deviceOrientation?: 'portrait' | 'landscape';
  compassHeading?: number;
  
  // Camera settings
  flash?: boolean;
  zoom?: number;
  focusDistance?: number;
  
  // Environmental data
  timestamp: number;
  weather?: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    conditions?: string;
  };
  
  // Inspection context
  inspectionId?: string;
  propertyId?: string;
  buildingArea?: string;
  deficiencyType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  
  // User annotations
  description?: string;
  tags?: string[];
  measurements?: {
    length?: number;
    width?: number;
    area?: number;
    units: 'feet' | 'meters' | 'inches';
  };
}

interface CapturedPhoto {
  id: string;
  blob: Blob;
  dataUrl: string;
  metadata: PhotoMetadata;
  thumbnail?: string;
}

interface EnhancedCameraProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCapture: (photo: CapturedPhoto) => void;
  context?: {
    inspectionId?: string;
    propertyId?: string;
    buildingArea?: string;
  };
}

export const EnhancedCamera: React.FC<EnhancedCameraProps> = ({
  isOpen,
  onClose,
  onPhotoCapture,
  context = {}
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [locationData, setLocationData] = useState<GeolocationPosition | null>(null);
  
  // Annotation state
  const [description, setDescription] = useState('');
  const [buildingArea, setBuildingArea] = useState(context.buildingArea || '');
  const [deficiencyType, setDeficiencyType] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [tags, setTags] = useState<string>('');
  const [measurements, setMeasurements] = useState({
    length: '',
    width: '',
    units: 'feet' as const
  });

  const { emit } = useInspectorEvents();

  // Initialize camera when dialog opens
  useEffect(() => {
    if (isOpen && !cameraActive) {
      initializeCamera();
      getCurrentLocation();
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  const initializeCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          zoom: true
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setCameraActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      // Fallback to basic constraints
      try {
        const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = basicStream;
        if (videoRef.current) {
          videoRef.current.srcObject = basicStream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } catch (basicError) {
        console.error('Camera access failed:', basicError);
      }
    }
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationData(position);
        },
        (error) => {
          console.warn('Location access denied:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Apply flash effect if enabled
      if (flashEnabled) {
        const flashOverlay = document.createElement('div');
        flashOverlay.style.position = 'fixed';
        flashOverlay.style.top = '0';
        flashOverlay.style.left = '0';
        flashOverlay.style.width = '100%';
        flashOverlay.style.height = '100%';
        flashOverlay.style.backgroundColor = 'white';
        flashOverlay.style.zIndex = '9999';
        flashOverlay.style.opacity = '0.8';
        flashOverlay.style.pointerEvents = 'none';
        document.body.appendChild(flashOverlay);
        
        setTimeout(() => {
          document.body.removeChild(flashOverlay);
        }, 100);
      }

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/jpeg', 0.9);
      });

      // Create data URL for preview
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      // Generate thumbnail
      const thumbnailCanvas = document.createElement('canvas');
      const thumbCtx = thumbnailCanvas.getContext('2d');
      thumbnailCanvas.width = 200;
      thumbnailCanvas.height = 150;
      thumbCtx?.drawImage(canvas, 0, 0, 200, 150);
      const thumbnail = thumbnailCanvas.toDataURL('image/jpeg', 0.7);

      // Collect metadata
      const metadata: PhotoMetadata = {
        timestamp: Date.now(),
        deviceOrientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
        flash: flashEnabled,
        zoom,
        
        // Location data
        ...(locationData && {
          latitude: locationData.coords.latitude,
          longitude: locationData.coords.longitude,
          altitude: locationData.coords.altitude || undefined,
          accuracy: locationData.coords.accuracy,
        }),
        
        // Compass heading (if available)
        ...(await getCompassHeading()),
        
        // Context data
        inspectionId: context.inspectionId,
        propertyId: context.propertyId,
        buildingArea: buildingArea || undefined,

        // Environmental data (mock for now - would integrate with weather API)
        weather: await getEnvironmentalData(),
      };

      const photo: CapturedPhoto = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        blob,
        dataUrl,
        metadata,
        thumbnail
      };

      setCapturedPhoto(photo);
      
      // Emit event
      emit('photo.captured', {
        photoId: photo.id,
        context: context,
        metadata: metadata
      });

    } catch (error) {
      console.error('Error capturing photo:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, flashEnabled, zoom, locationData, context, buildingArea, emit]);

  const getCompassHeading = async (): Promise<{ compassHeading?: number }> => {
    if ('DeviceOrientationEvent' in window) {
      return new Promise((resolve) => {
        const handleOrientation = (event: DeviceOrientationEvent) => {
          if (event.alpha !== null) {
            resolve({ compassHeading: event.alpha });
          } else {
            resolve({});
          }
          window.removeEventListener('deviceorientation', handleOrientation);
        };
        
        window.addEventListener('deviceorientation', handleOrientation);
        
        // Timeout after 1 second
        setTimeout(() => {
          window.removeEventListener('deviceorientation', handleOrientation);
          resolve({});
        }, 1000);
      });
    }
    return {};
  };

  const getEnvironmentalData = async () => {
    // In a real implementation, this would call a weather API
    // For now, return mock data
    return {
      temperature: 72,
      humidity: 45,
      windSpeed: 8,
      conditions: 'Clear'
    };
  };

  const savePhoto = useCallback(async () => {
    if (!capturedPhoto) return;

    const updatedMetadata: PhotoMetadata = {
      ...capturedPhoto.metadata,
      description: description || undefined,
      deficiencyType: deficiencyType || undefined,
      severity,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      ...(measurements.length || measurements.width ? {
        measurements: {
          length: measurements.length ? parseFloat(measurements.length) : undefined,
          width: measurements.width ? parseFloat(measurements.width) : undefined,
          area: (measurements.length && measurements.width) ? 
            parseFloat(measurements.length) * parseFloat(measurements.width) : undefined,
          units: measurements.units
        }
      } : {})
    };

    const finalPhoto = {
      ...capturedPhoto,
      metadata: updatedMetadata
    };

    // Store for offline sync
    await offlineManager.storeOfflineData('photo', {
      photo: finalPhoto,
      context: context
    });

    onPhotoCapture(finalPhoto);
    
    // Reset states
    setCapturedPhoto(null);
    setDescription('');
    setDeficiencyType('');
    setSeverity('medium');
    setTags('');
    setMeasurements({ length: '', width: '', units: 'feet' });
    
    onClose();
  }, [capturedPhoto, description, deficiencyType, severity, tags, measurements, context, onPhotoCapture, onClose]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  const handleClose = useCallback(() => {
    setCapturedPhoto(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Enhanced Photo Capture
            {locationData && (
              <Badge variant="outline" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                GPS Enabled
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!capturedPhoto ? (
            // Camera view
            <div className="relative">
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Camera overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Grid lines */}
                  <div className="absolute inset-0 border border-white/30">
                    <div className="w-full h-full relative">
                      <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                    </div>
                  </div>
                  
                  {/* Center focus indicator */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 border-2 border-white rounded-full opacity-70" />
                  </div>
                </div>

                {/* Camera controls overlay */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFlashEnabled(!flashEnabled)}
                    className="bg-black/50 border-white/50 text-white hover:bg-black/70"
                  >
                    {flashEnabled ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                  </Button>
                  
                  <Button
                    size="lg"
                    onClick={capturePhoto}
                    disabled={!cameraActive || isCapturing}
                    className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 text-black"
                  >
                    {isCapturing ? (
                      <div className="animate-spin">
                        <Camera className="h-6 w-6" />
                      </div>
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"  
                    size="icon"
                    onClick={handleClose}
                    className="bg-black/50 border-white/50 text-white hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Quick context info */}
              <div className="mt-2 flex flex-wrap gap-2">
                {context.inspectionId && (
                  <Badge variant="outline">Inspection: {context.inspectionId}</Badge>
                )}
                {buildingArea && (
                  <Badge variant="outline">Area: {buildingArea}</Badge>
                )}
                {locationData && (
                  <Badge variant="outline" className="text-xs">
                    <Compass className="h-3 w-3 mr-1" />
                    {locationData.coords.latitude.toFixed(6)}, {locationData.coords.longitude.toFixed(6)}
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            // Photo annotation view
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Photo preview */}
              <div className="space-y-4">
                <img
                  src={capturedPhoto.dataUrl}
                  alt="Captured photo"
                  className="w-full rounded-lg border"
                />
                
                <div className="flex gap-2">
                  <Button onClick={retakePhoto} variant="outline" className="flex-1">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                  <Button onClick={savePhoto} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save Photo
                  </Button>
                </div>
              </div>

              {/* Metadata and annotations */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Photo Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe what this photo shows..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="building-area">Building Area</Label>
                        <Input
                          id="building-area"
                          placeholder="e.g., North wall, Roof section A"
                          value={buildingArea}
                          onChange={(e) => setBuildingArea(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="deficiency-type">Issue Type</Label>
                        <Select value={deficiencyType} onValueChange={setDeficiencyType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="leak">Leak</SelectItem>
                            <SelectItem value="crack">Crack</SelectItem>
                            <SelectItem value="corrosion">Corrosion</SelectItem>
                            <SelectItem value="membrane-damage">Membrane Damage</SelectItem>
                            <SelectItem value="flashing-issue">Flashing Issue</SelectItem>
                            <SelectItem value="drainage-problem">Drainage Problem</SelectItem>
                            <SelectItem value="structural">Structural</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="severity">Severity</Label>
                      <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        placeholder="e.g., urgent, recurring, weather-related"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Measurements (optional)</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Input
                          placeholder="Length"
                          value={measurements.length}
                          onChange={(e) => setMeasurements(prev => ({...prev, length: e.target.value}))}
                        />
                        <Input
                          placeholder="Width"
                          value={measurements.width}
                          onChange={(e) => setMeasurements(prev => ({...prev, width: e.target.value}))}
                        />
                        <Select value={measurements.units} onValueChange={(v: any) => setMeasurements(prev => ({...prev, units: v}))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="feet">Feet</SelectItem>
                            <SelectItem value="meters">Meters</SelectItem>
                            <SelectItem value="inches">Inches</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Metadata summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Captured Metadata</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>📅 {new Date(capturedPhoto.metadata.timestamp).toLocaleString()}</div>
                      <div>📱 {capturedPhoto.metadata.deviceOrientation}</div>
                      {capturedPhoto.metadata.latitude && (
                        <div className="col-span-2">
                          📍 {capturedPhoto.metadata.latitude.toFixed(6)}, {capturedPhoto.metadata.longitude?.toFixed(6)}
                        </div>
                      )}
                      {capturedPhoto.metadata.compassHeading && (
                        <div>🧭 {capturedPhoto.metadata.compassHeading.toFixed(0)}°</div>
                      )}
                      {capturedPhoto.metadata.weather && (
                        <div className="col-span-2">
                          🌡️ {capturedPhoto.metadata.weather.temperature}°F, {capturedPhoto.metadata.weather.conditions}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};