import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

interface CampaignWorkflowData {
  campaign_id: string
  campaign_name: string
  client_name: string
  property_manager_email: string
  region: string
  market: string
  properties: Array<{
    roof_id: string
    property_name: string
    address: string
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

// Updated to match the correct n8n workflow endpoint
const DEFAULT_WEBHOOK_URL = 'https://mkidder97.app.n8n.cloud/webhook-test/roofmind-campaign'

async function triggerN8nWorkflow(
  campaignData: CampaignWorkflowData,
  webhookUrl: string = DEFAULT_WEBHOOK_URL
): Promise<N8nWebhookResponse> {
  // Updated payload structure to match our n8n workflow
  const payload = {
    campaign_id: campaignData.campaign_id,
    campaign_name: campaignData.campaign_name,
    client_name: campaignData.client_name,
    property_manager_email: campaignData.property_manager_email,
    region: campaignData.region,
    market: campaignData.market,
    properties: campaignData.properties,
    // Add Supabase credentials for the workflow
    supabase_url: import.meta.env.VITE_SUPABASE_URL,
    supabase_service_key: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  return result
}

export function useN8nWorkflow() {
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: ({ campaignData, webhookUrl }: TriggerWorkflowParams) =>
      triggerN8nWorkflow(campaignData, webhookUrl),
    onSuccess: (data, variables) => {
      toast({
        title: "Workflow Triggered Successfully",
        description: `Campaign "${variables.campaignData.campaign_name}" has been started. Gmail draft created with ID: ${data.draft_id}`,
      })
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
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  }
}

export type { CampaignWorkflowData, N8nWebhookResponse, TriggerWorkflowParams }