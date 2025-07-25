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

interface ProcessingResult {
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

// Updated to match the correct n8n workflow endpoint
const DEFAULT_WEBHOOK_URL = 'https://mkidder97.app.n8n.cloud/webhook-test/roofmind-campaign'
const MAX_RETRIES = 3
const RETRY_DELAY = 2000
const REQUEST_TIMEOUT = 60000

// New batch processing function
const processCampaignsBatch = async (campaigns: CampaignWorkflowData[]): Promise<BatchProcessingResult> => {
  console.log(`Processing ${campaigns.length} campaigns as a batch`)
  
  // Create enhanced batch payload structure with inspector information
  const batchPayload = {
    batch_id: `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    batch_mode: true,
    campaigns: campaigns,
    // Include default inspector info for the batch
    default_inspector: campaigns[0] ? {
      inspector_id: campaigns[0].inspector_id,
      inspector_name: campaigns[0].inspector_name,
      inspector_email: campaigns[0].inspector_email
    } : null,
    supabase_url: "https://cycfmmxveqcpqtmncmup.supabase.co",
    supabase_service_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Y2ZtbXh2ZXFjcHF0bW5jbXVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc5MDg1MSwiZXhwIjoyMDY4MzY2ODUxfQ.lSkzBLqHs5DKWGsMLbLZrOoL2KZIYBCHNlLuLhFWm5M"
  }
  
  console.log('Sending enhanced batch payload to N8n:', {
    batch_id: batchPayload.batch_id,
    campaign_count: campaigns.length,
    default_inspector: batchPayload.default_inspector,
    property_managers: campaigns.map(c => c.property_manager_email)
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(DEFAULT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchPayload),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Batch webhook failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('Batch processing successful:', result)
    
    // Convert successful batch response to ProcessingResult format
    const successful = campaigns.map(campaign => ({
      success: true,
      campaignData: campaign,
      response: result,
      attempts: 1
    }))
    
    return {
      successful,
      failed: [],
      total: campaigns.length
    }
    
  } catch (error) {
    clearTimeout(timeoutId)
    console.error('Batch processing failed, attempting individual fallbacks:', error)
    
    const results: ProcessingResult[] = []
    
    for (const campaign of campaigns) {
      try {
        await createCampaignFallback(campaign)
        results.push({
          success: true,
          campaignData: campaign,
          attempts: 1
        })
        console.log(`Fallback successful for campaign: ${campaign.campaign_name}`)
      } catch (fallbackError) {
        results.push({
          success: false,
          campaignData: campaign,
          error: `Batch failed: ${error.message}. Fallback failed: ${fallbackError.message}`,
          attempts: 1
        })
        console.error(`Both batch and fallback failed for campaign: ${campaign.campaign_name}`, fallbackError)
      }
    }
    
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    return {
      successful,
      failed,
      total: campaigns.length
    }
  }
}

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
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1)
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
    // Include inspector information for n8n workflow
    inspector_id: campaignData.inspector_id,
    inspector_name: campaignData.inspector_name,
    inspector_email: campaignData.inspector_email,
    properties: campaignData.properties,
    // Add Supabase credentials for the workflow
    supabase_url: "https://cycfmmxveqcpqtmncmup.supabase.co",
    supabase_service_key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Y2ZtbXh2ZXFjcHF0bW5jbXVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc5MDg1MSwiZXhwIjoyMDY4MzY2ODUxfQ.lSkzBLqHs5DKWGsMLbLZrOoL2KZIYBCHNlLuLhFWm5M"
  }

  console.log('Sending payload to N8n:', {
    campaign_id: payload.campaign_id,
    campaign_name: payload.campaign_name,
    property_manager_email: payload.property_manager_email,
    inspector_email: payload.inspector_email,
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
          // Include inspector information in fallback
          inspector_id: campaignData.inspector_id,
          inspector_name: campaignData.inspector_name,
          inspector_email: campaignData.inspector_email,
          estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          properties: campaignData.properties.map(p => ({
            id: p.roof_id,
            name: p.property_name,
            inspector_id: p.inspector_id || campaignData.inspector_id // Use property override or campaign default
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

const processCampaignsSequentially = async (campaigns: CampaignWorkflowData[]): Promise<BatchProcessingResult> => {
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

export function useN8nWorkflow() {
  const { toast } = useToast()

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
    processCampaignsSequentially, // Keep for backward compatibility
    processCampaignsBatch, // New batch function
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  }
}

export type { CampaignWorkflowData, N8nWebhookResponse, TriggerWorkflowParams, ProcessingResult, BatchProcessingResult }
