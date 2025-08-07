import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation criteria - matches frontend validator
const VALIDATION_CRITERIA = {
  minimumDeficiencies: 1,
  minimumPhotos: 3,
  requiredDeficiencyFields: ['type', 'severity', 'description'],
  requiredInspectionFields: ['notes', 'status']
};

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  summary?: string;
}

interface InspectionData {
  id: string;
  roof_id: string;
  inspector_id: string;
  status: string;
  notes: string | null;
  roofs: {
    property_name: string;
  } | null;
  users: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { inspectionId } = await req.json()
    
    if (!inspectionId) {
      return new Response(
        JSON.stringify({ error: 'inspectionId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Validating inspection: ${inspectionId}`)

    // Fetch inspection data
    const { data: inspection, error: inspectionError } = await supabaseAdmin
      .from('inspections')
      .select(`
        id,
        roof_id,
        inspector_id,
        status,
        notes,
        roofs:roof_id (
          property_name
        ),
        users:inspector_id (
          first_name,
          last_name
        )
      `)
      .eq('id', inspectionId)
      .single()

    if (inspectionError || !inspection) {
      console.error('Inspection fetch error:', inspectionError)
      return new Response(
        JSON.stringify({ error: 'Inspection not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Perform validation
    const validationResult = await validateInspection(supabaseAdmin, inspection)
    
    // Update inspection based on validation result
    const updateData: any = {}
    
    if (validationResult.isValid) {
      updateData.ready_to_send = true
      updateData.proof_check_notes = null // Clear any previous error notes
      console.log(`✅ Inspection ${inspectionId} passed validation`)
    } else {
      updateData.ready_to_send = false
      updateData.proof_check_notes = validationResult.errors.join('; ')
      console.log(`❌ Inspection ${inspectionId} failed validation:`, validationResult.errors)
    }

    // Update the inspection
    const { error: updateError } = await supabaseAdmin
      .from('inspections')
      .update(updateData)
      .eq('id', inspectionId)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update inspection status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Return validation result
    return new Response(
      JSON.stringify({
        success: true,
        validation: validationResult,
        updated: updateData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Validates an inspection and returns validation result
 */
async function validateInspection(supabaseAdmin: any, inspection: InspectionData): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Check inspection status
  if (inspection.status !== 'completed') {
    errors.push(`Inspection status must be 'completed', currently: '${inspection.status}'`)
  }

  // Check required inspection fields
  if (!inspection.notes || inspection.notes.trim().length === 0) {
    errors.push("Inspection field 'notes' is required but empty")
  }

  // Fetch and validate deficiencies
  const { deficiencyCount, deficiencyErrors, deficiencyWarnings } = await validateDeficiencies(
    supabaseAdmin, 
    inspection.id
  )
  errors.push(...deficiencyErrors)
  warnings.push(...deficiencyWarnings)

  // Fetch and validate photos
  const { photoCount, photoErrors, photoWarnings } = await validatePhotos(
    supabaseAdmin, 
    inspection.id
  )
  errors.push(...photoErrors)
  warnings.push(...photoWarnings)

  // Generate summary
  const isValid = errors.length === 0
  const propertyName = inspection.roofs?.property_name || 'Unknown Property'
  const inspectorName = inspection.users 
    ? `${inspection.users.first_name || ''} ${inspection.users.last_name || ''}`.trim()
    : 'Unknown Inspector'

  let summary: string
  if (isValid) {
    summary = `✅ Inspection for ${propertyName} by ${inspectorName} passed validation with ${deficiencyCount} deficiencies and ${photoCount} photos.`
  } else {
    summary = `❌ Inspection for ${propertyName} by ${inspectorName} failed validation. Review requirements and complete missing items.`
  }

  return {
    isValid,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
    summary
  }
}

/**
 * Validates deficiencies for an inspection
 */
async function validateDeficiencies(supabaseAdmin: any, inspectionId: string): Promise<{
  deficiencyCount: number;
  deficiencyErrors: string[];
  deficiencyWarnings: string[];
}> {
  const errors: string[] = []
  const warnings: string[] = []

  // Note: This is a placeholder implementation since we don't have a deficiencies table yet
  // In a real implementation, you would query the actual deficiencies table
  
  // For now, simulate that we found deficiencies in the inspection session_data or notes
  // This should be replaced with actual database queries when the deficiencies schema is available
  
  const deficiencyCount = 0 // This would come from the actual database query
  
  if (deficiencyCount < VALIDATION_CRITERIA.minimumDeficiencies) {
    errors.push(`At least ${VALIDATION_CRITERIA.minimumDeficiencies} deficiency required, found ${deficiencyCount}`)
  }

  // Real implementation would look like this:
  /*
  const { data: deficiencies, error } = await supabaseAdmin
    .from('deficiencies')
    .select('*')
    .eq('inspection_id', inspectionId)

  if (error) {
    errors.push(`Error fetching deficiencies: ${error.message}`)
    return { deficiencyCount: 0, deficiencyErrors: errors, deficiencyWarnings: warnings }
  }

  const deficiencyCount = deficiencies?.length || 0

  if (deficiencyCount < VALIDATION_CRITERIA.minimumDeficiencies) {
    errors.push(`At least ${VALIDATION_CRITERIA.minimumDeficiencies} deficiency required, found ${deficiencyCount}`)
  } else {
    deficiencies?.forEach((deficiency, index) => {
      VALIDATION_CRITERIA.requiredDeficiencyFields.forEach(field => {
        if (!deficiency[field] || (typeof deficiency[field] === 'string' && deficiency[field].trim().length === 0)) {
          errors.push(`Deficiency ${index + 1}: field '${field}' is required but empty`)
        }
      })
    })
  }
  */

  return { deficiencyCount, deficiencyErrors: errors, deficiencyWarnings: warnings }
}

/**
 * Validates photos for an inspection
 */
async function validatePhotos(supabaseAdmin: any, inspectionId: string): Promise<{
  photoCount: number;
  photoErrors: string[];
  photoWarnings: string[];
}> {
  const errors: string[] = []
  const warnings: string[] = []

  // Note: This is a placeholder implementation since we don't have a photos table defined yet
  // In a real implementation, you would query the actual photos/files table
  
  const photoCount = 0 // This would come from the actual database query

  if (photoCount < VALIDATION_CRITERIA.minimumPhotos) {
    errors.push(`At least ${VALIDATION_CRITERIA.minimumPhotos} photos required, found ${photoCount}`)
  } else if (photoCount < VALIDATION_CRITERIA.minimumPhotos + 2) {
    warnings.push(`Only ${photoCount} photos found - consider adding more for comprehensive documentation`)
  }

  // Real implementation would look like this:
  /*
  const { data: photos, error } = await supabaseAdmin
    .from('inspection_photos')
    .select('id')
    .eq('inspection_id', inspectionId)

  if (error) {
    errors.push(`Error fetching photos: ${error.message}`)
    return { photoCount: 0, photoErrors: errors, photoWarnings: warnings }
  }

  const photoCount = photos?.length || 0

  if (photoCount < VALIDATION_CRITERIA.minimumPhotos) {
    errors.push(`At least ${VALIDATION_CRITERIA.minimumPhotos} photos required, found ${photoCount}`)
  } else if (photoCount < VALIDATION_CRITERIA.minimumPhotos + 2) {
    warnings.push(`Only ${photoCount} photos found - consider adding more for comprehensive documentation`)
  }
  */

  return { photoCount, photoErrors: errors, photoWarnings: warnings }
}