import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  X,
  Check,
  Zap,
  RotateCw,
  Trash2,
  ArrowLeft,
  Grid3X3,
  List,
  MapPin,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CapturedPhoto {
  id: string;
  url: string;
  file: File;
  timestamp: Date;
  location?: GeolocationPosition;
  category?: string;
}

interface BatchPhotoCaptureProps {
  onPhotosUpdate: (photos: CapturedPhoto[]) => void;
  onExit: () => void;
  initialPhotos?: CapturedPhoto[];
  categories?: string[];
}

const DEFAULT_CATEGORIES = [
  'Overview',
  'Deficiency',
  'Before Repair',
  'After Repair',
  'Reference',
  'Safety Issue'
];

export function BatchPhotoCapture({
  onPhotosUpdate,
  onExit,
  initialPhotos = [],
  categories = DEFAULT_CATEGORIES
}: BatchPhotoCaptureProps) {
  const [photos, setPhotos] = useState<CapturedPhoto[]>(initialPhotos);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [captureCount, setCaptureCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera for live preview
  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsCapturing(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  }, []);

  // Quick capture from camera
  const quickCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      // Get location if available
      let location: GeolocationPosition | undefined;
      try {
        location = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3000,
            enableHighAccuracy: false
          });
        });
      } catch (error) {
        console.warn('Could not get location');
      }
      
      const photoId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const file = new File([blob], `${photoId}.jpg`, { type: 'image/jpeg' });
      
      const newPhoto: CapturedPhoto = {
        id: photoId,
        url: URL.createObjectURL(blob),
        file,
        timestamp: new Date(),
        location,
        category: selectedCategory
      };
      
      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);
      onPhotosUpdate(updatedPhotos);
      setCaptureCount(prev => prev + 1);
      
      // Visual feedback
      if (videoRef.current) {
        videoRef.current.style.filter = 'brightness(1.5)';
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.style.filter = 'none';
          }
        }, 100);
      }
    }, 'image/jpeg', 0.9);
  }, [photos, selectedCategory, onPhotosUpdate]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newPhotos: CapturedPhoto[] = await Promise.all(
      files.map(async (file) => {
        const photoId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
          id: photoId,
          url: URL.createObjectURL(file),
          file,
          timestamp: new Date(),
          category: selectedCategory
        };
      })
    );

    const updatedPhotos = [...photos, ...newPhotos];
    setPhotos(updatedPhotos);
    onPhotosUpdate(updatedPhotos);
    setCaptureCount(prev => prev + newPhotos.length);
    
    event.target.value = '';
  }, [photos, selectedCategory, onPhotosUpdate]);

  const deletePhoto = useCallback((photoId: string) => {
    const updatedPhotos = photos.filter(p => p.id !== photoId);
    setPhotos(updatedPhotos);
    onPhotosUpdate(updatedPhotos);
  }, [photos, onPhotosUpdate]);

  const deleteAllPhotos = useCallback(() => {
    if (confirm('Delete all photos? This cannot be undone.')) {
      setPhotos([]);
      onPhotosUpdate([]);
      setCaptureCount(0);
    }
  }, [onPhotosUpdate]);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExit}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Exit
            </Button>
            <div>
              <h1 className="font-bold">Batch Photo Capture</h1>
              <p className="text-xs opacity-90">{photos.length} photos captured</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary-foreground/20">
              <Zap className="h-3 w-3 mr-1" />
              Rapid Mode
            </Badge>
            {photos.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteAllPhotos}
                className="text-primary-foreground hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div className="bg-muted p-3 border-b">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-sm font-medium whitespace-nowrap">Category:</span>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col h-full">
        {/* Camera View */}
        {isCapturing ? (
          <div className="relative flex-1 bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Camera Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={stopCamera}
                >
                  <X className="h-6 w-6" />
                </Button>
                
                <div className="text-center text-white">
                  <Badge className="mb-2">{selectedCategory}</Badge>
                  <p className="text-sm">Tap to capture ({captureCount} taken)</p>
                </div>
                
                <Button
                  size="lg"
                  onClick={quickCapture}
                  className="bg-white text-black hover:bg-gray-200 w-16 h-16 rounded-full"
                >
                  <Camera className="h-8 w-8" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            {/* Quick Action Bar */}
            <div className="p-3 bg-background border-b">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    onClick={startCamera}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Photo Gallery */}
            <div className="flex-1 overflow-y-auto p-3">
              {photos.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Photos Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start capturing photos for rapid documentation
                  </p>
                  <Button onClick={startCamera} className="bg-green-600 hover:bg-green-700">
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <PhotoGridItem
                      key={photo.id}
                      photo={photo}
                      onDelete={() => deletePhoto(photo.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {photos.map((photo) => (
                    <PhotoListItem
                      key={photo.id}
                      photo={photo}
                      onDelete={() => deletePhoto(photo.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Summary */}
        {!isCapturing && photos.length > 0 && (
          <div className="bg-muted p-3 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{photos.length} photos</span>
                <span className="text-muted-foreground ml-2">
                  in {selectedCategory}
                </span>
              </div>
              <Button
                onClick={onExit}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}

// Photo Grid Item Component
function PhotoGridItem({ 
  photo, 
  onDelete 
}: { 
  photo: CapturedPhoto; 
  onDelete: () => void; 
}) {
  return (
    <div className="relative group aspect-square">
      <img
        src={photo.url}
        alt={`Photo ${photo.id}`}
        className="w-full h-full object-cover rounded border"
      />
      
      {/* Category Badge */}
      <Badge className="absolute top-1 left-1 text-xs">
        {photo.category}
      </Badge>
      
      {/* Location Indicator */}
      {photo.location && (
        <div className="absolute top-1 right-1">
          <MapPin className="h-3 w-3 text-white drop-shadow" />
        </div>
      )}
      
      {/* Delete Button */}
      <Button
        variant="destructive"
        size="sm"
        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
        onClick={onDelete}
      >
        <X className="h-3 w-3" />
      </Button>
      
      {/* Timestamp */}
      <div className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">
        {photo.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
}

// Photo List Item Component
function PhotoListItem({ 
  photo, 
  onDelete 
}: { 
  photo: CapturedPhoto; 
  onDelete: () => void; 
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <img
            src={photo.url}
            alt={`Photo ${photo.id}`}
            className="w-16 h-16 object-cover rounded border"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {photo.category}
              </Badge>
              {photo.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  GPS
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{photo.timestamp.toLocaleString()}</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}