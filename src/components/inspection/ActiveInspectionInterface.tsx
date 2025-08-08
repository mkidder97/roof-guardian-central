import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, 
  Plus, 
  MapPin, 
  FileText, 
  AlertTriangle,
  Image as ImageIcon,
  Trash2,
  Edit,
  Save,
  X,
  CheckCircle,
  Clock,
  DollarSign,
  Mic,
  ChevronLeft,
  ChevronRight,
  Layers,
  ClipboardList,
  FileBarChart,
  Workflow,
  Home,
  History,
  Sun,
  FolderOpen,
  Building2,
  Download,
  Shield,
  Zap,
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useInspectionAutosave } from "@/hooks/useInspectionAutosave";
import { ImmediateRepairModal } from "./ImmediateRepairModal";
import { RoofCompositionCapture } from "./RoofCompositionCapture";
import { MinimalInspectionChecklist } from "./MinimalInspectionChecklist";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { WorkflowDataExporter } from "./WorkflowDataExporter";
import { FloatingCameraButton } from "./FloatingCameraButton";
import type { CriticalityAnalysis } from '@/lib/CriticalIssueDetector';

interface Photo {
  id: string;
  url: string;
  file: File;
  type: 'overview' | 'deficiency';
  location?: string;
  timestamp: Date;
}

interface Deficiency {
  id: string;
  category: string;
  location: string;
  description: string;
  budgetAmount: number;
  photos: Photo[];
  severity: 'low' | 'medium' | 'high';
  status: 'identified' | 'documented' | 'resolved';
  // Critical issue management fields
  isImmediateRepair?: boolean;
  needsSupervisorAlert?: boolean;
  criticalityScore?: number;
  detectionTimestamp?: string;
}

interface CapitalExpense {
  id: string;
  description: string;
  year: number;
  estimatedCost: number;
  scopeOfWork: string;
  completed: boolean;
}

interface ActiveInspectionProps {
  propertyId: string;
  propertyName: string;
  onComplete: (inspectionData: any) => void;
  onCancel: () => void;
  onDataChange?: (data: any) => void;
}

const DEFICIENCY_CATEGORIES = [
  'Immediate Repair',
  'Perimeter Flashing',
  'Curb Flashing', 
  'Penetration',
  'Roof Top Equipment',
  'Gutters/Downspouts',
  'Roofing Drains',
  'Scuppers',
  'Debris',
  'Membrane Failures',
  'General Wear',
  'Structural Issues'
];

export function ActiveInspectionInterface({ 
  propertyId, 
  propertyName, 
  onComplete, 
  onCancel,
  onDataChange
}: ActiveInspectionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overviewFileInputRef = useRef<HTMLInputElement>(null);
  
  // Property data
  const selectedProperty = {
    id: propertyId,
    name: propertyName
  };
  
  // Inspection state
  const [currentTab, setCurrentTab] = useState('roof-summary');
  const [currentSubTab, setCurrentSubTab] = useState('overview');
  const [inspectionStarted, setInspectionStarted] = useState(false);
  
  // iPad-specific state
  const [isTablet, setIsTablet] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  // Detect tablet/iPad
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroidTablet = /Android/.test(userAgent) && !/Mobile/.test(userAgent);
      const isLargeScreen = window.innerWidth >= 768;
      setIsTablet(isIOS || isAndroidTablet || isLargeScreen);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Handle tab change to My Inspection
  useEffect(() => {
    if (currentTab === 'my-inspection' && !inspectionStarted) {
      setShowStartInspectionModal(true);
    }
  }, [currentTab, inspectionStarted]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showStartInspectionModal, setShowStartInspectionModal] = useState(false);
  const [showPreInspectionBriefing, setShowPreInspectionBriefing] = useState(false);
  const [criticalAreas, setCriticalAreas] = useState<any[]>([]);
  
  // Deficiencies
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([]);
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);
  const [editingDeficiency, setEditingDeficiency] = useState<Deficiency | null>(null);
  
  // Overview photos
  const [overviewPhotos, setOverviewPhotos] = useState<Photo[]>([]);
  
  // Notes and findings
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [roofSquareFootageConfirmed, setRoofSquareFootageConfirmed] = useState<boolean | null>(null);
  
  // Capital expenses
  const [capitalExpenses, setCapitalExpenses] = useState<CapitalExpense[]>([]);
  const [showCapitalExpenseModal, setShowCapitalExpenseModal] = useState(false);
  const [editingCapitalExpense, setEditingCapitalExpense] = useState<CapitalExpense | null>(null);
  
  // File management
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    name: string;
    type: 'warranty' | 'cad' | 'other';
    url: string;
    size: number;
    uploadedAt: Date;
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const warrantyFileInputRef = useRef<HTMLInputElement>(null);
  const cadFileInputRef = useRef<HTMLInputElement>(null);
  const otherFileInputRef = useRef<HTMLInputElement>(null);

  // New inspection components state
  const [roofCompositionData, setRoofCompositionData] = useState<any>({});
  const [checklistData, setChecklistData] = useState<any>({});
  const [executiveSummaryData, setExecutiveSummaryData] = useState<any>(null);
  
  // Critical issue management state
  const [showImmediateRepairModal, setShowImmediateRepairModal] = useState(false);
  const [selectedDeficiencyForRepair, setSelectedDeficiencyForRepair] = useState<Deficiency | null>(null);
  const [criticalAnalysisForRepair, setCriticalAnalysisForRepair] = useState<CriticalityAnalysis | null>(null);

  // New deficiency form
  const [newDeficiency, setNewDeficiency] = useState({
    category: '',
    location: '',
    description: '',
    budgetAmount: 0,
    severity: 'medium' as 'low' | 'medium' | 'high',
    photos: [] as { id: string; url: string; file: File }[]
  });

  // Get current inspection data for auto-save
  const currentInspectionData = {
    propertyId,
    propertyName,
    deficiencies,
    overviewPhotos,
    inspectionNotes,
    roofSquareFootageConfirmed,
    capitalExpenses,
    roofCompositionData,
    checklistData,
    executiveSummaryData,
    inspectionStarted,
    startTime,
    lastUpdated: new Date().toISOString()
  };

  // Handle critical issue detection
  const handleCriticalIssueDetected = useCallback((deficiency: Deficiency, analysis: CriticalityAnalysis) => {
    console.warn('🚨 Critical issue detected:', {
      location: deficiency.location,
      description: deficiency.description,
      score: analysis.score,
      urgency: analysis.urgencyLevel
    });

    // Show critical issue alert
    toast({
      title: "⚠️ Critical Issue Detected",
      description: `${analysis.urgencyLevel.toUpperCase()} issue found: ${deficiency.location}`,
      variant: analysis.isEmergency ? "destructive" : "default",
      duration: 8000,
    });
  }, [toast]);

  // Use autosave hook with critical detection enabled
  const { 
    sessionId, 
    forceSave, 
    criticalAlerts, 
    clearCriticalAlerts, 
    getCurrentCriticalIssues,
    hasCriticalIssues,
    criticalIssueCount
  } = useInspectionAutosave({
    propertyId,
    inspectionData: currentInspectionData,
    enabled: inspectionStarted,
    enableCriticalDetection: true,
    onCriticalIssueDetected: handleCriticalIssueDetected
  });

  // New capital expense form
  const [newCapitalExpense, setNewCapitalExpense] = useState({
    description: '',
    year: new Date().getFullYear() + 1,
    estimatedCost: 0,
    scopeOfWork: ''
  });

  // Initialize autosave hook for session management
  const inspectionData = {
    propertyId,
    propertyName,
    deficiencies,
    overviewPhotos,
    inspectionNotes,
    roofSquareFootageConfirmed,
    capitalExpenses,
    roofCompositionData,
    checklistData,
    executiveSummaryData,
    inspectionStarted,
    startTime,
    lastUpdated: new Date().toISOString()
  };
  
  const { loadSession } = useInspectionAutosave({
    propertyId,
    inspectionData,
    enabled: true
  });

  // Load existing session data on component mount
  useEffect(() => {
    const loadExistingSession = async () => {
      try {
        const sessionData = await loadSession();
        if (sessionData) {
          console.log('🔄 Loading existing inspection session data:', sessionData);
          
          // Initialize all state with session data
          if (sessionData.deficiencies) setDeficiencies(sessionData.deficiencies);
          if (sessionData.overviewPhotos) {
            // Ensure timestamps are Date objects
            const photosWithDateTimestamps = sessionData.overviewPhotos.map(photo => ({
              ...photo,
              timestamp: typeof photo.timestamp === 'string' ? new Date(photo.timestamp) : photo.timestamp
            }));
            setOverviewPhotos(photosWithDateTimestamps);
          }
          if (sessionData.inspectionNotes) setInspectionNotes(sessionData.inspectionNotes);
          if (sessionData.roofSquareFootageConfirmed !== undefined) {
            setRoofSquareFootageConfirmed(sessionData.roofSquareFootageConfirmed);
          }
          if (sessionData.capitalExpenses) setCapitalExpenses(sessionData.capitalExpenses);
          if (sessionData.roofCompositionData) setRoofCompositionData(sessionData.roofCompositionData);
          if (sessionData.checklistData) setChecklistData(sessionData.checklistData);
          if (sessionData.executiveSummaryData) setExecutiveSummaryData(sessionData.executiveSummaryData);
          if (sessionData.inspectionStarted !== undefined) setInspectionStarted(sessionData.inspectionStarted);
          if (sessionData.startTime) setStartTime(new Date(sessionData.startTime));
          
          console.log('✅ Session data loaded successfully');
        }
      } catch (error) {
        console.error('❌ Error loading session data:', error);
      }
    };
    
    // Load session data when property changes
    loadExistingSession();
  }, [propertyId, loadSession]); // Load when property changes

  // Auto-save inspection data whenever it changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange(inspectionData);
    }
  }, [
    inspectionData,
    onDataChange
  ]);

  useEffect(() => {
    if (!inspectionStarted) {
      setStartTime(new Date());
      setInspectionStarted(true);
    }
  }, [inspectionStarted]);

  const handleCameraCapture = (type: 'overview' | 'deficiency') => {
    const fileInput = type === 'overview' ? overviewFileInputRef : fileInputRef;
    fileInput.current?.click();
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>, type: 'overview' | 'deficiency') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const photo: Photo = {
          id: `photo-${Date.now()}-${Math.random()}`,
          url,
          file,
          type,
          timestamp: new Date()
        };

        if (type === 'overview') {
          setOverviewPhotos(prev => [...prev, photo]);
        } else {
          // For deficiency photos, we'll add them when creating the deficiency
          console.log('Deficiency photo captured, will be added to deficiency');
        }
      }
    });

    // Reset file input
    event.target.value = '';
  };

  // Helper function to upload photos to Supabase
  const uploadPhotosToStorage = async (photos: { id: string; url: string; file: File }[], folder: string) => {
    return Promise.all(
      photos.map(async (photo) => {
        try {
          const fileName = `${selectedProperty?.id}/${folder}/${Date.now()}-${photo.file.name}`;
          const { data, error } = await supabase.storage
            .from('inspection-photos')
            .upload(fileName, photo.file);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('inspection-photos')
            .getPublicUrl(fileName);

          return {
            id: photo.id,
            url: publicUrl,
            fileName: photo.file.name,
            size: photo.file.size,
            uploadedAt: new Date().toISOString()
          };
        } catch (error) {
          console.error('Error uploading photo:', error);
          return {
            id: photo.id,
            url: photo.url, // Keep local URL as fallback
            fileName: photo.file.name,
            size: photo.file.size,
            uploadedAt: new Date().toISOString(),
            error: 'Upload failed'
          };
        }
      })
    );
  };

  // Enhanced photo capture handler for FloatingCameraButton
  const handleFloatingCameraCapture = async (files: File[], type: 'overview' | 'deficiency') => {
    const photos: Photo[] = files.map(file => ({
      id: `photo-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file,
      type,
      timestamp: new Date()
    }));

    if (type === 'overview') {
      setIsUploading(true);
      try {
        // Upload overview photos immediately to storage
        const uploadedPhotos = await uploadPhotosToStorage(
          photos.map(p => ({ id: p.id, url: p.url, file: p.file })), 
          'overview'
        );
        
        const enhancedPhotos = photos.map((photo, index) => ({
          ...photo,
          url: uploadedPhotos[index].url,
          uploaded: !uploadedPhotos[index].error
        }));

        setOverviewPhotos(prev => [...prev, ...enhancedPhotos]);
        toast({
          title: "Overview Photos Added",
          description: `${photos.length} photo${photos.length > 1 ? 's' : ''} uploaded successfully`,
        });
      } catch (error) {
        console.error('Overview photo upload error:', error);
        setOverviewPhotos(prev => [...prev, ...photos]);
        toast({
          title: "Photos Added Locally",
          description: "Photos saved locally. Upload will be retried later.",
          variant: "destructive"
        });
      } finally {
        setIsUploading(false);
      }
    } else {
      // For deficiency photos, open deficiency creation modal with photos pre-loaded
      setNewDeficiency(prev => ({ 
        ...prev, 
        photos: photos.map(p => ({ id: p.id, url: p.url, file: p.file }))
      }));
      setShowDeficiencyModal(true);
      
      toast({
        title: "Deficiency Photos Captured",
        description: "Photos ready for deficiency creation",
      });
    }
  };

  const handleCreateDeficiency = async () => {
    if (!newDeficiency.category || !newDeficiency.location) {
      toast({
        title: "Missing Information",
        description: "Please select a category and specify location",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload photos to Supabase storage if any
      const uploadedPhotos = newDeficiency.photos.length > 0 
        ? await uploadPhotosToStorage(newDeficiency.photos, 'deficiencies')
        : [];

      const deficiency: Deficiency = {
        id: `def-${Date.now()}`,
        category: newDeficiency.category,
        location: newDeficiency.location,
        description: newDeficiency.description,
        budgetAmount: newDeficiency.budgetAmount,
        photos: uploadedPhotos.map(photo => ({
          ...photo,
          file: new File([], photo.fileName),
          type: 'deficiency' as const,
          timestamp: new Date(photo.uploadedAt)
        })),
        severity: newDeficiency.severity,
        status: 'identified'
      };

      setDeficiencies(prev => [...prev, deficiency]);

      // If "Immediate Repair" category is selected, automatically send email notification
      if (newDeficiency.category === 'Immediate Repair') {
        try {
          // Call edge function to send immediate repair email
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-immediate-repair-email', {
            body: {
              propertyId,
              propertyName,
              deficiency: {
                location: deficiency.location,
                description: deficiency.description,
                budgetAmount: deficiency.budgetAmount,
                severity: deficiency.severity,
                photos: uploadedPhotos
              },
              inspectorEmail: (await supabase.auth.getUser()).data.user?.email,
              timestamp: new Date().toISOString()
            }
          });

          if (emailError) {
            console.error('Error sending immediate repair email:', emailError);
            toast({
              title: "Email Warning",
              description: "Immediate repair created but email notification failed",
              variant: "destructive"
            });
          } else {
            toast({
              title: "🚨 Immediate Repair Email Sent",
              description: "Emergency repair team has been notified automatically",
              variant: "default"
            });
          }
        } catch (emailError) {
          console.error('Error with immediate repair email:', emailError);
          toast({
            title: "Email Warning", 
            description: "Repair team notification may have failed",
            variant: "destructive"
          });
        }
      }

      setNewDeficiency({
        category: '',
        location: '',
        description: '',
        budgetAmount: 0,
        severity: 'medium',
        photos: []
      });
      setShowDeficiencyModal(false);

      toast({
        title: newDeficiency.category === 'Immediate Repair' ? "🚨 Immediate Repair Created" : "Deficiency Created",
        description: newDeficiency.category === 'Immediate Repair' 
          ? "Emergency repair request submitted and team notified"
          : `${uploadedPhotos.length > 0 ? `Created with ${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? 's' : ''}` : 'Created successfully'}`,
      });
    } catch (error) {
      console.error('Error creating deficiency:', error);
      toast({
        title: "Error",
        description: "Failed to create deficiency. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddCapitalExpense = () => {
    if (!newCapitalExpense.description || newCapitalExpense.estimatedCost <= 0) {
      toast({
        title: "Missing Information", 
        description: "Please provide description and cost estimate",
        variant: "destructive"
      });
      return;
    }

    const expense: CapitalExpense = {
      id: `cap-${Date.now()}`,
      description: newCapitalExpense.description,
      year: newCapitalExpense.year,
      estimatedCost: newCapitalExpense.estimatedCost,
      scopeOfWork: newCapitalExpense.scopeOfWork,
      completed: false
    };

    setCapitalExpenses(prev => [...prev, expense]);
    setNewCapitalExpense({
      description: '',
      year: new Date().getFullYear() + 1,
      estimatedCost: 0,
      scopeOfWork: ''
    });
    setShowCapitalExpenseModal(false);

    toast({
      title: "Capital Expense Added",
      description: `$${expense.estimatedCost.toLocaleString()} expense documented`,
    });
  };

  // Handle immediate repair request creation
  const handleCreateImmediateRepair = useCallback((deficiency: Deficiency, analysis?: CriticalityAnalysis) => {
    setSelectedDeficiencyForRepair(deficiency);
    setCriticalAnalysisForRepair(analysis || null);
    setShowImmediateRepairModal(true);
  }, []);

  // Handle immediate repair completion
  const handleImmediateRepairCreated = useCallback((repair: any) => {
    toast({
      title: "Immediate Repair Created",
      description: `${repair.urgency.toUpperCase()} repair request created for ${repair.property_name}`,
      variant: repair.urgency === 'emergency' ? "destructive" : "default"
    });

    // Clear critical alerts related to this deficiency if resolved
    if (selectedDeficiencyForRepair && criticalAlerts.length > 0) {
      const alertsToKeep = criticalAlerts.filter(
        alert => alert.deficiency.id !== selectedDeficiencyForRepair.id
      );
      if (alertsToKeep.length < criticalAlerts.length) {
        clearCriticalAlerts();
        // Re-add remaining alerts if any
        // Note: This is simplified - a real implementation might be more sophisticated
      }
    }

    setSelectedDeficiencyForRepair(null);
    setCriticalAnalysisForRepair(null);
  }, [selectedDeficiencyForRepair, criticalAlerts, clearCriticalAlerts, toast]);

  // Get critical status for a deficiency
  const getDeficiencyCriticalStatus = useCallback((deficiency: Deficiency) => {
    if (deficiency.isImmediateRepair) return 'immediate';
    if (deficiency.needsSupervisorAlert) return 'supervisor';
    if (deficiency.criticalityScore && deficiency.criticalityScore >= 60) return 'critical';
    return 'normal';
  }, []);

  // Get critical alert for a specific deficiency
  const getCriticalAlertForDeficiency = useCallback((deficiency: Deficiency) => {
    return criticalAlerts.find(alert => alert.deficiency.id === deficiency.id);
  }, [criticalAlerts]);

  // File upload functions
  const handleFileUpload = async (files: FileList | null, type: 'warranty' | 'cad' | 'other') => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileName = `${propertyId}/${type}/${Date.now()}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from('inspection-files')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('inspection-files')
          .getPublicUrl(fileName);
          
        return {
          id: `file-${Date.now()}-${Math.random()}`,
          name: file.name,
          type,
          url: publicUrl,
          size: file.size,
          uploadedAt: new Date()
        };
      });
      
      const uploadedFiles = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...uploadedFiles]);
      
      toast({
        title: "Files Uploaded",
        description: `${uploadedFiles.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    toast({
      title: "File Deleted",
      description: "File removed from inspection",
    });
  };

  const handleStartInspection = () => {
    setShowStartInspectionModal(false);
    setShowPreInspectionBriefing(true);
    // Fetch critical areas here if needed
    fetchCriticalAreas();
  };

  const handleBeginInspection = () => {
    setShowPreInspectionBriefing(false);
    setInspectionStarted(true);
    setStartTime(new Date());
    setCurrentSubTab('deficiencies'); // Default to deficiencies tab
  };

  const fetchCriticalAreas = async () => {
    // Sample critical areas for demo
    const sampleCriticalAreas = [
      {
        location: "Northwest corner",
        severity: "high",
        issueType: "Recurring leak potential",
        description: "Historical pattern suggests vulnerability in this area during heavy rain",
        estimatedCost: 12500,
        lastReported: "2024-10-15"
      },
      {
        location: "HVAC penetrations",
        severity: "medium", 
        issueType: "Sealant degradation",
        description: "Typical wear pattern for this roof age and type",
        estimatedCost: 3500,
        lastReported: "2024-09-20"
      }
    ];
    setCriticalAreas(sampleCriticalAreas);
  };

  const handleCompleteInspection = async () => {
    if (deficiencies.length === 0 && overviewPhotos.length === 0) {
      toast({
        title: "Incomplete Inspection",
        description: "Please add at least some photos or deficiencies",
        variant: "destructive"
      });
      return;
    }

    try {
      // Ensure we have a session before completion
      let currentSessionId = sessionId;
      
      if (!currentSessionId) {
        console.log('No session found, creating one before completion...');
        const session = await forceSave();
        if (!session) {
          throw new Error('Failed to create inspection session');
        }
        currentSessionId = session.id;
        console.log('Session created with ID:', currentSessionId);
      }

      if (!currentSessionId) {
        throw new Error('Unable to create or retrieve session ID for completion');
      }

      // Prepare photos for processing
      const photos = overviewPhotos.map(photo => ({
        url: photo.url,
        type: photo.type,
        caption: photo.location || '',
        timestamp: photo.timestamp instanceof Date 
          ? photo.timestamp.toISOString() 
          : typeof photo.timestamp === 'string' 
            ? photo.timestamp 
            : new Date().toISOString()
      }));

      console.log('Processing completion with session ID:', currentSessionId);

      // Call the edge function to process completion
      const { data, error } = await supabase.functions.invoke('process-inspection-completion', {
        body: {
          sessionId: currentSessionId,
          finalNotes: inspectionNotes,
          photos
        }
      });

      if (error) throw error;

      toast({
        title: "Inspection Submitted",
        description: "Your inspection has been submitted for review and will be processed by the review team",
      });

      // Call the original completion handler
      const inspectionData = {
        propertyId,
        propertyName,
        startTime,
        endTime: new Date(),
        deficiencies,
        overviewPhotos,
        capitalExpenses,
        inspectionNotes,
        roofSquareFootageConfirmed,
        roofCompositionData,
        checklistData,
        executiveSummaryData,
        summary: {
          totalDeficiencies: deficiencies.length,
          highSeverityCount: deficiencies.filter(d => d.severity === 'high').length,
          totalCapitalExpenses: capitalExpenses.reduce((sum, exp) => sum + exp.estimatedCost, 0),
          overviewPhotoCount: overviewPhotos.length
        }
      };

      onComplete(inspectionData);

    } catch (error) {
      console.error('Error completing inspection:', error);
      
      let errorMessage = "Failed to complete inspection. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('Session not found')) {
          errorMessage = "Session expired or not found. Please restart the inspection.";
        } else if (error.message.includes('Failed to create inspection session')) {
          errorMessage = "Unable to save inspection data. Check your connection and try again.";
        } else if (error.message.includes('session ID')) {
          errorMessage = "Could not create session for completion. Please try again.";
        } else if (error.message.includes('authentication')) {
          errorMessage = "Authentication error. Please log in again.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast({
        title: "Completion Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'deficiencies': return deficiencies.length;
      case 'overview': return overviewPhotos.length;
      case 'notes': return inspectionNotes.length > 0 ? 1 : 0;
      case 'files': return capitalExpenses.length;
      default: return 0;
    }
  };

  // iPad-specific touch and swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX || !touchEndX) return;
    
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    const tabs = ['deficiencies', 'overview', 'notes', 'files'];
    const currentIndex = tabs.indexOf(currentTab);
    
    if (isLeftSwipe && currentIndex < tabs.length - 1) {
      setCurrentTab(tabs[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      setCurrentTab(tabs[currentIndex - 1]);
    }
  }, [touchStartX, touchEndX, currentTab]);

  // Voice-to-text functionality for iPad
  const startVoiceRecording = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Voice Recognition Unavailable",
        description: "Voice input is not supported on this device",
        variant: "destructive"
      });
      return;
    }

    setIsVoiceRecording(true);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInspectionNotes(prev => prev + (prev ? ' ' : '') + transcript);
      setIsVoiceRecording(false);
    };

    recognition.onerror = () => {
      setIsVoiceRecording(false);
      toast({
        title: "Voice Recognition Error",
        description: "Could not capture voice input",
        variant: "destructive"
      });
    };

    recognition.onend = () => {
      setIsVoiceRecording(false);
    };

    recognition.start();
  }, [toast]);

  // Enhanced camera capture for iPad
  const handleEnhancedCameraCapture = useCallback(async (type: 'overview' | 'deficiency') => {
    try {
      // For iPad, try to access the camera directly
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', // Use back camera
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        });
        
        // Create video element for preview (would need full implementation)
        toast({
          title: "Camera Ready",
          description: "Enhanced camera capture for iPad field use"
        });
        
        // Stop the stream for now (full implementation would show camera preview)
        stream.getTracks().forEach(track => track.stop());
        
        // Fall back to file input for now
        handleCameraCapture(type);
      } else {
        handleCameraCapture(type);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      handleCameraCapture(type);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-bold truncate">{propertyName}</h1>
            <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm opacity-90">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                {startTime && (
                  <span className="hidden sm:inline">Started: {startTime.toLocaleTimeString()}</span>
                )}
              </div>
              <Badge variant="secondary" className="bg-blue-500 text-xs">
                Active Inspection
              </Badge>
              {/* Critical Issue Counter */}
              {hasCriticalIssues && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {criticalIssueCount} Critical
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1 md:gap-2 ml-2">
            <Button 
              variant="outline" 
              onClick={onCancel} 
              size="sm"
              className="text-blue-600 border-white hover:bg-blue-50 text-xs md:text-sm"
            >
              ← Back
            </Button>
            <Button 
              onClick={handleCompleteInspection} 
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-xs md:text-sm"
            >
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Complete
            </Button>
          </div>
        </div>
      </div>

      {/* Critical Issues Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 p-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-red-800 mb-1">
                  🚨 {criticalAlerts.length} Critical Issue{criticalAlerts.length > 1 ? 's' : ''} Detected
                </h3>
                <div className="space-y-1">
                  {criticalAlerts.slice(0, 2).map((alert, index) => (
                    <p key={index} className="text-xs text-red-700">
                      • {alert.deficiency.location}: {alert.analysis.urgencyLevel.toUpperCase()} (Score: {alert.analysis.score})
                    </p>
                  ))}
                  {criticalAlerts.length > 2 && (
                    <p className="text-xs text-red-600 font-medium">
                      +{criticalAlerts.length - 2} more critical issue{criticalAlerts.length > 3 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCriticalAlerts}
                className="text-red-600 border-red-300 hover:bg-red-100 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-2 md:p-4">
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              {/* Main Tabs - RoofController Style */}
              <TabsList className={`w-full ${isTablet ? 'h-16' : 'h-12 md:h-14'} bg-gray-100 rounded-none border-b`}>
                <TabsTrigger value="roof-summary" className={`flex items-center gap-1 md:gap-2 ${isTablet ? 'px-8 py-4 text-lg font-medium' : 'px-6 py-3 text-base font-medium'} whitespace-nowrap min-h-[44px]`}>
                  <Home className={isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
                  <span>Roof Summary</span>
                </TabsTrigger>
                <TabsTrigger value="my-inspection" className={`flex items-center gap-1 md:gap-2 ${isTablet ? 'px-8 py-4 text-lg font-medium' : 'px-6 py-3 text-base font-medium'} whitespace-nowrap min-h-[44px]`}>
                  <ClipboardList className={isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
                  <span>My Inspection</span>
                  {(deficiencies.length > 0 || overviewPhotos.length > 0 || inspectionNotes) && (
                    <Badge variant="default" className="ml-2">
                      {deficiencies.length + overviewPhotos.length + (inspectionNotes ? 1 : 0)}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Roof Summary Tab */}
              <TabsContent value="roof-summary" className="p-0">
                <Tabs value={currentSubTab} onValueChange={setCurrentSubTab}>
                  <TabsList className={`w-full ${isTablet ? 'h-14' : 'h-10 md:h-12'} bg-muted/50 rounded-none border-b overflow-x-auto flex-nowrap`}>
                    <TabsTrigger value="overview" className={`flex items-center gap-1 md:gap-2 ${isTablet ? 'px-6 py-3 text-base' : 'px-3 md:px-4 text-xs md:text-sm'} whitespace-nowrap`}>
                      <Building2 className={isTablet ? 'h-5 w-5' : 'h-3 w-3 md:h-4 md:w-4'} />
                      <span>Overview</span>
                    </TabsTrigger>
                    <TabsTrigger value="repair-history" className={`flex items-center gap-1 md:gap-2 ${isTablet ? 'px-6 py-3 text-base' : 'px-3 md:px-4 text-xs md:text-sm'} whitespace-nowrap`}>
                      <History className={isTablet ? 'h-5 w-5' : 'h-3 w-3 md:h-4 md:w-4'} />
                      <span>Repair History</span>
                    </TabsTrigger>
                    <TabsTrigger value="roof-assembly" className={`flex items-center gap-1 md:gap-2 ${isTablet ? 'px-6 py-3 text-base' : 'px-3 md:px-4 text-xs md:text-sm'} whitespace-nowrap`}>
                      <Layers className={isTablet ? 'h-5 w-5' : 'h-3 w-3 md:h-4 md:w-4'} />
                      <span>Roof Assembly</span>
                    </TabsTrigger>
                    <TabsTrigger value="daylight" className={`flex items-center gap-1 md:gap-2 ${isTablet ? 'px-6 py-3 text-base' : 'px-3 md:px-4 text-xs md:text-sm'} whitespace-nowrap`}>
                      <Sun className={isTablet ? 'h-5 w-5' : 'h-3 w-3 md:h-4 md:w-4'} />
                      <span>Daylight</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Sub-tab */}
                  <TabsContent value="overview" className={`${isTablet ? 'p-6' : 'p-3 md:p-6'}`}>
                    <div className="space-y-6">
                      <div>
                        <h2 className={`font-semibold mb-4 ${isTablet ? 'text-xl' : 'text-lg'}`}>Property Overview</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className={isTablet ? 'text-lg' : 'text-base'}>Property Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <p className="text-muted-foreground text-sm">Property Name</p>
                                <p className="font-medium">{propertyName}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-sm">Inspection Date</p>
                                <p className="font-medium">{new Date().toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-sm">Square Footage Confirmed</p>
                                <p className="font-medium">
                                  {roofSquareFootageConfirmed === true ? 'Yes' : 
                                   roofSquareFootageConfirmed === false ? 'No' : 'Not confirmed'}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader>
                              <CardTitle className={isTablet ? 'text-lg' : 'text-base'}>Inspection Progress</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Deficiencies</span>
                                <Badge variant="secondary">{deficiencies.length}</Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Overview Photos</span>
                                <Badge variant="secondary">{overviewPhotos.length}</Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Checklist Progress</span>
                                <Badge variant="secondary">{checklistData.completionPercentage || 0}%</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Repair History Sub-tab */}
                  <TabsContent value="repair-history" className={`${isTablet ? 'p-6' : 'p-3 md:p-6'}`}>
                    <div className="space-y-6">
                      <h2 className={`font-semibold mb-4 ${isTablet ? 'text-xl' : 'text-lg'}`}>Repair History</h2>
                      <Card>
                        <CardContent className="p-6 text-center">
                          <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">
                            Repair history will be populated from previous inspection data and work orders.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Roof Assembly Sub-tab */}
                  <TabsContent value="roof-assembly" className={`${isTablet ? 'p-6' : 'p-3 md:p-6'}`}>
                    <div className="space-y-6">
                      <h2 className={`font-semibold mb-4 ${isTablet ? 'text-xl' : 'text-lg'}`}>Roof Assembly</h2>
                      <RoofCompositionCapture
                        initialData={roofCompositionData}
                        onDataChange={setRoofCompositionData}
                        isTablet={isTablet}
                      />
                    </div>
                  </TabsContent>

                  {/* Daylight Sub-tab */}
                  <TabsContent value="daylight" className={`${isTablet ? 'p-6' : 'p-3 md:p-6'}`}>
                    <div className="space-y-6">
                      <h2 className={`font-semibold mb-4 ${isTablet ? 'text-xl' : 'text-lg'}`}>Daylight & Solar</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Sun className="h-5 w-5" />
                              Solar Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <p className="text-muted-foreground text-sm mb-2">Has Solar Installation?</p>
                                <Badge variant={checklistData.hasSolar === 'YES' ? 'default' : 'secondary'}>
                                  {checklistData.hasSolar || 'Not specified'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Sun className="h-5 w-5" />
                              Daylighting Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <p className="text-muted-foreground text-sm mb-2">Has Daylighting?</p>
                                <Badge variant={checklistData.hasDaylighting === 'YES' ? 'default' : 'secondary'}>
                                  {checklistData.hasDaylighting || 'Not specified'}
                                </Badge>
                              </div>
                              {checklistData.hasDaylighting === 'YES' && checklistData.daylightFactor && (
                                <div>
                                  <p className="text-muted-foreground text-sm mb-2">Daylight Factor</p>
                                  <p className="font-medium">{checklistData.daylightFactor}%</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* My Inspection Tab */}
              <TabsContent value="my-inspection" className="p-0">
                <Tabs value={currentSubTab} onValueChange={setCurrentSubTab}>
                  <TabsList className={`w-full ${isTablet ? 'h-14' : 'h-10 md:h-12'} bg-muted/50 rounded-none border-b overflow-x-auto flex-nowrap`}>
                    <TabsTrigger value="deficiencies" className={`flex items-center gap-1 md:gap-2 ${isTablet ? 'px-6 py-3 text-base' : 'px-3 md:px-4 text-xs md:text-sm'} whitespace-nowrap`}>
                      <AlertTriangle className={isTablet ? 'h-5 w-5' : 'h-3 w-3 md:h-4 md:w-4'} />
                      <span>Deficiencies</span>
                      {deficiencies.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">{deficiencies.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="overview-photos" className={`flex items-center gap-1 md:gap-2 ${isTablet ? 'px-6 py-3 text-base' : 'px-3 md:px-4 text-xs md:text-sm'} whitespace-nowrap`}>
                      <ImageIcon className={isTablet ? 'h-5 w-5' : 'h-3 w-3 md:h-4 md:w-4'} />
                      <span>Overview Photos</span>
                      {overviewPhotos.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">{overviewPhotos.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="notes" className={`flex items-center gap-1 md:gap-2 ${isTablet ? 'px-6 py-3 text-base' : 'px-3 md:px-4 text-xs md:text-sm'} whitespace-nowrap`}>
                      <FileText className={isTablet ? 'h-5 w-5' : 'h-3 w-3 md:h-4 md:w-4'} />
                      <span>Notes</span>
                    </TabsTrigger>
                    <TabsTrigger value="files" className={`flex items-center gap-1 md:gap-2 ${isTablet ? 'px-6 py-3 text-base' : 'px-3 md:px-4 text-xs md:text-sm'} whitespace-nowrap`}>
                      <FolderOpen className={isTablet ? 'h-5 w-5' : 'h-3 w-3 md:h-4 md:w-4'} />
                      <span>Files</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Deficiencies Sub-tab - All sections in one scrollable page */}
                  <TabsContent value="deficiencies" className={`${isTablet ? 'p-6' : 'p-3 md:p-6'} space-y-8`}>
                    {/* Deficiencies Section */}
                    <section>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                        <h3 className="text-lg font-semibold">Roof Deficiencies</h3>
                        <Button 
                          onClick={() => setShowDeficiencyModal(true)}
                          className="w-full sm:w-auto"
                          size={isTablet ? "lg" : "default"}
                        >
                          <Plus className={`${isTablet ? 'h-5 w-5' : 'h-4 w-4'} mr-2`} />
                          Add New Deficiency
                        </Button>
                      </div>

                      {deficiencies.length === 0 ? (
                        <Card className="p-8 text-center">
                          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Deficiencies Documented</h3>
                          <p className="text-gray-600 mb-4">Start by adding deficiencies found during your inspection.</p>
                          <Button onClick={() => setShowDeficiencyModal(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Deficiency
                          </Button>
                        </Card>
                      ) : (
                        <div className="grid gap-4">
                          {deficiencies.map((deficiency) => {
                            const criticalStatus = getDeficiencyCriticalStatus(deficiency);
                            const criticalAlert = getCriticalAlertForDeficiency(deficiency);
                            const isCritical = criticalStatus !== 'normal';
                            
                            return (
                              <Card 
                                key={deficiency.id} 
                                className={`p-4 ${isCritical ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <Badge className={getSeverityColor(deficiency.severity)}>
                                        {deficiency.severity.toUpperCase()}
                                      </Badge>
                                      <Badge variant="outline">{deficiency.category}</Badge>
                                      
                                      {/* Critical Issue Indicators */}
                                      {deficiency.isImmediateRepair && (
                                        <Badge variant="destructive" className="bg-red-600">
                                          <Zap className="h-3 w-3 mr-1" />
                                          IMMEDIATE REPAIR
                                        </Badge>
                                      )}
                                      {deficiency.needsSupervisorAlert && !deficiency.isImmediateRepair && (
                                        <Badge variant="destructive" className="bg-orange-600">
                                          <Shield className="h-3 w-3 mr-1" />
                                          SUPERVISOR ALERT
                                        </Badge>
                                      )}
                                      {deficiency.criticalityScore && deficiency.criticalityScore >= 60 && !deficiency.needsSupervisorAlert && (
                                        <Badge variant="secondary" className="bg-yellow-600 text-white">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          HIGH RISK ({deficiency.criticalityScore})
                                        </Badge>
                                      )}
                                    </div>

                                    <h3 className="font-semibold">{deficiency.location}</h3>
                                    {deficiency.description && (
                                      <p className="text-gray-600 mt-1">{deficiency.description}</p>
                                    )}
                                    {deficiency.budgetAmount > 0 && (
                                      <p className="text-sm text-green-600 mt-1">
                                        Budget: ${deficiency.budgetAmount.toLocaleString()}
                                      </p>
                                    )}

                                    {/* Critical Issue Analysis Display */}
                                    {criticalAlert && (
                                      <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
                                        <div className="flex items-start gap-2">
                                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                          <div>
                                            <p className="text-sm font-semibold text-red-800">
                                              Critical Analysis: {criticalAlert.analysis.urgencyLevel.toUpperCase()} (Score: {criticalAlert.analysis.score}/100)
                                            </p>
                                            <p className="text-xs text-red-700 mt-1">
                                              Keywords: {criticalAlert.analysis.triggeredKeywords.slice(0, 3).join(', ')}
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                              {criticalAlert.analysis.riskFactors.safety && (
                                                <Badge variant="destructive" className="text-xs">Safety Risk</Badge>
                                              )}
                                              {criticalAlert.analysis.riskFactors.structural && (
                                                <Badge variant="destructive" className="text-xs">Structural Risk</Badge>
                                              )}
                                              {criticalAlert.analysis.riskFactors.weatherExposure && (
                                                <Badge variant="secondary" className="text-xs">Weather Risk</Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-2 ml-4">
                                    {/* Immediate Repair Button */}
                                    {isCritical && (
                                      <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => handleCreateImmediateRepair(deficiency, criticalAlert?.analysis)}
                                        className="whitespace-nowrap"
                                      >
                                        <Phone className="h-3 w-3 mr-1" />
                                        {deficiency.isImmediateRepair ? 'Emergency Repair' : 'Escalate'}
                                      </Button>
                                    )}
                                    
                                    <div className="flex gap-2">
                                      <Button variant="outline" size="sm">
                                        <Camera className="h-4 w-4" />
                                      </Button>
                                      <Button variant="outline" size="sm">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {/* Capital Expenses Section */}
                    <section>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                        <h3 className="text-lg font-semibold">Capital Expenses</h3>
                        <Button 
                          onClick={() => setShowCapitalExpenseModal(true)}
                          size={isTablet ? "lg" : "default"}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Capital Expense
                        </Button>
                      </div>

                      {capitalExpenses.length === 0 ? (
                        <Card className="p-8 text-center">
                          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Capital Expenses Planned</h3>
                          <p className="text-gray-600 mb-4">Add future capital expenses for budget planning.</p>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {capitalExpenses.map((expense) => (
                            <Card key={expense.id} className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-semibold">{expense.description}</h3>
                                  <p className="text-sm text-gray-600 mt-1">{expense.scopeOfWork}</p>
                                  <div className="flex items-center gap-4 mt-2">
                                    <span className="text-sm font-medium">
                                      Year: {expense.year}
                                    </span>
                                    <span className="text-sm font-medium text-green-600">
                                      ${expense.estimatedCost.toLocaleString()}
                                    </span>
                                    <Badge variant={expense.completed ? "default" : "secondary"}>
                                      {expense.completed ? "Completed" : "Planned"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Inspection Checklist Section */}
                    <section>
                      <h3 className="text-lg font-semibold mb-4">Inspection Checklist</h3>
                      <Card>
                        <CardContent className="p-6">
                          <MinimalInspectionChecklist
                            initialData={checklistData}
                            onDataChange={setChecklistData}
                            isTablet={isTablet}
                          />
                        </CardContent>
                      </Card>
                    </section>

                    {/* Executive Summary Section */}
                    <section>
                      <h3 className="text-lg font-semibold mb-4">Executive Summary</h3>
                      <Card>
                        <CardContent className="p-6">
                          <ExecutiveSummary
                            inspectionData={{
                              ...roofCompositionData,
                              ...checklistData,
                              deficiencies,
                              inspectionNotes,
                              roofSquareFootageConfirmed,
                              overviewPhotos
                            }}
                            roofData={selectedProperty}
                            onSummaryGenerated={setExecutiveSummaryData}
                            isTablet={isTablet}
                            deficiencies={deficiencies.map(d => ({
                              type: d.category,
                              severity: d.severity,
                              description: d.description,
                              location: d.location,
                              estimatedCost: d.budgetAmount
                            }))}
                            photoCount={(overviewPhotos?.length || 0) + deficiencies.reduce((total, d) => total + (d.photos?.length || 0), 0)}
                            weatherConditions="Clear" // Could be enhanced to get real weather data
                            inspectorName="Current Inspector" // Could be enhanced to get actual inspector name
                          />
                        </CardContent>
                      </Card>
                    </section>
                  </TabsContent>

                  {/* Overview Photos Sub-tab */}
                  <TabsContent value="overview-photos" className={`${isTablet ? 'p-6' : 'p-3 md:p-6'}`}>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <h3 className="text-lg font-semibold">Overview Photos</h3>
                        <Button 
                          onClick={() => handleCameraCapture('overview')}
                          size={isTablet ? "lg" : "default"}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Take Overview Photo
                        </Button>
                      </div>

                      {overviewPhotos.length === 0 ? (
                        <Card className="p-8 text-center">
                          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Overview Photos</h3>
                          <p className="text-gray-600 mb-4">Take overview photos to document the roof condition.</p>
                          <Button onClick={() => handleCameraCapture('overview')}>
                            <Camera className="h-4 w-4 mr-2" />
                            Take First Photo
                          </Button>
                        </Card>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {overviewPhotos.map((photo) => (
                            <Card key={photo.id} className="overflow-hidden">
                              <div className="aspect-video bg-gray-100">
                                <img 
                                  src={photo.url} 
                                  alt={`Overview ${photo.id}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">Overview Photo</p>
                                    <p className="text-xs text-gray-500">
                                      {photo.timestamp.toLocaleString()}
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Notes Sub-tab */}
                  <TabsContent value="notes" className={`${isTablet ? 'p-6' : 'p-3 md:p-6'}`}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Inspection Notes</h3>
                        {isVoiceRecording && (
                          <Badge variant="destructive" className="animate-pulse">
                            <Mic className="h-3 w-3 mr-1" />
                            Recording...
                          </Badge>
                        )}
                      </div>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Add your inspection notes here..."
                              value={inspectionNotes}
                              onChange={(e) => setInspectionNotes(e.target.value)}
                              className={`min-h-[200px] ${isTablet ? 'text-base' : 'text-sm'}`}
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={startVoiceRecording}
                                disabled={isVoiceRecording}
                              >
                                <Mic className="h-4 w-4 mr-2" />
                                {isVoiceRecording ? 'Recording...' : 'Voice Input'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setInspectionNotes('')}
                              >
                                Clear Notes
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Square Footage Confirmation</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-3">
                            <Button
                              variant={roofSquareFootageConfirmed === true ? "default" : "outline"}
                              onClick={() => setRoofSquareFootageConfirmed(true)}
                              size="sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirmed
                            </Button>
                            <Button
                              variant={roofSquareFootageConfirmed === false ? "destructive" : "outline"}
                              onClick={() => setRoofSquareFootageConfirmed(false)}
                              size="sm"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Not Confirmed
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Files Sub-tab */}
                  <TabsContent value="files" className={`${isTablet ? 'p-6' : 'p-3 md:p-6'}`}>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Files & Documents</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Upload Documents</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => warrantyFileInputRef.current?.click()}
                              disabled={isUploading}
                            >
                              <FolderOpen className="h-4 w-4 mr-2" />
                              Upload Warranty Documents
                            </Button>
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => cadFileInputRef.current?.click()}
                              disabled={isUploading}
                            >
                              <FolderOpen className="h-4 w-4 mr-2" />
                              Upload CAD Files
                            </Button>
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => otherFileInputRef.current?.click()}
                              disabled={isUploading}
                            >
                              <FolderOpen className="h-4 w-4 mr-2" />
                              Upload Other Documents
                            </Button>
                            {isUploading && (
                              <div className="text-center text-sm text-muted-foreground">
                                Uploading files...
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Workflow Export</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <WorkflowDataExporter
                              inspectionData={{
                                propertyId,
                                propertyName,
                                deficiencies,
                                overviewPhotos,
                                inspectionNotes,
                                roofSquareFootageConfirmed,
                                capitalExpenses,
                                roofCompositionData,
                                checklistData,
                                executiveSummaryData,
                                inspectionStarted,
                                startTime
                              }}
                              isTablet={isTablet}
                            />
                          </CardContent>
                        </Card>
                      </div>

                      {/* Uploaded Files List */}
                      {uploadedFiles.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Uploaded Files ({uploadedFiles.length})</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {uploadedFiles.map((file) => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    <div>
                                      <p className="font-medium text-sm">{file.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {file.type.toUpperCase()} • {(file.size / 1024).toFixed(1)} KB • {file.uploadedAt.toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDownloadFile(file.url, file.name)}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteFile(file.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handlePhotoCapture(e, 'deficiency')}
      />
      <input
        ref={overviewFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handlePhotoCapture(e, 'overview')}
      />
      
      {/* Hidden document file inputs */}
      <input
        ref={warrantyFileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files, 'warranty')}
      />
      <input
        ref={cadFileInputRef}
        type="file"
        accept=".dwg,.dxf,.pdf,.zip"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files, 'cad')}
      />
      <input
        ref={otherFileInputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files, 'other')}
      />

      {/* Start Inspection Modal */}
      <Dialog open={showStartInspectionModal} onOpenChange={setShowStartInspectionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Camera className="h-6 w-6" />
              Start New Inspection
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-muted-foreground mb-6">
              Begin a comprehensive roof inspection for {propertyName}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStartInspectionModal(false);
                  setCurrentTab('roof-summary');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStartInspection}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Inspection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pre-Inspection Briefing Modal */}
      <Dialog open={showPreInspectionBriefing} onOpenChange={setShowPreInspectionBriefing}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Critical Focus Areas - {propertyName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">⚠️ Pre-Inspection Briefing</h3>
              <p className="text-red-700 text-sm">
                Review these critical areas identified from previous annual inspections before beginning your inspection.
              </p>
            </div>

            {criticalAreas.length > 0 ? (
              <div className="space-y-3">
                {criticalAreas.map((area, index) => (
                  <Card key={index} className={`border-l-4 ${
                    area.severity === 'high' ? 'border-l-red-500 bg-red-50' : 
                    area.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' : 
                    'border-l-blue-500 bg-blue-50'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={area.severity === 'high' ? 'destructive' : 'secondary'}>
                              {area.severity?.toUpperCase() || 'HIGH'}
                            </Badge>
                            <Badge variant="outline">
                              <MapPin className="h-3 w-3 mr-1" />
                              {area.location}
                            </Badge>
                            {area.estimatedCost && (
                              <Badge variant="outline">
                                <DollarSign className="h-3 w-3 mr-1" />
                                ${area.estimatedCost.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-semibold text-lg">{area.issueType}</h4>
                          <p className="text-muted-foreground mt-1">{area.description}</p>
                          {area.lastReported && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Last reported: {new Date(area.lastReported).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">No Critical Issues Found</h3>
                  <p className="text-muted-foreground">
                    This property has no high-priority issues identified from previous inspections.
                    Proceed with a standard comprehensive inspection.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowPreInspectionBriefing(false);
                setShowStartInspectionModal(true);
              }}
            >
              Review Later
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleBeginInspection}
            >
              <Camera className="h-4 w-4 mr-2" />
              Begin Inspection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deficiency Modal */}
      <Dialog open={showDeficiencyModal} onOpenChange={setShowDeficiencyModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adding New Deficiency</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Deficiency *</label>
                <Select value={newDeficiency.category} onValueChange={(value) => 
                  setNewDeficiency(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger className={newDeficiency.category === 'Immediate Repair' ? 'border-red-500 bg-red-50' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFICIENCY_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === 'Immediate Repair' ? '🚨 Immediate Repair' : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newDeficiency.category === 'Immediate Repair' && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-red-800">⚡ Auto-Email Alert</p>
                        <p className="text-red-700">
                          Selecting this category will automatically send an emergency email to the repair team when saved.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Budget Amount *</label>
                <Input
                  type="number"
                  value={newDeficiency.budgetAmount}
                  onChange={(e) => setNewDeficiency(prev => ({ 
                    ...prev, 
                    budgetAmount: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="Estimated cost"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location/Description</label>
              <Input
                value={newDeficiency.location}
                onChange={(e) => setNewDeficiency(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Describe location and issue details"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Scope of Work *</label>
              <Textarea
                value={newDeficiency.description}
                onChange={(e) => setNewDeficiency(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of work needed"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Severity</label>
              <Select value={newDeficiency.severity} onValueChange={(value: 'low' | 'medium' | 'high') => 
                setNewDeficiency(prev => ({ ...prev, severity: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Photo Preview Section */}
            {newDeficiency.photos.length > 0 ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Captured Photos ({newDeficiency.photos.length})</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {newDeficiency.photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img 
                        src={photo.url} 
                        alt="Deficiency" 
                        className="w-full h-20 object-cover rounded border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0"
                        onClick={() => setNewDeficiency(prev => ({
                          ...prev,
                          photos: prev.photos.filter(p => p.id !== photo.id)
                        }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Trigger floating camera button for deficiency photos
                    toast({
                      title: "Use Camera Button",
                      description: "Use the floating camera button and select 'Deficiency' to add more photos",
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add More Photos
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Upload Photo (max 20 MB)</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => {
                    toast({
                      title: "Use Camera Button",
                      description: "Use the floating camera button and select 'Deficiency' to capture photos",
                    });
                  }}
                >
                  Take Photo
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeficiencyModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeficiency}>
              Add Deficiency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Capital Expense Modal */}
      <Dialog open={showCapitalExpenseModal} onOpenChange={setShowCapitalExpenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Capital Expense</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input
                value={newCapitalExpense.description}
                onChange={(e) => setNewCapitalExpense(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Roof Replacement (Recover)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Expense Year *</label>
                <Input
                  type="number"
                  value={newCapitalExpense.year}
                  onChange={(e) => setNewCapitalExpense(prev => ({ 
                    ...prev, 
                    year: parseInt(e.target.value) || new Date().getFullYear() 
                  }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Estimated Cost *</label>
                <Input
                  type="number"
                  value={newCapitalExpense.estimatedCost}
                  onChange={(e) => setNewCapitalExpense(prev => ({ 
                    ...prev, 
                    estimatedCost: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="Dollar amount"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Scope of Work *</label>
              <Textarea
                value={newCapitalExpense.scopeOfWork}
                onChange={(e) => setNewCapitalExpense(prev => ({ ...prev, scopeOfWork: e.target.value }))}
                placeholder="Detailed scope of work description"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCapitalExpenseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCapitalExpense}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Immediate Repair Modal */}
      <ImmediateRepairModal
        open={showImmediateRepairModal}
        onOpenChange={setShowImmediateRepairModal}
        inspectionId={sessionId || ''}
        deficiency={selectedDeficiencyForRepair || undefined}
        propertyInfo={{
          id: propertyId,
          name: propertyName,
          address: propertyName, // Simplified - could be enhanced with actual address
          city: 'Unknown City',
          state: 'Unknown State'
        }}
        criticalityAnalysis={criticalAnalysisForRepair || undefined}
        onRepairCreated={handleImmediateRepairCreated}
      />

      {/* Floating Camera Button - Only show during active inspection */}
      {inspectionStarted && (
        <FloatingCameraButton
          onPhotoCapture={handleFloatingCameraCapture}
          isTablet={isTablet}
          disabled={isUploading}
          className="z-50"
        />
      )}
    </div>
  );
}