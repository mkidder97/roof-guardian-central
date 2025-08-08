import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Camera, 
  FileText, 
  MapPin,
  Clock,
  Eye,
  Shield,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProofRequirement {
  id: string;
  type: 'photo' | 'measurement' | 'documentation' | 'verification';
  title: string;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  evidence?: any;
  validationCriteria: {
    minPhotos?: number;
    specificLocations?: string[];
    measurementTypes?: string[];
    documentTypes?: string[];
  };
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  completedRequirements: number;
  totalRequirements: number;
  missingRequired: ProofRequirement[];
  warnings: string[];
  recommendations: string[];
}

interface ProofValidationProps {
  inspectionId: string;
  inspectionType: 'routine' | 'emergency' | 'follow-up';
  deficiencies: any[];
  photos: any[];
  notes: string;
  onValidationComplete: (result: ValidationResult) => void;
  onRequirementUpdate: (requirementId: string, evidence: any) => void;
}

export function ProofValidationSystem({
  inspectionId,
  inspectionType,
  deficiencies,
  photos,
  notes,
  onValidationComplete,
  onRequirementUpdate
}: ProofValidationProps) {
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<ProofRequirement[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    generateRequirements();
  }, [inspectionType, deficiencies]);

  useEffect(() => {
    validateInspection();
  }, [requirements, photos, deficiencies, notes]);

  const generateRequirements = useCallback(() => {
    const baseRequirements: ProofRequirement[] = [
      {
        id: 'overview-photos',
        type: 'photo',
        title: 'Overview Photos',
        description: 'General roof condition photos from multiple angles',
        isRequired: true,
        isCompleted: false,
        validationCriteria: {
          minPhotos: 4,
          specificLocations: ['North', 'South', 'East', 'West']
        }
      },
      {
        id: 'roof-access-verification',
        type: 'verification',
        title: 'Roof Access Verification',
        description: 'Confirm safe access to all inspected areas',
        isRequired: true,
        isCompleted: false,
        validationCriteria: {}
      },
      {
        id: 'safety-documentation',
        type: 'documentation',
        title: 'Safety Documentation',
        description: 'Document safety measures and conditions',
        isRequired: true,
        isCompleted: false,
        validationCriteria: {
          documentTypes: ['safety_checklist', 'weather_conditions']
        }
      }
    ];

    // Add deficiency-specific requirements
    const deficiencyRequirements: ProofRequirement[] = deficiencies.map((deficiency, index) => ({
      id: `deficiency-${deficiency.id || index}`,
      type: 'photo',
      title: `Deficiency Evidence - ${deficiency.category}`,
      description: `Photo evidence of ${deficiency.description}`,
      isRequired: deficiency.severity === 'high',
      isCompleted: false,
      validationCriteria: {
        minPhotos: deficiency.severity === 'high' ? 3 : 2,
        specificLocations: [deficiency.location]
      }
    }));

    // Add inspection type specific requirements
    const typeSpecificRequirements: ProofRequirement[] = [];
    
    if (inspectionType === 'emergency') {
      typeSpecificRequirements.push({
        id: 'emergency-assessment',
        type: 'verification',
        title: 'Emergency Assessment',
        description: 'Document immediate risks and safety concerns',
        isRequired: true,
        isCompleted: false,
        validationCriteria: {}
      });
    }

    if (inspectionType === 'follow-up') {
      typeSpecificRequirements.push({
        id: 'previous-work-verification',
        type: 'photo',
        title: 'Previous Work Verification',
        description: 'Document status of previously identified issues',
        isRequired: true,
        isCompleted: false,
        validationCriteria: {
          minPhotos: 2
        }
      });
    }

    const allRequirements = [
      ...baseRequirements,
      ...deficiencyRequirements,
      ...typeSpecificRequirements
    ];

    setRequirements(allRequirements);
  }, [inspectionType, deficiencies]);

  const validateInspection = useCallback(() => {
    setIsValidating(true);

    const updatedRequirements = requirements.map(req => {
      let isCompleted = false;
      let evidence = null;

      switch (req.type) {
        case 'photo':
          const relevantPhotos = photos.filter(photo => {
            if (req.validationCriteria.specificLocations) {
              return req.validationCriteria.specificLocations.some(location =>
                photo.location?.toLowerCase().includes(location.toLowerCase())
              );
            }
            return photo.type === 'overview' || photo.type === 'deficiency';
          });

          isCompleted = relevantPhotos.length >= (req.validationCriteria.minPhotos || 1);
          evidence = { photos: relevantPhotos, count: relevantPhotos.length };
          break;

        case 'documentation':
          isCompleted = notes.length > 50; // Basic documentation check
          evidence = { notesLength: notes.length, hasNotes: notes.length > 0 };
          break;

        case 'verification':
          // Manual verification - assume completed for now
          // In real implementation, this would check specific criteria
          isCompleted = true;
          evidence = { verified: true, timestamp: Date.now() };
          break;

        case 'measurement':
          // Check if measurements are provided in deficiencies or notes
          const hasMeasurements = deficiencies.some(def => 
            def.budgetAmount > 0 || def.description.includes('sq ft') || def.description.includes('linear ft')
          );
          isCompleted = hasMeasurements;
          evidence = { measurementsFound: hasMeasurements };
          break;
      }

      return {
        ...req,
        isCompleted,
        evidence
      };
    });

    setRequirements(updatedRequirements);

    // Calculate validation result
    const totalRequirements = updatedRequirements.length;
    const completedRequirements = updatedRequirements.filter(req => req.isCompleted).length;
    const missingRequired = updatedRequirements.filter(req => req.isRequired && !req.isCompleted);
    
    const score = Math.round((completedRequirements / totalRequirements) * 100);
    const isValid = missingRequired.length === 0;

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Generate warnings
    if (photos.length < 5) {
      warnings.push('Consider adding more photos for better documentation');
    }

    if (deficiencies.length > 0 && deficiencies.some(d => d.severity === 'high' && !d.budgetAmount)) {
      warnings.push('High severity deficiencies should include cost estimates');
    }

    // Generate recommendations
    if (score < 80) {
      recommendations.push('Review missing requirements to improve inspection completeness');
    }

    if (photos.filter(p => p.type === 'overview').length < 4) {
      recommendations.push('Add overview photos from all four directions');
    }

    const result: ValidationResult = {
      isValid,
      score,
      completedRequirements,
      totalRequirements,
      missingRequired,
      warnings,
      recommendations
    };

    setValidationResult(result);
    onValidationComplete(result);
    setIsValidating(false);
  }, [requirements, photos, deficiencies, notes, onValidationComplete]);

  const handleRequirementAction = (requirement: ProofRequirement) => {
    if (requirement.type === 'photo') {
      // Trigger photo capture
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.capture = 'environment';
      
      fileInput.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const evidence = {
            file,
            timestamp: Date.now(),
            location: requirement.validationCriteria.specificLocations?.[0] || 'General'
          };
          onRequirementUpdate(requirement.id, evidence);
        }
      };
      
      fileInput.click();
    } else {
      // For other types, mark as completed
      onRequirementUpdate(requirement.id, { completed: true, timestamp: Date.now() });
    }
  };

  const getRequirementIcon = (type: ProofRequirement['type']) => {
    switch (type) {
      case 'photo': return Camera;
      case 'documentation': return FileText;
      case 'verification': return Shield;
      case 'measurement': return Target;
      default: return FileText;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      {validationResult && (
        <Card className={`border-2 ${validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {validationResult.isValid ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              )}
              Inspection Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completion Score</span>
              <span className={`text-2xl font-bold ${getScoreColor(validationResult.score)}`}>
                {validationResult.score}%
              </span>
            </div>
            
            <Progress value={validationResult.score} className="h-3" />
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Completed:</span>
                <span className="ml-2 font-medium">
                  {validationResult.completedRequirements} of {validationResult.totalRequirements}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Missing Required:</span>
                <span className="ml-2 font-medium text-red-600">
                  {validationResult.missingRequired.length}
                </span>
              </div>
            </div>

            {validationResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {validationResult.warnings.map((warning, index) => (
                      <div key={index}>• {warning}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Requirements Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Proof Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requirements.map((requirement) => {
            const Icon = getRequirementIcon(requirement.type);
            
            return (
              <div
                key={requirement.id}
                className={`flex items-start gap-4 p-4 border rounded-lg ${
                  requirement.isCompleted 
                    ? 'bg-green-50 border-green-200' 
                    : requirement.isRequired 
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex-shrink-0">
                  {requirement.isCompleted ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <div className={`p-1 rounded-full ${
                      requirement.isRequired ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        requirement.isRequired ? 'text-red-600' : 'text-gray-600'
                      }`} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{requirement.title}</h3>
                    {requirement.isRequired && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {requirement.description}
                  </p>
                  
                  {requirement.evidence && (
                    <div className="text-xs text-green-700 bg-green-100 p-2 rounded mb-3">
                      {requirement.type === 'photo' && (
                        <span>✓ {requirement.evidence.count} photo(s) captured</span>
                      )}
                      {requirement.type === 'documentation' && (
                        <span>✓ {requirement.evidence.notesLength} characters documented</span>
                      )}
                      {requirement.type === 'verification' && (
                        <span>✓ Verified at {new Date(requirement.evidence.timestamp).toLocaleTimeString()}</span>
                      )}
                    </div>
                  )}
                  
                  {!requirement.isCompleted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRequirementAction(requirement)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      {requirement.type === 'photo' && <Camera className="h-3 w-3 mr-1" />}
                      {requirement.type === 'verification' && <Shield className="h-3 w-3 mr-1" />}
                      Complete Requirement
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          
          {isValidating && (
            <div className="text-center py-4">
              <div className="animate-pulse text-muted-foreground">
                Validating inspection...
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}