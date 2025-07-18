import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Search, Calendar, FileDown, CheckCircle, AlertCircle, X, Brain, Loader2, Filter, Settings } from "lucide-react";
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

// Enhanced Zod schemas with proper null handling
const webhookPropertySchema = z.object({
  id: z.string(),
  property_name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string().optional(),
  market: z.string().optional(),
  region: z.string().optional(),
  property_manager_name: z.string().optional(),
  property_manager_email: z.string().optional(),
  property_manager_phone: z.string().optional(),
  site_contact_name: z.string().optional(),
  site_contact_phone: z.string().optional(),
  roof_access: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  manufacturer_warranty_expiration: z.string().optional(),
  installer_warranty_expiration: z.string().optional(),
  roof_area: z.number().optional(),
  roof_type: z.string().optional(),
  last_inspection_date: z.string().optional(),
  warranty_status: z.string().optional(),
});

const webhookPayloadSchema = z.object({
  selectedProperties: z.array(webhookPropertySchema),
  filters: z.object({
    clientId: z.string().optional(),
    region: z.string().optional(),
    market: z.string().optional(),
    inspectionType: z.string(),
  }),
});

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
  searchTerm?: string;
  warrantyStatus?: 'active' | 'expired' | 'all';
  roofType?: string;
  propertyManager?: string;
  zipCode?: string;
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
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<WorkflowSteps>(WorkflowSteps.PREPARING);
  const [progress, setProgress] = useState(0);
  const [campaignResult, setCampaignResult] = useState<CampaignResult | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Enhanced filtering state
  const [propertyCache, setPropertyCache] = useState<Map<string, any[]>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Debounce timer for auto-fetching properties
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to convert null values to undefined for Zod validation
  const sanitizeProperty = (property: any) => {
    const sanitized = {
      id: String(property.id || ''),
      property_name: String(property.property_name || ''),
      address: String(property.address || ''),
      city: String(property.city || ''),
      state: String(property.state || ''),
      zip: property.zip === null ? undefined : String(property.zip || ''),
      market: property.market === null ? undefined : String(property.market || ''),
      region: property.region === null ? undefined : String(property.region || ''),
      property_manager_name: property.property_manager_name === null ? undefined : String(property.property_manager_name || ''),
      property_manager_email: property.property_manager_email === null ? undefined : String(property.property_manager_email || ''),
      property_manager_phone: property.property_manager_phone === null ? undefined : String(property.property_manager_phone || ''),
      site_contact_name: property.site_contact_name === null ? undefined : String(property.site_contact_name || ''),
      site_contact_phone: property.site_contact_phone === null ? undefined : String(property.site_contact_phone || ''),
      roof_access: property.roof_access === null ? undefined : String(property.roof_access || ''),
      latitude: property.latitude === null ? undefined : Number(property.latitude),
      longitude: property.longitude === null ? undefined : Number(property.longitude),
      manufacturer_warranty_expiration: property.manufacturer_warranty_expiration === null ? undefined : String(property.manufacturer_warranty_expiration || ''),
      installer_warranty_expiration: property.installer_warranty_expiration === null ? undefined : String(property.installer_warranty_expiration || ''),
      roof_area: property.roof_area === null ? undefined : Number(property.roof_area),
      roof_type: property.roof_type === null ? undefined : String(property.roof_type || ''),
      last_inspection_date: property.last_inspection_date === null ? undefined : String(property.last_inspection_date || ''),
      warranty_status: property.warranty_status === null ? undefined : String(property.warranty_status || ''),
    };

    console.log('Sanitizing property:', {
      original: {
        id: property.id,
        property_name: property.property_name,
        property_manager_name: property.property_manager_name,
        property_manager_email: property.property_manager_email,
        latitude: property.latitude,
        longitude: property.longitude,
      },
      sanitized: {
        id: sanitized.id,
        property_name: sanitized.property_name,
        property_manager_name: sanitized.property_manager_name,
        property_manager_email: sanitized.property_manager_email,
        latitude: sanitized.latitude,
        longitude: sanitized.longitude,
      }
    });

    return sanitized;
  };

  useEffect(() => {
    if (open) {
      fetchClients();
      fetchRegionsAndMarkets();
      resetWorkflowState();
      loadFiltersFromStorage();
      // Auto-fetch properties with default filters when modal opens
      debouncedFetchProperties(filters);
    }
  }, [open]);

  // Auto-fetch properties when filters change
  useEffect(() => {
    if (open && (filters.clientId || filters.region || filters.market)) {
      debouncedFetchProperties(filters);
      saveFiltersToStorage(filters);
    }
  }, [filters.clientId, filters.region, filters.market, open]);

  // Search term effect with debouncing
  useEffect(() => {
    if (open && filters.searchTerm !== undefined) {
      debouncedSearch(filters.searchTerm);
    }
  }, [filters.searchTerm, open]);

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
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegionsAndMarkets = async () => {
    try {
      // Get distinct regions
      const { data: regionData, error: regionError } = await supabase
        .from('roofs')
        .select('region')
        .not('region', 'is', null)
        .eq('status', 'active')
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (regionError) throw regionError;

      // Get distinct markets
      const { data: marketData, error: marketError } = await supabase
        .from('roofs')
        .select('market')
        .not('market', 'is', null)
        .eq('status', 'active')
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (marketError) throw marketError;

      // Extract unique values and combine with common options
      const dbRegions = [...new Set(regionData?.map(r => r.region).filter(Boolean) || [])];
      const dbMarkets = [...new Set(marketData?.map(m => m.market).filter(Boolean) || [])];

      // Common regions (add if not already in db)
      const commonRegions = ['Central', 'Southwest', 'Southeast', 'Northeast', 'Northwest', 'West Coast', 'Midwest'];
      const allRegions = [...new Set([...dbRegions, ...commonRegions])].sort();

      // Common markets (add if not already in db)
      const commonMarkets = ['Dallas', 'Houston', 'Austin', 'San Antonio', 'Atlanta', 'Charlotte', 'Phoenix', 'Denver', 'Miami', 'Tampa', 'Nashville', 'Kansas City', 'Oklahoma City', 'Tulsa'];
      const allMarkets = [...new Set([...dbMarkets, ...commonMarkets])].sort();

      setAvailableRegions(allRegions);
      setAvailableMarkets(allMarkets);
    } catch (error) {
      console.error('Error fetching regions and markets:', error);
      // Fallback to common options if query fails
      setAvailableRegions(['Central', 'Southwest', 'Southeast', 'Northeast', 'Northwest', 'West Coast', 'Midwest']);
      setAvailableMarkets(['Dallas', 'Houston', 'Austin', 'San Antonio', 'Atlanta', 'Charlotte', 'Phoenix', 'Denver', 'Miami', 'Tampa', 'Nashville', 'Kansas City']);
    }
  };

  // Filter persistence
  const saveFiltersToStorage = (currentFilters: SchedulingFilters) => {
    try {
      localStorage.setItem('inspection_filters', JSON.stringify({
        clientId: currentFilters.clientId,
        region: currentFilters.region,
        market: currentFilters.market,
        inspectionType: currentFilters.inspectionType,
        warrantyStatus: currentFilters.warrantyStatus,
        roofType: currentFilters.roofType,
        propertyManager: currentFilters.propertyManager,
        zipCode: currentFilters.zipCode,
      }));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }
  };

  const loadFiltersFromStorage = () => {
    try {
      const saved = localStorage.getItem('inspection_filters');
      if (saved) {
        const savedFilters = JSON.parse(saved);
        setFilters(prev => ({
          ...prev,
          ...savedFilters,
          // Keep current date range and search term
          scheduledDateRange: prev.scheduledDateRange,
          searchTerm: prev.searchTerm,
        }));
      }
    } catch (error) {
      console.warn('Failed to load filters from localStorage:', error);
    }
  };

  const debouncedFetchProperties = useCallback((currentFilters: SchedulingFilters) => {
    // Clear existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Set new timeout for debounced fetching
    fetchTimeoutRef.current = setTimeout(() => {
      fetchFilteredProperties(currentFilters);
    }, 300); // 300ms debounce
  }, []);

  const debouncedSearch = useCallback((searchTerm: string) => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      if (searchTerm) {
        const filtered = filteredProperties.filter(property => 
          property.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.property_manager_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredProperties(filtered);
      } else {
        // Re-fetch without search filter
        fetchFilteredProperties(filters);
      }
    }, 200); // 200ms debounce for search
  }, [filteredProperties, filters]);

  const fetchFilteredProperties = async (currentFilters: SchedulingFilters) => {
    try {
      setPropertiesLoading(true);
      
      // Check cache first
      const cacheKey = JSON.stringify({
        clientId: currentFilters.clientId,
        region: currentFilters.region,
        market: currentFilters.market,
        warrantyStatus: currentFilters.warrantyStatus,
        roofType: currentFilters.roofType,
        propertyManager: currentFilters.propertyManager,
        zipCode: currentFilters.zipCode,
      });
      
      if (propertyCache.has(cacheKey)) {
        const cachedData = propertyCache.get(cacheKey)!;
        setFilteredProperties(cachedData);
        setPropertiesLoading(false);
        return;
      }

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

      if (currentFilters.roofType) {
        query = query.eq('roof_type', currentFilters.roofType);
      }

      if (currentFilters.propertyManager) {
        query = query.ilike('property_manager_name', `%${currentFilters.propertyManager}%`);
      }

      if (currentFilters.zipCode) {
        query = query.eq('zip', currentFilters.zipCode);
      }

      const { data, error } = await query.order('property_name');

      if (error) throw error;

      // Add warranty status and apply warranty filter
      let propertiesWithStatus = (data || []).map(property => {
        const now = new Date();
        const manufacturerExpiry = property.manufacturer_warranty_expiration ? new Date(property.manufacturer_warranty_expiration) : null;
        const installerExpiry = property.installer_warranty_expiration ? new Date(property.installer_warranty_expiration) : null;
        
        const hasActiveWarranty = (manufacturerExpiry && manufacturerExpiry > now) || (installerExpiry && installerExpiry > now);
        const warranty_status = hasActiveWarranty ? 'active' : 'expired';
        
        return { ...property, warranty_status };
      });

      // Apply warranty status filter
      if (currentFilters.warrantyStatus && currentFilters.warrantyStatus !== 'all') {
        propertiesWithStatus = propertiesWithStatus.filter(property => 
          property.warranty_status === currentFilters.warrantyStatus
        );
      }

      // Cache the results
      setPropertyCache(prev => new Map(prev.set(cacheKey, propertiesWithStatus)));
      
      setFilteredProperties(propertiesWithStatus);
      setCurrentPage(1); // Reset to first page
      
      // Show success message for property count
      if (propertiesWithStatus.length > 0) {
        console.log(`Found ${propertiesWithStatus.length} properties matching filters`);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to fetch properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPropertiesLoading(false);
    }
  };

  // Memoized filtered and paginated properties for performance
  const filteredAndPaginatedProperties = useMemo(() => {
    let properties = [...filteredProperties];

    // Apply search filter
    if (filters.searchTerm) {
      properties = properties.filter(property => 
        property.property_name?.toLowerCase().includes(filters.searchTerm!.toLowerCase()) ||
        property.address?.toLowerCase().includes(filters.searchTerm!.toLowerCase()) ||
        property.city?.toLowerCase().includes(filters.searchTerm!.toLowerCase()) ||
        property.property_manager_name?.toLowerCase().includes(filters.searchTerm!.toLowerCase())
      );
    }

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
      properties: properties.slice(startIndex, endIndex),
      totalCount: properties.length,
      totalPages: Math.ceil(properties.length / itemsPerPage)
    };
  }, [filteredProperties, filters.searchTerm, currentPage, itemsPerPage]);

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
      console.log('Validating payload structure:', {
        selectedPropertiesCount: payload.selectedProperties?.length,
        filters: payload.filters,
        sampleProperty: payload.selectedProperties?.[0]
      });

      const result = webhookPayloadSchema.parse(payload);
      console.log('Payload validation successful:', result);
      return true;
    } catch (error) {
      console.error('Payload validation failed:', error);
      if (error instanceof z.ZodError) {
        console.error('Detailed validation errors:', error.issues);
        
        // Log specific field errors for debugging
        error.issues.forEach((err, index) => {
          console.error(`Validation Error ${index + 1}:`, {
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
            ...('received' in err && { received: err.received }),
            ...('expected' in err && { expected: err.expected })
          });
        });
        
        toast({
          title: "Payload Validation Failed",
          description: `Field validation error: ${error.issues[0]?.path.join('.')} - ${error.issues[0]?.message}`,
          variant: "destructive",
        });
      }
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

    } catch (error: any) {
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
      
      console.log('Raw selected properties before sanitization:', selectedProperties.slice(0, 2));
      
      // Sanitize properties to ensure proper data types and null handling
      const sanitizedProperties = selectedProperties.map(sanitizeProperty);
      
      console.log('Sanitized properties sample:', sanitizedProperties.slice(0, 2));
      
      const payload = {
        selectedProperties: sanitizedProperties,
        filters: {
          clientId: filters.clientId === 'all' ? undefined : filters.clientId,
          region: filters.region || undefined,
          market: filters.market || undefined,
          inspectionType: filters.inspectionType || 'annual', // Ensure this is always set
        },
      };

      console.log('Final payload structure:', {
        selectedPropertiesCount: payload.selectedProperties.length,
        filters: payload.filters,
        sampleProperty: payload.selectedProperties[0]
      });

      // Validate payload size (max 10MB)
      const payloadSize = new Blob([JSON.stringify(payload)]).size;
      if (payloadSize > 10 * 1024 * 1024) {
        throw new Error('Payload too large. Please select fewer properties.');
      }

      if (!isPayloadValid(payload)) {
        throw new Error('Invalid payload data. Please check your selections and try again.');
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

      } catch (error: any) {
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
        } else if (error.message.includes('Invalid payload data')) {
          errorTitle = "Data Validation Error";
          errorDescription = "Some property data is invalid. Please check your selections and try again.";
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
              <Card className="p-4 flex flex-col max-h-[600px]">
                <CardHeader className="p-0 pb-4 flex-shrink-0">
                  <CardTitle className="text-base">Filters</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 pr-4 pb-4">
                  {/* Client Selection */}
                  <div>
                    <label className="text-sm font-medium">Client</label>
                    <Select 
                      value={filters.clientId} 
                      onValueChange={(value) => 
                        setFilters(prev => ({ ...prev, clientId: value }))
                      }
                      disabled={loading}
                    >
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
                         {availableRegions.map(region => (
                           <SelectItem key={region} value={region}>
                             {region}
                           </SelectItem>
                         ))}
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
                         {availableMarkets.map(market => (
                           <SelectItem key={market} value={market}>
                             {market}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>

                  {/* Zip Code Filter - moved to main filters */}
                  <div>
                    <label className="text-sm font-medium">Zip Code</label>
                    <Input
                      placeholder="Filter by zip code..."
                      value={filters.zipCode || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, zipCode: e.target.value }))}
                    />
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

                  {/* Real-time search */}
                  <div>
                    <label className="text-sm font-medium">Search Properties</label>
                    <Input
                      placeholder="Search by name, address, or manager..."
                      value={filters.searchTerm || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    />
                  </div>

                  {/* Advanced filters toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
                  </Button>

                  {/* Advanced filters */}
                  {showAdvancedFilters && (
                    <div className="space-y-4 border-t pt-4">
                      {/* Warranty Status Filter */}
                      <div>
                        <label className="text-sm font-medium">Warranty Status</label>
                        <Select 
                          value={filters.warrantyStatus || 'all'} 
                          onValueChange={(value) => 
                            setFilters(prev => ({ ...prev, warrantyStatus: value as any }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All warranties" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Warranties</SelectItem>
                            <SelectItem value="active">Active Warranty</SelectItem>
                            <SelectItem value="expired">Expired Warranty</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Roof Type Filter */}
                      <div>
                        <label className="text-sm font-medium">Roof Type</label>
                        <Input
                          placeholder="Filter by roof type..."
                          value={filters.roofType || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, roofType: e.target.value }))}
                        />
                      </div>

                      {/* Property Manager Filter */}
                      <div>
                        <label className="text-sm font-medium">Property Manager</label>
                        <Input
                          placeholder="Filter by property manager..."
                          value={filters.propertyManager || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, propertyManager: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Manual Refresh Button - now optional since auto-fetch is enabled */}
                  <Button 
                    onClick={() => {
                      setPropertyCache(new Map()); // Clear cache
                      fetchFilteredProperties(filters);
                    }}
                    variant="outline"
                    className="w-full"
                    disabled={propertiesLoading}
                  >
                    {propertiesLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Refresh Properties
                  </Button>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Center Panel - Property List */}
              <Card className="lg:col-span-3 p-4 flex flex-col">
                <CardHeader className="p-0 pb-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      Properties ({selectedProperties.length} selected of {filteredAndPaginatedProperties.totalCount})
                      {propertiesLoading && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                    </CardTitle>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={selectAllProperties}
                        disabled={filteredProperties.length === 0 || propertiesLoading}
                      >
                        Select All ({filteredAndPaginatedProperties.totalCount})
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearSelection}
                        disabled={selectedProperties.length === 0}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Pagination controls */}
                  {filteredAndPaginatedProperties.totalPages > 1 && (
                    <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                      <span>
                        Page {currentPage} of {filteredAndPaginatedProperties.totalPages}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(filteredAndPaginatedProperties.totalPages, p + 1))}
                          disabled={currentPage === filteredAndPaginatedProperties.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full max-h-[400px]">
                    <div className="space-y-2 pr-4 pb-4">
                      {propertiesLoading ? (
                        <div className="text-center py-8 flex items-center justify-center space-x-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading properties...</span>
                        </div>
                      ) : filteredAndPaginatedProperties.totalCount === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          {filters.clientId || filters.region || filters.market || filters.searchTerm ? (
                            <>
                              No properties found with current filters.
                              <br />
                              <span className="text-sm">Try adjusting your filter selection above.</span>
                            </>
                           ) : (
                             <div>
                               <p>Select filters to find properties for inspection scheduling.</p>
                               <p className="text-xs mt-1">Use the filters on the left to search by client, region, or market.</p>
                               {propertyCache.size > 0 && (
                                 <Button
                                   variant="link"
                                   size="sm"
                                   onClick={() => setPropertyCache(new Map())}
                                   className="mt-2"
                                 >
                                   Clear cached results
                                 </Button>
                               )}
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
