import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInspectionAutosave } from "@/hooks/useInspectionAutosave";
import { 
  Building2, 
  AlertTriangle, 
  Camera, 
  Mic, 
  FileText, 
  TrendingUp,
  MapPin,
  Clock,
  DollarSign,
  Loader2
} from "lucide-react";
import { InspectorIntelligenceService } from "@/lib/inspectorIntelligenceService";
import { ActiveInspectionInterface } from "@/components/inspection/ActiveInspectionInterface";
import { useToast } from "@/hooks/use-toast";
import { BuildingDetailsDialog } from "@/components/inspector/BuildingDetailsDialog";
import { useInspectorKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useInspectorEventListener, useInspectionState, usePropertySelection } from "@/hooks/useInspectorEvents";
import { useUnifiedInspectionEvents, useInspectionEventEmitter } from "@/hooks/useUnifiedInspectionEvents";
import { KeyboardShortcutsHelp } from "@/components/ui/keyboard-shortcuts-help";
import { offlineManager } from "@/lib/offlineManager";
import { VirtualizedPropertyList } from "@/components/ui/virtualized-property-list";
import { QuickActions } from "@/components/ui/quick-actions";
import { createTestInspection, storeTestInspection, selectFirstProperty } from "@/lib/testDataGenerator";

import { useInspectorAccessibility } from "@/hooks/useAccessibility";
import { AccessibleStatus } from "@/components/ui/accessible-components";

interface InspectionBriefing {
  property: {
    id: string;
    name: string;
    address: string;
    roofType: string;
    squareFootage: number;
    lastInspectionDate: string;
  };
  focusAreas: Array<{
    location: string;
    severity: 'high' | 'medium' | 'low';
    issueType: string;
    recurrenceCount: number;
    lastReported: string;
    estimatedCost: number;
  }>;
  patternInsights: Array<{
    insight: string;
    probability: number;
    basedOnCount: number;
  }>;
  crossPortfolioInsights: Array<{
    pattern: string;
    affectedProperties: number;
    successfulFix?: string;
  }>;
  historicalPhotos: Array<{
    id: string;
    location: string;
    date: string;
    url: string;
    issue: string;
  }>;
}

const InspectorInterface = () => {
  
  // Accessibility features
  const {
    announce,
    announcePropertySelection,
    announceInspectionStep,
    announceError
  } = useInspectorAccessibility();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<InspectionBriefing | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState<string[]>([]);
  const [availableProperties, setAvailableProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [activeInspection, setActiveInspection] = useState<{propertyId: string; propertyName: string} | null>(null);
  const [inspectionData, setInspectionData] = useState<any>(null);
  const [showBuildingDetails, setShowBuildingDetails] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // Initialize autosave for active inspection
  const { saveSession, loadSession, completeSession } = useInspectionAutosave({
    propertyId: activeInspection?.propertyId || '',
    inspectionData,
    enabled: !!activeInspection
  });
  
  // Initialize keyboard shortcuts and event handling
  const { setContext, shortcuts } = useInspectorKeyboardShortcuts();
  const { startInspection, on } = useInspectionState();
  const { selectProperty, deselectProperty } = usePropertySelection();
  
  // Unified event system for real-time synchronization
  const { inspectionLifecycle, dataSync } = useUnifiedInspectionEvents();
  const { emitDataRefresh, emitInspectionCreated } = useInspectionEventEmitter();
  
  // Set keyboard context based on current state
  useEffect(() => {
    if (activeInspection) {
      setContext('inspection');
    } else if (selectedProperty) {
      setContext('inspector');
    } else {
      setContext('global');
    }
  }, [activeInspection, selectedProperty, setContext]);
  
  // Handler functions
  const handleStartInspection = useCallback((propertyId: string, propertyName: string) => {
    setActiveInspection({ propertyId, propertyName });
    startInspection(propertyId, propertyName);
    
    // Emit unified event for real-time synchronization
    emitDataRefresh(['inspections_tab', 'inspection_history']);
    
    // Track inspection start in analytics/monitoring
    console.log('Inspector Interface: Starting inspection for property', propertyId);
  }, [startInspection, emitDataRefresh]);

  // Event listeners for keyboard shortcuts
  useInspectorEventListener('navigation.help_opened', useCallback(() => {
    setShowKeyboardHelp(true);
  }, []));
  
  useInspectorEventListener('navigation.tab_changed', useCallback((event) => {
    // Handle tab changes via keyboard
    console.log('Tab changed via keyboard:', event.payload.tab);
  }, []));
  
  useInspectorEventListener('inspection.start_requested', useCallback(() => {
    if (selectedProperty && briefing) {
      handleStartInspection(selectedProperty, briefing.property.name);
    }
  }, [selectedProperty, briefing, handleStartInspection]));

  // Mock data for demo - this would come from your API/database  
  const mockBriefing: InspectionBriefing = useMemo(() => ({
    property: {
      id: "1",
      name: "Prologis Dallas Distribution Center",
      address: "2400 Industrial Blvd, Dallas, TX 75207",
      roofType: "Modified Bitumen",
      squareFootage: 150000,
      lastInspectionDate: "2024-10-15"
    },
    focusAreas: [
      {
        location: "Northwest corner",
        severity: "high",
        issueType: "Recurring leak",
        recurrenceCount: 3,
        lastReported: "2024-10-15",
        estimatedCost: 12500
      },
      {
        location: "HVAC penetrations",
        severity: "medium",
        issueType: "Sealant failure",
        recurrenceCount: 2,
        lastReported: "2024-08-20",
        estimatedCost: 3500
      },
      {
        location: "Drainage system",
        severity: "medium",
        issueType: "Pooling water",
        recurrenceCount: 2,
        lastReported: "2024-09-10",
        estimatedCost: 8000
      }
    ],
    patternInsights: [
      {
        insight: "Similar roofs fail at parapet walls",
        probability: 70,
        basedOnCount: 15
      },
      {
        insight: "This material degrades 40% faster near HVAC units",
        probability: 85,
        basedOnCount: 23
      },
      {
        insight: "Average repair cost for this issue type",
        probability: 90,
        basedOnCount: 47
      }
    ],
    crossPortfolioInsights: [
      {
        pattern: "Modified Bitumen roofs showing same drainage issues",
        affectedProperties: 5,
        successfulFix: "Install cricket diverters - 95% success rate"
      },
      {
        pattern: "HVAC sealant failures appear 6 months before major leak",
        affectedProperties: 8
      }
    ],
    historicalPhotos: [
      {
        id: "1",
        location: "Northwest corner",
        date: "2024-10-15",
        url: "/placeholder.svg",
        issue: "Active leak penetration"
      },
      {
        id: "2",
        location: "HVAC Unit 3",
        date: "2024-08-20",
        url: "/placeholder.svg",
        issue: "Deteriorated sealant"
      }
    ]
  }), []);

  // Optimized property loading with useCallback
  const loadProperties = useCallback(async () => {
    setLoading(true);
    try {
      // Get current user to filter inspections by inspector
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Get the user's record from users table to get the correct inspector_id
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userRecord) {
        console.error('Error fetching user record:', userError);
        throw new Error('User record not found in users table');
      }

      // Use the new database function to get inspector's inspections with property details
      const { data: inspectionData, error } = await supabase.rpc('get_inspector_inspections', {
        p_inspector_id: userRecord.id
      });

      if (error) throw error;

      // Transform to the expected format for the interface
      const propertiesWithInspections = (inspectionData || []).map(item => ({
        id: item.property_id,
        name: item.property_name || 'Unknown Property',
        roofType: item.roof_type || 'Unknown',
        squareFootage: item.roof_area || 0,
        lastInspectionDate: item.last_inspection_date,
        criticalIssues: 0,
        status: 'good',
        inspectionStatus: item.status,
        inspectionId: item.inspection_id,
        scheduledDate: item.scheduled_date,
        inspectionType: item.inspection_type,
        sessionData: item.session_data,
        address: `${item.property_address}, ${item.city}, ${item.state}`
      }));
      
      setAvailableProperties(propertiesWithInspections);
    } catch (error) {
      console.error('Error loading properties:', error);
      
      // Try to load from offline cache
      try {
        const offlineData = offlineManager.getOfflineData('inspection');
        if (offlineData.length > 0) {
          // Use cached data
          const cachedProperties = offlineData.map(item => item.data.property).filter(Boolean);
          setAvailableProperties(cachedProperties);
          toast({
            title: "Offline Mode",
            description: "Loaded cached properties",
            variant: "default"
          });
        } else {
          throw error;
        }
      } catch (offlineError) {
        toast({
          title: "Error",
          description: "Failed to load properties",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Auto-populate first property with test data (stable ref to prevent infinite loops)
  const populateFirstPropertyWithTestData = useCallback(async () => {
    try {
      // Check if test data has already been populated for this user session
      const testDataKey = 'inspector_test_data_populated';
      const hasPopulated = localStorage.getItem(testDataKey);
      if (hasPopulated) {
        console.log('✅ Test data already populated in this session, skipping');
        return;
      }

      // Add session-based check to prevent concurrent runs
      const sessionKey = `${testDataKey}_session_${Date.now()}`;
      if ((window as any)[sessionKey]) {
        console.log('✅ Test data population already in progress, skipping');
        return;
      }
      (window as any)[sessionKey] = true;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping test data population');
        (window as any)[sessionKey] = false;
        return;
      }

      // Get the user's record to get inspector_id
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      let inspectorId;
      if (userError) {
        console.warn('User not found in users table, using auth user ID');
        inspectorId = user.id;
      } else {
        inspectorId = userRecord.id;
      }

      // Get the first property (3535 Commerce Ctr.) to check for existing inspections
      const { data: firstProperty, error: propertyError } = await supabase
        .from('roofs')
        .select('id, property_name')
        .eq('property_name', '3535 Commerce Ctr.')
        .limit(1)
        .single();

      if (propertyError) {
        console.log('No test property found, skipping test data population');
        (window as any)[sessionKey] = false;
        return;
      }

      // Check for ANY existing inspections for this property and inspector (not just active sessions)
      const { data: existingInspections, error: inspectionError } = await supabase
        .from('inspections')
        .select('id, status')
        .eq('roof_id', firstProperty.id)
        .eq('inspector_id', inspectorId)
        .limit(1);

      if (inspectionError) {
        console.error('Error checking existing inspections:', inspectionError);
        (window as any)[sessionKey] = false;
        return;
      }

      if (existingInspections && existingInspections.length > 0) {
        console.log('✅ Test inspection already exists for this property and inspector', existingInspections);
        // Mark as populated to prevent future attempts
        localStorage.setItem(testDataKey, 'true');
        (window as any)[sessionKey] = false;
        return;
      }

      console.log('🎯 Populating first property with test inspection data...');

      // Generate test inspection data
      const testData = await createTestInspection();
      
      // Store in database
      const result = await storeTestInspection(testData, inspectorId);
      
      console.log(`✅ Test inspection populated for "${result.propertyName}"`);

      // Mark as populated to prevent future attempts
      localStorage.setItem(testDataKey, 'true');
      (window as any)[sessionKey] = false;

      // Don't call loadProperties here to prevent infinite loop
      // The component will re-render and load properties naturally

    } catch (error) {
      console.error('Error populating test data:', error);
      // Clean up session lock on error - testDataKey is defined in this scope
      // No need to clean up session key here as it's function-scoped
    }
  }, []); // Empty deps array to prevent infinite loop

  // Load available properties on component mount and populate test data
  useEffect(() => {
    let mounted = true;
    
    const initializeInspectorInterface = async () => {
      if (!mounted) return;
      
      await loadProperties();
      
      if (!mounted) return;
      
      // Auto-populate first property with test data if authenticated
      await populateFirstPropertyWithTestData();
    };
    
    initializeInspectorInterface();
    
    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount

  // Separate effect to refresh properties after test data population
  useEffect(() => {
    const testDataKey = 'inspector_test_data_populated';
    const hasPopulated = localStorage.getItem(testDataKey);
    
    if (hasPopulated && availableProperties.length === 0) {
      // If test data was populated but no properties are loaded, refresh
      loadProperties();
    }
  }, [availableProperties.length, loadProperties]);

  // Handle navigation from dashboard with inspection state
  useEffect(() => {
    if (location.state?.startInspection && location.state?.roofId && location.state?.propertyName) {
      const { roofId, propertyName } = location.state;
      setActiveInspection({ propertyId: roofId, propertyName });
      
      // Clear the navigation state to prevent re-triggering
      navigate('/inspector', { replace: true });
      
      console.log('Inspector Interface: Starting inspection from navigation state', roofId);
    }
  }, [location.state, navigate]);

  // Optimized briefing loading with useCallback
  const loadBriefing = useCallback(async (propertyId: string) => {
    setLoadingBriefing(true);
    try {
      const briefingData = await InspectorIntelligenceService.generateInspectionBriefing(propertyId);
      if (briefingData) {
        setBriefing(briefingData);
        // Cache for offline use
        await offlineManager.storeOfflineData('inspection', { briefing: briefingData, propertyId });
      } else {
        throw new Error('Failed to generate briefing');
      }
    } catch (error) {
      console.error('Error loading briefing:', error);
      toast({
        title: "Error",
        description: "Failed to load inspection briefing",
        variant: "destructive"
      });
    } finally {
      setLoadingBriefing(false);
    }
  }, [toast]);

  // Load briefing data when property is selected
  useEffect(() => {
    if (selectedProperty) {
      loadBriefing(selectedProperty);
    }
  }, [selectedProperty, loadBriefing]);

  const handleVoiceNote = useCallback(() => {
    setIsRecording(prev => {
      if (prev) {
        // Stop recording and add note
        const newNote = `Voice note ${voiceNotes.length + 1}: Northwest corner leak has expanded 6 inches`;
        setVoiceNotes(prev => [...prev, newNote]);
      }
      return !prev;
    });
  }, [voiceNotes.length]);

  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'default';
    }
  }, []);


  const handleCompleteInspection = useCallback(async (inspectionData: any) => {
    console.log('🎯 [Inspector Interface] handleCompleteInspection called with data:', {
      inspectionId: inspectionData.inspectionId,
      propertyName: inspectionData.propertyName,
      deficiencies: inspectionData.deficiencies?.length || 0,
      hasOverviewPhotos: (inspectionData.overviewPhotos?.length || 0) > 0,
      hasExecutiveSummary: !!inspectionData.executiveSummary
    });
    
    console.log('🔍 [Inspector Interface] Full inspection data structure:', inspectionData);
    
    try {
      // Update inspection status through unified system
      if (inspectionData.inspectionId) {
        await inspectionLifecycle.changeStatus(inspectionData.inspectionId, 'completed', inspectionData);
      }
      
      // Sync building history for the property
      if (inspectionData.propertyId) {
        await dataSync.syncBuildingHistory(inspectionData.propertyId);
      }
      
      // Trigger n8n workflows for deficiency alerts and AI review
      console.log('🚀 [Inspector Interface] Starting n8n workflow trigger section...');
      try {
        console.log('📦 [Inspector Interface] Importing n8nWorkflowTriggers module...');
        const n8nModule = await import('@/lib/n8nWorkflowTriggers');
        console.log('✅ [Inspector Interface] Module imported successfully:', Object.keys(n8nModule));
        
        const { n8nWorkflowTriggers } = n8nModule;
        console.log('✅ [Inspector Interface] n8nWorkflowTriggers extracted:', typeof n8nWorkflowTriggers);
        
        console.log('🚀 [Inspector Interface] Triggering n8n workflows for:', inspectionData.inspectionId);
        console.log('📋 [Inspector Interface] n8n Configuration:', {
          USE_SUPABASE_PROXY: import.meta.env.VITE_USE_SUPABASE_PROXY,
          N8N_WEBHOOK_BASE: import.meta.env.VITE_N8N_WEBHOOK_BASE,
          deficiencyUrl: `${import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://mkidder97.app.n8n.cloud/webhook'}/roofmind-deficiency-alerts`,
          aiReviewUrl: `${import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://mkidder97.app.n8n.cloud/webhook'}/roofmind-inspection-review`
        });
        console.log('Inspection data:', inspectionData);
        
        // Get current user for workflow data
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user for n8n workflow:', user);
        
        // Get user details from users table
        let userDetails = {
          first_name: '',
          last_name: '',
          email: user?.email || ''
        };
        
        if (user) {
          try {
            const { data: userRecord } = await supabase
              .from('users')
              .select('first_name, last_name, email')
              .eq('auth_user_id', user.id)
              .single();
            
            if (userRecord) {
              userDetails = {
                first_name: userRecord.first_name || '',
                last_name: userRecord.last_name || '',
                email: userRecord.email || user.email || ''
              };
            }
          } catch (userError) {
            console.warn('Could not fetch user details from users table:', userError);
          }
        }
        
        console.log('User details for workflow:', userDetails);
        
        // Format the inspection data for n8n
        const workflowData = {
          id: inspectionData.inspectionId,
          property_name: inspectionData.propertyName,
          property_address: inspectionData.propertyAddress,
          status: 'completed',
          deficiencies: inspectionData.deficiencies || [],
          executiveSummary: inspectionData.executiveSummary,
          capitalExpenses: inspectionData.capitalExpenses,
          overviewPhotos: inspectionData.overviewPhotos || [],
          notes: inspectionData.notes,
          weather_conditions: inspectionData.weatherConditions,
          roofs: {
            property_name: inspectionData.propertyName,
            address: inspectionData.propertyAddress
          },
          users: userDetails
        };
        
        console.log('📤 [Inspector Interface] Sending workflow data:', {
          ...workflowData,
          deficiencies_count: workflowData.deficiencies?.length || 0,
          photos_count: workflowData.overviewPhotos?.length || 0,
          has_executive_summary: !!workflowData.executiveSummary
        });
        
        console.log('🎯 [Inspector Interface] About to call triggerInspectionWorkflows...');
        console.log('🎯 [Inspector Interface] n8nWorkflowTriggers object:', n8nWorkflowTriggers);
        console.log('🎯 [Inspector Interface] triggerInspectionWorkflows method:', typeof n8nWorkflowTriggers.triggerInspectionWorkflows);
        
        const workflowResults = await n8nWorkflowTriggers.triggerInspectionWorkflows(workflowData);
        console.log('🎉 [Inspector Interface] Workflow call completed!');
        
        console.log('✅ [Inspector Interface] n8n workflow results:', workflowResults);
        
        if (!workflowResults.deficiencyAlerts.success) {
          console.error('❌ Deficiency alerts workflow failed:', workflowResults.deficiencyAlerts.error);
        }
        
        if (!workflowResults.aiReview.success) {
          console.error('❌ AI review workflow failed:', workflowResults.aiReview.error);
        }
        
        if (workflowResults.deficiencyAlerts.success && inspectionData.deficiencies?.length > 0) {
          toast({
            title: "Deficiency Alerts Sent",
            description: "Critical deficiencies have been reported via email",
          });
        }
        
        if (workflowResults.aiReview.success) {
          toast({
            title: "AI Review Initiated",
            description: "Inspection is being processed for quality review",
          });
        }
      } catch (workflowError) {
        console.error('Failed to trigger n8n workflows:', workflowError);
        // Don't fail the inspection completion if workflows fail
      }
      
      // Clear local state
      setActiveInspection(null);
      setSelectedProperty(null);
      deselectProperty();
      
      // Emit global refresh for all inspection-related components
      emitDataRefresh(['inspections_tab', 'inspection_history', 'inspector_interface']);
      
      toast({
        title: "Inspection Completed",
        description: `Inspection for ${inspectionData.propertyName} has been completed and saved to database`,
      });

      // Log completion for debugging
      console.log('✅ Inspection completed successfully:', {
        propertyId: inspectionData.propertyId,
        propertyName: inspectionData.propertyName,
        deficiencies: inspectionData.deficiencies?.length || 0,
        photos: inspectionData.overviewPhotos?.length || 0
      });
    } catch (error) {
      console.error('Error completing inspection:', error);
      toast({
        title: "Error",
        description: "Failed to complete inspection. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast, deselectProperty, inspectionLifecycle, dataSync, emitDataRefresh]);

  const handleBackFromInspection = useCallback(async () => {
    // Auto-save current inspection data before going back
    if (inspectionData && activeInspection) {
      await saveSession(inspectionData, 'active');
      
      // Update inspection status to paused/draft through unified system
      if (inspectionData.inspectionId) {
        try {
          await inspectionLifecycle.changeStatus(inspectionData.inspectionId, 'paused', inspectionData);
        } catch (error) {
          console.error('Error updating inspection status:', error);
        }
      }
      
      // Emit data refresh to sync with other components
      emitDataRefresh(['inspections_tab', 'inspection_history']);
      
      toast({
        title: "Inspection Saved",
        description: "Your inspection progress has been automatically saved and can be resumed later.",
      });
    }
    setActiveInspection(null);
  }, [inspectionData, activeInspection, saveSession, toast, inspectionLifecycle, emitDataRefresh]);

  const handleBuildingClick = useCallback((propertyId: string) => {
    const property = availableProperties.find(p => p.id === propertyId);
    
    if (property) {
      // Go directly to ActiveInspectionInterface instead of modal
      setActiveInspection({ propertyId, propertyName: property.name });
      selectProperty(propertyId);
      
      // Sync building-specific inspection history when property is selected
      dataSync.syncBuildingHistory(propertyId);
      
      // Announce selection for screen readers
      announcePropertySelection(property.name, property.criticalIssues || 0);
      
      // Track navigation in analytics/monitoring
      console.log('Inspector Interface: Navigating to property inspection view', propertyId);
    }
  }, [selectProperty, availableProperties, announcePropertySelection, dataSync]);

  const handleBuildingDetailsClose = useCallback(() => {
    setShowBuildingDetails(false);
    setSelectedBuildingId(null);
  }, []);


  // If there's an active inspection, show the inspection interface
  if (activeInspection) {
    return (
      <ActiveInspectionInterface
        propertyId={activeInspection.propertyId}
        propertyName={activeInspection.propertyName}
        onComplete={handleCompleteInspection}
        onCancel={handleBackFromInspection}
        onDataChange={setInspectionData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-3 sm:p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8" />
            <h1 className="text-lg sm:text-2xl font-bold">Inspector Intelligence</h1>
          </div>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => navigate("/")}
            className="text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-2 sm:p-4">
        {!selectedProperty ? (
          // Property Selection
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Select Property for Inspection</CardTitle>
              <CardDescription className="text-sm">Choose a property to view pre-inspection intelligence (first property auto-populated with test data)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2">Loading properties...</span>
                </div>
              ) : (
                <VirtualizedPropertyList
                  properties={availableProperties}
                  onPropertyClick={handleBuildingClick}
                  loading={loading}
                  containerHeight={Math.max(350, Math.min(600, window.innerHeight - 300))}
                  className="mt-4"
                />
              )}
              
              {/* Quick Actions for property selection context */}
              {availableProperties.length > 0 && (
                <QuickActions 
                  context="property-selection"
                  className="mt-4"
                />
              )}
            </CardContent>
          </Card>
        ) : loadingBriefing ? (
          // Loading briefing
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Generating inspection briefing...</span>
              </div>
            </CardContent>
          </Card>
        ) : briefing ? (
          // Memoized briefing content to prevent unnecessary re-renders
          // Pre-Inspection Intelligence
          <div className="space-y-6">
            {/* Property Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                      <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
                      {briefing.property.name}
                    </h2>
                    <p className="text-muted-foreground">{briefing.property.address}</p>
                    <div className="flex gap-4 mt-2">
                      <Badge variant="outline">
                        <Building2 className="h-3 w-3 mr-1" />
                        {briefing.property.roofType}
                      </Badge>
                      <Badge variant="outline">
                        {briefing.property.squareFootage.toLocaleString()} sq ft
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Last: {new Date(briefing.property.lastInspectionDate).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedProperty(null)}
                  >
                    Change Property
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="briefing" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="briefing" className="text-xs sm:text-sm">Intelligence</TabsTrigger>
                <TabsTrigger value="patterns" className="text-xs sm:text-sm">Patterns</TabsTrigger>
                <TabsTrigger value="photos" className="text-xs sm:text-sm">Photos</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs sm:text-sm">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="briefing" className="space-y-4">
                {/* Focus Areas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Critical Focus Areas
                    </CardTitle>
                    <CardDescription>Areas requiring immediate attention during inspection</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {briefing.focusAreas.map((area, index) => (
                        <Alert key={index} variant={area.severity === 'high' ? 'destructive' : 'default'}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="flex items-center justify-between">
                            <span>{area.location}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={getSeverityColor(area.severity)}>
                                {area.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="outline">
                                <DollarSign className="h-3 w-3" />
                                {area.estimatedCost.toLocaleString()}
                              </Badge>
                            </div>
                          </AlertTitle>
                          <AlertDescription>
                            <p>{area.issueType} • Reported {area.recurrenceCount} times</p>
                            <p className="text-sm mt-1">Last reported: {new Date(area.lastReported).toLocaleDateString()}</p>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Cross-Portfolio Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Cross-Portfolio Intelligence
                    </CardTitle>
                    <CardDescription>Insights from similar properties in your portfolio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {briefing.crossPortfolioInsights.map((insight, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <p className="font-medium">{insight.pattern}</p>
                          <p className="text-sm text-muted-foreground">
                            Affects {insight.affectedProperties} properties
                          </p>
                          {insight.successfulFix && (
                            <p className="text-sm text-green-600 mt-1">
                              ✓ Solution: {insight.successfulFix}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="patterns" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pattern Recognition Insights</CardTitle>
                    <CardDescription>AI-detected patterns based on historical data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {briefing.patternInsights.map((pattern, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{pattern.insight}</p>
                            <p className="text-sm text-muted-foreground">
                              Based on {pattern.basedOnCount} similar cases
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{pattern.probability}%</div>
                            <p className="text-sm text-muted-foreground">Probability</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="photos" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Historical Reference Photos</CardTitle>
                    <CardDescription>Previous damage locations and progression</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {briefing.historicalPhotos.map((photo) => (
                        <div key={photo.id} className="border rounded-lg p-3">
                          <img 
                            src={photo.url} 
                            alt={photo.issue}
                            className="w-full h-48 object-cover rounded mb-2"
                          />
                          <div className="space-y-1">
                            <p className="font-medium">{photo.location}</p>
                            <p className="text-sm text-muted-foreground">{photo.issue}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(photo.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Field Notes</CardTitle>
                    <CardDescription>Voice-to-text inspection notes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          variant={isRecording ? "destructive" : "default"}
                          size="default"
                          className="flex-1"
                          onClick={handleVoiceNote}
                        >
                          <Mic className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          <span className="text-sm">{isRecording ? "Stop Recording" : "Start Voice Note"}</span>
                        </Button>
                        <Button variant="outline" size="default" className="flex-1 sm:flex-none">
                          <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          <span className="text-sm">Take Photo</span>
                        </Button>
                      </div>

                      {voiceNotes.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Recorded Notes:</h4>
                          {voiceNotes.map((note, index) => (
                            <div key={index} className="p-3 bg-muted rounded-lg">
                              <p className="text-sm">{note}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date().toLocaleTimeString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="default"
                        onClick={() => handleStartInspection(briefing.property.id, briefing.property.name)}
                      >
                        <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Start Inspection
                      </Button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Report
                        </Button>
                        <Button variant="outline">
                          Request Repair Quote
                        </Button>
                        <Button variant="outline">
                          Schedule Follow-up
                        </Button>
                        <Button variant="outline">
                          Export Findings
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          // Error state when briefing failed to load
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to Load Briefing</h3>
                <p className="text-gray-600 mb-4">
                  We couldn't generate the inspection briefing for this property.
                </p>
                <div className="space-x-2">
                  <Button onClick={() => setSelectedProperty(null)} variant="outline">
                    Select Different Property
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Building Details Dialog */}
      {selectedBuildingId && (
        <BuildingDetailsDialog
          open={showBuildingDetails}
          onOpenChange={handleBuildingDetailsClose}
          roofId={selectedBuildingId}
          onStartInspection={handleStartInspection}
        />
      )}
      
      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={showKeyboardHelp}
        onOpenChange={setShowKeyboardHelp}
        shortcuts={shortcuts}
      />
    </div>
  );
};

export default InspectorInterface;