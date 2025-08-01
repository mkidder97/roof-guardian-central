import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  MinusCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Sun,
  Droplets,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  category: string;
  question: string;
  response: 'YES' | 'NO' | 'NA' | null;
  required: boolean;
  notes?: string;
  followUpRequired?: boolean;
}

interface InspectionChecklistData {
  budgetYear: number;
  standingWater: 'YES' | 'NO' | null;
  roofAssemblyFailure: 'YES' | 'NO' | null;
  preventativeRepairsCompleted: 'YES' | 'NO' | null;
  squareFootageConfirmed: 'YES' | 'NO' | null;
  hasSolar: 'YES' | 'NO' | null;
  hasDaylighting: 'YES' | 'NO' | null;
  daylightFactor: number;
  checklist: ChecklistItem[];
  completionPercentage: number;
}

interface InspectionChecklistProps {
  initialData?: Partial<InspectionChecklistData>;
  onDataChange: (data: InspectionChecklistData) => void;
  isTablet?: boolean;
}

// Professional inspection checklist items based on industry standards
const DEFAULT_CHECKLIST_ITEMS: Omit<ChecklistItem, 'id'>[] = [
  // Budget and Planning
  {
    category: 'Budget & Planning',
    question: 'Select Inspection Budget Year',
    response: null,
    required: true
  },
  
  // Water Management
  {
    category: 'Water Management',
    question: 'Is there standing water on the roof?',
    response: null,
    required: true,
    followUpRequired: true
  },
  {
    category: 'Water Management',
    question: 'Are all drains, scuppers, and gutters clear of debris?',
    response: null,
    required: true
  },
  {
    category: 'Water Management',
    question: 'Is the drainage system functioning properly?',
    response: null,
    required: true
  },

  // Roof Assembly
  {
    category: 'Roof Assembly',
    question: 'Is there roof assembly failure?',
    response: null,
    required: true,
    followUpRequired: true
  },
  {
    category: 'Roof Assembly',
    question: 'Are all membrane seams intact and properly sealed?',
    response: null,
    required: true
  },
  {
    category: 'Roof Assembly',
    question: 'Is the membrane surface in good condition?',
    response: null,
    required: true
  },

  // Maintenance History
  {
    category: 'Maintenance',
    question: 'Were last year\'s preventative repairs completed?',
    response: null,
    required: true
  },
  {
    category: 'Maintenance',
    question: 'Have all warranty requirements been met?',
    response: null,
    required: false
  },

  // Measurements
  {
    category: 'Measurements',
    question: 'Did you confirm roof square footage?',
    response: null,
    required: true
  },

  // Solar and Daylighting
  {
    category: 'Solar & Daylighting',
    question: 'Does the roof have solar installations?',
    response: null,
    required: true
  },
  {
    category: 'Solar & Daylighting',
    question: 'Does the roof have daylighting (skylights)?',
    response: null,
    required: true
  },

  // Flashing and Penetrations
  {
    category: 'Flashing & Penetrations',
    question: 'Are all roof penetrations properly flashed and sealed?',
    response: null,
    required: true
  },
  {
    category: 'Flashing & Penetrations',
    question: 'Is perimeter flashing in good condition?',
    response: null,
    required: true
  },
  {
    category: 'Flashing & Penetrations',
    question: 'Are curb flashings properly installed and maintained?',
    response: null,
    required: true
  },

  // Equipment and Access
  {
    category: 'Equipment & Access',
    question: 'Is all rooftop equipment properly supported and flashed?',
    response: null,
    required: true
  },
  {
    category: 'Equipment & Access',
    question: 'Are walkways and access paths in good condition?',
    response: null,
    required: false
  },

  // Safety
  {
    category: 'Safety',
    question: 'Are there any immediate safety concerns?',
    response: null,
    required: true,
    followUpRequired: true
  },
  {
    category: 'Safety',
    question: 'Are fall protection systems in place where required?',
    response: null,
    required: true
  }
];

export function InspectionChecklist({ 
  initialData, 
  onDataChange, 
  isTablet = false 
}: InspectionChecklistProps) {
  const { toast } = useToast();
  
  const [checklistData, setChecklistData] = useState<InspectionChecklistData>({
    budgetYear: new Date().getFullYear() + 1,
    standingWater: null,
    roofAssemblyFailure: null,
    preventativeRepairsCompleted: null,
    squareFootageConfirmed: null,
    hasSolar: null,
    hasDaylighting: null,
    daylightFactor: 0,
    checklist: [],
    completionPercentage: 0,
    ...initialData
  });

  // Initialize checklist items if none exist
  useEffect(() => {
    if (checklistData.checklist.length === 0) {
      const initialChecklist: ChecklistItem[] = DEFAULT_CHECKLIST_ITEMS.map((item, index) => ({
        ...item,
        id: `checklist-${Date.now()}-${index}`
      }));
      
      setChecklistData(prev => ({
        ...prev,
        checklist: initialChecklist
      }));
    }
  }, []);

  // Calculate completion percentage
  useEffect(() => {
    const totalItems = checklistData.checklist.filter(item => item.required).length + 4; // 4 main questions
    const completedItems = [
      checklistData.standingWater,
      checklistData.roofAssemblyFailure,
      checklistData.preventativeRepairsCompleted,
      checklistData.squareFootageConfirmed
    ].filter(Boolean).length + 
    checklistData.checklist.filter(item => item.required && item.response).length;
    
    const percentage = Math.round((completedItems / totalItems) * 100);
    
    setChecklistData(prev => ({
      ...prev,
      completionPercentage: percentage
    }));
  }, [checklistData.checklist, checklistData.standingWater, checklistData.roofAssemblyFailure, checklistData.preventativeRepairsCompleted, checklistData.squareFootageConfirmed]);

  // Notify parent of data changes
  useEffect(() => {
    onDataChange(checklistData);
  }, [checklistData, onDataChange]);

  const updateChecklistItem = (itemId: string, updates: Partial<ChecklistItem>) => {
    setChecklistData(prev => ({
      ...prev,
      checklist: prev.checklist.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    }));
  };

  const getResponseIcon = (response: 'YES' | 'NO' | 'NA' | null) => {
    switch (response) {
      case 'YES':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'NO':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'NA':
        return <MinusCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getResponseButton = (
    currentResponse: 'YES' | 'NO' | 'NA' | null,
    targetResponse: 'YES' | 'NO' | 'NA',
    onClick: () => void
  ) => {
    const isSelected = currentResponse === targetResponse;
    const baseClasses = `min-w-[60px] ${isTablet ? 'h-12 px-4 text-base' : 'h-10 px-3 text-sm'}`;
    
    switch (targetResponse) {
      case 'YES':
        return (
          <Button
            variant={isSelected ? "default" : "outline"}
            className={`${baseClasses} ${isSelected ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'}`}
            onClick={onClick}
          >
            YES
          </Button>
        );
      case 'NO':
        return (
          <Button
            variant={isSelected ? "default" : "outline"}
            className={`${baseClasses} ${isSelected ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-50'}`}
            onClick={onClick}
          >
            NO
          </Button>
        );
      case 'NA':
        return (
          <Button
            variant={isSelected ? "default" : "outline"}
            className={`${baseClasses} ${isSelected ? 'bg-gray-600 hover:bg-gray-700' : 'hover:bg-gray-50'}`}
            onClick={onClick}
          >
            N/A
          </Button>
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'water management':
        return <Droplets className="h-5 w-5 text-blue-500" />;
      case 'solar & daylighting':
        return <Sun className="h-5 w-5 text-yellow-500" />;
      case 'budget & planning':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      case 'safety':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'equipment & access':
        return <Settings className="h-5 w-5 text-gray-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const groupedChecklist = checklistData.checklist.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category].push(item);
    return groups;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={isTablet ? 'text-2xl' : 'text-xl'}>
              Inspection Checklist Progress
            </CardTitle>
            <Badge 
              variant={checklistData.completionPercentage === 100 ? "default" : "secondary"}
              className={isTablet ? 'text-base px-3 py-1' : 'text-sm'}
            >
              {checklistData.completionPercentage}% Complete
            </Badge>
          </div>
          <Progress value={checklistData.completionPercentage} className="mt-2" />
        </CardHeader>
      </Card>

      {/* Primary Questions */}
      <Card>
        <CardHeader>
          <CardTitle className={isTablet ? 'text-xl' : 'text-lg'}>
            Key Inspection Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Budget Year Selection */}
          <div>
            <Label className={`${isTablet ? 'text-base' : 'text-sm'} font-medium flex items-center gap-2`}>
              <Calendar className="h-4 w-4" />
              Select Inspection Budget Year *
            </Label>
            <div className="flex gap-4 mt-2">
              {[2025, 2026].map(year => (
                <Button
                  key={year}
                  variant={checklistData.budgetYear === year ? "default" : "outline"}
                  onClick={() => setChecklistData(prev => ({ ...prev, budgetYear: year }))}
                  className={isTablet ? 'h-12 px-6 text-base' : 'h-10 px-4'}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Standing Water */}
          <div>
            <Label className={`${isTablet ? 'text-base' : 'text-sm'} font-medium flex items-center gap-2`}>
              <Droplets className="h-4 w-4 text-blue-500" />
              Is there standing water? *
            </Label>
            <div className="flex gap-2 mt-2">
              {getResponseButton(
                checklistData.standingWater,
                'NO',
                () => setChecklistData(prev => ({ ...prev, standingWater: 'NO' }))
              )}
              {getResponseButton(
                checklistData.standingWater,
                'YES',
                () => setChecklistData(prev => ({ ...prev, standingWater: 'YES' }))
              )}
            </div>
          </div>

          {/* Roof Assembly Failure */}
          <div>
            <Label className={`${isTablet ? 'text-base' : 'text-sm'} font-medium flex items-center gap-2`}>
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Is there roof assembly failure? *
            </Label>
            <div className="flex gap-2 mt-2">
              {getResponseButton(
                checklistData.roofAssemblyFailure,
                'NO',
                () => setChecklistData(prev => ({ ...prev, roofAssemblyFailure: 'NO' }))
              )}
              {getResponseButton(
                checklistData.roofAssemblyFailure,
                'YES',
                () => setChecklistData(prev => ({ ...prev, roofAssemblyFailure: 'YES' }))
              )}
            </div>
          </div>

          {/* Preventative Repairs */}
          <div>
            <Label className={`${isTablet ? 'text-base' : 'text-sm'} font-medium`}>
              Were last year's preventative repairs completed? *
            </Label>
            <div className="flex gap-2 mt-2">
              {getResponseButton(
                checklistData.preventativeRepairsCompleted,
                'YES',
                () => setChecklistData(prev => ({ ...prev, preventativeRepairsCompleted: 'YES' }))
              )}
              {getResponseButton(
                checklistData.preventativeRepairsCompleted,
                'NO',
                () => setChecklistData(prev => ({ ...prev, preventativeRepairsCompleted: 'NO' }))
              )}
            </div>
          </div>

          {/* Square Footage Confirmation */}
          <div>
            <Label className={`${isTablet ? 'text-base' : 'text-sm'} font-medium`}>
              Did you confirm roof square footage? *
            </Label>
            <div className="flex gap-2 mt-2">
              {getResponseButton(
                checklistData.squareFootageConfirmed,
                'YES',
                () => setChecklistData(prev => ({ ...prev, squareFootageConfirmed: 'YES' }))
              )}
              {getResponseButton(
                checklistData.squareFootageConfirmed,
                'NO',
                () => setChecklistData(prev => ({ ...prev, squareFootageConfirmed: 'NO' }))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Checklist by Category */}
      {Object.entries(groupedChecklist).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className={`${isTablet ? 'text-lg' : 'text-base'} flex items-center gap-2`}>
              {getCategoryIcon(category)}
              {category}
              <Badge variant="outline">
                {items.filter(item => item.response).length}/{items.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Label className={`${isTablet ? 'text-base' : 'text-sm'} font-medium flex items-center gap-2`}>
                      {getResponseIcon(item.response)}
                      {item.question}
                      {item.required && <span className="text-red-500">*</span>}
                    </Label>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-7">
                  {getResponseButton(
                    item.response,
                    'YES',
                    () => updateChecklistItem(item.id, { response: 'YES' })
                  )}
                  {getResponseButton(
                    item.response,
                    'NO',
                    () => updateChecklistItem(item.id, { response: 'NO' })
                  )}
                  {getResponseButton(
                    item.response,
                    'NA',
                    () => updateChecklistItem(item.id, { response: 'NA' })
                  )}
                </div>

                {item.response === 'NO' && item.followUpRequired && (
                  <div className="ml-7 mt-2">
                    <Input
                      placeholder="Please provide details about this issue..."
                      value={item.notes || ''}
                      onChange={(e) => updateChecklistItem(item.id, { notes: e.target.value })}
                      className={`${isTablet ? 'h-12 text-base' : 'h-10'} border-red-200 bg-red-50`}
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Solar and Daylighting Details */}
      <Card>
        <CardHeader>
          <CardTitle className={`${isTablet ? 'text-lg' : 'text-base'} flex items-center gap-2`}>
            <Sun className="h-5 w-5 text-yellow-500" />
            Solar & Daylighting Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className={`${isTablet ? 'text-base' : 'text-sm'} font-medium`}>
              Has Solar?
            </Label>
            <div className="flex gap-2 mt-2">
              {getResponseButton(
                checklistData.hasSolar,
                'NO',
                () => setChecklistData(prev => ({ ...prev, hasSolar: 'NO' }))
              )}
              {getResponseButton(
                checklistData.hasSolar,
                'YES',
                () => setChecklistData(prev => ({ ...prev, hasSolar: 'YES' }))
              )}
            </div>
          </div>

          <div>
            <Label className={`${isTablet ? 'text-base' : 'text-sm'} font-medium`}>
              Has Daylighting?
            </Label>
            <div className="flex gap-2 mt-2">
              {getResponseButton(
                checklistData.hasDaylighting,
                'YES',
                () => setChecklistData(prev => ({ ...prev, hasDaylighting: 'YES' }))
              )}
              {getResponseButton(
                checklistData.hasDaylighting,
                'NO',
                () => setChecklistData(prev => ({ ...prev, hasDaylighting: 'NO' }))
              )}
            </div>
          </div>

          {checklistData.hasDaylighting === 'YES' && (
            <div>
              <Label className={`${isTablet ? 'text-base' : 'text-sm'} font-medium`}>
                Daylight Factor (%)
              </Label>
              <Input
                type="number"
                value={checklistData.daylightFactor}
                onChange={(e) => setChecklistData(prev => ({ 
                  ...prev, 
                  daylightFactor: parseFloat(e.target.value) || 0 
                }))}
                className={isTablet ? 'h-12 text-base w-32' : 'h-10 w-24'}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}