import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Workflow, 
  Download, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Send,
  Settings,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkflowInspectionData {
  // Property Information
  propertyId: string;
  propertyName: string;
  propertyAddress?: string;
  roofArea?: number;
  
  // Inspection Metadata
  inspectionId: string;
  inspectionDate: string;
  inspectorId: string;
  inspectorName: string;
  inspectionType: 'annual' | 'maintenance' | 'warranty' | 'storm' | 'other';
  budgetYear: number;
  
  // Roof Composition
  roofComposition: {
    roofSystem: string;
    systemDescription: string;
    installationYear: number;
    layers: Array<{
      layer: string;
      material: string;
      thickness: string;
      attachment: string;
      description?: string;
    }>;
    hasRecover: boolean;
    recoverType?: string;
    recoverYear?: number;
  };
  
  // Inspection Results
  inspectionResults: {
    overallCondition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
    overallRating: number;
    completionPercentage: number;
    
    // Key findings
    standingWater: boolean;
    roofAssemblyFailure: boolean;
    preventativeRepairsCompleted: boolean;
    squareFootageConfirmed: boolean;
    hasSolar: boolean;
    hasDaylighting: boolean;
    daylightFactor?: number;
    
    // Checklist responses
    checklistResponses: Array<{
      category: string;
      question: string;
      response: 'YES' | 'NO' | 'NA';
      notes?: string;
      required: boolean;
    }>;
  };
  
  // Deficiencies
  deficiencies: Array<{
    id: string;
    category: string;
    location: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    budgetAmount: number;
    photos: Array<{
      id: string;
      url: string;
      filename: string;
      location?: string;
    }>;
    recommendedAction: string;
    priority: number;
  }>;
  
  // Photos
  photos: Array<{
    id: string;
    type: 'overview' | 'deficiency' | 'detail';
    url: string;
    filename: string;
    location?: string;
    description?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  }>;
  
  // Executive Summary
  executiveSummary: {
    summaryText: string;
    keyFindings: string[];
    criticalIssues: string[];
    recommendedActions: string[];
    budgetRecommendation: 'Maintenance Only' | 'Minor Repairs' | 'Major Repairs' | 'Replacement Required';
    nextInspectionDate: string;
    estimatedCosts: {
      immediate: number;
      annual: number;
      capitalReplacement: number;
    };
  };
  
  // Capital Planning
  capitalExpenses: Array<{
    id: string;
    description: string;
    year: number;
    estimatedCost: number;
    scopeOfWork: string;
    priority: 'high' | 'medium' | 'low';
    completed: boolean;
  }>;
  
  // Compliance & Warranty
  compliance: {
    warrantyCompliant: boolean;
    manufactererWarrantyValid: boolean;
    installerWarrantyValid: boolean;
    lastMaintenanceDate?: string;
    nextMaintenanceRequired?: string;
  };
  
  // Workflow Configuration
  workflowConfig: {
    generatePdfReport: boolean;
    sendToPropertyManager: boolean;
    createWorkOrders: boolean;
    updateMaintenanceSchedule: boolean;
    notifyStakeholders: boolean;
    exportToCRM: boolean;
  };
}

interface WorkflowDataExporterProps {
  inspectionData: any;
  propertyData?: any;
  onExport?: (data: WorkflowInspectionData) => void;
  isTablet?: boolean;
}

export function WorkflowDataExporter({ 
  inspectionData, 
  propertyData,
  onExport,
  isTablet = false 
}: WorkflowDataExporterProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflowData, setWorkflowData] = useState<WorkflowInspectionData | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  const transformInspectionData = (): WorkflowInspectionData => {
    const now = new Date();
    
    // Transform deficiencies to include recommended actions and priority
    const transformedDeficiencies = (inspectionData.deficiencies || []).map((def: any, index: number) => ({
      id: def.id,
      category: def.category,
      location: def.location,
      description: def.description,
      severity: def.severity,
      budgetAmount: def.budgetAmount || 0,
      photos: (def.photos || []).map((photo: any) => ({
        id: photo.id,
        url: photo.url,
        filename: photo.file?.name || `deficiency-${def.id}-${photo.id}.jpg`,
        location: photo.location
      })),
      recommendedAction: generateRecommendedAction(def),
      priority: getSeverityPriority(def.severity)
    }));

    // Transform checklist responses
    const checklistResponses = (inspectionData.checklistData?.checklist || []).map((item: any) => ({
      category: item.category,
      question: item.question,
      response: item.response || 'NA',
      notes: item.notes,
      required: item.required
    }));

    // Calculate estimated costs
    const immediateCosts = transformedDeficiencies
      .filter((def: any) => def.severity === 'high')
      .reduce((sum: number, def: any) => sum + def.budgetAmount, 0);
    
    const annualCosts = transformedDeficiencies
      .filter((def: any) => def.severity === 'medium')
      .reduce((sum: number, def: any) => sum + def.budgetAmount, 0);
    
    const capitalCosts = (inspectionData.capitalExpenses || [])
      .reduce((sum: number, expense: any) => sum + expense.estimatedCost, 0);

    const workflowData: WorkflowInspectionData = {
      // Property Information
      propertyId: inspectionData.propertyId,
      propertyName: inspectionData.propertyName,
      propertyAddress: propertyData?.address,
      roofArea: propertyData?.roof_area,
      
      // Inspection Metadata
      inspectionId: `inspection-${now.getTime()}`,
      inspectionDate: now.toISOString(),
      inspectorId: 'current-user', // This would come from auth context
      inspectorName: 'Current Inspector', // This would come from auth context
      inspectionType: 'annual',
      budgetYear: inspectionData.checklistData?.budgetYear || now.getFullYear() + 1,
      
      // Roof Composition
      roofComposition: {
        roofSystem: inspectionData.roofCompositionData?.roofSystem || 'Unknown',
        systemDescription: inspectionData.roofCompositionData?.systemDescription || '',
        installationYear: inspectionData.roofCompositionData?.installationYear || 2020,
        layers: (inspectionData.roofCompositionData?.layers || []).map((layer: any) => ({
          layer: layer.layer,
          material: layer.material,
          thickness: layer.thickness,
          attachment: layer.attachment,
          description: layer.description
        })),
        hasRecover: inspectionData.roofCompositionData?.hasRecover || false,
        recoverType: inspectionData.roofCompositionData?.recoverType,
        recoverYear: inspectionData.roofCompositionData?.recoverYear
      },
      
      // Inspection Results
      inspectionResults: {
        overallCondition: inspectionData.executiveSummaryData?.overallCondition || 'Good',
        overallRating: inspectionData.executiveSummaryData?.overallRating || 4,
        completionPercentage: inspectionData.checklistData?.completionPercentage || 0,
        
        standingWater: inspectionData.checklistData?.standingWater === 'YES',
        roofAssemblyFailure: inspectionData.checklistData?.roofAssemblyFailure === 'YES',
        preventativeRepairsCompleted: inspectionData.checklistData?.preventativeRepairsCompleted === 'YES',
        squareFootageConfirmed: inspectionData.checklistData?.squareFootageConfirmed === 'YES',
        hasSolar: inspectionData.checklistData?.hasSolar === 'YES',
        hasDaylighting: inspectionData.checklistData?.hasDaylighting === 'YES',
        daylightFactor: inspectionData.checklistData?.daylightFactor,
        
        checklistResponses
      },
      
      // Deficiencies
      deficiencies: transformedDeficiencies,
      
      // Photos
      photos: [
        ...(inspectionData.overviewPhotos || []).map((photo: any) => ({
          id: photo.id,
          type: 'overview' as const,
          url: photo.url,
          filename: photo.file?.name || `overview-${photo.id}.jpg`,
          location: photo.location,
          description: 'Overview photo'
        })),
        ...transformedDeficiencies.flatMap((def: any) => def.photos.map((photo: any) => ({
          ...photo,
          type: 'deficiency' as const,
          description: `Deficiency: ${def.description}`
        })))
      ],
      
      // Executive Summary
      executiveSummary: {
        summaryText: inspectionData.executiveSummaryData?.summaryText || '',
        keyFindings: inspectionData.executiveSummaryData?.keyFindings || [],
        criticalIssues: inspectionData.executiveSummaryData?.criticalIssues || [],
        recommendedActions: inspectionData.executiveSummaryData?.recommendedActions || [],
        budgetRecommendation: inspectionData.executiveSummaryData?.budgetRecommendation || 'Maintenance Only',
        nextInspectionDate: inspectionData.executiveSummaryData?.nextInspectionDate || '',
        estimatedCosts: {
          immediate: immediateCosts,
          annual: annualCosts,
          capitalReplacement: capitalCosts
        }
      },
      
      // Capital Planning
      capitalExpenses: (inspectionData.capitalExpenses || []).map((expense: any) => ({
        id: expense.id,
        description: expense.description,
        year: expense.year,
        estimatedCost: expense.estimatedCost,
        scopeOfWork: expense.scopeOfWork,
        priority: 'medium' as const,
        completed: expense.completed || false
      })),
      
      // Compliance & Warranty
      compliance: {
        warrantyCompliant: true, // This would be calculated based on maintenance history
        manufactererWarrantyValid: propertyData?.manufacturer_has_warranty || false,
        installerWarrantyValid: propertyData?.installer_has_warranty || false,
        lastMaintenanceDate: propertyData?.last_maintenance_date,
        nextMaintenanceRequired: calculateNextMaintenance()
      },
      
      // Workflow Configuration
      workflowConfig: {
        generatePdfReport: true,
        sendToPropertyManager: true,
        createWorkOrders: transformedDeficiencies.some((def: any) => def.severity === 'high'),
        updateMaintenanceSchedule: true,
        notifyStakeholders: inspectionData.executiveSummaryData?.criticalIssues?.length > 0,
        exportToCRM: true
      }
    };

    return workflowData;
  };

  const generateRecommendedAction = (deficiency: any): string => {
    const actionMap: Record<string, string> = {
      'Perimeter Flashing': 'Repair or replace perimeter flashing to prevent water infiltration',
      'Curb Flashing': 'Reseal curb flashing and inspect penetration integrity',
      'Penetration': 'Reseal penetration with appropriate flashing system',
      'Roof Top Equipment': 'Service equipment and verify proper support and flashing',
      'Gutters/Downspouts': 'Clean and repair drainage system components',
      'Roofing Drains': 'Clear drain and inspect surrounding membrane',
      'Scuppers': 'Clear scuppers and verify proper drainage flow',
      'Debris': 'Remove debris and inspect underlying membrane for damage',
      'Membrane Failures': 'Patch or replace damaged membrane sections',
      'General Wear': 'Monitor condition and plan for preventative maintenance',
      'Structural Issues': 'Conduct structural engineering assessment'
    };

    return actionMap[deficiency.category] || 'Evaluate and repair as needed';
  };

  const getSeverityPriority = (severity: string): number => {
    switch (severity) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 2;
    }
  };

  const calculateNextMaintenance = (): string => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
  };

  const handleExportData = async () => {
    setIsProcessing(true);
    
    try {
      const transformedData = transformInspectionData();
      setWorkflowData(transformedData);
      
      if (onExport) {
        await onExport(transformedData);
      }
      
      toast({
        title: "Workflow Data Prepared",
        description: "Inspection data has been formatted for n8n workflow automation."
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to prepare workflow data. Please check your inspection data.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyJson = () => {
    if (workflowData) {
      navigator.clipboard.writeText(JSON.stringify(workflowData, null, 2));
      toast({
        title: "Copied to Clipboard",
        description: "Workflow JSON data copied to clipboard."
      });
    }
  };

  const handleDownloadJson = () => {
    if (workflowData) {
      const blob = new Blob([JSON.stringify(workflowData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspection-workflow-${workflowData.inspectionId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getDataCompleteness = () => {
    const checks = [
      inspectionData.roofCompositionData?.roofSystem,
      inspectionData.checklistData?.completionPercentage > 80,
      inspectionData.executiveSummaryData?.summaryText,
      inspectionData.deficiencies?.length > 0 || inspectionData.overviewPhotos?.length > 0
    ];
    
    const completedChecks = checks.filter(Boolean).length;
    return {
      percentage: Math.round((completedChecks / checks.length) * 100),
      isComplete: completedChecks === checks.length
    };
  };

  const completeness = getDataCompleteness();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isTablet ? 'text-2xl' : 'text-xl'}`}>
            <Workflow className={isTablet ? 'h-7 w-7' : 'h-6 w-6'} />
            n8n Workflow Automation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className={`font-medium ${isTablet ? 'text-lg' : 'text-base'}`}>
                Data Completeness
              </h3>
              <p className={`text-muted-foreground ${isTablet ? 'text-base' : 'text-sm'}`}>
                {completeness.percentage}% complete for workflow automation
              </p>
            </div>
            <div className="flex items-center gap-2">
              {completeness.isComplete ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-orange-500" />
              )}
              <Badge variant={completeness.isComplete ? "default" : "secondary"}>
                {completeness.isComplete ? "Ready" : "Incomplete"}
              </Badge>
            </div>
          </div>

          {!completeness.isComplete && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Complete the roof composition, inspection checklist, and executive summary to enable full workflow automation.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={handleExportData}
              disabled={isProcessing}
              className="flex-1"
              size={isTablet ? "lg" : "default"}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Prepare Workflow Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {workflowData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={isTablet ? 'text-xl' : 'text-lg'}>
                Workflow Data Ready
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size={isTablet ? "default" : "sm"}
                  onClick={() => setShowJsonPreview(!showJsonPreview)}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  {showJsonPreview ? 'Hide' : 'Show'} JSON
                </Button>
                <Button
                  variant="outline"
                  size={isTablet ? "default" : "sm"}
                  onClick={handleCopyJson}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size={isTablet ? "default" : "sm"}
                  onClick={handleDownloadJson}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className={`font-semibold ${isTablet ? 'text-lg' : 'text-base'}`}>
                  {workflowData.deficiencies.length}
                </p>
                <p className={`text-muted-foreground ${isTablet ? 'text-base' : 'text-sm'}`}>
                  Deficiencies
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className={`font-semibold ${isTablet ? 'text-lg' : 'text-base'}`}>
                  {workflowData.photos.length}
                </p>
                <p className={`text-muted-foreground ${isTablet ? 'text-base' : 'text-sm'}`}>
                  Photos
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className={`font-semibold ${isTablet ? 'text-lg' : 'text-base'}`}>
                  ${workflowData.executiveSummary.estimatedCosts.immediate.toLocaleString()}
                </p>
                <p className={`text-muted-foreground ${isTablet ? 'text-base' : 'text-sm'}`}>
                  Immediate Costs
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>
                Workflow Actions
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(workflowData.workflowConfig).map(([key, value]) => (
                  <Badge
                    key={key}
                    variant={value ? "default" : "secondary"}
                    className={isTablet ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'}
                  >
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </div>

            {showJsonPreview && (
              <div className="space-y-2">
                <h4 className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>
                  JSON Preview
                </h4>
                <pre className={`bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 ${isTablet ? 'text-sm' : 'text-xs'}`}>
                  {JSON.stringify(workflowData, null, 2)}
                </pre>
              </div>
            )}

            <Alert>
              <Send className="h-4 w-4" />
              <AlertDescription>
                This structured data can be sent to your n8n workflow endpoint to automatically generate reports, 
                create work orders, update maintenance schedules, and notify stakeholders.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}