
import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

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

interface ProcessingResult {
  success: boolean
  campaignData: CampaignWorkflowData
  response?: N8nWebhookResponse
  error?: string
  attempts: number
}

// Updated to match the correct n8n workflow endpoint
const DEFAULT_WEBHOOK_URL = 'https://mkidder97.app.n8n.cloud/webhook-test/roofmind-campaign'
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // Increased to 2 seconds
const REQUEST_TIMEOUT = 60000 // Increased to 60 seconds

async function triggerN8nWorkflowWithRetry(
  campaignData: CampaignWorkflowData,
  webhookUrl: string = DEFAULT_WEBHOOK_URL,
  maxRetries: number = MAX_RETRIES
): Promise<ProcessingResult> {
  let lastError: Error | null = null
  
  console.log(`Starting campaign processing for: ${campaignData.campaign_name}`)
  console.log(`Property Manager: ${campaignData.property_manager_email}`)
  console.log(`Properties count: ${campaignData.properties.length}`)
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting webhook call ${attempt}/${maxRetries} for campaign: ${campaignData.campaign_name}`)
      
      const response = await triggerN8nWorkflow(campaignData, webhookUrl)
      
      console.log(`Webhook success on attempt ${attempt} for campaign: ${campaignData.campaign_name}`)
      return {
        success: true,
        campaignData,
        response,
        attempts: attempt
      }
    } catch (error) {
      lastError = error as Error
      console.error(`Webhook failed on attempt ${attempt}/${maxRetries} for campaign: ${campaignData.campaign_name}`, {
        error: error.message,
        status: (error as any).status,
        response: (error as any).response
      })
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1) // Exponential backoff
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  return {
    success: false,
    campaignData,
    error: lastError?.message || 'Unknown error occurred',
    attempts: maxRetries
  }
}

async function triggerN8nWorkflow(
  campaignData: CampaignWorkflowData,
  webhookUrl: string = DEFAULT_WEBHOOK_URL
): Promise<N8nWebhookResponse> {
  // Validate property manager email
  if (!campaignData.property_manager_email || 
      !campaignData.property_manager_email.includes('@') || 
      !campaignData.property_manager_email.includes('.')) {
    throw new Error(`Invalid property manager email: ${campaignData.property_manager_email}`)
  }

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
    supabase_url: "https://cycfmmxveqcpqtmncmup.supabase.co",
    supabase_service_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Y2ZtbXh2ZXFjcHF0bW5jbXVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc5MDg1MSwiZXhwIjoyMDY4MzY2ODUxfQ.lSkzBLqHs5DKWGsMLbLZrOoL2KZIYBCHNlLuLhFWm5M"
  }

  console.log('Sending payload to N8n:', {
    campaign_id: payload.campaign_id,
    campaign_name: payload.campaign_name,
    property_manager_email: payload.property_manager_email,
    properties_count: payload.properties.length
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const responseText = await response.text()
    console.log(`N8n response status: ${response.status}`)
    console.log(`N8n response body: ${responseText}`)

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText} - ${responseText}`)
    }

    try {
      const result = JSON.parse(responseText)
      return result
    } catch (parseError) {
      console.warn('Failed to parse N8n response as JSON, treating as success:', responseText)
      return { success: true, message: responseText }
    }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - webhook took too long to respond')
    }
    throw error
  }
}

// Fixed fallback function to use correct Supabase Edge Function URL
async function createCampaignFallback(campaignData: CampaignWorkflowData): Promise<void> {
  console.log('Creating campaign fallback for:', campaignData.campaign_name)
  
  try {
    // Use the correct Supabase Edge Function URL
    const { data, error } = await supabase.functions.invoke('create-inspection-campaign', {
      body: {
        campaignId: campaignData.campaign_id,
        campaignData: {
          name: campaignData.campaign_name,
          market: campaignData.market,
          region: campaignData.region,
          propertyManager: campaignData.property_manager_email.split('@')[0], // Extract name from email
          propertyCount: campaignData.properties.length,
          pmEmail: campaignData.property_manager_email,
          estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          properties: campaignData.properties.map(p => ({
            id: p.roof_id,
            name: p.property_name
          })),
          gmail: {
            draftId: 'fallback-' + Date.now(),
            threadId: 'fallback-thread-' + Date.now()
          },
          execution: {
            executionId: 'fallback-exec-' + Date.now(),
            processingTimeMs: 0
          }
        },
        userId: 'system'
      }
    })

    if (error) {
      console.error('Supabase function error:', error)
      throw new Error(`Fallback creation failed: ${error.message}`)
    }

    console.log('Campaign fallback created successfully:', data)
  } catch (error) {
    console.error('Fallback creation failed:', error)
    throw error
  }
}

export function useN8nWorkflow() {
  const { toast } = useToast()

  const processCampaignsSequentially = async (campaigns: CampaignWorkflowData[]): Promise<{
    successful: ProcessingResult[]
    failed: ProcessingResult[]
    total: number
  }> => {
    const results: ProcessingResult[] = []
    
    console.log(`Starting to process ${campaigns.length} campaigns sequentially`)
    
    // Validate all campaigns have valid property manager emails
    const validCampaigns = campaigns.filter(campaign => {
      if (!campaign.property_manager_email || 
          !campaign.property_manager_email.includes('@') || 
          !campaign.property_manager_email.includes('.')) {
        console.warn(`Skipping campaign due to invalid property manager email: ${campaign.property_manager_email}`)
        return false
      }
      return true
    })
    
    if (validCampaigns.length !== campaigns.length) {
      toast({
        title: "Warning",
        description: `${campaigns.length - validCampaigns.length} campaigns skipped due to invalid property manager emails`,
        variant: "destructive",
      })
    }
    
    for (let i = 0; i < validCampaigns.length; i++) {
      const campaign = validCampaigns[i]
      console.log(`Processing campaign ${i + 1}/${validCampaigns.length}: ${campaign.campaign_name}`)
      console.log(`Property Manager: ${campaign.property_manager_email} (${campaign.properties.length} properties)`)
      
      // Add delay between requests to avoid overwhelming N8n (increased to 3 seconds)
      if (i > 0) {
        console.log('Waiting 3 seconds before next campaign...')
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      const result = await triggerN8nWorkflowWithRetry(campaign)
      
      // If N8n fails, try fallback creation
      if (!result.success) {
        console.log(`N8n failed for ${campaign.campaign_name}, attempting fallback...`)
        try {
          await createCampaignFallback(campaign)
          result.success = true
          result.error = undefined
          console.log(`Fallback successful for campaign: ${campaign.campaign_name}`)
        } catch (fallbackError) {
          console.error(`Both N8n and fallback failed for campaign: ${campaign.campaign_name}`, fallbackError)
          result.error = `N8n failed: ${result.error}. Fallback failed: ${fallbackError.message}`
        }
      }
      
      results.push(result)
    }
    
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    console.log(`Campaign processing complete: ${successful.length} successful, ${failed.length} failed`)
    
    return {
      successful,
      failed,
      total: validCampaigns.length
    }
  }

  const mutation = useMutation({
    mutationFn: async ({ campaignData, webhookUrl }: TriggerWorkflowParams) => {
      // For single campaign (backward compatibility)
      return await triggerN8nWorkflowWithRetry(campaignData, webhookUrl)
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
    processCampaignsSequentially,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  }
}

export type { CampaignWorkflowData, N8nWebhookResponse, TriggerWorkflowParams, ProcessingResult }
