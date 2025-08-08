import { useMutation } from '@tanstack/react-query'
import { useToast, toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface CampaignWorkflowData {
  campaign_id: string
  campaign_name: string
  client_name: string
  property_manager_email: string
  region: string
  market: string
  // Enhanced with inspector information
  inspector_id?: string
  inspector_name?: string
  inspector_email?: string
  properties: Array<{
    roof_id: string
    property_name: string
    address: string
    // Property-level inspector override
    inspector_id?: string
    inspector_email?: string
  }>
}

interface N8nWebhookResponse {
  success: boolean
  draft_id?: string
  campaign_id?: string
  message?: string
  error?: string
}

interface TriggerWorkflowParams {
  campaignData: CampaignWorkflowData
  webhookUrl?: string
}

export interface ProcessingResult {
  success: boolean
  campaignData: CampaignWorkflowData
  response?: N8nWebhookResponse
  error?: string
  attempts: number
}

interface BatchProcessingResult {
  successful: ProcessingResult[]
  failed: ProcessingResult[]
  total: number
}

const MAX_RETRIES = 3
const RETRY_DELAY = 2000
const REQUEST_TIMEOUT = 60000

// New batch processing function via edge proxy
const processCampaignsBatch = async (campaigns: CampaignWorkflowData[]): Promise<BatchProcessingResult> => {
  const batchPayload = {
    batch_id: `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    batch_mode: true,
    campaigns,
    default_inspector: campaigns[0] ? {
      inspector_id: campaigns[0].inspector_id,
      inspector_name: campaigns[0].inspector_name,
      inspector_email: campaigns[0].inspector_email
    } : null
  }

  try {
    const { data, error } = await supabase.functions.invoke('trigger-workflow', {
      body: { workflow: 'campaign', payload: batchPayload }
    })
    if (error) throw error

    const successful = campaigns.map(campaign => ({
      success: true,
      campaignData: campaign,
      response: data,
      attempts: 1,
    }))

    return { successful, failed: [], total: campaigns.length }
  } catch (error: any) {
    // Fallback to per-campaign edge function for creation
    const results: ProcessingResult[] = []
    for (const campaign of campaigns) {
      try {
        await createCampaignFallback(campaign)
        results.push({ success: true, campaignData: campaign, attempts: 1 })
      } catch (fallbackError: any) {
        results.push({ success: false, campaignData: campaign, error: fallbackError.message, attempts: 1 })
      }
    }
    return { successful: results.filter(r => r.success), failed: results.filter(r => !r.success), total: campaigns.length }
  }
}

async function triggerN8nWorkflowWithRetry(
  campaignData: CampaignWorkflowData,
  _webhookUrl: string | undefined,
  maxRetries: number = MAX_RETRIES
): Promise<ProcessingResult> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await triggerN8nWorkflow(campaignData)
      return { success: true, campaignData, response, attempts: attempt }
    } catch (error: any) {
      lastError = error
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  return { success: false, campaignData, error: lastError?.message || 'Unknown error', attempts: maxRetries }
}

async function triggerN8nWorkflow(
  campaignData: CampaignWorkflowData,
): Promise<N8nWebhookResponse> {
  // Validate property manager email
  if (!campaignData.property_manager_email || 
      !campaignData.property_manager_email.includes('@') || 
      !campaignData.property_manager_email.includes('.')) {
    throw new Error(`Invalid property manager email: ${campaignData.property_manager_email}`)
  }

  const payload = {
    campaign_id: campaignData.campaign_id,
    campaign_name: campaignData.campaign_name,
    client_name: campaignData.client_name,
    property_manager_email: campaignData.property_manager_email,
    region: campaignData.region,
    market: campaignData.market,
    inspector_id: campaignData.inspector_id,
    inspector_name: campaignData.inspector_name,
    inspector_email: campaignData.inspector_email,
    properties: campaignData.properties,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const { data, error } = await supabase.functions.invoke('trigger-workflow', {
      body: { workflow: 'campaign', payload },
    })
    clearTimeout(timeoutId)

    if (error) throw error
    return data as N8nWebhookResponse
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - workflow took too long to respond')
    }
    throw error
  }
}

// Fallback function to use Supabase Edge Function for campaign creation
async function createCampaignFallback(campaignData: CampaignWorkflowData): Promise<void> {
  const { error } = await supabase.functions.invoke('create-inspection-campaign', {
    body: {
      campaignId: campaignData.campaign_id,
      campaignData: {
        name: campaignData.campaign_name,
        market: campaignData.market,
        region: campaignData.region,
        propertyManager: campaignData.property_manager_email.split('@')[0],
        propertyCount: campaignData.properties.length,
        pmEmail: campaignData.property_manager_email,
        inspector_id: campaignData.inspector_id,
        inspector_name: campaignData.inspector_name,
        inspector_email: campaignData.inspector_email,
        estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      properties: campaignData.properties
    }
  })

  if (error) throw error
}

export function useN8nWorkflow() {
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: async ({ campaignData, webhookUrl }: TriggerWorkflowParams) => {
      // Ignore webhookUrl; we use secure edge proxy now
      return await triggerN8nWorkflowWithRetry(campaignData, undefined)
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast({
          title: "Workflow Triggered Successfully",
          description: `Campaign "${variables.campaignData.campaign_name}" has been started after ${data.attempts} attempt(s).`,
        })
      } else {
        toast({
          title: "Workflow Failed",
          description: data.error || "Failed to trigger inspection campaign workflow",
          variant: "destructive",
        })
      }
    },
    onError: (error: Error) => {
      console.error('N8n workflow trigger failed:', error)
      toast({
        title: "Workflow Failed",
        description: error.message || "Failed to trigger inspection campaign workflow",
        variant: "destructive",
      })
    },
  })

  return {
    triggerWorkflow: mutation.mutate,
    triggerWorkflowAsync: mutation.mutateAsync,
    processCampaignsSequentially: async (campaigns: CampaignWorkflowData[]) => processCampaignsBatch(campaigns),
    processCampaignsBatch,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  }
}

export type { CampaignWorkflowData, N8nWebhookResponse, TriggerWorkflowParams }
