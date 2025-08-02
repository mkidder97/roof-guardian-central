import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Camera, 
  Image as ImageIcon, 
  FolderOpen,
  X,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FloatingCameraButtonProps {
  onPhotoCapture: (photos: File[], type: 'overview' | 'deficiency') => void;
  isTablet?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FloatingCameraButton({ 
  onPhotoCapture, 
  isTablet = false, 
  disabled = false,
  className = ""
}: FloatingCameraButtonProps) {
  const { toast } = useToast();
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState<'overview' | 'deficiency'>('overview');
  const [isUploading, setIsUploading] = useState(false);
  
  // File input refs for different capture methods
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFabClick = () => {
    if (disabled) return;
    setShowCameraModal(true);
  };

  const handlePhotoTypeSelect = (type: 'overview' | 'deficiency') => {
    setSelectedPhotoType(type);
  };

  const handleCameraCapture = async () => {
    // For mobile/iPad, try to request camera permissions first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        // Request camera access to ensure permissions
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', // Use back camera by default
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        });
        
        // Stop the stream immediately - we just wanted to check permissions
        stream.getTracks().forEach(track => track.stop());
        
        // Now trigger the file input
        cameraInputRef.current?.click();
      } catch (error) {
        console.error('Camera permission error:', error);
        
        // Show helpful error message
        toast({
          title: "Camera Access Required",
          description: "Please allow camera access to take photos",
          variant: "destructive"
        });
        
        // Fall back to file input anyway
        cameraInputRef.current?.click();
      }
    } else {
      // No camera API available, use file input
      cameraInputRef.current?.click();
    }
  };

  const handlePhotoLibrary = () => {
    galleryInputRef.current?.click();
  };

  const handleChooseFiles = () => {
    fileInputRef.current?.click();
  };

  const processPhotos = async (files: FileList | null, source: string) => {
    if (!files || files.length === 0) return;

    // Validate file count (max 10)
    if (files.length > 10) {
      toast({
        title: "Too Many Files",
        description: "Please select up to 10 photos at a time",
        variant: "destructive"
      });
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const maxSize = 20 * 1024 * 1024; // 20MB
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not an image file`,
          variant: "destructive"
        });
        continue;
      }
      
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} exceeds 20MB limit`,
          variant: "destructive"
        });
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      // Call the parent handler with valid files
      await onPhotoCapture(validFiles, selectedPhotoType);
      
      // Show success toast
      toast({
        title: "Photos Added",
        description: `${validFiles.length} ${selectedPhotoType} photo${validFiles.length > 1 ? 's' : ''} captured from ${source}`,
      });
      
      // Close modal
      setShowCameraModal(false);
    } catch (error) {
      console.error('Photo processing error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to process photos. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, source: string) => {
    processPhotos(event.target.files, source);
    // Reset file input
    event.target.value = '';
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={handleFabClick}
        disabled={disabled}
        className={`
          fixed z-50 shadow-2xl border-2 border-white/20 transition-all duration-200 hover:scale-110 active:scale-95
          ${isTablet 
            ? 'bottom-8 right-8 h-16 w-16 rounded-full' 
            : 'bottom-6 right-6 h-14 w-14 rounded-full'
          }
          ${disabled 
            ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
          ${className}
        `}
        size="icon"
      >
        <Plus className={isTablet ? 'h-8 w-8' : 'h-6 w-6'} />
      </Button>

      {/* Camera Options Modal */}
      <Dialog open={showCameraModal} onOpenChange={setShowCameraModal}>
        <DialogContent className={`${isTablet ? 'max-w-lg' : 'max-w-md'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isTablet ? 'text-xl' : 'text-lg'}`}>
              <Camera className={isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
              Add Photo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Photo Type Selection */}
            <div>
              <h4 className={`font-medium mb-3 ${isTablet ? 'text-base' : 'text-sm'}`}>Photo Type</h4>
              <div className="flex gap-2">
                <Button
                  variant={selectedPhotoType === 'overview' ? 'default' : 'outline'}
                  onClick={() => handlePhotoTypeSelect('overview')}
                  className={isTablet ? 'h-11 px-6' : 'h-9 px-4'}
                  size={isTablet ? 'lg' : 'default'}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Overview
                </Button>
                <Button
                  variant={selectedPhotoType === 'deficiency' ? 'default' : 'outline'}
                  onClick={() => handlePhotoTypeSelect('deficiency')}
                  className={isTablet ? 'h-11 px-6' : 'h-9 px-4'}
                  size={isTablet ? 'lg' : 'default'}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Deficiency
                </Button>
              </div>
            </div>

            {/* Camera Options */}
            <div className="space-y-3">
              <h4 className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>Capture Method</h4>
              
              {/* Take Photo */}
              <Card className="hover:shadow-md transition-shadows cursor-pointer" onClick={handleCameraCapture}>
                <CardContent className={`flex items-center gap-4 ${isTablet ? 'p-6' : 'p-4'}`}>
                  <div className={`rounded-full bg-blue-100 ${isTablet ? 'p-3' : 'p-2'}`}>
                    <Camera className={`text-blue-600 ${isTablet ? 'h-6 w-6' : 'h-5 w-5'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>Take Photo</h3>
                    <p className={`text-muted-foreground ${isTablet ? 'text-sm' : 'text-xs'}`}>
                      Use device camera to capture photos
                    </p>
                  </div>
                  <Badge variant="secondary" className={isTablet ? 'text-sm' : 'text-xs'}>
                    Up to 10
                  </Badge>
                </CardContent>
              </Card>

              {/* Photo Library */}
              <Card className="hover:shadow-md transition-shadows cursor-pointer" onClick={handlePhotoLibrary}>
                <CardContent className={`flex items-center gap-4 ${isTablet ? 'p-6' : 'p-4'}`}>
                  <div className={`rounded-full bg-green-100 ${isTablet ? 'p-3' : 'p-2'}`}>
                    <ImageIcon className={`text-green-600 ${isTablet ? 'h-6 w-6' : 'h-5 w-5'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>Photo Library</h3>
                    <p className={`text-muted-foreground ${isTablet ? 'text-sm' : 'text-xs'}`}>
                      Select from camera roll
                    </p>
                  </div>
                  <Badge variant="secondary" className={isTablet ? 'text-sm' : 'text-xs'}>
                    Up to 10
                  </Badge>
                </CardContent>
              </Card>

              {/* Choose Files */}
              <Card className="hover:shadow-md transition-shadows cursor-pointer" onClick={handleChooseFiles}>
                <CardContent className={`flex items-center gap-4 ${isTablet ? 'p-6' : 'p-4'}`}>
                  <div className={`rounded-full bg-purple-100 ${isTablet ? 'p-3' : 'p-2'}`}>
                    <FolderOpen className={`text-purple-600 ${isTablet ? 'h-6 w-6' : 'h-5 w-5'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>Choose Files</h3>
                    <p className={`text-muted-foreground ${isTablet ? 'text-sm' : 'text-xs'}`}>
                      Browse files from device
                    </p>
                  </div>
                  <Badge variant="secondary" className={isTablet ? 'text-sm' : 'text-xs'}>
                    Up to 10
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                <span className={`text-blue-700 ${isTablet ? 'text-base' : 'text-sm'}`}>
                  Processing photos...
                </span>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCameraModal(false)}
                disabled={isUploading}
                className={isTablet ? 'h-11 px-6' : 'h-9 px-4'}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden File Inputs */}
      {/* Camera Capture - iOS/Android optimized */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, 'camera')}
        disabled={isUploading}
        // iOS specific attributes
        {...(navigator.userAgent.match(/iPhone|iPad|iPod/) && {
          capture: "environment"
        })}
      />

      {/* Photo Library - No capture attribute for gallery access */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, 'photo library')}
        disabled={isUploading}
      />

      {/* File Browser - Standard file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, 'file browser')}
        disabled={isUploading}
      />
    </>
  );
}