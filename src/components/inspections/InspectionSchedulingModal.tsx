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
import { Search, Calendar, CheckCircle, X, FileDown, Filter, MapPin } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useN8nWorkflow, type CampaignWorkflowData } from '@/hooks/useN8nWorkflow';

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


export function InspectionSchedulingModal({ open, onOpenChange }: InspectionSchedulingModalProps) {
  const { toast } = useToast();
  const { triggerWorkflow, isLoading: n8nLoading, isSuccess, data, error } = useN8nWorkflow();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [propertyCache, setPropertyCache] = useState<Map<string, Property[]>>(new Map());
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [filters, setFilters] = useState({
    clientId: 'all',
    region: 'all',
    market: 'all',
    inspectionType: 'annual',
    zipcode: 'all'
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
    }
  }, [filters.zipcode, filters.region, filters.market]);

  const resetModalState = () => {
    setSelectedProperties([]);
    setSearchTerm('');
    setCurrentPage(1);
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
    const cacheKey = `${filters.clientId}-${filters.region}-${filters.market}-${filters.zipcode}`;
    
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
        query = query.eq('region', filters.region);
      }
      
      if (filters.market !== 'all') {
        query = query.eq('market', filters.market);
      }
      
      if (filters.zipcode !== 'all') {
        query = query.eq('zip', filters.zipcode);
      }

      const { data, error } = await query;

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

    // Create separate campaigns for each property manager
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

      // Trigger n8n workflow for this property manager
      triggerWorkflow({ campaignData });
    }

    toast({
      title: "Campaigns Started",
      description: `Started ${Object.keys(propertiesByManager).length} campaign(s) for different property managers.`,
      variant: "default",
    });
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

                    <Select value={filters.zipcode} onValueChange={(value) => setFilters(prev => ({ ...prev, zipcode: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Zipcode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Zipcodes</SelectItem>
                        <SelectItem value="75001">75001</SelectItem>
                        <SelectItem value="75002">75002</SelectItem>
                        <SelectItem value="75006">75006</SelectItem>
                        <SelectItem value="75007">75007</SelectItem>
                        <SelectItem value="75010">75010</SelectItem>
                        <SelectItem value="75038">75038</SelectItem>
                        <SelectItem value="75039">75039</SelectItem>
                        <SelectItem value="75040">75040</SelectItem>
                        <SelectItem value="75041">75041</SelectItem>
                        <SelectItem value="75042">75042</SelectItem>
                        <SelectItem value="75043">75043</SelectItem>
                        <SelectItem value="75044">75044</SelectItem>
                        <SelectItem value="75051">75051</SelectItem>
                        <SelectItem value="75052">75052</SelectItem>
                        <SelectItem value="75054">75054</SelectItem>
                        <SelectItem value="75056">75056</SelectItem>
                        <SelectItem value="75057">75057</SelectItem>
                        <SelectItem value="75060">75060</SelectItem>
                        <SelectItem value="75061">75061</SelectItem>
                        <SelectItem value="75062">75062</SelectItem>
                        <SelectItem value="75063">75063</SelectItem>
                        <SelectItem value="75067">75067</SelectItem>
                        <SelectItem value="75068">75068</SelectItem>
                        <SelectItem value="75069">75069</SelectItem>
                        <SelectItem value="75070">75070</SelectItem>
                        <SelectItem value="75071">75071</SelectItem>
                        <SelectItem value="75074">75074</SelectItem>
                        <SelectItem value="75075">75075</SelectItem>
                        <SelectItem value="75076">75076</SelectItem>
                        <SelectItem value="75077">75077</SelectItem>
                        <SelectItem value="75078">75078</SelectItem>
                        <SelectItem value="75080">75080</SelectItem>
                        <SelectItem value="75081">75081</SelectItem>
                        <SelectItem value="75082">75082</SelectItem>
                        <SelectItem value="75083">75083</SelectItem>
                        <SelectItem value="75085">75085</SelectItem>
                        <SelectItem value="75086">75086</SelectItem>
                        <SelectItem value="75087">75087</SelectItem>
                        <SelectItem value="75088">75088</SelectItem>
                        <SelectItem value="75089">75089</SelectItem>
                        <SelectItem value="75093">75093</SelectItem>
                        <SelectItem value="75094">75094</SelectItem>
                        <SelectItem value="75098">75098</SelectItem>
                        <SelectItem value="75104">75104</SelectItem>
                        <SelectItem value="75115">75115</SelectItem>
                        <SelectItem value="75116">75116</SelectItem>
                        <SelectItem value="75119">75119</SelectItem>
                        <SelectItem value="75125">75125</SelectItem>
                        <SelectItem value="75134">75134</SelectItem>
                        <SelectItem value="75149">75149</SelectItem>
                        <SelectItem value="75150">75150</SelectItem>
                        <SelectItem value="75154">75154</SelectItem>
                        <SelectItem value="75159">75159</SelectItem>
                        <SelectItem value="75166">75166</SelectItem>
                        <SelectItem value="75172">75172</SelectItem>
                        <SelectItem value="75180">75180</SelectItem>
                        <SelectItem value="75182">75182</SelectItem>
                        <SelectItem value="75201">75201</SelectItem>
                        <SelectItem value="75202">75202</SelectItem>
                        <SelectItem value="75203">75203</SelectItem>
                        <SelectItem value="75204">75204</SelectItem>
                        <SelectItem value="75205">75205</SelectItem>
                        <SelectItem value="75206">75206</SelectItem>
                        <SelectItem value="75207">75207</SelectItem>
                        <SelectItem value="75208">75208</SelectItem>
                        <SelectItem value="75209">75209</SelectItem>
                        <SelectItem value="75210">75210</SelectItem>
                        <SelectItem value="75211">75211</SelectItem>
                        <SelectItem value="75212">75212</SelectItem>
                        <SelectItem value="75214">75214</SelectItem>
                        <SelectItem value="75215">75215</SelectItem>
                        <SelectItem value="75216">75216</SelectItem>
                        <SelectItem value="75217">75217</SelectItem>
                        <SelectItem value="75218">75218</SelectItem>
                        <SelectItem value="75219">75219</SelectItem>
                        <SelectItem value="75220">75220</SelectItem>
                        <SelectItem value="75223">75223</SelectItem>
                        <SelectItem value="75224">75224</SelectItem>
                        <SelectItem value="75225">75225</SelectItem>
                        <SelectItem value="75226">75226</SelectItem>
                        <SelectItem value="75227">75227</SelectItem>
                        <SelectItem value="75228">75228</SelectItem>
                        <SelectItem value="75229">75229</SelectItem>
                        <SelectItem value="75230">75230</SelectItem>
                        <SelectItem value="75231">75231</SelectItem>
                        <SelectItem value="75232">75232</SelectItem>
                        <SelectItem value="75233">75233</SelectItem>
                        <SelectItem value="75234">75234</SelectItem>
                        <SelectItem value="75235">75235</SelectItem>
                        <SelectItem value="75236">75236</SelectItem>
                        <SelectItem value="75237">75237</SelectItem>
                        <SelectItem value="75238">75238</SelectItem>
                        <SelectItem value="75240">75240</SelectItem>
                        <SelectItem value="75241">75241</SelectItem>
                        <SelectItem value="75243">75243</SelectItem>
                        <SelectItem value="75244">75244</SelectItem>
                        <SelectItem value="75246">75246</SelectItem>
                        <SelectItem value="75247">75247</SelectItem>
                        <SelectItem value="75248">75248</SelectItem>
                        <SelectItem value="75249">75249</SelectItem>
                        <SelectItem value="75250">75250</SelectItem>
                        <SelectItem value="75251">75251</SelectItem>
                        <SelectItem value="75252">75252</SelectItem>
                        <SelectItem value="75253">75253</SelectItem>
                        <SelectItem value="75254">75254</SelectItem>
                        <SelectItem value="75287">75287</SelectItem>
                        <SelectItem value="75390">75390</SelectItem>
                        <SelectItem value="75398">75398</SelectItem>
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
                  <CardHeader className="pb-3 flex-shrink-0">
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

          {/* Status Cards with proper spacing */}
          <div className="space-y-3 mt-4 mb-4">
            {/* Workflow Loading State */}
            {n8nLoading && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Starting inspection campaign workflow...
                    </span>
                  </div>
                  <Progress value={50} className="w-full" />
                </div>
              </Card>
            )}

            {/* Success State */}
            {isSuccess && data && (
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Campaign Started Successfully!</span>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>Campaign ID: {data.campaign_id}</div>
                    {data.draft_id && <div>Gmail Draft ID: {data.draft_id}</div>}
                    <div>Properties: {selectedProperties.length}</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-center space-x-2">
                  <X className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">
                    {error.message || "Failed to start workflow"}
                  </span>
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
              disabled={selectedProperties.length === 0 || n8nLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {n8nLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Starting Workflow...
                </>
              ) : isSuccess ? (
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
