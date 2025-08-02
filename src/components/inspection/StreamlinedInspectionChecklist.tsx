import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  Sun,
  Droplets,
  Settings,
  Shield,
  Ruler,
  Wrench,
  Zap,
  ArrowRight,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InspectionStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  questions: Question[];
  isComplete: boolean;
}

interface Question {
  id: string;
  text: string;
  type: 'yes_no' | 'yes_no_na' | 'year_select' | 'number' | 'text';
  response: any;
  required: boolean;
  followUpRequired?: boolean;
  followUpText?: string;
  options?: any[];
  condition?: (data: any) => boolean; // Only show question if condition is true
}

interface StreamlinedInspectionData {
  // Essential Info
  budgetYear: number;
  squareFootageConfirmed: boolean;
  confirmedSquareFootage?: number;
  
  // Critical Issues (show first for safety)
  hasImmediateSafetyConcerns: boolean | null;
  safetyDetails?: string;
  hasRoofAssemblyFailure: boolean | null;
  assemblyFailureDetails?: string;
  
  // Water Management
  hasStandingWater: boolean | null;
  waterDetails?: string;
  drainsAndGuttersClear: boolean | null;
  drainageSystemFunctioning: boolean | null;
  
  // Structural & Membrane
  membraneSeamsIntact: boolean | null;
  membraneSurfaceGood: boolean | null;
  penetrationsProperlyFlashed: boolean | null;
  perimeterFlashingGood: boolean | null;
  curbFlashingsGood: boolean | null;
  
  // Equipment & Solar
  hasSolar: boolean | null;
  solarDetails?: string;
  hasDaylighting: boolean | null;
  daylightDetails?: string;
  rooftopEquipmentSecure: boolean | null;
  walkwaysGood: boolean | null;
  
  // Maintenance History
  preventativeRepairsCompleted: boolean | null;
  warrantyRequirementsMet: boolean | null;
  
  // Safety & Access
  fallProtectionInPlace: boolean | null;
  
  completionPercentage: number;
}

interface StreamlinedInspectionChecklistProps {
  initialData?: Partial<StreamlinedInspectionData>;
  onDataChange: (data: StreamlinedInspectionData) => void;
  isTablet?: boolean;
}

export function StreamlinedInspectionChecklist({ 
  initialData, 
  onDataChange, 
  isTablet = false 
}: StreamlinedInspectionChecklistProps) {
  const { toast } = useToast();
  
  const [data, setData] = useState<StreamlinedInspectionData>({
    budgetYear: new Date().getFullYear() + 1,
    squareFootageConfirmed: false,
    hasImmediateSafetyConcerns: null,
    hasRoofAssemblyFailure: null,
    hasStandingWater: null,
    drainsAndGuttersClear: null,
    drainageSystemFunctioning: null,
    membraneSeamsIntact: null,
    membraneSurfaceGood: null,
    penetrationsProperlyFlashed: null,
    perimeterFlashingGood: null,
    curbFlashingsGood: null,
    hasSolar: null,
    hasDaylighting: null,
    rooftopEquipmentSecure: null,
    walkwaysGood: null,
    preventativeRepairsCompleted: null,
    warrantyRequirementsMet: null,
    fallProtectionInPlace: null,
    completionPercentage: 0,
    ...initialData
  });

  const [currentStep, setCurrentStep] = useState(0);

  // Define inspection steps in logical order
  const inspectionSteps: InspectionStep[] = [
    {
      id: 'setup',
      title: 'Inspection Setup',
      icon: <Calendar className="h-5 w-5" />,
      questions: [
        {
          id: 'budgetYear',
          text: 'Select Inspection Budget Year',
          type: 'year_select',
          response: data.budgetYear,
          required: true,
          options: [2025, 2026, 2027]
        },
        {
          id: 'squareFootageConfirmed',
          text: 'Did you confirm roof square footage?',
          type: 'yes_no',
          response: data.squareFootageConfirmed,
          required: true,
          followUpRequired: true
        },
        {
          id: 'confirmedSquareFootage',
          text: 'Confirmed Square Footage',
          type: 'number',
          response: data.confirmedSquareFootage || '',
          required: false,
          condition: (d) => d.squareFootageConfirmed === true
        }
      ],
      isComplete: false
    },
    {
      id: 'safety',
      title: 'Immediate Safety Assessment',
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      questions: [
        {
          id: 'hasImmediateSafetyConcerns',
          text: 'Are there any immediate safety concerns?',
          type: 'yes_no',
          response: data.hasImmediateSafetyConcerns,
          required: true,
          followUpRequired: true
        },
        {
          id: 'safetyDetails',
          text: 'Describe safety concerns in detail',
          type: 'text',
          response: data.safetyDetails || '',
          required: true,
          condition: (d) => d.hasImmediateSafetyConcerns === true
        },
        {
          id: 'fallProtectionInPlace',
          text: 'Are fall protection systems in place where required?',
          type: 'yes_no',
          response: data.fallProtectionInPlace,
          required: true
        }
      ],
      isComplete: false
    },
    {
      id: 'structural',
      title: 'Structural & Assembly',
      icon: <Settings className="h-5 w-5 text-gray-600" />,
      questions: [
        {
          id: 'hasRoofAssemblyFailure',
          text: 'Is there any roof assembly failure?',
          type: 'yes_no',
          response: data.hasRoofAssemblyFailure,
          required: true,
          followUpRequired: true
        },
        {
          id: 'assemblyFailureDetails',
          text: 'Describe assembly failure in detail',
          type: 'text',
          response: data.assemblyFailureDetails || '',
          required: true,
          condition: (d) => d.hasRoofAssemblyFailure === true
        },
        {
          id: 'membraneSeamsIntact',
          text: 'Are all membrane seams intact and properly sealed?',
          type: 'yes_no_na',
          response: data.membraneSeamsIntact,
          required: true
        },
        {
          id: 'membraneSurfaceGood',
          text: 'Is the membrane surface in good condition?',
          type: 'yes_no_na',
          response: data.membraneSurfaceGood,
          required: true
        }
      ],
      isComplete: false
    },
    {
      id: 'water',
      title: 'Water Management',
      icon: <Droplets className="h-5 w-5 text-blue-500" />,
      questions: [
        {
          id: 'hasStandingWater',
          text: 'Is there standing water on the roof?',
          type: 'yes_no',
          response: data.hasStandingWater,
          required: true,
          followUpRequired: true
        },
        {
          id: 'waterDetails',
          text: 'Describe standing water locations and severity',
          type: 'text',
          response: data.waterDetails || '',
          required: true,
          condition: (d) => d.hasStandingWater === true
        },
        {
          id: 'drainsAndGuttersClear',
          text: 'Are all drains, scuppers, and gutters clear of debris?',
          type: 'yes_no_na',
          response: data.drainsAndGuttersClear,
          required: true
        },
        {
          id: 'drainageSystemFunctioning',
          text: 'Is the drainage system functioning properly?',
          type: 'yes_no_na',
          response: data.drainageSystemFunctioning,
          required: true
        }
      ],
      isComplete: false
    },
    {
      id: 'flashing',
      title: 'Flashing & Penetrations',
      icon: <Shield className="h-5 w-5 text-green-600" />,
      questions: [
        {
          id: 'penetrationsProperlyFlashed',
          text: 'Are all roof penetrations properly flashed and sealed?',
          type: 'yes_no_na',
          response: data.penetrationsProperlyFlashed,
          required: true
        },
        {
          id: 'perimeterFlashingGood',
          text: 'Is perimeter flashing in good condition?',
          type: 'yes_no_na',
          response: data.perimeterFlashingGood,
          required: true
        },
        {
          id: 'curbFlashingsGood',
          text: 'Are curb flashings properly installed and maintained?',
          type: 'yes_no_na',
          response: data.curbFlashingsGood,
          required: true
        }
      ],
      isComplete: false
    },
    {
      id: 'equipment',
      title: 'Equipment & Solar',
      icon: <Sun className="h-5 w-5 text-yellow-500" />,
      questions: [
        {
          id: 'hasSolar',
          text: 'Does the roof have solar installations?',
          type: 'yes_no',
          response: data.hasSolar,
          required: true
        },
        {
          id: 'solarDetails',
          text: 'Solar installation details (condition, type, issues)',
          type: 'text',
          response: data.solarDetails || '',
          required: false,
          condition: (d) => d.hasSolar === true
        },
        {
          id: 'hasDaylighting',
          text: 'Does the roof have daylighting (skylights)?',
          type: 'yes_no',
          response: data.hasDaylighting,
          required: true
        },
        {
          id: 'daylightDetails',
          text: 'Skylight details (condition, type, issues)',
          type: 'text',
          response: data.daylightDetails || '',
          required: false,
          condition: (d) => d.hasDaylighting === true
        },
        {
          id: 'rooftopEquipmentSecure',
          text: 'Is all rooftop equipment properly supported and flashed?',
          type: 'yes_no_na',
          response: data.rooftopEquipmentSecure,
          required: true
        },
        {
          id: 'walkwaysGood',
          text: 'Are walkways and access paths in good condition?',
          type: 'yes_no_na',
          response: data.walkwaysGood,
          required: false
        }
      ],
      isComplete: false
    },
    {
      id: 'maintenance',
      title: 'Maintenance History',
      icon: <Wrench className="h-5 w-5 text-purple-600" />,
      questions: [
        {
          id: 'preventativeRepairsCompleted',
          text: 'Were last year\'s preventative repairs completed?',
          type: 'yes_no_na',
          response: data.preventativeRepairsCompleted,
          required: true
        },
        {
          id: 'warrantyRequirementsMet',
          text: 'Have all warranty requirements been met?',
          type: 'yes_no_na',
          response: data.warrantyRequirementsMet,
          required: false
        }
      ],
      isComplete: false
    }
  ];

  // Calculate completion
  useEffect(() => {
    const totalRequired = inspectionSteps.reduce((total, step) => 
      total + step.questions.filter(q => q.required && (!q.condition || q.condition(data))).length, 0
    );
    
    const completed = inspectionSteps.reduce((total, step) => 
      total + step.questions.filter(q => {
        if (!q.required || (q.condition && !q.condition(data))) return false;
        return q.response !== null && q.response !== undefined && q.response !== '';
      }).length, 0
    );
    
    const percentage = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 0;
    
    setData(prev => ({
      ...prev,
      completionPercentage: percentage
    }));
  }, [data, inspectionSteps]);

  // Update step completion status
  useEffect(() => {
    inspectionSteps.forEach((step, index) => {
      const requiredQuestions = step.questions.filter(q => q.required && (!q.condition || q.condition(data)));
      const completedQuestions = requiredQuestions.filter(q => 
        q.response !== null && q.response !== undefined && q.response !== ''
      );
      step.isComplete = requiredQuestions.length > 0 && completedQuestions.length === requiredQuestions.length;
    });
  }, [data]);

  // Notify parent of changes
  useEffect(() => {
    onDataChange(data);
  }, [data, onDataChange]);

  const updateResponse = (questionId: string, value: any) => {
    setData(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const renderQuestion = (question: Question) => {
    // Skip if condition not met
    if (question.condition && !question.condition(data)) {
      return null;
    }

    const baseClasses = isTablet ? 'text-base' : 'text-sm';
    
    return (
      <div key={question.id} className="space-y-3">
        <Label className={`${baseClasses} font-medium flex items-center gap-2`}>
          {question.text}
          {question.required && <span className="text-red-500">*</span>}
        </Label>
        
        {question.type === 'yes_no' && (
          <div className="flex gap-3">
            <Button
              variant={question.response === true ? "default" : "outline"}
              className={`min-w-[80px] ${isTablet ? 'h-12 text-base' : 'h-10'} ${
                question.response === true ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'
              }`}
              onClick={() => updateResponse(question.id, true)}
            >
              YES
            </Button>
            <Button
              variant={question.response === false ? "default" : "outline"}
              className={`min-w-[80px] ${isTablet ? 'h-12 text-base' : 'h-10'} ${
                question.response === false ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-50'
              }`}
              onClick={() => updateResponse(question.id, false)}
            >
              NO
            </Button>
          </div>
        )}

        {question.type === 'yes_no_na' && (
          <div className="flex gap-3">
            <Button
              variant={question.response === true ? "default" : "outline"}
              className={`min-w-[80px] ${isTablet ? 'h-12 text-base' : 'h-10'} ${
                question.response === true ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'
              }`}
              onClick={() => updateResponse(question.id, true)}
            >
              YES
            </Button>
            <Button
              variant={question.response === false ? "default" : "outline"}
              className={`min-w-[80px] ${isTablet ? 'h-12 text-base' : 'h-10'} ${
                question.response === false ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-50'
              }`}
              onClick={() => updateResponse(question.id, false)}
            >
              NO
            </Button>
            <Button
              variant={question.response === null ? "default" : "outline"}
              className={`min-w-[80px] ${isTablet ? 'h-12 text-base' : 'h-10'} ${
                question.response === null ? 'bg-gray-600 hover:bg-gray-700' : 'hover:bg-gray-50'
              }`}
              onClick={() => updateResponse(question.id, null)}
            >
              N/A
            </Button>
          </div>
        )}

        {question.type === 'year_select' && question.options && (
          <div className="flex gap-3">
            {question.options.map(year => (
              <Button
                key={year}
                variant={question.response === year ? "default" : "outline"}
                onClick={() => updateResponse(question.id, year)}
                className={isTablet ? 'h-12 px-6 text-base' : 'h-10 px-4'}
              >
                {year}
              </Button>
            ))}
          </div>
        )}

        {question.type === 'number' && (
          <Input
            type="number"
            value={question.response || ''}
            onChange={(e) => updateResponse(question.id, parseFloat(e.target.value) || undefined)}
            className={isTablet ? 'h-12 text-base w-40' : 'h-10 w-32'}
            placeholder="Enter square footage"
          />
        )}

        {question.type === 'text' && (
          <Textarea
            value={question.response || ''}
            onChange={(e) => updateResponse(question.id, e.target.value)}
            className={isTablet ? 'min-h-[100px] text-base' : 'min-h-[80px]'}
            placeholder="Please provide details..."
          />
        )}

        {/* Follow-up alert for critical issues */}
        {(question.response === true && question.followUpRequired && 
          ['hasImmediateSafetyConcerns', 'hasRoofAssemblyFailure', 'hasStandingWater'].includes(question.id)) && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <strong>Action Required:</strong> This issue requires immediate attention and detailed documentation.
            </div>
          </div>
        )}
      </div>
    );
  };

  const currentStepData = inspectionSteps[currentStep];
  const visibleQuestions = currentStepData.questions.filter(q => !q.condition || q.condition(data));
  const completedSteps = inspectionSteps.filter(step => step.isComplete).length;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={isTablet ? 'text-2xl' : 'text-xl'}>
              Streamlined Inspection Checklist
            </CardTitle>
            <Badge 
              variant={data.completionPercentage === 100 ? "default" : "secondary"}
              className={isTablet ? 'text-base px-3 py-1' : 'text-sm'}
            >
              {data.completionPercentage}% Complete
            </Badge>
          </div>
          <Progress value={data.completionPercentage} className="mt-2" />
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
            <span>Step {currentStep + 1} of {inspectionSteps.length}</span>
            <span>•</span>
            <span>{completedSteps} steps completed</span>
          </div>
        </CardHeader>
      </Card>

      {/* Step Navigation */}
      <div className="flex flex-wrap gap-2">
        {inspectionSteps.map((step, index) => (
          <Button
            key={step.id}
            variant={currentStep === index ? "default" : step.isComplete ? "secondary" : "outline"}
            onClick={() => setCurrentStep(index)}
            className={`flex items-center gap-2 ${isTablet ? 'h-12 px-4 text-base' : 'h-10 px-3 text-sm'}`}
          >
            {step.icon}
            {step.title}
            {step.isComplete && <CheckCircle className="h-4 w-4" />}
          </Button>
        ))}
      </div>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle className={`${isTablet ? 'text-xl' : 'text-lg'} flex items-center gap-3`}>
            {currentStepData.icon}
            {currentStepData.title}
            {currentStepData.isComplete && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            )}
          </CardTitle>
          {currentStepData.id === 'safety' && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <Info className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <strong>Priority:</strong> Complete safety assessment before proceeding with other inspections.
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {visibleQuestions.map(renderQuestion)}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className={isTablet ? 'h-12 px-6 text-base' : 'h-10 px-4'}
        >
          Previous
        </Button>
        <Button
          onClick={() => setCurrentStep(Math.min(inspectionSteps.length - 1, currentStep + 1))}
          disabled={currentStep === inspectionSteps.length - 1}
          className={isTablet ? 'h-12 px-6 text-base' : 'h-10 px-4'}
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}