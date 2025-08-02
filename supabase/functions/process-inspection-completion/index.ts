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

    // Complete the inspection and get the inspection ID
    const { data: inspectionId, error: completionError } = await supabaseClient
      .rpc('complete_inspection_from_session', {
        p_session_id: sessionId,
        p_final_notes: finalNotes
      })

    if (completionError) {
      console.error('Error completing inspection:', completionError)
      throw completionError
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