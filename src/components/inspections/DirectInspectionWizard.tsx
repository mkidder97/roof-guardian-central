import React, { useState } from 'react';
import { InspectionSetupStep } from './InspectionSetupStep';
import { PropertySelectionStep } from './PropertySelectionStep';

export interface InspectionSetupData {
  inspectorId: string;
  scheduledDate: string;
  scheduledTime: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  inspectionType: 'routine' | 'warranty' | 'damage' | 'maintenance';
  notes?: string;
}

interface DirectInspectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DirectInspectionWizard({ open, onOpenChange }: DirectInspectionWizardProps) {
  const [currentStep, setCurrentStep] = useState<'setup' | 'property'>('setup');
  const [setupData, setSetupData] = useState<InspectionSetupData | null>(null);

  const handleSetupComplete = (data: InspectionSetupData) => {
    setSetupData(data);
    setCurrentStep('property');
  };

  const handleBack = () => {
    setCurrentStep('setup');
  };

  const handleWizardClose = () => {
    setCurrentStep('setup');
    setSetupData(null);
    onOpenChange(false);
  };

  const handleInspectionScheduled = () => {
    handleWizardClose();
  };

  return (
    <>
      {currentStep === 'setup' && (
        <InspectionSetupStep
          open={open}
          onOpenChange={handleWizardClose}
          onComplete={handleSetupComplete}
        />
      )}
      
      {currentStep === 'property' && setupData && (
        <PropertySelectionStep
          open={open}
          onOpenChange={handleWizardClose}
          onBack={handleBack}
          setupData={setupData}
          onInspectionScheduled={handleInspectionScheduled}
        />
      )}
    </>
  );
}