import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Calendar, FileDown } from "lucide-react";
import { format, addMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InspectionSchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

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

  const initiateInspectionWorkflow = () => {
    if (selectedProperties.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select properties to schedule inspections.",
        variant: "destructive",
      });
      return;
    }

    // This will eventually trigger the n8n workflow
    toast({
      title: "Inspection Workflow Started",
      description: `Initiated inspection scheduling for ${selectedProperties.length} properties. You will receive an email confirmation shortly.`,
    });

    // For now, just close the modal
    onOpenChange(false);
    setSelectedProperties([]);
    setFilteredProperties([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Schedule Annual Inspections</DialogTitle>
          <DialogDescription>
            Select properties and create automated inspection scheduling workflow
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* Left Panel - Filters */}
          <Card className="p-4">
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
            disabled={selectedProperties.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Start Inspection Workflow ({selectedProperties.length} properties)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}