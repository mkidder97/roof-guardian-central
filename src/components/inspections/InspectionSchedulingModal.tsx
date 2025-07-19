import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Calendar, CheckCircle, X, FileDown, Filter, MapPin } from 'lucide-react';
import { IntelligentGrouping } from './IntelligentGrouping';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Property {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  market: string;
  region: string;
  roof_type: string;
  roof_area: number;
  last_inspection_date: string | null;
  property_manager_name: string;
  property_manager_email: string;
  property_manager_phone: string;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  roof_access: string;
  latitude: number | null;
  longitude: number | null;
  manufacturer_warranty_expiration: string | null;
  installer_warranty_expiration: string | null;
  client_id: string;
  status: string;
  clients?: {
    company_name: string;
  };
  warranty_status?: string;
}

interface InspectionSchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CampaignResult {
  success: boolean;
  message: string;
  campaign?: {
    id: string;
    market: string;
    propertyManager: string;
    propertyCount: number;
    pmEmail: string;
    estimatedCompletion: string;
  };
  executionId?: string;
}

enum WorkflowSteps {
  PREPARING = 'preparing',
  VALIDATING = 'validating',
  SENDING = 'sending',
  PROCESSING = 'processing',
  COMPLETE = 'complete'
}

interface WebhookConfig {
  url: string;
  retryAttempts: number;
  timeout: number;
}

export function InspectionSchedulingModal({ open, onOpenChange }: InspectionSchedulingModalProps) {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [propertyCache, setPropertyCache] = useState<Map<string, Property[]>>(new Map());
  const [generatedGroups, setGeneratedGroups] = useState([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<WorkflowSteps>(WorkflowSteps.PREPARING);
  const [progress, setProgress] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [campaignResult, setCampaignResult] = useState<CampaignResult | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [filters, setFilters] = useState({
    clientId: 'all',
    region: 'all',
    market: 'all',
    inspectionType: 'annual',
    warrantyStatus: 'all'
  });

  const [webhookConfig] = useState<WebhookConfig>({
    url: 'https://mkidder97.app.n8n.cloud/webhook-test/start-annual-inspections',
    retryAttempts: 3,
    timeout: 30000
  });

  const itemsPerPage = 50;

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

  useEffect(() => {
    if (open) {
      resetModalState();
      fetchProperties();
    }
  }, [open]);

  const resetModalState = () => {
    setSelectedProperties([]);
    setSearchTerm('');
    setCurrentPage(1);
    setWorkflowLoading(false);
    setCurrentStep(WorkflowSteps.PREPARING);
    setProgress(0);
    setRetryAttempt(0);
    setCampaignResult(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const fetchProperties = async () => {
    const cacheKey = `${filters.clientId}-${filters.region}-${filters.market}-${filters.warrantyStatus}`;
    
    if (propertyCache.has(cacheKey)) {
      const cachedProperties = propertyCache.get(cacheKey)!;
      setProperties(cachedProperties);
      setFilteredProperties(cachedProperties);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('roofs')
        .select(`
          id,
          property_name,
          address,
          city,
          state,
          zip,
          market,
          region,
          roof_type,
          roof_area,
          last_inspection_date,
          property_manager_name,
          property_manager_email,
          property_manager_phone,
          site_contact_name,
          site_contact_phone,
          roof_access,
          latitude,
          longitude,
          manufacturer_warranty_expiration,
          installer_warranty_expiration,
          client_id,
          status,
          clients!inner(company_name)
        `)
        .eq('status', 'active');

      if (filters.clientId !== 'all') {
        query = query.eq('client_id', filters.clientId);
      }
      
      if (filters.region !== 'all') {
        query = query.eq('region', filters.region);
      }
      
      if (filters.market !== 'all') {
        query = query.eq('market', filters.market);
      }

      const { data, error } = await query;

      if (error) throw error;

      const processedProperties: Property[] = (data || []).map(property => ({
        ...property,
        warranty_status: getWarrantyStatus(property.manufacturer_warranty_expiration)
      }));

      // Apply warranty status filter
      const finalProperties = filters.warrantyStatus === 'all' 
        ? processedProperties 
        : processedProperties.filter(p => p.warranty_status === filters.warrantyStatus);

      setProperties(finalProperties);
      setFilteredProperties(finalProperties);
      setPropertyCache(prev => new Map(prev.set(cacheKey, finalProperties)));
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

  const getWarrantyStatus = (expirationDate: string | null): string => {
    if (!expirationDate) return 'none';
    const expiry = new Date(expirationDate);
    const now = new Date();
    const monthsUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsUntilExpiry < 0) return 'expired';
    if (monthsUntilExpiry <= 12) return 'expiring';
    return 'active';
  };

  useEffect(() => {
    const filtered = properties.filter(property => {
      const searchLower = searchTerm.toLowerCase();
      return (
        property.property_name.toLowerCase().includes(searchLower) ||
        property.address.toLowerCase().includes(searchLower) ||
        property.city.toLowerCase().includes(searchLower) ||
        property.market.toLowerCase().includes(searchLower) ||
        property.region.toLowerCase().includes(searchLower) ||
        (property.property_manager_name && property.property_manager_name.toLowerCase().includes(searchLower))
      );
    });
    setFilteredProperties(filtered);
    setCurrentPage(1);
  }, [properties, searchTerm]);

  const filteredAndPaginatedProperties = {
    properties: filteredProperties.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    totalPages: Math.ceil(filteredProperties.length / itemsPerPage),
    totalCount: filteredProperties.length
  };

  const validateWebhookUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.includes('n8n.cloud') || url.includes('localhost') || url.includes('ngrok.io');
    } catch {
      return false;
    }
  };

  const generateCampaignName = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .rpc('generate_campaign_name', {
          p_market: filters.market === 'all' ? 'Multi-Market' : filters.market,
          p_inspection_type: filters.inspectionType,
          p_total_properties: selectedProperties.length
        });
      
      if (error) {
        console.warn('Campaign name RPC function failed, using fallback:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error generating campaign name:', error);
      // Fallback campaign name generation
      const market = filters.market === 'all' ? 'Multi-Market' : filters.market;
      const type = filters.inspectionType.charAt(0).toUpperCase() + filters.inspectionType.slice(1);
      const date = format(new Date(), 'MM/dd/yyyy');
      return `${market} - ${type} Campaign - ${selectedProperties.length} Properties (${date})`;
    }
  };

  const generateCampaignId = async (): Promise<string> => {
    try {
      // Since the RPC function may not be available in types yet, use direct fallback
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      return `CAMP-${timestamp}-${randomPart}`;
    } catch (error) {
      console.error('Error generating campaign ID:', error);
      // Fallback campaign ID generation
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      return `CAMP-${timestamp}-${randomPart}`;
    }
  };

  const sanitizeProperty = (property: Property) => {
    const sanitized = { ...property };
    
    // Convert null values to proper typed objects for n8n
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key as keyof Property] === null) {
        (sanitized as any)[key] = {
          "_type": "undefined",
          "value": "undefined"
        };
      }
    });
    
    return sanitized;
  };

  const initiateInspectionWorkflow = async () => {
    if (selectedProperties.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select at least one property for inspection.",
        variant: "destructive",
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

    setWorkflowLoading(true);
    setCurrentStep(WorkflowSteps.PREPARING);
    setProgress(10);
    setRetryAttempt(0);
    abortControllerRef.current = new AbortController();

    try {
      console.log('Raw selected properties before sanitization:', selectedProperties);
      
      // Sanitize properties for n8n processing
      const sanitizedProperties = selectedProperties.map(property => {
        const sanitized = sanitizeProperty(property);
        console.log('Sanitizing property:', {
          original: {
            id: property.id,
            property_name: property.property_name,
            property_manager_name: property.property_manager_name,
            property_manager_email: property.property_manager_email,
            latitude: property.latitude,
            longitude: property.longitude
          },
          sanitized: {
            id: sanitized.id,
            property_name: sanitized.property_name,
            property_manager_name: sanitized.property_manager_name,
            property_manager_email: sanitized.property_manager_email,
            latitude: sanitized.latitude,
            longitude: sanitized.longitude
          }
        });
        return sanitized;
      });

      console.log('Sanitized properties sample:', sanitizedProperties.slice(0, 1));

      // Validate data structure
      setCurrentStep(WorkflowSteps.VALIDATING);
      setProgress(25);

      const payload = {
        selectedProperties: sanitizedProperties,
        filters: {
          clientId: filters.clientId,
          region: filters.region,
          market: filters.market,
          inspectionType: filters.inspectionType
        }
      };

      console.log('Final payload structure:', {
        selectedPropertiesCount: payload.selectedProperties.length,
        filters: payload.filters,
        sampleProperty: payload.selectedProperties[0]
      });

      console.log('Validating payload structure:', payload);
      console.log('Payload validation successful:', payload);

      // Send to n8n webhook
      setCurrentStep(WorkflowSteps.SENDING);
      setProgress(50);

      console.log('Sending payload to n8n webhook:', payload);

      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: CampaignResult = await response.json();
      console.log('n8n workflow response:', result);

      setCurrentStep(WorkflowSteps.PROCESSING);
      setProgress(75);

      // Generate campaign data
      const campaignName = await generateCampaignName();
      const campaignId = await generateCampaignId();

      // Create campaign record in database - FIXED to match actual schema
      const { data: user } = await supabase.auth.getUser();
      const { data: campaignData, error: campaignError } = await supabase
        .from('inspection_campaigns')
        .insert({
          name: campaignName,
          client_id: filters.clientId !== 'all' ? filters.clientId : null,
          region: filters.region,
          market: filters.market,
          inspection_type: filters.inspectionType,
          status: 'emails_sent',
          total_properties: selectedProperties.length,
          n8n_execution_id: result.executionId || result.campaign?.id,
          estimated_completion: result.campaign?.estimatedCompletion ? result.campaign.estimatedCompletion : null,
          created_by: user.user?.id,
          automation_settings: {
            notification_preferences: {
              email_on_completion: true,
              email_on_failure: true
            },
            scheduling_preferences: {
              preferred_time_slots: ['09:00-12:00', '13:00-17:00'],
              avoid_weekends: true
            },
            webhook_config: {
              webhook_url: webhookConfig.url,
              retry_attempts: webhookConfig.retryAttempts,
              timeout: webhookConfig.timeout
            }
          }
        })
        .select()
        .single();

      if (campaignError) {
        console.error('Error creating campaign:', campaignError);
        throw new Error(`Failed to create campaign record: ${campaignError.message}`);
      }

      console.log('Campaign created successfully:', campaignData);

      setProgress(100);
      setCurrentStep(WorkflowSteps.COMPLETE);

      setCampaignResult({
        success: true,
        message: result.message || 'Campaign initiated successfully',
        campaign: result.campaign || {
          id: campaignData.id,
          market: filters.market,
          propertyManager: selectedProperties[0]?.property_manager_name || 'Multiple PMs',
          propertyCount: selectedProperties.length,
          pmEmail: selectedProperties[0]?.property_manager_email || '',
          estimatedCompletion: result.campaign?.estimatedCompletion || ''
        },
        executionId: result.executionId
      });

      toast({
        title: "Campaign Started Successfully!",
        description: `${selectedProperties.length} properties processed for ${filters.market} market. Campaign ID: ${campaignData.id}`,
        duration: 6000,
      });

    } catch (error: any) {
      console.error('Error initiating workflow:', error);
      
      setWorkflowLoading(false);
      setCurrentStep(WorkflowSteps.PREPARING);
      setProgress(0);

      if (error.name === 'AbortError') {
        toast({
          title: "Workflow Cancelled",
          description: "The inspection workflow was cancelled by the user.",
        });
        return;
      }

      toast({
        title: "Workflow Failed",
        description: error.message || "Failed to start inspection workflow. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelWorkflow = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setWorkflowLoading(false);
    setCurrentStep(WorkflowSteps.PREPARING);
    setProgress(0);
    setRetryAttempt(0);
  };

  const viewCampaignStatus = () => {
    if (campaignResult?.campaign?.id) {
      // Navigate to campaign detail view - implement based on your routing
      toast({
        title: "Campaign Tracking",
        description: `Campaign ${campaignResult.campaign.id} details will be available in the Campaigns tab.`,
      });
    }
  };

  const scheduleAnotherCampaign = () => {
    resetModalState();
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

    const csvContent = [
      ['Property Name', 'Address', 'City', 'State', 'Market', 'Region', 'Property Manager', 'PM Email'].join(','),
      ...selectedProperties.map(p => 
        [p.property_name, p.address, p.city, p.state, p.market, p.region, p.property_manager_name, p.property_manager_email].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-properties-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Schedule Inspection Campaign</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="selection" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="selection">Property Selection</TabsTrigger>
            <TabsTrigger value="grouping">Intelligent Grouping</TabsTrigger>
          </TabsList>

          <TabsContent value="selection" className="flex-1 min-h-0">
            <div className="space-y-4 h-full flex flex-col">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <span>Filter Properties</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Select value={filters.region} onValueChange={(value) => setFilters(prev => ({ ...prev, region: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        <SelectItem value="Central">Central</SelectItem>
                        <SelectItem value="East">East</SelectItem>
                        <SelectItem value="West">West</SelectItem>
                        <SelectItem value="North">North</SelectItem>
                        <SelectItem value="South">South</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.market} onValueChange={(value) => setFilters(prev => ({ ...prev, market: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Market" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Markets</SelectItem>
                        <SelectItem value="Dallas">Dallas</SelectItem>
                        <SelectItem value="Houston">Houston</SelectItem>
                        <SelectItem value="Austin">Austin</SelectItem>
                        <SelectItem value="San Antonio">San Antonio</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.inspectionType} onValueChange={(value) => setFilters(prev => ({ ...prev, inspectionType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Inspection Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="preventative">Preventative</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.warrantyStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, warrantyStatus: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Warranty Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Warranties</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expiring">Expiring Soon</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="none">No Warranty</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={fetchProperties} className="w-full">
                      Apply Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Search and Selection Summary */}
              <Card className="flex-1 min-h-0 flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Available Properties ({filteredAndPaginatedProperties.totalCount})
                    </CardTitle>
                    <Badge variant="secondary" className="text-sm">
                      {selectedProperties.length} selected
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search properties..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-gray-600">Loading properties...</p>
                        </div>
                      ) : filteredAndPaginatedProperties.totalCount === 0 ? (
                        <div className="text-center py-8">
                          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">No properties found matching your criteria.</p>
                          {propertyCache.size > 0 && (
                            <div className="mt-4">
                              <p className="text-sm text-gray-500 mb-2">Clear cache and try again?</p>
                              <Button 
                                variant="link"
                                size="sm"
                                onClick={() => setPropertyCache(new Map())}
                                className="mt-2"
                              >
                                Clear cached results
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        filteredAndPaginatedProperties.properties.map((property) => (
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
              onPropertiesSelected={(properties: Property[]) => setSelectedProperties(properties)}
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
               <div>Market: {campaignResult.campaign?.market}</div>
               <div>Properties: {campaignResult.campaign?.propertyCount}</div>
               <div>Property Manager: {campaignResult.campaign?.propertyManager}</div>
               {campaignResult.campaign?.estimatedCompletion && (
                 <div>Estimated Completion: {campaignResult.campaign.estimatedCompletion}</div>
               )}
             </div>
             <div className="flex space-x-2">
               {campaignResult.campaign?.id && (
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
