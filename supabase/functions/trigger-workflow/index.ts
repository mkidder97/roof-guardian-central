import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const bytes = Array.from(new Uint8Array(sig))
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token)
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { workflow, payload } = await req.json()

    const base = Deno.env.get('N8N_WEBHOOK_BASE') || ''
    const secret = Deno.env.get('N8N_SHARED_SECRET') || ''
    
    // Validate that secrets are configured
    if (!base || !secret) {
      console.error('❌ n8n secrets not configured:', { hasBase: !!base, hasSecret: !!secret })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'n8n integration not configured. Please set N8N_WEBHOOK_BASE and N8N_SHARED_SECRET secrets.' 
        }), 
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const map: Record<string, string> = {
      'deficiency-alerts': `${base}/roofmind-deficiency-alerts`,
      'inspection-review': `${base}/roofmind-inspection-review`,
      'campaign': `${base}/roofmind-campaign`,
    }

    const target = map[workflow]
    if (!target) {
      return new Response(JSON.stringify({ success: false, error: 'Workflow not allowed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = JSON.stringify(payload || {})
    const signature = await hmacSha256Hex(secret, body)
    
    // Log workflow trigger for debugging
    console.log('🚀 Triggering n8n workflow:', {
      workflow,
      target,
      payloadSize: body.length,
      hasSignature: !!signature,
      userId: userData.user.id
    })

    const forwardResp = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-origin': 'supabase-edge',
        'x-signature': signature,
      },
      body,
    })

    const text = await forwardResp.text()
    let data: any = null
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!forwardResp.ok) {
      console.error('❌ n8n workflow failed:', {
        workflow,
        status: forwardResp.status,
        error: text
      })
      return new Response(JSON.stringify({ success: false, status: forwardResp.status, error: text }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    console.log('✅ n8n workflow triggered successfully:', {
      workflow,
      status: forwardResp.status
    })

    return new Response(JSON.stringify({ success: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message || 'Unexpected error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
}) 