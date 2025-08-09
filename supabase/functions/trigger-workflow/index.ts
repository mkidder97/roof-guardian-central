import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 [Edge Function] Starting workflow trigger...')
    
    // 1) Optional authentication (don't block for testing)
    const authHeader = req.headers.get('Authorization') || ''
    console.log('🔐 [Edge Function] Auth header present:', !!authHeader)

    // 2) Read body as JSON
    const body = await req.json()
    console.log('📋 [Edge Function] Received payload:', {
      inspection_id: body.inspection_id,
      property_name: body.property_name,
      deficiency_count: body.deficiencies?.length || 0
    })

    // 3) Build PRODUCTION webhook URLs (NOT test URLs)
    const webhookBase = Deno.env.get("N8N_WEBHOOK_BASE") || "https://mkidder97.app.n8n.cloud/webhook"
    const deficiencyUrl = `${webhookBase}/roofmind-deficiency-alerts`  // PRODUCTION URL
    const reviewUrl = `${webhookBase}/roofmind-inspection-review`       // PRODUCTION URL

    console.log('🎯 [Edge Function] Using webhook URLs:', { deficiencyUrl, reviewUrl })

    // 4) Prepare headers for n8n (ALWAYS JSON)
    const n8nHeaders = { 
      "Content-Type": "application/json",
      "User-Agent": "RoofMind-EdgeFunction/1.0"
    }

    // 5) Fire deficiency alerts workflow
    console.log('📧 [Edge Function] Triggering deficiency alerts...')
    const deficiencyResponse = await fetch(deficiencyUrl, {
      method: "POST",
      headers: n8nHeaders,
      body: JSON.stringify(body)
    })
    const deficiencyBody = await deficiencyResponse.text()
    
    console.log('📧 [Edge Function] Deficiency alerts response:', {
      status: deficiencyResponse.status,
      statusText: deficiencyResponse.statusText,
      body: deficiencyBody
    })

    // 6) Fire inspection review workflow (always trigger both)
    console.log('🔍 [Edge Function] Triggering inspection review...')
    const reviewResponse = await fetch(reviewUrl, {
      method: "POST", 
      headers: n8nHeaders,
      body: JSON.stringify(body)
    })
    const reviewBody = await reviewResponse.text()

    console.log('🔍 [Edge Function] Inspection review response:', {
      status: reviewResponse.status,
      statusText: reviewResponse.statusText,
      body: reviewBody
    })

    // 7) Return detailed response so frontend can see exactly what happened
    const result = {
      success: deficiencyResponse.ok && reviewResponse.ok,
      deficiency_workflow: {
        status: deficiencyResponse.status,
        statusText: deficiencyResponse.statusText,
        body: deficiencyBody,
        success: deficiencyResponse.ok
      },
      review_workflow: {
        status: reviewResponse.status,
        statusText: reviewResponse.statusText,
        body: reviewBody,
        success: reviewResponse.ok
      },
      summary: {
        total_workflows: 2,
        successful_workflows: (deficiencyResponse.ok ? 1 : 0) + (reviewResponse.ok ? 1 : 0),
        failed_workflows: (deficiencyResponse.ok ? 0 : 1) + (reviewResponse.ok ? 0 : 1)
      }
    }

    console.log('📊 [Edge Function] Final result:', result)

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 207, // 207 = Multi-Status for partial success
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error('💥 [Edge Function] Fatal error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
}) 