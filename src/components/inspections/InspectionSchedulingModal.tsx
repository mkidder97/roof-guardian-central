import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calendar, FileDown, CheckCircle, AlertCircle, X, Brain } from "lucide-react";
import { format, addMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { IntelligentGrouping } from "./IntelligentGrouping";
import { PropertyGroup } from "@/lib/intelligentGrouping";

interface InspectionSchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Webhook configuration with environment variables
const webhookConfig = {
  url: import.meta.env.VITE_N8N_WEBHOOK_URL || "https://mkidder97.app.n8n.cloud/webhook-test/start-annual-inspections",
  apiKey: import.meta.env.VITE_N8N_API_KEY,
  timeout: parseInt(import.meta.env.VITE_N8N_TIMEOUT) || 30000,
  retryAttempts: 3
};

// Zod schemas for validation
const webhookResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  campaign: z.object({
    id: z.string().optional(),
    market: z.string(),
    propertyManager: z.string(),
    propertyCount: z.number(),
    pmEmail: z.string(),
    estimatedCompletion: z.string().optional(),
  }).optional(),
});

const webhookPayloadSchema = z.object({
  selectedProperties: z.array(z.object({
    id: z.string(),
    property_name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string().optional(),
    market: z.string().optional(),
    property_manager_name: z.string().optional(),
    property_manager_email: z.string().optional(),
    property_manager_phone: z.string().optional(),
    site_contact_name: z.string().optional(),
    site_contact_phone: z.string().optional(),
    roof_access: z.string().optional(),
    roof_area: z.number().optional(),
    roof_type: z.string().optional(),
    last_inspection_date: z.string().optional(),
    warranty_status: z.string().optional(),
  })),
  filters: z.object({
    clientId: z.string().optional(),
    region: z.string().optional(),
    market: z.string().optional(),
    inspectionType: z.string(),
  }),
});

enum WorkflowSteps {
  PREPARING = "preparing",
  VALIDATING = "validating",
  SENDING = "sending",
  PROCESSING = "processing",
  COMPLETE = "complete",
  ERROR = "error"
}

interface CampaignResult {
  id?: string;
  market: string;
  propertyManager: string;
  propertyCount: number;
  pmEmail: string;
  estimatedCompletion?: string;
}

interface SchedulingFilters {
  clientId?: string;
  region?: string;
  market?: string;
  propertyIds?: string[];
  inspectionType: 'annual' | 'preventative' | 'emergency';
  scheduledDateRange: {
    start: Date;
    end: Date;
  };
}

export function InspectionSchedulingModal({ open, onOpenChange }: InspectionSchedulingModalProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState<SchedulingFilters>({
    inspectionType: 'annual',
    scheduledDateRange: {
      start: new Date(),
      end: addMonths(new Date(), 3)
    }
  });
  const [selectedProperties, setSelectedProperties] = useState<any[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [generatedGroups, setGeneratedGroups] = useState<PropertyGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'properties' | 'grouping'>('properties');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<WorkflowSteps>(WorkflowSteps.PREPARING);
  const [progress, setProgress] = useState(0);
  const [campaignResult, setCampaignResult] = useState<CampaignResult | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      fetchClients();
      resetWorkflowState();
    }
  }, [open]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const resetWorkflowState = () => {
    setCurrentStep(WorkflowSteps.PREPARING);
    setProgress(0);
    setCampaignResult(null);
    setRetryAttempt(0);
    setWorkflowLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchFilteredProperties = async (currentFilters: SchedulingFilters) => {
    try {
      setLoading(true);
      let query = supabase
        .from('roofs')
        .select(`
          *,
          clients(company_name)
        `)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .eq('status', 'active');

      if (currentFilters.clientId && currentFilters.clientId !== 'all') {
        query = query.eq('client_id', currentFilters.clientId);
      }

      if (currentFilters.region) {
        query = query.eq('region', currentFilters.region);
      }

      if (currentFilters.market) {
        query = query.eq('market', currentFilters.market);
      }

      const { data, error } = await query.order('property_name');

      if (error) throw error;

      // Add warranty status to each property
      const propertiesWithStatus = (data || []).map(property => {
        const now = new Date();
        const manufacturerExpiry = property.manufacturer_warranty_expiration ? new Date(property.manufacturer_warranty_expiration) : null;
        const installerExpiry = property.installer_warranty_expiration ? new Date(property.installer_warranty_expiration) : null;
        
        const hasActiveWarranty = (manufacturerExpiry && manufacturerExpiry > now) || (installerExpiry && installerExpiry > now);
        const warranty_status = hasActiveWarranty ? 'active' : 'expired';
        
        return { ...property, warranty_status };
      });

      setFilteredProperties(propertiesWithStatus);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to fetch properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectAllProperties = () => {
    setSelectedProperties([...filteredProperties]);
  };

  const clearSelection = () => {
    setSelectedProperties([]);
  };

  const exportSelectedProperties = () => {
    if (selectedProperties.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select properties to export.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ['Property Name', 'Address', 'City', 'State', 'Property Manager', 'Phone', 'Email', 'Last Inspection', 'Roof Area'];
    const csvContent = [
      headers.join(','),
      ...selectedProperties.map(property => [
        `"${property.property_name}"`,
        `"${property.address}"`,
        property.city,
        property.state,
        `"${property.property_manager_name || ''}"`,
        property.property_manager_phone || '',
        property.property_manager_email || '',
        property.last_inspection_date || '',
        property.roof_area || ''
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-schedule-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${selectedProperties.length} properties to CSV.`,
    });
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const validateWebhookUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' && urlObj.hostname.length > 0;
    } catch {
      return false;
    }
  };

  const isPayloadValid = (payload: any): boolean => {
    try {
      webhookPayloadSchema.parse(payload);
      return true;
    } catch (error) {
      console.error('Payload validation failed:', error);
      return false;
    }
  };

  const updateProgress = (step: WorkflowSteps, progressValue: number) => {
    setCurrentStep(step);
    setProgress(progressValue);
  };

  const cancelWorkflow = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetWorkflowState();
    toast({
      title: "Workflow Cancelled",
      description: "The inspection workflow has been cancelled.",
    });
  };

  const scheduleAnotherCampaign = () => {
    resetWorkflowState();
    setSelectedProperties([]);
    setCampaignResult(null);
  };

  const generateCampaignName = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .rpc('generate_campaign_name', {
          p_market: filters.market || 'Multi-Market',
          p_inspection_type: filters.inspectionType,
          p_total_properties: selectedProperties.length
        });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating campaign name:', error);
      return `${filters.market || 'Multi-Market'} ${filters.inspectionType} Campaign - ${selectedProperties.length} Properties (${format(new Date(), 'MM/dd/yyyy')})`;
    }
  };

  const viewCampaignStatus = () => {
    if (campaignResult?.id) {
      // Navigate to campaign detail view
      window.open(`/dashboard?tab=campaigns&campaign=${campaignResult.id}`, '_blank');
    }
  };

  const makeWebhookRequest = async (payload: any, attempt: number = 0): Promise<any> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (webhookConfig.apiKey) {
        headers["Authorization"] = `Bearer ${webhookConfig.apiKey}`;
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, webhookConfig.timeout);

      const response = await fetch(webhookConfig.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Validate response schema
      try {
        return webhookResponseSchema.parse(result);
      } catch (validationError) {
        console.warn('Response validation failed, using raw response:', validationError);
        return result;
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      
      if (attempt < webhookConfig.retryAttempts - 1) {
        const backoffDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Attempt ${attempt + 1} failed, retrying in ${backoffDelay}ms...`);
        await sleep(backoffDelay);
        return makeWebhookRequest(payload, attempt + 1);
      }
      
      throw error;
    }
  };

  const initiateInspectionWorkflow = async () => {
    // Pre-validation checks
    if (selectedProperties.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select properties to schedule inspections.",
        variant: "destructive",
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "Network Unavailable",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!validateWebhookUrl(webhookConfig.url)) {
      toast({
        title: "Invalid Webhook URL",
        description: "Please configure a valid HTTPS webhook URL.",
        variant: "destructive",
      });
      return;
    }

    setWorkflowLoading(true);
    setRetryAttempt(0);

    try {
      // Step 1: Preparing campaign
      updateProgress(WorkflowSteps.PREPARING, 10);
      await sleep(500); // Simulate preparation time

      // Step 2: Validating payload
      updateProgress(WorkflowSteps.VALIDATING, 25);
      
      const payload = {
        selectedProperties: selectedProperties.map(property => ({
          id: property.id,
          property_name: property.property_name,
          address: property.address,
          city: property.city,
          state: property.state,
          zip: property.zip,
          market: property.market,
          property_manager_name: property.property_manager_name,
          property_manager_email: property.property_manager_email,
          property_manager_phone: property.property_manager_phone,
          site_contact_name: property.site_contact_name,
          site_contact_phone: property.site_contact_phone,
          roof_access: property.roof_access,
          roof_area: property.roof_area,
          roof_type: property.roof_type,
          last_inspection_date: property.last_inspection_date,
          warranty_status: property.warranty_status,
        })),
        filters: {
          clientId: filters.clientId,
          region: filters.region,
          market: filters.market,
          inspectionType: filters.inspectionType,
        },
      };

      // Validate payload size (max 10MB)
      const payloadSize = new Blob([JSON.stringify(payload)]).size;
      if (payloadSize > 10 * 1024 * 1024) {
        throw new Error('Payload too large. Please select fewer properties.');
      }

      if (!isPayloadValid(payload)) {
        throw new Error('Invalid payload data. Please check your selections.');
      }

      console.log("Sending payload to n8n webhook:", payload);

      // Step 3: Sending to n8n
      updateProgress(WorkflowSteps.SENDING, 50);

      // Step 4: Processing
      updateProgress(WorkflowSteps.PROCESSING, 75);
      
      const result = await makeWebhookRequest(payload);
      console.log("n8n workflow response:", result);

        // Step 5: Complete
        updateProgress(WorkflowSteps.COMPLETE, 100);

        if (result.success) {
          // Create campaign record in database
          const campaignName = await generateCampaignName();
          
          const { data: campaignData, error: campaignError } = await supabase
            .from('inspection_campaigns')
            .insert({
              name: campaignName,
              client_id: filters.clientId !== 'all' ? filters.clientId : null,
              region: filters.region,
              market: filters.market,
              inspection_type: filters.inspectionType,
              status: 'processing',
              total_properties: selectedProperties.length,
              n8n_workflow_id: result.campaign?.id,
              n8n_execution_id: result.executionId,
              estimated_completion: result.campaign?.estimatedCompletion ? result.campaign.estimatedCompletion : null,
              created_by: (await supabase.auth.getUser()).data.user?.id,
              metadata: {
                webhook_response: result,
                automation_settings: {
                  webhook_url: webhookConfig.url,
                  retry_attempts: webhookConfig.retryAttempts,
                  timeout: webhookConfig.timeout
                }
              },
              automation_settings: {
                notification_preferences: {
                  email_on_completion: true,
                  email_on_failure: true
                },
                scheduling_preferences: {
                  preferred_time_slots: ['09:00-12:00', '13:00-17:00'],
                  avoid_weekends: true
                }
              },
              contact_preferences: {
                primary_contact_method: 'email',
                backup_contact_method: 'phone',
                notification_frequency: 'daily'
              }
            })
            .select()
            .single();

          if (campaignError) {
            console.error('Error creating campaign:', campaignError);
            throw new Error('Failed to create campaign record');
          }

          // Create campaign_properties records
          const campaignProperties = selectedProperties.map(property => ({
            campaign_id: campaignData.id,
            roof_id: property.id,
            status: 'pending' as const,
            automation_data: {
              property_payload: {
                property_name: property.property_name,
                address: property.address,
                city: property.city,
                state: property.state,
                zip: property.zip,
                market: property.market,
                property_manager: {
                  name: property.property_manager_name,
                  email: property.property_manager_email,
                  phone: property.property_manager_phone
                }
              }
            },
            risk_assessment: {
              safety_concerns: property.safety_concerns || false,
              roof_access_difficulty: property.roof_access || 'standard',
              last_inspection_age: property.last_inspection_date ? 
                Math.floor((new Date().getTime() - new Date(property.last_inspection_date).getTime()) / (1000 * 3600 * 24)) : null,
              warranty_status: property.warranty_status
            }
          }));

          const { error: propertiesError } = await supabase
            .from('campaign_properties')
            .insert(campaignProperties);

          if (propertiesError) {
            console.error('Error creating campaign properties:', propertiesError);
            // Don't throw here as campaign is created, just log the issue
          }

          const campaign: CampaignResult = {
            id: campaignData.id,
            market: result.campaign?.market || filters.market || 'Unknown',
            propertyManager: result.campaign?.propertyManager || 'Multiple',
            propertyCount: result.campaign?.propertyCount || selectedProperties.length,
            pmEmail: result.campaign?.pmEmail || '',
            estimatedCompletion: result.campaign?.estimatedCompletion,
          };

          setCampaignResult(campaign);

          toast({
            title: "Campaign Started Successfully!",
            description: `${campaign.propertyCount} properties processed for ${campaign.market} market. Campaign ID: ${campaignData.id.slice(0, 8)}...`,
            duration: 6000,
          });

          // Don't close modal immediately - show success state
          await sleep(2000);
          
        } else {
          throw new Error(result.message || "Workflow failed without specific error");
        }

      } catch (error) {
        console.error("Error initiating workflow:", error);
      updateProgress(WorkflowSteps.ERROR, 0);
      
      let errorTitle = "Workflow Failed";
      let errorDescription = "An unexpected error occurred. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          errorTitle = "Network Error";
          errorDescription = "Unable to connect to automation server. Please check your connection and try again.";
        } else if (error.message.includes('timeout')) {
          errorTitle = "Request Timeout";
          errorDescription = "The request took too long to complete. Please try again with fewer properties.";
        } else if (error.message.includes('Payload too large')) {
          errorTitle = "Payload Too Large";
          errorDescription = error.message;
        } else if (error.message.includes('cancelled')) {
          errorTitle = "Request Cancelled";
          errorDescription = "The workflow was cancelled by the user.";
        } else {
          errorDescription = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 8000,
      });
      
    } finally {
      setWorkflowLoading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Schedule Annual Inspections</DialogTitle>
          <DialogDescription>
            Select properties and create automated inspection scheduling workflow
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="properties" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Property Selection</span>
            </TabsTrigger>
            <TabsTrigger value="grouping" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Intelligent Grouping</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="flex-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
              {/* Left Panel - Filters */}
              <Card className="p-4">{/* ... keep existing filter content ... */}
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {/* Client Selection */}
              <div>
                <label className="text-sm font-medium">Client</label>
                <Select value={filters.clientId} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, clientId: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Region Selection */}
              <div>
                <label className="text-sm font-medium">Region</label>
                <Select value={filters.region} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, region: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="central">Central</SelectItem>
                    <SelectItem value="southwest">Southwest</SelectItem>
                    <SelectItem value="southeast">Southeast</SelectItem>
                    <SelectItem value="northeast">Northeast</SelectItem>
                    <SelectItem value="northwest">Northwest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Market Selection */}
              <div>
                <label className="text-sm font-medium">Market</label>
                <Select value={filters.market} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, market: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select market" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dallas">Dallas</SelectItem>
                    <SelectItem value="houston">Houston</SelectItem>
                    <SelectItem value="austin">Austin</SelectItem>
                    <SelectItem value="san-antonio">San Antonio</SelectItem>
                    <SelectItem value="atlanta">Atlanta</SelectItem>
                    <SelectItem value="charlotte">Charlotte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Inspection Type */}
              <div>
                <label className="text-sm font-medium">Inspection Type</label>
                <Select value={filters.inspectionType} onValueChange={(value: any) => 
                  setFilters(prev => ({ ...prev, inspectionType: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual Preventative</SelectItem>
                    <SelectItem value="preventative">Routine Preventative</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-sm font-medium">Inspection Window</label>
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    type="date"
                    value={format(filters.scheduledDateRange.start, 'yyyy-MM-dd')}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      scheduledDateRange: {
                        ...prev.scheduledDateRange,
                        start: new Date(e.target.value)
                      }
                    }))}
                  />
                  <Input
                    type="date"
                    value={format(filters.scheduledDateRange.end, 'yyyy-MM-dd')}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      scheduledDateRange: {
                        ...prev.scheduledDateRange,
                        end: new Date(e.target.value)
                      }
                    }))}
                  />
                </div>
              </div>

              {/* Environment Configuration Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Configuration Status</label>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {validateWebhookUrl(webhookConfig.url) ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs">Webhook URL</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {webhookConfig.apiKey ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-xs">API Key (optional)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isOnline ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs">Network Status</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => fetchFilteredProperties(filters)}
                className="w-full"
                disabled={loading}
              >
                <Search className="h-4 w-4 mr-2" />
                Find Properties
              </Button>
            </CardContent>
          </Card>

          {/* Center Panel - Property List */}
          <Card className="lg:col-span-3 p-4 flex flex-col">
            <CardHeader className="p-0 pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Properties ({selectedProperties.length} selected)
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={selectAllProperties}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-4">
                  {loading ? (
                    <div className="text-center py-8">Loading properties...</div>
                  ) : filteredProperties.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No properties found. Adjust your filters and try again.
                    </div>
                  ) : (
                    filteredProperties.map((property) => (
                      <div key={property.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          checked={selectedProperties.some(p => p.id === property.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProperties(prev => [...prev, property]);
                            } else {
                              setSelectedProperties(prev => prev.filter(p => p.id !== property.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{property.property_name}</div>
                          <div className="text-sm text-gray-600">
                            {property.address}, {property.city}, {property.state}
                          </div>
                          <div className="text-xs text-gray-500">
                            PM: {property.property_manager_name || 'Not assigned'} • Last Inspection: {property.last_inspection_date || 'Never'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{property.roof_area?.toLocaleString() || 'N/A'} sq ft</div>
                          <Badge variant={property.warranty_status === 'active' ? 'default' : 'destructive'}>
                            {property.warranty_status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
            </div>
          </TabsContent>

          <TabsContent value="grouping" className="flex-1 min-h-0">
            <IntelligentGrouping
              properties={filteredProperties}
              selectedProperties={selectedProperties}
              onGroupsGenerated={setGeneratedGroups}
              onPropertiesSelected={setSelectedProperties}
            />
          </TabsContent>
        </Tabs>

        {/* Workflow Progress Section */}
        {workflowLoading && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {currentStep === WorkflowSteps.PREPARING && "Preparing campaign..."}
                  {currentStep === WorkflowSteps.VALIDATING && "Validating data..."}
                  {currentStep === WorkflowSteps.SENDING && "Sending to n8n..."}
                  {currentStep === WorkflowSteps.PROCESSING && "Processing workflow..."}
                  {currentStep === WorkflowSteps.COMPLETE && "Campaign started successfully!"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelWorkflow}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Progress value={progress} className="w-full" />
              {retryAttempt > 0 && (
                <div className="text-xs text-gray-600">
                  Retry attempt {retryAttempt}/{webhookConfig.retryAttempts}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Success State */}
        {campaignResult && currentStep === WorkflowSteps.COMPLETE && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Campaign Created Successfully!</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <div>Market: {campaignResult.market}</div>
                <div>Properties: {campaignResult.propertyCount}</div>
                <div>Property Manager: {campaignResult.propertyManager}</div>
                {campaignResult.estimatedCompletion && (
                  <div>Estimated Completion: {campaignResult.estimatedCompletion}</div>
                )}
              </div>
              <div className="flex space-x-2">
                {campaignResult.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={viewCampaignStatus}
                    className="text-green-700 border-green-300"
                  >
                    View Campaign Status
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scheduleAnotherCampaign}
                  className="text-green-700 border-green-300"
                >
                  Schedule Another Campaign
                </Button>
              </div>
            </div>
          </Card>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={exportSelectedProperties}>
              <FileDown className="h-4 w-4 mr-2" />
              Export List
            </Button>
          </div>
          <Button 
            onClick={initiateInspectionWorkflow}
            disabled={
              selectedProperties.length === 0 || 
              workflowLoading || 
              !isOnline ||
              !validateWebhookUrl(webhookConfig.url) ||
              currentStep === WorkflowSteps.COMPLETE
            }
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {workflowLoading ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                {currentStep === WorkflowSteps.PREPARING && "Preparing..."}
                {currentStep === WorkflowSteps.VALIDATING && "Validating..."}
                {currentStep === WorkflowSteps.SENDING && "Sending..."}
                {currentStep === WorkflowSteps.PROCESSING && "Processing..."}
              </>
            ) : currentStep === WorkflowSteps.COMPLETE ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Campaign Started
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Start Inspection Workflow ({selectedProperties.length} properties)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}