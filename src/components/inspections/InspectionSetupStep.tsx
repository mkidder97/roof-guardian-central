import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, User, Flag, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useInspectors } from '@/hooks/useInspectors';
import { InspectionSetupData } from './DirectInspectionWizard';

interface InspectionSetupStepProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: InspectionSetupData) => void;
}

export function InspectionSetupStep({ open, onOpenChange, onComplete }: InspectionSetupStepProps) {
  const { inspectors } = useInspectors();
  const [formData, setFormData] = useState<Partial<InspectionSetupData>>({
    priority: 'medium',
    inspectionType: 'routine'
  });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.inspectorId) newErrors.inspectorId = 'Inspector is required';
    if (!selectedDate) newErrors.scheduledDate = 'Date is required';
    if (!formData.scheduledTime) newErrors.scheduledTime = 'Time is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;
    
    const setupData: InspectionSetupData = {
      inspectorId: formData.inspectorId!,
      scheduledDate: format(selectedDate!, 'yyyy-MM-dd'),
      scheduledTime: formData.scheduledTime!,
      priority: formData.priority!,
      inspectionType: formData.inspectionType!,
      notes: formData.notes
    };
    
    onComplete(setupData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Schedule Direct Inspection - Step 1 of 2
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Inspector & Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Inspector Selection */}
              <div className="space-y-2">
                <Label htmlFor="inspector">Inspector *</Label>
                <Select
                  value={formData.inspectorId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, inspectorId: value }))}
                >
                  <SelectTrigger className={errors.inspectorId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select inspector" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspectors.map((inspector) => (
                      <SelectItem key={inspector.id} value={inspector.id}>
                        {inspector.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.inspectorId && (
                  <p className="text-sm text-destructive">{errors.inspectorId}</p>
                )}
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label>Inspection Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground",
                        errors.scheduledDate && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {errors.scheduledDate && (
                  <p className="text-sm text-destructive">{errors.scheduledDate}</p>
                )}
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <Label htmlFor="time">Inspection Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="time"
                    type="time"
                    className={cn("pl-10", errors.scheduledTime && "border-destructive")}
                    value={formData.scheduledTime || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  />
                </div>
                {errors.scheduledTime && (
                  <p className="text-sm text-destructive">{errors.scheduledTime}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Inspection Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                    setFormData(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Inspection Type */}
              <div className="space-y-2">
                <Label>Inspection Type</Label>
                <Select
                  value={formData.inspectionType}
                  onValueChange={(value: 'routine' | 'warranty' | 'damage' | 'maintenance') => 
                    setFormData(prev => ({ ...prev, inspectionType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine Inspection</SelectItem>
                    <SelectItem value="warranty">Warranty Inspection</SelectItem>
                    <SelectItem value="damage">Damage Assessment</SelectItem>
                    <SelectItem value="maintenance">Maintenance Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add any special instructions or notes for this inspection..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleNext}>
              Next: Select Property
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}