/**
 * ImmediateRepairModal - Modal for creating immediate repair requests for critical issues
 * 
 * This component provides a comprehensive interface for documenting and submitting
 * immediate repair requests when critical issues are discovered during inspections.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, 
  Upload, 
  X, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  Shield, 
  MapPin,
  FileText,
  Phone,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { 
  CreateImmediateRepairRequest, 
  RepairUrgency, 
  ImmediateRepair 
} from '@/types/immediate-repair';
import type { Deficiency } from '@/types/deficiency';
import type { CriticalityAnalysis } from '@/lib/CriticalIssueDetector';

interface ImmediateRepairModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspectionId: string;
  deficiency?: Deficiency;
  propertyInfo: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
  };
  criticalityAnalysis?: CriticalityAnalysis;
  onRepairCreated?: (repair: ImmediateRepair) => void;
}

interface PhotoUpload {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

const urgencyLevels: { value: RepairUrgency; label: string; color: string; description: string }[] = [
  { 
    value: 'low', 
    label: 'Low', 
    color: 'bg-green-100 text-green-800', 
    description: 'Can be scheduled within 2 weeks' 
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    color: 'bg-yellow-100 text-yellow-800', 
    description: 'Should be completed within 1 week' 
  },
  { 
    value: 'high', 
    label: 'High', 
    color: 'bg-orange-100 text-orange-800', 
    description: 'Requires completion within 48 hours' 
  },
  { 
    value: 'critical', 
    label: 'Critical', 
    color: 'bg-red-100 text-red-800', 
    description: 'Must be completed within 24 hours' 
  },
  { 
    value: 'emergency', 
    label: 'Emergency', 
    color: 'bg-red-200 text-red-900 font-bold', 
    description: 'Requires immediate response' 
  }
];

export function ImmediateRepairModal({
  open,
  onOpenChange,
  inspectionId,
  deficiency,
  propertyInfo,
  criticalityAnalysis,
  onRepairCreated
}: ImmediateRepairModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<CreateImmediateRepairRequest>({
    inspection_id: inspectionId,
    deficiency_id: deficiency?.id,
    title: deficiency ? `Critical Issue: ${deficiency.type}` : '',
    description: deficiency?.description || '',
    urgency: criticalityAnalysis?.urgencyLevel || 'medium',
    estimated_cost: deficiency?.budgetAmount || undefined,
    safetyRisk: criticalityAnalysis?.riskFactors.safety || false,
    structuralRisk: criticalityAnalysis?.riskFactors.structural || false,
    weatherExposureRisk: criticalityAnalysis?.riskFactors.weatherExposure || false,
    accessibilityIssues: '',
    photos: [],
    emergency_contact_required: criticalityAnalysis?.isEmergency || false
  });

  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedUrgency = urgencyLevels.find(u => u.value === formData.urgency);

  // Handle form field updates
  const updateField = useCallback((field: keyof CreateImmediateRepairRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle photo uploads
  const handlePhotoSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: `${file.name} is not an image file`,
          variant: "destructive"
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive"
        });
        return;
      }

      const photoId = `photo_${Date.now()}_${Math.random()}`;
      const preview = URL.createObjectURL(file);

      const newPhoto: PhotoUpload = {
        id: photoId,
        file,
        preview,
        uploading: false,
        uploaded: false
      };

      setPhotos(prev => [...prev, newPhoto]);
      updateField('photos', [...formData.photos, file]);
    });

    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  }, [formData.photos, toast, updateField]);

  // Remove photo
  const removePhoto = useCallback((photoId: string) => {
    setPhotos(prev => {
      const updated = prev.filter(p => p.id !== photoId);
      // Clean up preview URL
      const photoToRemove = prev.find(p => p.id === photoId);
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.preview);
      }
      return updated;
    });

    // Update form data
    const photoIndex = photos.findIndex(p => p.id === photoId);
    if (photoIndex !== -1) {
      const updatedFiles = [...formData.photos];
      updatedFiles.splice(photoIndex, 1);
      updateField('photos', updatedFiles);
    }
  }, [photos, formData.photos, updateField]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (formData.photos.length === 0) {
        throw new Error('At least one photo is required');
      }

      // Get current user
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Upload photos first
      const photoUrls: string[] = [];
      for (const photo of formData.photos) {
        const fileName = `immediate_repairs/${inspectionId}/${Date.now()}_${photo.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(fileName);

        photoUrls.push(publicUrl);
      }

      // Calculate priority score based on urgency and risk factors
      const priorityScore = calculatePriorityScore(formData);

      // Create immediate repair record
      const repairData = {
        inspection_id: formData.inspection_id,
        deficiency_id: formData.deficiency_id,
        property_id: propertyInfo.id,
        title: formData.title,
        description: formData.description,
        urgency: formData.urgency,
        estimated_cost: formData.estimated_cost,
        safety_risk: formData.safetyRisk,
        structural_risk: formData.structuralRisk,
        weather_exposure_risk: formData.weatherExposureRisk,
        accessibility_issues: formData.accessibilityIssues || null,
        priority_score: priorityScore,
        reported_by: user.user.id,
        emergency_contact_required: formData.emergency_contact_required,
        status: 'pending'
      };

      const { data: repair, error: repairError } = await supabase
        .from('immediate_repairs')
        .insert(repairData)
        .select()
        .single();

      if (repairError) throw repairError;

      // If this is an emergency, create escalation record
      if (formData.urgency === 'emergency' || formData.emergency_contact_required) {
        await supabase
          .from('emergency_escalations')
          .insert({
            repair_id: repair.id,
            escalation_level: 1,
            triggered_by: 'user',
            contacts_notified: [],
            resolution_deadline: new Date(Date.now() + (formData.urgency === 'emergency' ? 2 : 24) * 60 * 60 * 1000).toISOString()
          });
      }

      // Success feedback
      toast({
        title: "Immediate Repair Created",
        description: `${formData.urgency.toUpperCase()} repair request submitted successfully`,
        duration: 5000
      });

      // Call callback
      if (onRepairCreated) {
        onRepairCreated({
          ...repair,
          property_name: propertyInfo.name,
          property_address: propertyInfo.address,
          photos: photoUrls.map((url, index) => ({
            id: `photo_${index}`,
            url,
            fileName: formData.photos[index].name,
            file: formData.photos[index],
            type: 'deficiency' as const,
            timestamp: new Date(),
            size: formData.photos[index].size,
            uploadedAt: new Date().toISOString()
          }))
        });
      }

      // Close modal
      onOpenChange(false);

    } catch (error) {
      console.error('Error creating immediate repair:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to create repair request",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate priority score
  function calculatePriorityScore(data: CreateImmediateRepairRequest): number {
    let score = 0;
    
    // Base score from urgency
    switch (data.urgency) {
      case 'emergency': score += 40; break;
      case 'critical': score += 32; break;
      case 'high': score += 24; break;
      case 'medium': score += 16; break;
      case 'low': score += 8; break;
    }
    
    // Risk factors
    if (data.safetyRisk) score += 20;
    if (data.structuralRisk) score += 20;
    if (data.weatherExposureRisk) score += 15;
    if (data.emergency_contact_required) score += 15;
    
    return Math.min(100, score);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Create Immediate Repair Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Property Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Property Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm">
                <div className="font-medium">{propertyInfo.name}</div>
                <div className="text-muted-foreground">
                  {propertyInfo.address}, {propertyInfo.city}, {propertyInfo.state}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Criticality Analysis */}
          {criticalityAnalysis && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium text-orange-800 mb-2">
                  Automated Analysis: {criticalityAnalysis.score}/100 Criticality Score
                </div>
                <div className="text-sm text-orange-700">
                  {criticalityAnalysis.recommendedActions.slice(0, 2).join(' • ')}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Repair Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Repair Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="Brief description of the issue"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Detailed Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Provide detailed information about the issue and why immediate repair is needed"
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="urgency">Urgency Level *</Label>
                <Select value={formData.urgency} onValueChange={(value: RepairUrgency) => updateField('urgency', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {urgencyLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={level.color}>{level.label}</Badge>
                          <span className="text-sm">{level.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="estimated_cost">Estimated Cost</Label>
                <div className="relative mt-1">
                  <DollarSign className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="estimated_cost"
                    type="number"
                    value={formData.estimated_cost || ''}
                    onChange={(e) => updateField('estimated_cost', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="safety_risk"
                  checked={formData.safetyRisk}
                  onCheckedChange={(checked) => updateField('safetyRisk', checked)}
                />
                <Label htmlFor="safety_risk" className="text-sm">
                  Safety risk to occupants or workers
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="structural_risk"
                  checked={formData.structuralRisk}
                  onCheckedChange={(checked) => updateField('structuralRisk', checked)}
                />
                <Label htmlFor="structural_risk" className="text-sm">
                  Structural integrity concerns
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="weather_risk"
                  checked={formData.weatherExposureRisk}
                  onCheckedChange={(checked) => updateField('weatherExposureRisk', checked)}
                />
                <Label htmlFor="weather_risk" className="text-sm">
                  Weather exposure risk (leaks, wind damage)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emergency_contact"
                  checked={formData.emergency_contact_required}
                  onCheckedChange={(checked) => updateField('emergency_contact_required', checked)}
                />
                <Label htmlFor="emergency_contact" className="text-sm font-medium text-red-700">
                  Requires immediate emergency contact
                </Label>
              </div>

              <div>
                <Label htmlFor="accessibility" className="text-sm">Accessibility Issues</Label>
                <Input
                  id="accessibility"
                  value={formData.accessibilityIssues}
                  onChange={(e) => updateField('accessibilityIssues', e.target.value)}
                  placeholder="Special equipment or access requirements"
                  className="mt-1 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Camera className="h-4 w-4" />
                Photos * (Required)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photos
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.preview}
                          alt="Repair documentation"
                          className="w-full h-24 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removePhoto(photo.id)}
                          className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Urgency Display */}
          {selectedUrgency && (
            <Alert className={formData.urgency === 'emergency' ? "border-red-500 bg-red-50" : ""}>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">
                  Selected Urgency: <Badge className={selectedUrgency.color}>{selectedUrgency.label}</Badge>
                </div>
                <div className="text-sm">{selectedUrgency.description}</div>
                {formData.emergency_contact_required && (
                  <div className="text-sm font-medium text-red-600 mt-2">
                    Emergency contacts will be notified immediately upon submission.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !formData.title.trim() || !formData.description.trim() || photos.length === 0}
            className={formData.urgency === 'emergency' ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {isSubmitting ? (
              <>
                <Send className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit {formData.urgency === 'emergency' ? 'Emergency ' : ''}Repair Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}