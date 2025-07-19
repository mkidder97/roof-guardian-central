import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Calendar, CheckCircle, X, FileDown, Filter, MapPin, AlertCircle } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useN8nWorkflow, type CampaignWorkflowData, type ProcessingResult } from '@/hooks/useN8nWorkflow';

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
  property_contact_assignments?: Array<{
    assignment_type: string;
    is_active: boolean;
    client_contacts: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      office_phone: string;
      mobile_phone: string;
      role: string;
      title: string;
    };
  }>;
  // Computed properties for easier access
  property_manager_name?: string;
  property_manager_email?: string;
  property_manager_phone?: string;
  warranty_status?: string;
}

interface InspectionSchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WorkflowProgress {
  isProcessing: boolean
  currentCampaign: string
  processedCount: number
  totalCount: number
  results: ProcessingResult[]
}

export function InspectionSchedulingModal({ open, onOpenChange }: InspectionSchedulingModalProps) {
  const { toast } = useToast();
  const { processCampaignsSequentially } = useN8nWorkflow();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [propertyCache, setPropertyCache] = useState<Map<string, Property[]>>(new Map());
  const [availableZipcodes, setAvailableZipcodes] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [filters, setFilters] = useState({
    clientId: 'all',
    region: 'all',
    market: 'all',
    inspectionType: 'annual',
    zipcodes: [] as string[]
  });

  // New state for workflow progress
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress>({
    isProcessing: false,
    currentCampaign: '',
    processedCount: 0,
    totalCount: 0,
    results: []
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

  useEffect(() => {
    if (open) {
      fetchProperties();
      fetchAvailableZipcodes();
    }
  }, [filters.zipcodes, filters.region, filters.market]);

  const resetModalState = () => {
    setSelectedProperties([]);
    setSearchTerm('');
    setCurrentPage(1);
    setWorkflowProgress({
      isProcessing: false,
      currentCampaign: '',
      processedCount: 0,
      totalCount: 0,
      results: []
    });
  };

  const fetchAvailableZipcodes = async () => {
    try {
      const { data, error } = await supabase
        .from('roofs')
        .select('zip')
        .eq('status', 'active')
        .neq('is_deleted', true)
        .not('zip', 'is', null)
        .order('zip');

      if (error) throw error;

      const uniqueZipcodes = [...new Set(data?.map(item => item.zip))].filter(Boolean);
      setAvailableZipcodes(uniqueZipcodes);
    } catch (error) {
      console.error('Error fetching zipcodes:', error);
    }
  };

  const processPropertyData = (rawProperties: any[]): Property[] => {
    return rawProperties.map(property => {
      // First check property_contact_assignments for linked property managers
      const propertyManager = property.property_contact_assignments?.find(
        assignment => assignment.assignment_type === 'property_manager' && assignment.is_active
      )?.client_contacts;
      
      // If no linked property manager, use the direct property manager fields
      const pmName = propertyManager 
        ? `${propertyManager.first_name} ${propertyManager.last_name}`
        : property.property_manager_name || 'Not assigned';
      
      const pmEmail = propertyManager?.email || property.property_manager_email || '';
      const pmPhone = propertyManager?.office_phone || propertyManager?.mobile_phone || property.property_manager_phone || '';
      
      return {
        ...property,
        property_manager_name: pmName,
        property_manager_email: pmEmail,
        property_manager_phone: pmPhone,
        warranty_status: getWarrantyStatus(property.manufacturer_warranty_expiration)
      };
    });
  };

  const fetchProperties = async () => {
    const cacheKey = `${filters.clientId}-${filters.region}-${filters.market}-${filters.zipcodes.join(',')}`;
    
    if (propertyCache.has(cacheKey)) {
      const cachedProperties = propertyCache.get(cacheKey)!;
      setProperties(cachedProperties);
      setFilteredProperties(cachedProperties);
      return;
    }

    setLoading(true);
    console.log('Fetching properties with filters:', filters);
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
          site_contact_name,
          site_contact_phone,
          roof_access,
          latitude,
          longitude,
          manufacturer_warranty_expiration,
          installer_warranty_expiration,
          client_id,
          status,
          property_manager_name,
          property_manager_email,
          property_manager_phone,
          clients!inner(company_name),
          property_contact_assignments!left(
            assignment_type,
            is_active,
            client_contacts!left(
              id,
              first_name,
              last_name,
              email,
              office_phone,
              mobile_phone,
              role,
              title
            )
          )
        `)
        .eq('status', 'active')
        .neq('is_deleted', true);

      if (filters.clientId !== 'all') {
        query = query.eq('client_id', filters.clientId);
      }
      
      if (filters.region !== 'all') {
        console.log('Filtering by region:', filters.region);
        query = query.eq('region', filters.region);
      }
      
      if (filters.market !== 'all') {
        console.log('Filtering by market:', filters.market);
        query = query.eq('market', filters.market);
      }
      
      if (filters.zipcodes.length > 0) {
        console.log('Filtering by zipcodes:', filters.zipcodes);
        query = query.in('zip', filters.zipcodes);
      }

      const { data, error } = await query;
      console.log('Query result:', { data: data?.length || 0, error });

      if (error) throw error;

      const processedProperties: Property[] = processPropertyData(data || []);

      // Since we're filtering by zipcode in the query, no additional filtering needed
      const finalProperties = processedProperties;

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

  const handleStartWorkflow = async () => {
    if (selectedProperties.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select at least one property for inspection.",
        variant: "destructive",
      });
      return;
    }

    // Group properties by property manager
    const propertiesByManager = selectedProperties.reduce((groups, property) => {
      const pmEmail = property.property_manager_email || 'unassigned';
      if (!groups[pmEmail]) {
        groups[pmEmail] = [];
      }
      groups[pmEmail].push(property);
      return groups;
    }, {} as Record<string, Property[]>);

    // Create campaign data for each property manager
    const campaignsToProcess: CampaignWorkflowData[] = [];
    
    for (const [pmEmail, properties] of Object.entries(propertiesByManager)) {
      const campaignId = await generateCampaignId();
      const campaignName = await generateCampaignName();

      const campaignData: CampaignWorkflowData = {
        campaign_id: campaignId,
        campaign_name: `${campaignName} - ${properties[0].property_manager_name}`,
        client_name: properties[0]?.clients?.company_name || 'Unknown Client',
        property_manager_email: pmEmail,
        region: filters.region,
        market: filters.market,
        properties: properties.map(prop => ({
          roof_id: prop.id,
          property_name: prop.property_name,
          address: `${prop.address}, ${prop.city}, ${prop.state}`
        }))
      };

      campaignsToProcess.push(campaignData);
    }

    // Initialize progress tracking
    setWorkflowProgress({
      isProcessing: true,
      currentCampaign: '',
      processedCount: 0,
      totalCount: campaignsToProcess.length,
      results: []
    });

    try {
      // Process campaigns sequentially with progress updates
      const results = await processCampaignsSequentially(campaignsToProcess);

      setWorkflowProgress(prev => ({
        ...prev,
        isProcessing: false,
        processedCount: results.total,
        results: [...results.successful, ...results.failed]
      }));

      // Show results toast
      if (results.failed.length === 0) {
        toast({
          title: "All Campaigns Started Successfully!",
          description: `Successfully started ${results.successful.length} campaign(s) for different property managers.`,
        });
      } else if (results.successful.length > 0) {
        toast({
          title: "Partial Success",
          description: `${results.successful.length} campaigns succeeded, ${results.failed.length} failed. Check details below.`,
          variant: "default",
        });
      } else {
        toast({
          title: "All Campaigns Failed",
          description: `Failed to start ${results.failed.length} campaign(s). Check details below.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Workflow processing failed:', error);
      setWorkflowProgress(prev => ({
        ...prev,
        isProcessing: false
      }));
      
      toast({
        title: "Workflow Processing Failed",
        description: "An unexpected error occurred while processing campaigns.",
        variant: "destructive",
      });
    }
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

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="space-y-4 h-full flex flex-col">
                
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Zipcodes</label>
                      <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="all-zipcodes"
                              checked={filters.zipcodes.length === 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters(prev => ({ ...prev, zipcodes: [] }));
                                }
                              }}
                            />
                            <label htmlFor="all-zipcodes" className="text-sm cursor-pointer">
                              All Zipcodes
                            </label>
                          </div>
                          {availableZipcodes.map((zipcode) => (
                            <div key={zipcode} className="flex items-center space-x-2">
                              <Checkbox
                                id={`zipcode-${zipcode}`}
                                checked={filters.zipcodes.includes(zipcode)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFilters(prev => ({ ...prev, zipcodes: [...prev.zipcodes, zipcode] }));
                                  } else {
                                    setFilters(prev => ({ ...prev, zipcodes: prev.zipcodes.filter(z => z !== zipcode) }));
                                  }
                                }}
                              />
                              <label htmlFor={`zipcode-${zipcode}`} className="text-sm cursor-pointer">
                                {zipcode}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      {filters.zipcodes.length > 0 && (
                        <div className="text-xs text-gray-600">
                          {filters.zipcodes.length} zipcode{filters.zipcodes.length !== 1 ? 's' : ''} selected
                        </div>
                      )}
                    </div>

                    <Button onClick={fetchProperties} className="w-full">
                      Apply Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

                
                <Card className="flex-1 min-h-0 flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Available Properties ({filteredAndPaginatedProperties.totalCount})
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-sm">
                        {selectedProperties.length} selected
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentPageProperties = filteredAndPaginatedProperties.properties;
                          const allCurrentSelected = currentPageProperties.every(prop => 
                            selectedProperties.some(selected => selected.id === prop.id)
                          );
                          
                          if (allCurrentSelected) {
                            // Deselect all current page properties
                            setSelectedProperties(prev => 
                              prev.filter(selected => 
                                !currentPageProperties.some(current => current.id === selected.id)
                              )
                            );
                          } else {
                            // Select all current page properties
                            const newSelections = currentPageProperties.filter(prop => 
                              !selectedProperties.some(selected => selected.id === prop.id)
                            );
                            setSelectedProperties(prev => [...prev, ...newSelections]);
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        {filteredAndPaginatedProperties.properties.every(prop => 
                          selectedProperties.some(selected => selected.id === prop.id)
                        ) ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
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
                <CardContent className="flex-1 min-h-0 p-0">
                  <ScrollArea className="h-[400px] w-full pointer-events-auto">
                    <div className="space-y-2 p-6">
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
          </div>

          {/* Enhanced Status Cards with detailed progress */}
          <div className="space-y-3 mt-4 mb-4">
            {/* Workflow Processing State */}
            {workflowProgress.isProcessing && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Processing inspection campaigns...
                    </span>
                    <span className="text-sm text-blue-600">
                      {workflowProgress.processedCount}/{workflowProgress.totalCount}
                    </span>
                  </div>
                  <Progress 
                    value={(workflowProgress.processedCount / workflowProgress.totalCount) * 100} 
                    className="w-full" 
                  />
                  {workflowProgress.currentCampaign && (
                    <div className="text-sm text-blue-700">
                      Current: {workflowProgress.currentCampaign}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Results Display */}
            {workflowProgress.results.length > 0 && !workflowProgress.isProcessing && (
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Campaign Processing Results</span>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-green-600">
                        ✓ {workflowProgress.results.filter(r => r.success).length} succeeded
                      </span>
                      <span className="text-red-600">
                        ✗ {workflowProgress.results.filter(r => !r.success).length} failed
                      </span>
                    </div>
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {workflowProgress.results.map((result, index) => (
                      <div key={index} className={`text-sm p-2 rounded flex items-center space-x-2 ${
                        result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                      }`}>
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{result.campaignData.campaign_name}</div>
                          {result.error && (
                            <div className="text-xs opacity-75">{result.error}</div>
                          )}
                          {result.success && result.attempts > 1 && (
                            <div className="text-xs opacity-75">Succeeded after {result.attempts} attempts</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center pt-4 border-t bg-background">
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
              onClick={handleStartWorkflow}
              disabled={selectedProperties.length === 0 || workflowProgress.isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {workflowProgress.isProcessing ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Processing ({workflowProgress.processedCount}/{workflowProgress.totalCount})
                </>
              ) : workflowProgress.results.length > 0 ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Processing Complete
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
