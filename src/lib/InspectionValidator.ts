/**
 * InspectionValidator - Validates inspection completeness for external automation
 * 
 * This utility class checks if inspections meet all required criteria before
 * being marked as ready for external report generation and email automation.
 */

import type { 
  UnifiedInspection, 
  ValidationResult, 
  ValidationCriteria 
} from '@/types/inspection';
import type { Deficiency } from '@/types/deficiency';
import { supabase } from '@/integrations/supabase/client';

// Default validation criteria - can be overridden
const DEFAULT_VALIDATION_CRITERIA: ValidationCriteria = {
  minimumDeficiencies: 1,
  minimumPhotos: 3,
  requiredDeficiencyFields: ['type', 'severity', 'description'],
  requiredInspectionFields: ['notes', 'status']
};

export class InspectionValidator {
  private criteria: ValidationCriteria;

  constructor(customCriteria?: Partial<ValidationCriteria>) {
    this.criteria = { ...DEFAULT_VALIDATION_CRITERIA, ...customCriteria };
  }

  /**
   * Validates a complete inspection including all related data
   */
  async validateInspection(inspectionId: string): Promise<ValidationResult> {
    try {
      // Fetch inspection data
      const inspection = await this.fetchInspectionData(inspectionId);
      if (!inspection) {
        return {
          isValid: false,
          errors: ['Inspection not found'],
          summary: 'Inspection validation failed - inspection not found'
        };
      }

      // Fetch related deficiencies and photos
      const { deficiencies, totalPhotos } = await this.fetchInspectionAssets(inspectionId);

      // Perform validation checks
      const validationErrors: string[] = [];
      const validationWarnings: string[] = [];

      // Check inspection status
      if (inspection.status !== 'completed') {
        validationErrors.push(`Inspection status must be 'completed', currently: '${inspection.status}'`);
      }

      // Check required inspection fields
      this.validateInspectionFields(inspection, validationErrors);

      // Check deficiencies
      this.validateDeficiencies(deficiencies, validationErrors, validationWarnings);

      // Check photos
      this.validatePhotos(totalPhotos, validationErrors, validationWarnings);

      // Generate summary
      const isValid = validationErrors.length === 0;
      const summary = this.generateValidationSummary(inspection, deficiencies.length, totalPhotos, isValid);

      return {
        isValid,
        errors: validationErrors,
        warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
        summary
      };

    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errors: [`Validation process failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        summary: 'Inspection validation failed due to system error'
      };
    }
  }

  /**
   * Quick validation for client-side checks (without database calls)
   */
  validateInspectionSync(
    inspection: UnifiedInspection,
    deficiencies: Deficiency[],
    totalPhotos: number
  ): ValidationResult {
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    // Check inspection status
    if (inspection.status !== 'completed') {
      validationErrors.push(`Inspection status must be 'completed', currently: '${inspection.status}'`);
    }

    // Check required inspection fields
    this.validateInspectionFields(inspection, validationErrors);

    // Check deficiencies
    this.validateDeficiencies(deficiencies, validationErrors, validationWarnings);

    // Check photos
    this.validatePhotos(totalPhotos, validationErrors, validationWarnings);

    const isValid = validationErrors.length === 0;
    const summary = this.generateValidationSummary(inspection, deficiencies.length, totalPhotos, isValid);

    return {
      isValid,
      errors: validationErrors,
      warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
      summary
    };
  }

  /**
   * Fetches inspection data from database
   */
  private async fetchInspectionData(inspectionId: string): Promise<UnifiedInspection | null> {
    const { data, error } = await supabase
      .from('inspections')
      .select(`
        id,
        roof_id,
        inspector_id,
        scheduled_date,
        completed_date,
        status,
        inspection_type,
        priority,
        notes,
        weather_conditions,
        created_at,
        updated_at,
        ready_to_send,
        proof_check_notes,
        roofs:roof_id (
          id,
          property_name,
          address,
          city,
          state
        ),
        users:inspector_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', inspectionId)
      .single();

    if (error) {
      console.error('Error fetching inspection:', error);
      return null;
    }

    // Cast the joined data properly since Supabase types think they're arrays
    const typedData = {
      ...data,
      roofs: (data as any).roofs as { id: string; property_name: string; address: string; city: string; state: string; },
      users: (data as any).users as { id: string; first_name: string; last_name: string; email: string; }
    };
    
    return typedData as UnifiedInspection;
  }

  /**
   * Fetches deficiencies and counts total photos for an inspection
   */
  private async fetchInspectionAssets(inspectionId: string): Promise<{
    deficiencies: Deficiency[];
    totalPhotos: number;
  }> {
    // Note: This is a placeholder implementation
    // In a real implementation, you would fetch deficiencies from your deficiencies table
    // and count photos from your photos/files table linked to this inspection
    
    // For now, return mock data - this should be replaced with actual database queries
    return {
      deficiencies: [],
      totalPhotos: 0
    };
    
    // Example of what the real implementation might look like:
    /*
    const { data: deficiencies } = await supabase
      .from('deficiencies')
      .select('*')
      .eq('inspection_id', inspectionId);

    const { data: photos } = await supabase
      .from('inspection_photos')
      .select('id')
      .eq('inspection_id', inspectionId);

    return {
      deficiencies: deficiencies || [],
      totalPhotos: photos?.length || 0
    };
    */
  }

  /**
   * Validates inspection fields
   */
  private validateInspectionFields(inspection: UnifiedInspection, errors: string[]): void {
    this.criteria.requiredInspectionFields.forEach(field => {
      const value = inspection[field as keyof UnifiedInspection];
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        errors.push(`Inspection field '${field}' is required but empty`);
      }
    });
  }

  /**
   * Validates deficiencies data
   */
  private validateDeficiencies(deficiencies: Deficiency[], errors: string[], warnings: string[]): void {
    // Check minimum deficiencies count
    if (deficiencies.length < this.criteria.minimumDeficiencies) {
      errors.push(`At least ${this.criteria.minimumDeficiencies} deficiency required, found ${deficiencies.length}`);
      return; // No point checking individual deficiencies if none exist
    }

    // Check each deficiency
    deficiencies.forEach((deficiency, index) => {
      this.criteria.requiredDeficiencyFields.forEach(field => {
        const value = deficiency[field as keyof Deficiency];
        if (!value || (typeof value === 'string' && value.trim().length === 0)) {
          errors.push(`Deficiency ${index + 1}: field '${field}' is required but empty`);
        }
      });

      // Check photos per deficiency
      if (deficiency.photos.length === 0) {
        warnings.push(`Deficiency ${index + 1} has no photos - consider adding visual evidence`);
      }
    });
  }

  /**
   * Validates photo requirements
   */
  private validatePhotos(totalPhotos: number, errors: string[], warnings: string[]): void {
    if (totalPhotos < this.criteria.minimumPhotos) {
      errors.push(`At least ${this.criteria.minimumPhotos} photos required, found ${totalPhotos}`);
    } else if (totalPhotos < this.criteria.minimumPhotos + 2) {
      warnings.push(`Only ${totalPhotos} photos found - consider adding more for comprehensive documentation`);
    }
  }

  /**
   * Generates a human-readable validation summary
   */
  private generateValidationSummary(
    inspection: UnifiedInspection,
    deficiencyCount: number,
    photoCount: number,
    isValid: boolean
  ): string {
    const propertyName = inspection.roofs?.property_name || 'Unknown Property';
    const inspectorName = inspection.users 
      ? `${inspection.users.first_name} ${inspection.users.last_name}`.trim()
      : 'Unknown Inspector';

    if (isValid) {
      return `✅ Inspection for ${propertyName} by ${inspectorName} passed validation with ${deficiencyCount} deficiencies and ${photoCount} photos.`;
    } else {
      return `❌ Inspection for ${propertyName} by ${inspectorName} failed validation. Review requirements and complete missing items.`;
    }
  }

  /**
   * Updates validation criteria
   */
  updateCriteria(newCriteria: Partial<ValidationCriteria>): void {
    this.criteria = { ...this.criteria, ...newCriteria };
  }

  /**
   * Gets current validation criteria
   */
  getCriteria(): ValidationCriteria {
    return { ...this.criteria };
  }
}

// Export default instance with standard criteria
export const inspectionValidator = new InspectionValidator();

// Export specific validation functions for direct use
export const validateInspection = (inspectionId: string) => 
  inspectionValidator.validateInspection(inspectionId);

export const validateInspectionSync = (
  inspection: UnifiedInspection,
  deficiencies: Deficiency[],
  totalPhotos: number
) => inspectionValidator.validateInspectionSync(inspection, deficiencies, totalPhotos);