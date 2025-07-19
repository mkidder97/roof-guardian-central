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
  executionId?: string
  campaign?: {
    id: string
    estimatedCompletion?: string
  }
  message?: string
  error?: string
}

interface TriggerWorkflowParams {
  campaignData: CampaignWorkflowData
  webhookUrl?: string
}

const DEFAULT_WEBHOOK_URL = 'https://mkidder97.app.n8n.cloud/webhook-test/start-annual-inspections'

async function triggerN8nWorkflow(
  campaignData: CampaignWorkflowData,
  webhookUrl: string = DEFAULT_WEBHOOK_URL
): Promise<N8nWebhookResponse> {
  const payload = {
    selectedProperties: campaignData.properties,
    filters: {
      clientId: campaignData.client_name,
      region: campaignData.region,
      market: campaignData.market,
      inspectionType: 'annual'
    },
    campaign: {
      id: campaignData.campaign_id,
      name: campaignData.campaign_name,
      propertyManagerEmail: campaignData.property_manager_email
    }
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
        description: `Campaign "${variables.campaignData.campaign_name}" has been started with ${variables.campaignData.properties.length} properties.`,
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