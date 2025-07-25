import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MobilePhotoCapture } from './MobilePhotoCapture';
import {
  CheckCircle,
  AlertTriangle,
  X,
  Camera,
  MapPin,
  Clock,
  User,
  FileText,
  Save,
  Upload,
  Mic,
  MicOff,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  Home,
  Zap,
  Shield,
  Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InspectionItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'pass' | 'fail' | 'na';
  notes?: string;
  photos?: string[];
  severity?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'medium' | 'high';
}

interface VoiceNote {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: Date;
  transcription?: string;
}

interface TouchInspectionInterfaceProps {
  inspectionId: string;
  propertyName: string;
  inspectorName: string;
  onSave: (data: any) => void;
  template?: InspectionItem[];
  offline?: boolean;
}

const DEFAULT_INSPECTION_TEMPLATE: InspectionItem[] = [
  {
    id: 'roof_surface',
    category: 'Roof Structure',
    title: 'Roof Surface Condition',
    description: 'Check for damage, wear, missing materials',
    status: 'pending'
  },
  {
    id: 'gutters',
    category: 'Drainage',
    title: 'Gutters & Downspouts',
    description: 'Inspect for clogs, damage, proper drainage',
    status: 'pending'
  },
  {
    id: 'flashing',
    category: 'Roof Structure',
    title: 'Flashing & Seals',
    description: 'Check around chimneys, vents, edges',
    status: 'pending'
  },
  {
    id: 'vents',
    category: 'Ventilation',
    title: 'Roof Vents',
    description: 'Inspect ventilation systems and openings',
    status: 'pending'
  },
  {
    id: 'structural',
    category: 'Roof Structure',
    title: 'Structural Integrity',
    description: 'Check for sagging, damage, support issues',
    status: 'pending'
  },
  {
    id: 'safety',
    category: 'Safety',
    title: 'Safety Hazards',
    description: 'Identify immediate safety concerns',
    status: 'pending'
  }
];

export function TouchInspectionInterface({
  inspectionId,
  propertyName,
  inspectorName,
  onSave,
  template = DEFAULT_INSPECTION_TEMPLATE,
  offline = false
}: TouchInspectionInterfaceProps) {
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>(template);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingNote, setPlayingNote] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [startTime] = useState(new Date());

  const currentItem = inspectionItems[currentItemIndex];
  const completedItems = inspectionItems.filter(item => item.status !== 'pending').length;
  const progressPercentage = (completedItems / inspectionItems.length) * 100;

  // Voice recording functions
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const voiceNote: VoiceNote = {
          id: `voice_${Date.now()}`,
          blob,
          duration: recordingTime,
          timestamp: new Date()
        };
        setVoiceNotes(prev => [...prev, voiceNote]);
        setRecordingTime(0);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };

  const playVoiceNote = (note: VoiceNote) => {
    const audio = new Audio(URL.createObjectURL(note.blob));
    audio.play();
    setPlayingNote(note.id);
    audio.onended = () => setPlayingNote(null);
  };

  // Update inspection item
  const updateItem = (updates: Partial<InspectionItem>) => {
    const updatedItems = inspectionItems.map((item, index) =>
      index === currentItemIndex ? { ...item, ...updates } : item
    );
    setInspectionItems(updatedItems);
  };

  // Navigation functions
  const goToNext = () => {
    if (currentItemIndex < inspectionItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setNotes(inspectionItems[currentItemIndex + 1].notes || '');
    }
  };

  const goToPrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      setNotes(inspectionItems[currentItemIndex - 1].notes || '');
    }
  };

  const saveInspection = () => {
    const inspectionData = {
      id: inspectionId,
      propertyName,
      inspector: inspectorName,
      startTime,
      endTime: new Date(),
      items: inspectionItems,
      voiceNotes,
      generalNotes: notes,
      status: completedItems === inspectionItems.length ? 'completed' : 'in_progress',
      offline
    };
    onSave(inspectionData);
  };

  if (showPhotoCapture) {
    return (
      <MobilePhotoCapture
        inspectionId={inspectionId}
        onPhotosChange={(photos) => {
          // Handle photo updates
          updateItem({ photos: photos.map(p => p.id) });
          setShowPhotoCapture(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b mb-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold truncate">{propertyName}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{inspectorName}</span>
              {offline && (
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
          <Button onClick={saveInspection} className="h-12 px-6">
            <Save className="h-5 w-5 mr-2" />
            Save
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{completedItems}/{inspectionItems.length} items</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>

      {/* Current Inspection Item */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Badge className="mb-2">{currentItem.category}</Badge>
              <CardTitle className="text-lg leading-tight">
                {currentItem.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {currentItem.description}
              </p>
            </div>
            <div className="text-xs text-muted-foreground ml-4">
              {currentItemIndex + 1}/{inspectionItems.length}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Selection - Large Touch Targets */}
          <div>
            <label className="text-sm font-medium mb-3 block">Status</label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={currentItem.status === 'pass' ? 'default' : 'outline'}
                size="lg"
                className="h-16 text-base"
                onClick={() => updateItem({ status: 'pass' })}
              >
                <CheckCircle className="h-6 w-6 mr-2 text-green-500" />
                Pass
              </Button>
              
              <Button
                variant={currentItem.status === 'fail' ? 'destructive' : 'outline'}
                size="lg"
                className="h-16 text-base"
                onClick={() => updateItem({ status: 'fail' })}
              >
                <AlertTriangle className="h-6 w-6 mr-2" />
                Fail
              </Button>
              
              <Button
                variant={currentItem.status === 'na' ? 'secondary' : 'outline'}
                size="lg"
                className="h-16 text-base"
                onClick={() => updateItem({ status: 'na' })}
              >
                <X className="h-6 w-6 mr-2" />
                N/A
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-16 text-base"
                onClick={() => setShowPhotoCapture(true)}
              >
                <Camera className="h-6 w-6 mr-2" />
                Photo
              </Button>
            </div>
          </div>

          {/* Severity Selection (if failed) */}
          {currentItem.status === 'fail' && (
            <div>
              <label className="text-sm font-medium mb-3 block">Severity</label>
              <div className="grid grid-cols-3 gap-2">
                {['low', 'medium', 'high'].map((severity) => (
                  <Button
                    key={severity}
                    variant={currentItem.severity === severity ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "h-12",
                      severity === 'low' && "border-blue-500 text-blue-600",
                      severity === 'medium' && "border-yellow-500 text-yellow-600",
                      severity === 'high' && "border-red-500 text-red-600"
                    )}
                    onClick={() => updateItem({ severity: severity as any })}
                  >
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Voice Notes */}
          <div>
            <label className="text-sm font-medium mb-3 block">Voice Notes</label>
            <div className="flex gap-2 mb-3">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="lg"
                className="h-14 flex-1"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-5 w-5 mr-2" />
                    Stop ({recordingTime}s)
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5 mr-2" />
                    Record
                  </>
                )}
              </Button>
            </div>

            {/* Voice Notes List */}
            {voiceNotes.length > 0 && (
              <div className="space-y-2">
                {voiceNotes.map((note) => (
                  <div key={note.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => playVoiceNote(note)}
                      disabled={playingNote === note.id}
                    >
                      {playingNote === note.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1 text-sm">
                      <p>Voice note ({note.duration}s)</p>
                      <p className="text-xs text-muted-foreground">
                        {note.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVoiceNotes(prev => prev.filter(v => v.id !== note.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Text Notes */}
          <div>
            <label className="text-sm font-medium mb-2 block">Text Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                updateItem({ notes: e.target.value });
              }}
              placeholder="Add detailed notes about this inspection item..."
              className="min-h-[100px] text-base"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-sm border-t">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-14 flex-1"
            onClick={goToPrevious}
            disabled={currentItemIndex === 0}
          >
            Previous
          </Button>
          
          <Button
            size="lg"
            className="h-14 flex-1"
            onClick={goToNext}
            disabled={currentItemIndex === inspectionItems.length - 1}
          >
            Next
          </Button>
        </div>

        {/* Quick Status Indicators */}
        <div className="flex justify-center gap-1 mt-3">
          {inspectionItems.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "w-3 h-3 rounded-full cursor-pointer",
                index === currentItemIndex && "ring-2 ring-primary",
                item.status === 'pass' && "bg-green-500",
                item.status === 'fail' && "bg-red-500",
                item.status === 'na' && "bg-gray-400",
                item.status === 'pending' && "bg-gray-200"
              )}
              onClick={() => {
                setCurrentItemIndex(index);
                setNotes(item.notes || '');
              }}
            />
          ))}
        </div>
      </div>

      {/* Overview Panel - Swipe up from bottom */}
      <InspectionOverview
        items={inspectionItems}
        onItemSelect={(index) => {
          setCurrentItemIndex(index);
          setNotes(inspectionItems[index].notes || '');
        }}
        currentIndex={currentItemIndex}
      />
    </div>
  );
}

// Inspection Overview Component
function InspectionOverview({
  items,
  onItemSelect,
  currentIndex
}: {
  items: InspectionItem[];
  onItemSelect: (index: number) => void;
  currentIndex: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        className="fixed top-4 right-4 z-20"
        onClick={() => setIsOpen(true)}
      >
        <FileText className="h-4 w-4 mr-2" />
        Overview
      </Button>

      {/* Overview Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Inspection Overview</h3>
                <Button variant="ghost" onClick={() => setIsOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="overflow-y-auto p-4 space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    index === currentIndex && "ring-2 ring-primary",
                    item.status === 'pass' && "bg-green-50 border-green-200",
                    item.status === 'fail' && "bg-red-50 border-red-200",
                    item.status === 'na' && "bg-gray-50 border-gray-200",
                    item.status === 'pending' && "bg-white"
                  )}
                  onClick={() => {
                    onItemSelect(index);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-1 text-xs">
                        {item.category}
                      </Badge>
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <div className="ml-2">
                      {item.status === 'pass' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {item.status === 'fail' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                      {item.status === 'na' && <X className="h-5 w-5 text-gray-400" />}
                      {item.status === 'pending' && <Clock className="h-5 w-5 text-gray-300" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}