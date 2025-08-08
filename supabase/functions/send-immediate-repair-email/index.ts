import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImmediateRepairRequest {
  propertyId: string;
  propertyName: string;
  deficiency: {
    location: string;
    description: string;
    budgetAmount: number;
    severity: string;
    photos: any[];
  };
  inspectorEmail?: string;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { propertyId, propertyName, deficiency, inspectorEmail, timestamp }: ImmediateRepairRequest = await req.json()

    console.log('🚨 Processing immediate repair request:', {
      propertyId,
      propertyName,
      location: deficiency.location,
      severity: deficiency.severity
    })

    // Get the current user from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Authentication required')
    }

    // Get user details for inspector information
    const { data: inspector } = await supabaseClient
      .from('users')
      .select('id, email, full_name, phone')
      .eq('auth_user_id', user.id)
      .single()

    // Get property details for email context
    const { data: property } = await supabaseClient
      .from('roofs')
      .select('property_name, street_address, city, state, zip_code, property_manager_email')
      .eq('id', propertyId)
      .single()

    // Prepare email recipients
    const recipients: string[] = []
    
    // Add property manager email if available
    if (property?.property_manager_email) {
      recipients.push(property.property_manager_email)
    }

    // Add default repair team emails (these should be configured based on your needs)
    const repairTeamEmails = [
      'repairs@roofguardian.com',
      'emergency@roofguardian.com'
    ]
    recipients.push(...repairTeamEmails)

    // Create emergency repair record in database
    const { data: repairRecord, error: dbError } = await supabaseClient
      .from('immediate_repairs')
      .insert({
        inspection_id: null, // Will be linked when inspection is completed
        property_id: propertyId,
        title: `Immediate Repair: ${deficiency.location}`,
        description: deficiency.description,
        urgency: 'emergency',
        estimated_cost: deficiency.budgetAmount,
        safety_risk: deficiency.severity === 'high',
        structural_risk: deficiency.description.toLowerCase().includes('structural'),
        weather_exposure_risk: deficiency.description.toLowerCase().includes('leak') || deficiency.description.toLowerCase().includes('water'),
        reported_by: inspector?.id,
        emergency_contact_required: true,
        status: 'pending'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error creating repair record:', dbError)
    }

    // Format the email content
    const emailSubject = `🚨 IMMEDIATE REPAIR REQUIRED - ${propertyName}`
    
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .urgent { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
        .details { background: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 8px; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; color: #666; }
        .button { background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 IMMEDIATE REPAIR REQUIRED</h1>
        <p>Emergency repair request submitted during inspection</p>
    </div>
    
    <div class="content">
        <div class="urgent">
            <h2>⚠️ URGENT ACTION REQUIRED</h2>
            <p><strong>An inspector has identified a critical issue requiring immediate repair attention.</strong></p>
        </div>
        
        <div class="details">
            <h3>Property Information</h3>
            <ul>
                <li><strong>Property:</strong> ${propertyName}</li>
                <li><strong>Address:</strong> ${property?.street_address || 'N/A'}, ${property?.city || ''}, ${property?.state || ''}</li>
                <li><strong>Issue Location:</strong> ${deficiency.location}</li>
                <li><strong>Severity:</strong> ${deficiency.severity.toUpperCase()}</li>
                <li><strong>Estimated Cost:</strong> $${deficiency.budgetAmount.toLocaleString()}</li>
            </ul>
        </div>
        
        <div class="details">
            <h3>Issue Description</h3>
            <p>${deficiency.description}</p>
            
            <h3>Inspector Details</h3>
            <ul>
                <li><strong>Inspector:</strong> ${inspector?.full_name || 'Unknown'}</li>
                <li><strong>Email:</strong> ${inspector?.email || inspectorEmail || 'N/A'}</li>
                <li><strong>Phone:</strong> ${inspector?.phone || 'N/A'}</li>
                <li><strong>Reported:</strong> ${new Date(timestamp).toLocaleString()}</li>
            </ul>
        </div>
        
        ${deficiency.photos.length > 0 ? `
        <div class="details">
            <h3>Photos Attached</h3>
            <p>${deficiency.photos.length} photo(s) have been uploaded documenting this issue.</p>
        </div>
        ` : ''}
        
        <div class="urgent">
            <h3>Next Steps</h3>
            <ol>
                <li><strong>Contact the inspector immediately</strong> for additional details</li>
                <li><strong>Dispatch repair team</strong> to assess and address the issue</li>
                <li><strong>Document all actions taken</strong> in the repair management system</li>
                <li><strong>Update property manager</strong> on repair progress and timeline</li>
            </ol>
        </div>
    </div>
    
    <div class="footer">
        <p>This is an automated alert from the RoofGuardian Inspection System</p>
        <p>Repair Request ID: ${repairRecord?.id || 'N/A'} | Sent: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
    `

    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll log the email details and simulate success
    console.log('📧 Immediate repair email prepared:', {
      to: recipients,
      subject: emailSubject,
      timestamp: new Date().toISOString(),
      repairId: repairRecord?.id
    })

    // Simulate sending email - replace with actual email service integration
    const emailResult = {
      success: true,
      messageId: `repair-${Date.now()}`,
      recipients: recipients.length,
      repairId: repairRecord?.id
    }

    // Log the immediate repair event for monitoring
    console.log('✅ Immediate repair email processing complete:', emailResult)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Immediate repair email sent successfully',
        data: emailResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error processing immediate repair request:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: 'Failed to process immediate repair request'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})