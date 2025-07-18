import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusUpdateRequest {
  campaignId: string;
  status?: string;
  propertyUpdates?: Array<{
    propertyId: string;
    status: string;
    inspectionDate?: string;
    notes?: string;
  }>;
  metadata?: Record<string, any>;
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

    const { campaignId, status, propertyUpdates, metadata, userId }: StatusUpdateRequest = await req.json();

    console.log('Updating campaign status:', { campaignId, status, propertyUpdates });

    const updates: any = {
      updated_at: new Date().toISOString()
    };

    // Update campaign status if provided
    if (status) {
      updates.status = status;
      
      // Set completion date if status is completed
      if (status === 'completed') {
        updates.actual_completion = new Date().toISOString().split('T')[0];
      }
    }

    // Update metadata if provided
    if (metadata) {
      updates.campaign_metadata = metadata;
    }

    // Update the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('inspection_campaigns')
      .update(updates)
      .eq('id', campaignId)
      .select()
      .single();

    if (campaignError) {
      console.error('Error updating campaign:', campaignError);
      throw campaignError;
    }

    // Update individual properties if provided
    let updatedProperties = [];
    if (propertyUpdates && propertyUpdates.length > 0) {
      for (const propUpdate of propertyUpdates) {
        const propertyData: any = {
          status: propUpdate.status,
          updated_at: new Date().toISOString()
        };

        if (propUpdate.inspectionDate) {
          propertyData.inspection_date = propUpdate.inspectionDate;
        }

        if (propUpdate.notes) {
          propertyData.inspector_notes = propUpdate.notes;
        }

        const { data: updatedProp, error: propError } = await supabase
          .from('campaign_properties')
          .update(propertyData)
          .eq('campaign_id', campaignId)
          .eq('roof_id', propUpdate.propertyId)
          .select()
          .single();

        if (propError) {
          console.error('Error updating property:', propError);
          // Continue with other properties even if one fails
        } else {
          updatedProperties.push(updatedProp);
        }
      }
    }

    // Calculate campaign progress
    const { data: progressData } = await supabase
      .from('campaign_properties')
      .select('status')
      .eq('campaign_id', campaignId);

    let progressStats = {
      total: 0,
      pending: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0
    };

    if (progressData) {
      progressStats.total = progressData.length;
      progressData.forEach(prop => {
        progressStats[prop.status as keyof typeof progressStats]++;
      });
    }

    console.log('Campaign status updated successfully:', campaign);

    return new Response(
      JSON.stringify({
        success: true,
        campaign,
        updatedProperties,
        progress: progressStats,
        message: 'Campaign status updated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in update-campaign-status function:', error);
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