import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InspectionStatusBadge, InspectionStatus, canTransitionTo, getStatusDescription } from './inspection-status-badge';
import { ArrowRight, AlertTriangle } from 'lucide-react';

interface StatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: InspectionStatus;
  targetStatus: InspectionStatus;
  propertyName?: string;
  onConfirm: (reason?: string) => void;
  loading?: boolean;
}

export function StatusTransitionDialog({
  open,
  onOpenChange,
  currentStatus,
  targetStatus,
  propertyName = '',
  onConfirm,
  loading = false
}: StatusTransitionDialogProps) {
  const [reason, setReason] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const isValidTransition = canTransitionTo(currentStatus, targetStatus);
  const requiresReason = targetStatus === 'completed' || currentStatus === 'ready_for_review';

  const handleConfirm = () => {
    if (requiresReason && !reason.trim()) {
      setIsRequired(true);
      return;
    }
    
    onConfirm(reason.trim() || undefined);
    setReason('');
    setIsRequired(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setReason('');
    setIsRequired(false);
  };

  const getTransitionMessage = () => {
    const messages = {
      'scheduled-in_progress': 'Start this inspection? The inspector will be able to begin data collection.',
      'in_progress-ready_for_review': 'Mark as ready for review? This will notify reviewers that the inspection is complete.',
      'ready_for_review-completed': 'Mark as completed? This will finalize the inspection and make it read-only.',
      'ready_for_review-in_progress': 'Send back for more work? The inspector will be able to continue editing.',
      'in_progress-scheduled': 'Move back to scheduled? This will reset the inspection status.'
    };
    
    return messages[`${currentStatus}-${targetStatus}` as keyof typeof messages] || 
           'Are you sure you want to change the inspection status?';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Inspection Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Info */}
          {propertyName && (
            <div className="text-sm text-gray-600">
              Property: <span className="font-medium">{propertyName}</span>
            </div>
          )}

          {/* Status Transition Visual */}
          <div className="flex items-center justify-center space-x-4 py-4">
            <InspectionStatusBadge status={currentStatus} />
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <InspectionStatusBadge status={targetStatus} />
          </div>

          {/* Validation Check */}
          {!isValidTransition && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This status transition is not allowed. Please follow the proper workflow.
              </AlertDescription>
            </Alert>
          )}

          {/* Transition Message */}
          {isValidTransition && (
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
              {getTransitionMessage()}
            </div>
          )}

          {/* Status Descriptions */}
          <div className="space-y-2 text-xs text-gray-600">
            <div><strong>Current:</strong> {getStatusDescription(currentStatus)}</div>
            <div><strong>New:</strong> {getStatusDescription(targetStatus)}</div>
          </div>

          {/* Reason Input */}
          {isValidTransition && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                {requiresReason ? 'Reason (Required)' : 'Reason (Optional)'}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  targetStatus === 'completed' 
                    ? 'e.g., All deficiencies documented, review completed'
                    : targetStatus === 'ready_for_review'
                    ? 'e.g., Inspection completed, all areas covered'
                    : 'Optional notes about this status change'
                }
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (isRequired) setIsRequired(false);
                }}
                className={isRequired ? 'border-red-500' : ''}
              />
              {isRequired && (
                <p className="text-sm text-red-600">Reason is required for this status change</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!isValidTransition || loading}
            className={
              targetStatus === 'completed' 
                ? 'bg-green-600 hover:bg-green-700' 
                : targetStatus === 'ready_for_review'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }
          >
            {loading ? 'Updating...' : `Change to ${targetStatus.replace('_', ' ')}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}