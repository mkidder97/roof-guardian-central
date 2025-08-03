import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { sessionId, finalNotes, photos } = await req.json()

    console.log('Processing inspection completion for session:', sessionId)

    // Get session data directly
    const { data: session, error: sessionError } = await supabaseClient
      .from('inspection_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('Error getting session:', sessionError)
      throw new Error('Session not found or access denied')
    }

    let inspectionId = session.inspection_id

    // Create inspection if it doesn't exist
    if (!inspectionId) {
      // Look up the public.users.id from auth.users.id
      const { data: userRecord, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('auth_user_id', session.inspector_id)
        .single()

      if (userError || !userRecord) {
        console.error('Error finding user record:', userError)
        throw new Error('Inspector user record not found. Please ensure user is properly set up.')
      }

      // Check for existing inspection for same property and date to prevent duplicates
      const today = new Date().toISOString().split('T')[0]
      const { data: existingInspection } = await supabaseClient
        .from('inspections')
        .select('id')
        .eq('roof_id', session.property_id)
        .eq('inspector_id', userRecord.id)
        .eq('completed_date', today)
        .eq('status', 'ready_for_review')
        .maybeSingle()

      if (existingInspection) {
        console.log('Found existing inspection for today:', existingInspection.id)
        inspectionId = existingInspection.id
        
        // Update the existing inspection with latest data
        await supabaseClient
          .from('inspections')
          .update({
            notes: finalNotes || session.session_data?.inspectionNotes || '',
            weather_conditions: session.session_data?.weatherConditions,
            updated_at: new Date().toISOString()
          })
          .eq('id', inspectionId)
      } else {
        // Create new inspection
        const { data: newInspection, error: inspectionError } = await supabaseClient
          .from('inspections')
          .insert({
            roof_id: session.property_id,
            inspector_id: userRecord.id, // Use public.users.id instead of auth.users.id
            scheduled_date: new Date().toISOString().split('T')[0],
            completed_date: new Date().toISOString().split('T')[0],
            status: 'ready_for_review',
            inspection_type: session.session_data?.inspectionType || 'routine',
            notes: finalNotes || session.session_data?.inspectionNotes || '',
            weather_conditions: session.session_data?.weatherConditions
          })
          .select()
          .single()

        if (inspectionError) {
          console.error('Error creating inspection:', inspectionError)
          throw inspectionError
        }

        inspectionId = newInspection.id
        console.log('Created new inspection:', inspectionId)
      }

      // Update session with inspection ID
      await supabaseClient
        .from('inspection_sessions')
        .update({ inspection_id: inspectionId })
        .eq('id', sessionId)
    } else {
      // Update existing inspection
      await supabaseClient
        .from('inspections')
        .update({
          status: 'ready_for_review',
          completed_date: new Date().toISOString().split('T')[0],
          notes: finalNotes || session.session_data?.inspectionNotes || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', inspectionId)
    }

    // Mark session as completed
    await supabaseClient
      .from('inspection_sessions')
      .update({ 
        status: 'completed',
        last_updated: new Date().toISOString()
      })
      .eq('id', sessionId)

    // Process deficiencies from session data
    if (session.session_data?.deficiencies && session.session_data.deficiencies.length > 0) {
      console.log('Processing', session.session_data.deficiencies.length, 'deficiencies')
      
      for (const deficiency of session.session_data.deficiencies) {
        try {
          await supabaseClient
            .from('inspection_deficiencies')
            .insert({
              inspection_id: inspectionId,
              deficiency_type: deficiency.category || deficiency.type || 'general',
              severity: deficiency.severity || 'medium',
              description: deficiency.description || '',
              location_description: deficiency.location || '',
              estimated_cost: deficiency.budgetAmount || deficiency.estimatedCost || 0
            })
        } catch (deficiencyError) {
          console.error('Error saving deficiency:', deficiencyError)
        }
      }
    }

    // Process capital expenses from session data
    if (session.session_data?.capitalExpenses && session.session_data.capitalExpenses.length > 0) {
      console.log('Processing', session.session_data.capitalExpenses.length, 'capital expenses')
      
      for (const expense of session.session_data.capitalExpenses) {
        try {
          await supabaseClient
            .from('inspection_capital_expenses')
            .insert({
              inspection_id: inspectionId,
              expense_type: expense.type || 'capital_expense',
              description: expense.description || '',
              estimated_cost: expense.estimatedCost || 0,
              priority: expense.priority || 'medium',
              recommended_timeline: expense.timeline || (expense.year ? expense.year.toString() : null)
            })
        } catch (expenseError) {
          console.error('Error saving capital expense:', expenseError)
        }
      }
    }

    console.log('Inspection completed with ID:', inspectionId)

    // Process photos if provided
    if (photos && photos.length > 0) {
      console.log('Processing', photos.length, 'photos')
      
      for (const photo of photos) {
        try {
          // Upload photo to storage if it's a base64 data URL
          let fileUrl = photo.url
          let storagePath = photo.url

          if (photo.url.startsWith('data:')) {
            // Convert base64 to blob and upload to storage
            const base64Data = photo.url.split(',')[1]
            const mimeType = photo.url.split(';')[0].split(':')[1]
            const fileExtension = mimeType.split('/')[1]
            const fileName = `${inspectionId}/${Date.now()}.${fileExtension}`

            const { data: uploadData, error: uploadError } = await supabaseClient.storage
              .from('roof-files')
              .upload(fileName, Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)), {
                contentType: mimeType,
                upsert: true
              })

            if (uploadError) {
              console.error('Error uploading photo:', uploadError)
              continue
            }

            const { data: urlData } = supabaseClient.storage
              .from('roof-files')
              .getPublicUrl(fileName)

            fileUrl = urlData.publicUrl
            storagePath = fileName
          }

          // Save photo record
          const { error: photoError } = await supabaseClient
            .from('inspection_photos')
            .insert({
              inspection_id: inspectionId,
              photo_type: photo.type || 'general',
              file_url: fileUrl,
              storage_path: storagePath,
              caption: photo.caption || '',
              metadata: {
                timestamp: photo.timestamp || new Date().toISOString(),
                location: photo.location
              }
            })

          if (photoError) {
            console.error('Error saving photo record:', photoError)
          }
        } catch (photoProcessError) {
          console.error('Error processing photo:', photoProcessError)
        }
      }
    }

    // Also create a file record in roof_files for backward compatibility
    const { error: fileRecordError } = await supabaseClient
      .from('roof_files')
      .insert({
        roof_id: (await supabaseClient
          .from('inspections')
          .select('roof_id')
          .eq('id', inspectionId)
          .single()).data?.roof_id,
        file_name: `Inspection_${inspectionId}_Report.json`,
        file_type: 'inspection_data',
        mime_type: 'application/json',
        is_public: false,
        file_url: `inspection-data/${inspectionId}.json`,
        storage_path: `inspection-data/${inspectionId}.json`
      })

    if (fileRecordError) {
      console.error('Error creating file record:', fileRecordError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        inspectionId,
        message: 'Inspection completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-inspection-completion:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})