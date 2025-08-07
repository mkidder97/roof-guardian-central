/**
 * Custom hook for inspection validation functionality
 * Handles API calls to the validation edge function and manages loading states
 */

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ValidationResult } from '@/types/inspection';

interface UseInspectionValidationReturn {
  validateInspection: (inspectionId: string) => Promise<ValidationResult | null>;
  isValidating: boolean;
  lastValidationResult: ValidationResult | null;
}

export function useInspectionValidation(): UseInspectionValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidationResult, setLastValidationResult] = useState<ValidationResult | null>(null);
  const { toast } = useToast();

  const validateInspection = async (inspectionId: string): Promise<ValidationResult | null> => {
    if (!inspectionId) {
      toast({
        title: "Validation Error",
        description: "No inspection ID provided",
        variant: "destructive"
      });
      return null;
    }

    setIsValidating(true);

    try {
      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('mark-inspection-ready', {
        body: { inspectionId }
      });

      if (error) {
        console.error('Validation edge function error:', error);
        toast({
          title: "Validation Failed",
          description: `Unable to validate inspection: ${error.message}`,
          variant: "destructive"
        });
        return null;
      }

      const result = data?.validation as ValidationResult;
      setLastValidationResult(result);

      if (result?.isValid) {
        toast({
          title: "✅ Validation Passed",
          description: result.summary || "Inspection is ready for external processing",
          duration: 5000
        });
      } else {
        // Create detailed error message
        const errorDetails = result?.errors?.slice(0, 3).join(', ') || 'Unknown validation errors';
        const additionalErrors = result?.errors && result.errors.length > 3 ? 
          ` and ${result.errors.length - 3} more issues` : '';

        toast({
          title: "❌ Validation Failed",
          description: `${errorDetails}${additionalErrors}`,
          variant: "destructive",
          duration: 8000
        });
      }

      // Show warnings if present
      if (result?.warnings && result.warnings.length > 0) {
        setTimeout(() => {
          toast({
            title: "⚠️ Validation Warnings",
            description: result.warnings?.join(', '),
            duration: 6000
          });
        }, 1000);
      }

      return result;

    } catch (error) {
      console.error('Unexpected validation error:', error);
      toast({
        title: "Validation Error",
        description: "An unexpected error occurred during validation",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  return {
    validateInspection,
    isValidating,
    lastValidationResult
  };
}

export default useInspectionValidation;