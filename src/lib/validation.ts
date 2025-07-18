import { z } from 'zod';

// Property/Roof validation schema
export const PropertyValidationSchema = z.object({
  property_name: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"), 
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required").max(2, "State must be 2 characters"),
  zip: z.string().min(5, "ZIP code must be at least 5 characters"),
  customer: z.string().optional(),
  region: z.string().optional(),
  market: z.string().optional(),
  roof_group: z.string().optional(),
  property_code: z.string().optional(),
  roof_section: z.string().optional(),
  roof_area: z.number().positive("Roof area must be positive").optional(),
  roof_area_unit: z.string().default('sq ft'),
  roof_type: z.string().optional(),
  roof_system: z.string().optional(),
  roof_system_description: z.string().optional(),
  roof_category: z.string().optional(),
  manufacturer: z.string().optional(),
  installing_contractor: z.string().optional(),
  install_date: z.string().optional(),
  install_year: z.number()
    .min(1900, "Install year must be after 1900")
    .max(new Date().getFullYear() + 5, "Install year cannot be too far in the future")
    .optional(),
  site_contact: z.string().optional(),
  site_contact_office_phone: z.string().optional(),
  site_contact_mobile_phone: z.string().optional(),
  site_contact_email: z.string().email("Invalid email format").optional().or(z.literal("")),
  customer_sensitivity: z.string().optional(),
  roof_access: z.string().optional(),
  roof_access_requirements: z.string().optional(),
  roof_access_safety_concern: z.string().optional(),
  roof_access_location: z.string().optional(),
  capital_budget_year: z.number().optional(),
  capital_budget_estimated: z.number().min(0, "Budget must be non-negative").optional(),
  capital_budget_actual: z.string().optional(),
  capital_budget_completed: z.string().optional(),
  capital_budget_category: z.string().optional(),
  capital_budget_scope_of_work: z.string().optional(),
  preventative_budget_year: z.number().optional(),
  preventative_budget_estimated: z.number().min(0, "Budget must be non-negative").optional(),
  preventative_budget_actual: z.string().optional(),
  preventative_budget_completed: z.string().optional(),
  preventative_budget_category: z.string().optional(),
  preventative_budget_scope_of_work: z.string().optional(),
  repair_contractor: z.string().optional(),
  manufacturer_has_warranty: z.boolean().optional(),
  manufacturer_warranty_term: z.string().optional(),
  manufacturer_warranty_number: z.string().optional(),
  manufacturer_warranty_expiration: z.string().optional(),
  installer_has_warranty: z.boolean().optional(),
  installer_warranty_term: z.string().optional(),
  installer_warranty_number: z.string().optional(),
  installer_warranty_expiration: z.string().optional(),
  total_leaks_12mo: z.string().optional(),
  total_leak_expense_12mo: z.string().optional(),
  last_inspection_date: z.string().optional(),
  next_inspection_due: z.string().optional(),
  warranty_expiration: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active')
});

// Client validation schema
export const ClientValidationSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  contact_name: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active')
});

// Client contact validation schema
export const ClientContactValidationSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  office_phone: z.string().optional(),
  mobile_phone: z.string().optional(),
  role: z.enum(['primary', 'property_manager', 'regional_manager', 'billing', 'emergency', 'contact']).default('contact'),
  title: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional()
});

// Data quality assessment functions
export interface DataQualityScore {
  overall: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  issues: DataQualityIssue[];
}

export interface DataQualityIssue {
  field: string;
  type: 'missing' | 'invalid' | 'duplicate' | 'inconsistent';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggested_fix?: string;
}

export function assessDataQuality(data: any[], schema: z.ZodSchema): DataQualityScore {
  const issues: DataQualityIssue[] = [];
  let completenessScore = 0;
  let accuracyScore = 0;
  let consistencyScore = 0;

  // For completeness calculation, we'll use a basic field count approach
  const requiredFields = ['property_name', 'address', 'city', 'state', 'zip'];
  let totalCompleteness = 0;
  let validRecords = 0;

  // Check each record
  data.forEach((record, index) => {
    const result = schema.safeParse(record);
    
    if (result.success) {
      validRecords++;
      
      // Calculate completeness for this record
      const nonEmptyFields = Object.values(record).filter(val => 
        val !== null && val !== undefined && val !== ''
      ).length;
      const totalFields = Object.keys(record).length;
      if (totalFields > 0) {
        totalCompleteness += nonEmptyFields / totalFields;
      }
    } else {
      // Add validation errors as issues
      if ('error' in result && result.error?.issues) {
        result.error.issues.forEach((error: any) => {
          issues.push({
            field: error.path?.join('.') || 'unknown',
            type: 'invalid',
            severity: 'high',
            message: error.message || 'Validation error',
            suggested_fix: `Fix ${error.path?.join('.') || 'field'} validation error`
          });
        });
      }
    }
  });

  completenessScore = data.length > 0 ? Math.round((totalCompleteness / data.length) * 100) : 0;
  accuracyScore = data.length > 0 ? Math.round((validRecords / data.length) * 100) : 0;
  
  // Check for duplicates (basic implementation)
  const duplicates = findDuplicates(data);
  duplicates.forEach(dup => {
    issues.push({
      field: 'property_name',
      type: 'duplicate',
      severity: 'medium',
      message: `Potential duplicate: ${dup.value}`,
      suggested_fix: 'Review and merge duplicate records'
    });
  });

  consistencyScore = Math.max(0, 100 - (issues.filter(i => i.type === 'inconsistent').length * 10));
  
  const overall = Math.round((completenessScore + accuracyScore + consistencyScore) / 3);

  return {
    overall,
    completeness: completenessScore,
    accuracy: accuracyScore,
    consistency: consistencyScore,
    issues: issues.slice(0, 20) // Limit to top 20 issues
  };
}

function findDuplicates(data: any[]): Array<{ value: string; count: number }> {
  const counts: { [key: string]: number } = {};
  
  data.forEach(record => {
    const key = `${record.property_name || ''}-${record.address || ''}`.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

// Export types
export type PropertyData = z.infer<typeof PropertyValidationSchema>;
export type ClientData = z.infer<typeof ClientValidationSchema>;
export type ClientContactData = z.infer<typeof ClientContactValidationSchema>;