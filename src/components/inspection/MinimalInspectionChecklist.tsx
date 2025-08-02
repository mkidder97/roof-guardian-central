import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Calendar,
  Droplets,
  AlertTriangle,
  Wrench,
  Ruler,
  FileText,
  Edit
} from "lucide-react";

interface MinimalInspectionData {
  budgetYear: 2025 | 2026 | null;
  standingWater: boolean | null;
  roofAssemblyFailure: boolean | null;
  preventativeRepairsCompleted: boolean | null;
  squareFootageConfirmed: boolean | null;
  inspectionFindings: string;
  completionPercentage: number;
}

interface MinimalInspectionChecklistProps {
  initialData?: Partial<MinimalInspectionData>;
  onDataChange: (data: MinimalInspectionData) => void;
  isTablet?: boolean;
}

export function MinimalInspectionChecklist({ 
  initialData, 
  onDataChange, 
  isTablet = false 
}: MinimalInspectionChecklistProps) {
  
  const [data, setData] = useState<MinimalInspectionData>({
    budgetYear: null,
    standingWater: null,
    roofAssemblyFailure: null,
    preventativeRepairsCompleted: null,
    squareFootageConfirmed: null,
    inspectionFindings: '',
    completionPercentage: 0,
    ...initialData
  });

  // Calculate completion percentage
  useEffect(() => {
    const requiredFields = [
      data.budgetYear,
      data.standingWater,
      data.roofAssemblyFailure,
      data.preventativeRepairsCompleted,
      data.squareFootageConfirmed
    ];
    
    const completedFields = requiredFields.filter(field => field !== null).length;
    const percentage = Math.round((completedFields / requiredFields.length) * 100);
    
    setData(prev => ({
      ...prev,
      completionPercentage: percentage
    }));
  }, [data.budgetYear, data.standingWater, data.roofAssemblyFailure, data.preventativeRepairsCompleted, data.squareFootageConfirmed]);

  // Notify parent of changes
  useEffect(() => {
    onDataChange(data);
  }, [data, onDataChange]);

  const updateData = (field: keyof MinimalInspectionData, value: any) => {
    setData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getYearButton = (year: 2025 | 2026) => (
    <Button
      variant={data.budgetYear === year ? "default" : "outline"}
      onClick={() => updateData('budgetYear', year)}
      className={`${isTablet ? 'h-12 px-6 text-base' : 'h-10 px-4'} min-w-[80px]`}
    >
      {year}
    </Button>
  );

  const getYesNoButtons = (
    field: 'standingWater' | 'roofAssemblyFailure' | 'preventativeRepairsCompleted' | 'squareFootageConfirmed',
    currentValue: boolean | null
  ) => (
    <div className="flex gap-3">
      <Button
        variant={currentValue === true ? "default" : "outline"}
        onClick={() => updateData(field, true)}
        className={`min-w-[80px] ${isTablet ? 'h-12 text-base' : 'h-10'} ${
          currentValue === true ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'
        }`}
      >
        Yes
      </Button>
      <Button
        variant={currentValue === false ? "default" : "outline"}
        onClick={() => updateData(field, false)}
        className={`min-w-[80px] ${isTablet ? 'h-12 text-base' : 'h-10'} ${
          currentValue === false ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-50'
        }`}
      >
        No
      </Button>
    </div>
  );

  const getQuestionIcon = (questionType: string) => {
    switch (questionType) {
      case 'budget':
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case 'water':
        return <Droplets className="h-4 w-4 text-blue-600" />;
      case 'assembly':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'repairs':
        return <Wrench className="h-4 w-4 text-orange-600" />;
      case 'footage':
        return <Ruler className="h-4 w-4 text-green-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const isComplete = data.completionPercentage === 100;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={`${isTablet ? 'text-2xl' : 'text-xl'} flex items-center gap-2`}>
              <FileText className="h-6 w-6" />
              Inspection Checklist
            </CardTitle>
            <Badge 
              variant={isComplete ? "default" : "secondary"}
              className={`${isTablet ? 'text-base px-3 py-1' : 'text-sm'} ${
                isComplete ? 'bg-green-600' : ''
              }`}
            >
              {isComplete && <CheckCircle className="h-3 w-3 mr-1" />}
              {data.completionPercentage}% Complete
            </Badge>
          </div>
          <Progress value={data.completionPercentage} className="mt-2" />
        </CardHeader>
      </Card>

      {/* Essential Questions */}
      <Card>
        <CardContent className="space-y-8 pt-6">
          
          {/* Budget Year Selection */}
          <div className="space-y-3">
            <Label className={`${isTablet ? 'text-lg' : 'text-base'} font-medium flex items-center gap-2`}>
              {getQuestionIcon('budget')}
              Select Inspection Budget Year <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-4">
              {getYearButton(2025)}
              {getYearButton(2026)}
            </div>
          </div>

          {/* Standing Water */}
          <div className="space-y-3">
            <Label className={`${isTablet ? 'text-lg' : 'text-base'} font-medium flex items-center gap-2`}>
              {getQuestionIcon('water')}
              Is there standing water? <span className="text-red-500">*</span>
            </Label>
            {getYesNoButtons('standingWater', data.standingWater)}
          </div>

          {/* Roof Assembly Failure */}
          <div className="space-y-3">
            <Label className={`${isTablet ? 'text-lg' : 'text-base'} font-medium flex items-center gap-2`}>
              {getQuestionIcon('assembly')}
              Is there roof assembly failure? <span className="text-red-500">*</span>
            </Label>
            {getYesNoButtons('roofAssemblyFailure', data.roofAssemblyFailure)}
          </div>

          {/* Preventative Repairs */}
          <div className="space-y-3">
            <Label className={`${isTablet ? 'text-lg' : 'text-base'} font-medium flex items-center gap-2`}>
              {getQuestionIcon('repairs')}
              Were last year's preventative repairs completed? <span className="text-red-500">*</span>
            </Label>
            {getYesNoButtons('preventativeRepairsCompleted', data.preventativeRepairsCompleted)}
          </div>

          {/* Square Footage Confirmation */}
          <div className="space-y-3">
            <Label className={`${isTablet ? 'text-lg' : 'text-base'} font-medium flex items-center gap-2`}>
              {getQuestionIcon('footage')}
              Did you confirm roof square footage? <span className="text-red-500">*</span>
            </Label>
            {getYesNoButtons('squareFootageConfirmed', data.squareFootageConfirmed)}
          </div>

        </CardContent>
      </Card>

      {/* Inspection Findings */}
      <Card>
        <CardHeader>
          <CardTitle className={`${isTablet ? 'text-xl' : 'text-lg'} flex items-center gap-2`}>
            <Edit className="h-5 w-5" />
            Inspection Findings <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.inspectionFindings}
            onChange={(e) => updateData('inspectionFindings', e.target.value)}
            placeholder="Enter detailed inspection findings, observations, and recommendations..."
            className={`${isTablet ? 'min-h-[120px] text-base' : 'min-h-[100px]'} resize-none`}
          />
        </CardContent>
      </Card>

      {/* Completion Status */}
      {isComplete && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-800">
              <CheckCircle className="h-6 w-6" />
              <div>
                <p className="font-medium">Inspection checklist complete!</p>
                <p className="text-sm text-green-600">All required fields have been filled out.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}