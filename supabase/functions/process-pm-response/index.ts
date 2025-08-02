import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PMResponseRequest {
  campaignId: string;
  gmailData?: {
    messageId: string;
    threadId: string;
    from: string;
    subject: string;
    body: string;
    receivedAt: string;
  };
  manualResponse?: {
    responseType: 'phone' | 'email' | 'in_person';
    notes: string;
    schedulingInfo?: string;
  };
  extractedData?: {
    preferredDates?: string[];
    availability?: string;
    contacts?: Array<{
      name: string;
      phone?: string;
      email?: string;
    }>;
    specialRequirements?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { campaignId, gmailData, manualResponse, extractedData }: PMResponseRequest = await req.json();

    console.log('Processing PM response for campaign:', campaignId);

    // Get the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('inspection_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      console.error('Error fetching campaign:', campaignError);
      throw campaignError;
    }

    // Create communication record
    let commData: any = {
      campaign_id: campaignId,
      direction: 'inbound',
      received_at: new Date().toISOString()
    };

    if (gmailData) {
      commData = {
        ...commData,
        communication_type: 'email_received',
        gmail_message_id: gmailData.messageId,
        gmail_thread_id: gmailData.threadId,
        from_email: gmailData.from,
        subject: gmailData.subject,
        message_content: gmailData.body,
        received_at: gmailData.receivedAt
      };
    } else if (manualResponse) {
      commData = {
        ...commData,
        communication_type: manualResponse.responseType === 'phone' ? 'phone_call' : 'email_received',
        message_content: manualResponse.notes,
        from_email: campaign.property_manager_email
      };
    }

    const { error: commError } = await supabase
      .from('campaign_communications')
      .insert([commData]);

    if (commError) {
      console.error('Error creating communication record:', commError);
    }

    // Update campaign status
    const { error: campaignUpdateError } = await supabase
      .from('inspection_campaigns')
      .update({
        status: 'responses_received',
        updated_at: new Date().toISOString(),
        campaign_metadata: {
          ...(campaign.campaign_metadata || {}),
          lastResponseReceived: new Date().toISOString(),
          responseProcessed: true,
          extractedData: extractedData || {}
        }
      })
      .eq('id', campaignId);

    if (campaignUpdateError) {
      console.error('Error updating campaign:', campaignUpdateError);
    }

    // Update campaign properties based on extracted data
    if (extractedData?.preferredDates && extractedData.preferredDates.length > 0) {
      // Update properties with scheduling information
      const { error: propUpdateError } = await supabase
        .from('campaign_properties')
        .update({
          pm_response_received: true,
          pm_response_date: new Date().toISOString(),
          pm_response_notes: `Preferred dates: ${extractedData.preferredDates.join(', ')}`,
          automation_data: {
            preferredDates: extractedData.preferredDates,
            availability: extractedData.availability,
            specialRequirements: extractedData.specialRequirements
          }
        })
        .eq('campaign_id', campaignId);

      if (propUpdateError) {
        console.error('Error updating campaign properties:', propUpdateError);
      }
    }

    // Analyze response content for scheduling automation
    const analysis = {
      hasSchedulingInfo: false,
      dates: [] as string[],
      contacts: [] as any[],
      sentiment: 'neutral'
    };

    if (gmailData?.body || manualResponse?.notes) {
      const content = gmailData?.body || manualResponse?.notes || '';
      
      // Simple date extraction (can be enhanced with NLP)
      const dateMatches = content.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g);
      if (dateMatches) {
        analysis.dates = dateMatches;
        analysis.hasSchedulingInfo = true;
      }

      // Simple sentiment analysis
      if (content.toLowerCase().includes('yes') || content.toLowerCase().includes('available')) {
        analysis.sentiment = 'positive';
      } else if (content.toLowerCase().includes('no') || content.toLowerCase().includes('busy')) {
        analysis.sentiment = 'negative';
      }
    }

    console.log('PM response processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        campaign: {
          id: campaign.id,
          status: 'responses_received'
        },
        analysis,
        message: 'Property manager response processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in process-pm-response function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});