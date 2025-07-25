import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Camera,
  Mic,
  MicOff,
  MapPin,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Phone,
  User,
  Building2,
  Key,
  Shield,
  Zap,
  Eye,
  FileText,
  Plus,
  X,
  Save,
  Play,
  Square,
  RotateCw,
  Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Deficiency {
  id: string;
  category: string;
  location: string;
  description: string;
  estimatedCost: number;
  severity: 'low' | 'medium' | 'high';
  photos: string[];
}

interface ProjectInfo {
  propertyName: string;
  address: string;
  roofArea: number;
  yearInstalled: number;
  roofSystem: string;
  propertyManager: {
    name: string;
    phone: string;
    email: string;
  };
  accessInfo: {
    location: string;
    requirements: string;
    safetyNotes: string;
  };
  criticalAreas: Array<{
    location: string;
    issue: string;
    severity: 'high' | 'medium' | 'low';
    estimatedCost: number;
  }>;
}

interface StreamlinedInspectionProps {
  projectInfo: ProjectInfo;
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export function StreamlinedInspectionInterface({
  projectInfo,
  onComplete,
  onCancel
}: StreamlinedInspectionProps) {
  const [currentView, setCurrentView] = useState<'briefing' | 'overview' | 'inspection' | 'summary'>('briefing');
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [batchPhotoMode, setBatchPhotoMode] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [startTime] = useState(new Date());
  const [currentDeficiencyDraft, setCurrentDeficiencyDraft] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer for recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Intelligent voice parsing for deficiencies
  const parseVoiceToDeficiency = (text: string): Deficiency | null => {
    const lowerText = text.toLowerCase();
    
    // Extract category
    let category = 'General Wear';
    if (lowerText.includes('elastomeric') || lowerText.includes('coating')) category = 'Membrane Failures';
    if (lowerText.includes('parapet') || lowerText.includes('wall')) category = 'Perimeter Flashing';
    if (lowerText.includes('drain') || lowerText.includes('gutter')) category = 'Gutters/Downspouts';
    if (lowerText.includes('penetration') || lowerText.includes('vent')) category = 'Penetration';
    if (lowerText.includes('equipment') || lowerText.includes('hvac')) category = 'Roof Top Equipment';
    if (lowerText.includes('membrane') || lowerText.includes('tear')) category = 'Membrane Failures';
    if (lowerText.includes('structural') || lowerText.includes('support')) category = 'Structural Issues';

    // Extract location
    let location = 'General area';
    const locationMatches = text.match(/(north|south|east|west|northwest|northeast|southwest|southeast|parapet|drain|corner|center|edge|perimeter)/i);
    if (locationMatches) {
      location = locationMatches[0];
    }

    // Estimate cost based on work description
    let estimatedCost = 500; // Base cost
    if (lowerText.includes('elastomeric coating')) estimatedCost = 3500;
    if (lowerText.includes('three course') || lowerText.includes('3 course')) estimatedCost *= 1.5;
    if (lowerText.includes('parapet')) estimatedCost += 1000;
    if (lowerText.includes('entire') || lowerText.includes('full')) estimatedCost *= 2;
    if (lowerText.includes('partial') || lowerText.includes('spot')) estimatedCost *= 0.7;

    // Determine severity
    let severity: 'low' | 'medium' | 'high' = 'medium';
    if (lowerText.includes('deteriorated') || lowerText.includes('failed') || lowerText.includes('urgent')) severity = 'high';
    if (lowerText.includes('minor') || lowerText.includes('small') || lowerText.includes('preventive')) severity = 'low';

    return {
      id: `def_${Date.now()}`,
      category,
      location,
      description: text,
      estimatedCost: Math.round(estimatedCost),
      severity,
      photos: []
    };
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        processVoiceRecording(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };

  const processVoiceRecording = async (blob: Blob) => {
    // In a real implementation, this would use speech-to-text API
    // For demo, we'll simulate with predefined responses
    const mockTranscriptions = [
      "Add deficiency for a three course elastomeric coating over deteriorated parapet wall joints",
      "Membrane failure at northwest corner needs immediate repair",
      "HVAC penetration sealant requires replacement",
      "Gutter cleaning and minor repair needed at south section"
    ];
    
    const transcription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
    
    if (currentView === 'inspection') {
      const deficiency = parseVoiceToDeficiency(transcription);
      if (deficiency) {
        setDeficiencies(prev => [...prev, deficiency]);
        setCurrentDeficiencyDraft('');
      }
    } else if (currentView === 'summary') {
      setExecutiveSummary(prev => prev + (prev ? ' ' : '') + transcription);
    }
  };

  const handleBatchPhoto = () => {
    if (batchPhotoMode) {
      // Quick capture without modal
      fileInputRef.current?.click();
    } else {
      setBatchPhotoMode(true);
      fileInputRef.current?.click();
    }
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newPhotos = files.map(file => URL.createObjectURL(file));
    setCapturedPhotos(prev => [...prev, ...newPhotos]);
    
    if (!batchPhotoMode) {
      // Single photo mode - exit after capture
    }
    
    event.target.value = ''; // Reset input
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalEstimatedCosts = () => {
    return deficiencies.reduce((sum, def) => sum + def.estimatedCost, 0);
  };

  // Briefing View - Show critical areas when starting inspection
  if (currentView === 'briefing') {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-red-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">⚡ Critical Focus Areas</h1>
              <p className="text-red-100 text-sm">Review before starting inspection</p>
            </div>
            <Button
              variant="ghost"
              onClick={onCancel}
              className="text-white hover:bg-red-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {projectInfo.criticalAreas.map((area, index) => (
            <Card key={index} className={cn(
              "border-l-4",
              area.severity === 'high' ? "border-l-red-500 bg-red-50" : 
              area.severity === 'medium' ? "border-l-yellow-500 bg-yellow-50" : 
              "border-l-blue-500 bg-blue-50"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={area.severity === 'high' ? 'destructive' : 'secondary'}>
                        {area.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        <DollarSign className="h-3 w-3 mr-1" />
                        ${area.estimatedCost.toLocaleString()}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg">{area.location}</h3>
                    <p className="text-muted-foreground">{area.issue}</p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Card className="border-green-200">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Ready to Begin?</h3>
              <p className="text-muted-foreground mb-4">
                Focus on these critical areas during your inspection
              </p>
              <Button 
                onClick={() => setCurrentView('overview')}
                className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Continue to Property Overview
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Project Overview
  if (currentView === 'overview') {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{projectInfo.propertyName}</h1>
              <p className="text-blue-100 text-sm">{projectInfo.address}</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => setCurrentView('briefing')}
              className="text-white hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{projectInfo.roofArea.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">sq ft</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{new Date().getFullYear() - projectInfo.yearInstalled}</p>
                <p className="text-sm text-muted-foreground">years old</p>
              </CardContent>
            </Card>
          </div>

          {/* Roof System */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Roof System</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{projectInfo.roofSystem}</p>
              <p className="text-sm text-muted-foreground">Installed: {projectInfo.yearInstalled}</p>
            </CardContent>
          </Card>

          {/* Property Manager */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Property Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{projectInfo.propertyManager.name}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => window.open(`tel:${projectInfo.propertyManager.phone}`)}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {projectInfo.propertyManager.phone}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Access Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5" />
                Roof Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">Location</p>
                <p className="text-muted-foreground">{projectInfo.accessInfo.location}</p>
              </div>
              <div>
                <p className="font-medium">Requirements</p>
                <p className="text-muted-foreground">{projectInfo.accessInfo.requirements}</p>
              </div>
              {projectInfo.accessInfo.safetyNotes && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Safety Notes</p>
                      <p className="text-sm text-yellow-700">{projectInfo.accessInfo.safetyNotes}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button 
            onClick={() => setCurrentView('inspection')}
            className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg"
          >
            <Camera className="h-5 w-5 mr-2" />
            Start Inspection
          </Button>
        </div>
      </div>
    );
  }

  // Main Inspection Interface
  if (currentView === 'inspection') {
    return (
      <div className="min-h-screen bg-background">
        {/* Compact Header */}
        <div className="sticky top-0 z-10 bg-green-600 text-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('overview')}
                className="text-white hover:bg-green-700"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-bold">{projectInfo.propertyName}</h1>
                <p className="text-xs opacity-90">{deficiencies.length} deficiencies • ${getTotalEstimatedCosts().toLocaleString()}</p>
              </div>
            </div>
            <Button
              onClick={() => setCurrentView('summary')}
              className="bg-green-700 hover:bg-green-800"
              size="sm"
            >
              Summary
            </Button>
          </div>
        </div>

        <div className="p-3 space-y-4">
          {/* Voice + Photo Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              className="h-16 flex-col gap-1"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            >
              {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              <span className="text-xs">
                {isRecording ? `Stop (${formatTime(recordingTime)})` : 'Voice Add Deficiency'}
              </span>
            </Button>
            
            <Button
              variant={batchPhotoMode ? "secondary" : "outline"}
              size="lg"
              className="h-16 flex-col gap-1"
              onClick={handleBatchPhoto}
            >
              <Camera className="h-6 w-6" />
              <span className="text-xs">
                {batchPhotoMode ? 'Batch Mode ON' : 'Take Photos'}
              </span>
            </Button>
          </div>

          {/* Batch Mode Indicator */}
          {batchPhotoMode && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Batch Mode: {capturedPhotos.length} photos
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBatchPhotoMode(false)}
                  >
                    Exit Batch
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Photos */}
          {capturedPhotos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent Photos ({capturedPhotos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 overflow-x-auto">
                  {capturedPhotos.slice(-4).map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Captured ${index}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deficiencies List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Deficiencies ({deficiencies.length})</span>
                <Badge variant="outline">
                  ${getTotalEstimatedCosts().toLocaleString()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deficiencies.length === 0 ? (
                <div className="text-center py-6">
                  <Mic className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Use voice to add your first deficiency</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Say: "Add deficiency for roof membrane tear at north corner"
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deficiencies.map((def) => (
                    <div key={def.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge className={cn(
                            "text-xs",
                            def.severity === 'high' ? "bg-red-100 text-red-800" :
                            def.severity === 'medium' ? "bg-yellow-100 text-yellow-800" :
                            "bg-green-100 text-green-800"
                          )}>
                            {def.severity.toUpperCase()}
                          </Badge>
                          <p className="font-medium mt-1">{def.location}</p>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          ${def.estimatedCost.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">{def.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{def.category}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handlePhotoCapture}
        />
      </div>
    );
  }

  // Summary View
  if (currentView === 'summary') {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Executive Summary</h1>
              <p className="text-blue-100 text-sm">Voice-to-text final report</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => setCurrentView('inspection')}
              className="text-white hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{deficiencies.length}</p>
                <p className="text-xs text-muted-foreground">Deficiencies</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{capturedPhotos.length}</p>
                <p className="text-xs text-muted-foreground">Photos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold">${getTotalEstimatedCosts().toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Cost</p>
              </CardContent>
            </Card>
          </div>

          {/* Voice Recording for Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Executive Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="lg"
                className="w-full h-14"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-5 w-5 mr-2" />
                    Stop Recording ({formatTime(recordingTime)})
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5 mr-2" />
                    Record Executive Summary
                  </>
                )}
              </Button>
              
              <Textarea
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
                placeholder="Executive summary will appear here from voice recording..."
                rows={6}
                className="text-base"
              />
            </CardContent>
          </Card>

          {/* Complete Inspection */}
          <Card className="border-green-200">
            <CardContent className="p-4">
              <Button
                onClick={() => onComplete({
                  propertyName: projectInfo.propertyName,
                  startTime,
                  endTime: new Date(),
                  deficiencies,
                  photos: capturedPhotos,
                  executiveSummary,
                  totalCost: getTotalEstimatedCosts()
                })}
                className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Complete Inspection
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}