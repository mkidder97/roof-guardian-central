import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignRequest {
  campaignId: string;
  campaignData: {
    name: string;
    market: string;
    region: string;
    propertyManager: string;
    propertyCount: number;
    pmEmail: string;
    estimatedCompletion: string;
    properties: Array<{id: string; name: string}>;
    gmail: {
      draftId: string;
      threadId: string;
    };
    execution: {
      executionId: string;
      processingTimeMs: number;
    };
  };
  userId: string;
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

    const { campaignId, campaignData, userId }: CampaignRequest = await req.json();

    console.log('Creating inspection campaign:', { campaignId, campaignData });

    // Create the main campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from('inspection_campaigns')
      .insert([
        {
          campaign_id: campaignId,
          name: campaignData.name,
          market: campaignData.market,
          region: campaignData.region,
          total_properties: campaignData.propertyCount,
          property_manager_name: campaignData.propertyManager,
          property_manager_email: campaignData.pmEmail,
          estimated_completion: campaignData.estimatedCompletion,
          n8n_execution_id: campaignData.execution.executionId,
          gmail_draft_id: campaignData.gmail.draftId,
          gmail_thread_id: campaignData.gmail.threadId,
          automation_settings: {
            processingTimeMs: campaignData.execution.processingTimeMs
          },
          campaign_metadata: {
            createdViaAutomation: true,
            gmailIntegration: true
          },
          created_by: userId === 'system' ? null : userId,
          status: 'emails_sent'
        }
      ])
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      throw campaignError;
    }

    console.log('Campaign created successfully:', campaign);

    // Create campaign property records
    if (campaignData.properties && campaignData.properties.length > 0) {
      const propertyRecords = campaignData.properties.map(prop => ({
        campaign_id: campaign.id,
        roof_id: prop.id,
        status: 'pending',
        automation_data: {
          propertyName: prop.name,
          automationSource: 'n8n_workflow'
        }
      }));

      const { error: propertiesError } = await supabase
        .from('campaign_properties')
        .insert(propertyRecords);

      if (propertiesError) {
        console.error('Error creating campaign properties:', propertiesError);
        // Don't fail the whole request, but log the error
      } else {
        console.log(`Created ${propertyRecords.length} campaign property records`);
      }
    }

    // Create communication record for the email draft
    const { error: commError } = await supabase
      .from('campaign_communications')
      .insert([
        {
          campaign_id: campaign.id,
          communication_type: 'email_draft',
          direction: 'outbound',
          subject: `Inspection Campaign: ${campaignData.name}`,
          to_email: campaignData.pmEmail,
          gmail_message_id: campaignData.gmail.draftId,
          gmail_thread_id: campaignData.gmail.threadId,
          sent_at: new Date().toISOString()
        }
      ]);

    if (commError) {
      console.error('Error creating communication record:', commError);
      // Don't fail the whole request, but log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaign: {
          id: campaign.id,
          campaign_id: campaign.campaign_id,
          name: campaign.name,
          status: campaign.status,
          total_properties: campaign.total_properties
        },
        message: 'Campaign created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-inspection-campaign function:', error);
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