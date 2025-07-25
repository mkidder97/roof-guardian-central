import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Camera,
  Upload,
  X,
  RotateCw,
  Maximize2,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Edit3,
  Save,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoData {
  id: string;
  file: File;
  url: string;
  category: string;
  description: string;
  timestamp: Date;
  location?: GeolocationPosition;
  annotations?: Annotation[];
}

interface Annotation {
  id: string;
  x: number;
  y: number;
  type: 'damage' | 'note' | 'measurement';
  text: string;
  severity?: 'low' | 'medium' | 'high';
}

interface MobilePhotoCaptureProps {
  inspectionId: string;
  onPhotosChange: (photos: PhotoData[]) => void;
  maxPhotos?: number;
  categories?: string[];
}

const DEFAULT_CATEGORIES = [
  'Overview',
  'Roof Surface',
  'Gutters',
  'Flashing',
  'Vents',
  'Damage',
  'Repairs Needed',
  'Safety Issues'
];

export function MobilePhotoCapture({
  inspectionId,
  onPhotosChange,
  maxPhotos = 50,
  categories = DEFAULT_CATEGORIES
}: MobilePhotoCaptureProps) {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(categories[0]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);

  // Get current location
  const getCurrentLocation = useCallback((): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  }, []);

  // Start camera capture
  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
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

  // Capture photo from camera
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0);
    
    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      const location = await getCurrentLocation();
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const file = new File([blob], `${photoId}.jpg`, { type: 'image/jpeg' });
      
      const newPhoto: PhotoData = {
        id: photoId,
        file,
        url: URL.createObjectURL(blob),
        category: currentCategory,
        description: '',
        timestamp: new Date(),
        location: location || undefined,
        annotations: []
      };
      
      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);
      stopCamera();
    }, 'image/jpeg', 0.9);
  }, [photos, currentCategory, onPhotosChange, getCurrentLocation, stopCamera]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const location = await getCurrentLocation();
    
    const newPhotos: PhotoData[] = await Promise.all(
      files.map(async (file) => {
        const photoId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
          id: photoId,
          file,
          url: URL.createObjectURL(file),
          category: currentCategory,
          description: '',
          timestamp: new Date(),
          location: location || undefined,
          annotations: []
        };
      })
    );

    const updatedPhotos = [...photos, ...newPhotos];
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  }, [photos, currentCategory, onPhotosChange, getCurrentLocation]);

  // Delete photo
  const deletePhoto = useCallback((photoId: string) => {
    const updatedPhotos = photos.filter(p => p.id !== photoId);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
    
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto(null);
    }
  }, [photos, selectedPhoto, onPhotosChange]);

  // Update photo metadata
  const updatePhoto = useCallback((photoId: string, updates: Partial<PhotoData>) => {
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId ? { ...photo, ...updates } : photo
    );
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
    
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto({ ...selectedPhoto, ...updates });
    }
  }, [photos, selectedPhoto, onPhotosChange]);

  // Add annotation to photo
  const addAnnotation = useCallback((photo: PhotoData, annotation: Annotation) => {
    const updatedAnnotations = [...(photo.annotations || []), annotation];
    updatePhoto(photo.id, { annotations: updatedAnnotations });
  }, [updatePhoto]);

  if (isCapturing) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="relative h-full">
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
              <Button variant="secondary" size="lg" onClick={stopCamera}>
                <X className="h-6 w-6" />
              </Button>
              
              <div className="text-center">
                <Badge className="mb-2">{currentCategory}</Badge>
                <p className="text-white text-sm">Tap to capture</p>
              </div>
              
              <Button size="lg" onClick={capturePhoto} className="bg-white text-black hover:bg-gray-200">
                <Camera className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedPhoto) {
    return (
      <PhotoDetailView
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onUpdate={(updates) => updatePhoto(selectedPhoto.id, updates)}
        onDelete={() => deletePhoto(selectedPhoto.id)}
        onAddAnnotation={(annotation) => addAnnotation(selectedPhoto, annotation)}
        categories={categories}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Photo Capture Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Photo Documentation</CardTitle>
            <Badge variant="outline">{photos.length}/{maxPhotos}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <select
              value={currentCategory}
              onChange={(e) => setCurrentCategory(e.target.value)}
              className="w-full p-3 border rounded-lg text-base bg-background"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Capture Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              size="lg" 
              onClick={startCamera}
              className="h-14 text-base"
              disabled={photos.length >= maxPhotos}
            >
              <Camera className="h-5 w-5 mr-2" />
              Take Photo
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => fileInputRef.current?.click()}
              className="h-14 text-base"
              disabled={photos.length >= maxPhotos}
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Photos ({photos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <PhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  onClick={() => setSelectedPhoto(photo)}
                  onDelete={() => deletePhoto(photo.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading photos...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Photo Thumbnail Component
function PhotoThumbnail({ 
  photo, 
  onClick, 
  onDelete 
}: { 
  photo: PhotoData; 
  onClick: () => void; 
  onDelete: () => void; 
}) {
  return (
    <div className="relative group">
      <div 
        className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
        onClick={onClick}
      >
        <img 
          src={photo.url} 
          alt={photo.description || 'Inspection photo'}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Photo Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-lg">
        <p className="text-white text-xs font-medium truncate">{photo.category}</p>
        {photo.location && (
          <div className="flex items-center text-white/80 text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            GPS
          </div>
        )}
      </div>

      {/* Delete Button */}
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Annotation Indicator */}
      {photo.annotations && photo.annotations.length > 0 && (
        <Badge className="absolute top-2 left-2 text-xs">
          {photo.annotations.length}
        </Badge>
      )}
    </div>
  );
}

// Photo Detail View Component
function PhotoDetailView({
  photo,
  onClose,
  onUpdate,
  onDelete,
  onAddAnnotation,
  categories
}: {
  photo: PhotoData;
  onClose: () => void;
  onUpdate: (updates: Partial<PhotoData>) => void;
  onDelete: () => void;
  onAddAnnotation: (annotation: Annotation) => void;
  categories: string[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPhoto, setEditedPhoto] = useState(photo);

  const handleSave = () => {
    onUpdate(editedPhoto);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-background border-b">
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setIsEditing(!isEditing)}>
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Photo Display */}
        <div className="flex-1 relative overflow-hidden">
          <img 
            src={photo.url} 
            alt={photo.description || 'Inspection photo'}
            className="w-full h-full object-contain"
          />
          
          {/* Annotations Overlay */}
          {photo.annotations?.map((annotation) => (
            <div
              key={annotation.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ 
                left: `${annotation.x}%`, 
                top: `${annotation.y}%` 
              }}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 border-white",
                annotation.type === 'damage' && annotation.severity === 'high' && "bg-red-500",
                annotation.type === 'damage' && annotation.severity === 'medium' && "bg-yellow-500",
                annotation.type === 'damage' && annotation.severity === 'low' && "bg-blue-500",
                annotation.type === 'note' && "bg-green-500",
                annotation.type === 'measurement' && "bg-purple-500"
              )} />
            </div>
          ))}
        </div>

        {/* Photo Details */}
        <div className="bg-background border-t p-4 space-y-4 max-h-80 overflow-y-auto">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  value={editedPhoto.category}
                  onChange={(e) => setEditedPhoto({ ...editedPhoto, category: e.target.value })}
                  className="w-full mt-1 p-2 border rounded"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editedPhoto.description}
                  onChange={(e) => setEditedPhoto({ ...editedPhoto, description: e.target.value })}
                  placeholder="Describe what's shown in this photo..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <Button onClick={handleSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Badge>{photo.category}</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  {photo.timestamp.toLocaleString()}
                </p>
              </div>
              
              {photo.description && (
                <div>
                  <h4 className="font-medium">Description</h4>
                  <p className="text-sm">{photo.description}</p>
                </div>
              )}
              
              {photo.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>GPS: {photo.location.coords.latitude.toFixed(6)}, {photo.location.coords.longitude.toFixed(6)}</span>
                </div>
              )}
              
              {photo.annotations && photo.annotations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Annotations ({photo.annotations.length})</h4>
                  <div className="space-y-1">
                    {photo.annotations.map((annotation) => (
                      <div key={annotation.id} className="text-sm bg-muted p-2 rounded">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            annotation.type === 'damage' && annotation.severity === 'high' && "bg-red-500",
                            annotation.type === 'damage' && annotation.severity === 'medium' && "bg-yellow-500",
                            annotation.type === 'damage' && annotation.severity === 'low' && "bg-blue-500",
                            annotation.type === 'note' && "bg-green-500",
                            annotation.type === 'measurement' && "bg-purple-500"
                          )} />
                          <span className="font-medium capitalize">{annotation.type}</span>
                          {annotation.severity && (
                            <Badge variant="outline" className="text-xs">
                              {annotation.severity}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1">{annotation.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}