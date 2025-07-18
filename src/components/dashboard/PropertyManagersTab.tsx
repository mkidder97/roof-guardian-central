import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Users, Building, Mail, Phone, MapPin, Search, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PropertyManager {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  region?: string;
  market?: string;
  properties_count?: number;
}

interface Property {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  region?: string;
  market?: string;
  property_manager_name?: string;
  property_manager_email?: string;
  property_manager_phone?: string;
}

export function PropertyManagersTab() {
  const { toast } = useToast();
  const [propertyManagers, setPropertyManagers] = useState<PropertyManager[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("managers");
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  
  // Form states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<PropertyManager | null>(null);
  const [selectedManagerForBulk, setSelectedManagerForBulk] = useState<PropertyManager | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    region: "",
    market: ""
  });

  useEffect(() => {
    fetchPropertyManagers();
    fetchProperties();
    fetchRegionsAndMarkets();
  }, []);

  const fetchPropertyManagers = async () => {
    try {
      setLoading(true);
      
      // Get unique property managers from roofs table
      const { data: roofData, error } = await supabase
        .from('roofs')
        .select('property_manager_name, property_manager_email, property_manager_phone, region, market')
        .not('property_manager_name', 'is', null)
        .not('property_manager_email', 'is', null);

      if (error) throw error;

      // Group by email to get unique property managers with property counts
      const managerMap = new Map();
      
      roofData?.forEach(roof => {
        const key = roof.property_manager_email;
        if (managerMap.has(key)) {
          const existing = managerMap.get(key);
          existing.properties_count = (existing.properties_count || 0) + 1;
          // Add regions and markets to set for variety
          if (roof.region && !existing.regions.includes(roof.region)) {
            existing.regions.push(roof.region);
          }
          if (roof.market && !existing.markets.includes(roof.market)) {
            existing.markets.push(roof.market);
          }
        } else {
          managerMap.set(key, {
            id: key, // Use email as unique ID
            name: roof.property_manager_name,
            email: roof.property_manager_email,
            phone: roof.property_manager_phone || 'Not provided',
            company: roof.property_manager_email?.split('@')[1]?.split('.')[0] || 'Unknown',
            region: roof.region,
            market: roof.market,
            properties_count: 1,
            regions: roof.region ? [roof.region] : [],
            markets: roof.market ? [roof.market] : []
          });
        }
      });

      const managers = Array.from(managerMap.values()).map(manager => ({
        ...manager,
        company: manager.company.charAt(0).toUpperCase() + manager.company.slice(1) // Capitalize company name
      }));

      setPropertyManagers(managers);
    } catch (error) {
      console.error('Error fetching property managers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch property managers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('roofs')
        .select('id, property_name, address, city, state, region, market, property_manager_name, property_manager_email, property_manager_phone')
        .eq('status', 'active')
        .order('property_name');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchRegionsAndMarkets = async () => {
    try {
      const { data: regionData } = await supabase
        .from('roofs')
        .select('region')
        .not('region', 'is', null);

      const { data: marketData } = await supabase
        .from('roofs')
        .select('market')
        .not('market', 'is', null);

      const regions = [...new Set(regionData?.map(r => r.region).filter(Boolean) || [])];
      const markets = [...new Set(marketData?.map(m => m.market).filter(Boolean) || [])];

      setAvailableRegions(regions.sort());
      setAvailableMarkets(markets.sort());
    } catch (error) {
      console.error('Error fetching regions and markets:', error);
    }
  };

  const handleAddManager = async () => {
    try {
      const { name, email, phone, company, region, market } = formData;
      
      if (!name || !email) {
        toast({
          title: "Validation Error",
          description: "Name and email are required",
          variant: "destructive",
        });
        return;
      }

      // Create a new property manager entry by updating properties without a manager
      const { error } = await supabase
        .from('roofs')
        .update({
          property_manager_name: name,
          property_manager_email: email,
          property_manager_phone: phone,
        })
        .is('property_manager_email', null)
        .eq('region', region)
        .eq('market', market)
        .limit(1);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property manager added successfully",
      });

      setFormData({ name: "", email: "", phone: "", company: "", region: "", market: "" });
      setIsAddDialogOpen(false);
      fetchPropertyManagers();
    } catch (error) {
      console.error('Error adding property manager:', error);
      toast({
        title: "Error",
        description: "Failed to add property manager",
        variant: "destructive",
      });
    }
  };

  const handleEditManager = async () => {
    if (!selectedManager) return;

    try {
      const { name, email, phone } = formData;
      
      if (!name || !email) {
        toast({
          title: "Validation Error",
          description: "Name and email are required",
          variant: "destructive",
        });
        return;
      }

      // Update all properties managed by this manager
      const { error } = await supabase
        .from('roofs')
        .update({
          property_manager_name: name,
          property_manager_email: email,
          property_manager_phone: phone,
        })
        .eq('property_manager_email', selectedManager.email);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property manager updated successfully",
      });

      setIsEditDialogOpen(false);
      setSelectedManager(null);
      fetchPropertyManagers();
      fetchProperties();
    } catch (error) {
      console.error('Error updating property manager:', error);
      toast({
        title: "Error",
        description: "Failed to update property manager",
        variant: "destructive",
      });
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedManagerForBulk || selectedProperties.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a property manager and properties",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('roofs')
        .update({
          property_manager_name: selectedManagerForBulk.name,
          property_manager_email: selectedManagerForBulk.email,
          property_manager_phone: selectedManagerForBulk.phone,
        })
        .in('id', selectedProperties);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Assigned ${selectedProperties.length} properties to ${selectedManagerForBulk.name}`,
      });

      setSelectedProperties([]);
      setSelectedManagerForBulk(null);
      setIsBulkAssignDialogOpen(false);
      fetchPropertyManagers();
      fetchProperties();
    } catch (error) {
      console.error('Error bulk assigning properties:', error);
      toast({
        title: "Error",
        description: "Failed to assign properties",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (manager: PropertyManager) => {
    setSelectedManager(manager);
    setFormData({
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      company: manager.company,
      region: manager.region || "",
      market: manager.market || ""
    });
    setIsEditDialogOpen(true);
  };

  const filteredManagers = propertyManagers.filter(manager => {
    const matchesSearch = manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         manager.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         manager.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = !regionFilter || manager.region === regionFilter;
    const matchesMarket = !marketFilter || manager.market === marketFilter;
    
    return matchesSearch && matchesRegion && matchesMarket;
  });

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = !regionFilter || property.region === regionFilter;
    const matchesMarket = !marketFilter || property.market === marketFilter;
    
    return matchesSearch && matchesRegion && matchesMarket;
  });

  const unassignedProperties = filteredProperties.filter(p => !p.property_manager_email);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Manager Management</h2>
          <p className="text-gray-600 mt-1">Manage property managers and their property assignments</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Manager
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Property Manager</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter manager name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="region">Region</Label>
                    <Select value={formData.region} onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRegions.map(region => (
                          <SelectItem key={region} value={region}>{region}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="market">Market</Label>
                    <Select value={formData.market} onValueChange={(value) => setFormData(prev => ({ ...prev, market: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select market" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMarkets.map(market => (
                          <SelectItem key={market} value={market}>{market}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddManager}>
                    Add Manager
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkAssignDialogOpen} onOpenChange={setIsBulkAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserCheck className="h-4 w-4 mr-2" />
                Bulk Assign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Bulk Assign Properties</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Property Manager</Label>
                  <Select value={selectedManagerForBulk?.id || ""} onValueChange={(value) => {
                    const manager = propertyManagers.find(m => m.id === value);
                    setSelectedManagerForBulk(manager || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a property manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyManagers.map(manager => (
                        <SelectItem key={manager.id} value={manager.id || ""}>
                          {manager.name} - {manager.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Select Properties ({selectedProperties.length} selected)</Label>
                  <ScrollArea className="h-64 border rounded-md p-4">
                    {unassignedProperties.map(property => (
                      <div key={property.id} className="flex items-center space-x-2 py-2">
                        <Checkbox
                          checked={selectedProperties.includes(property.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProperties(prev => [...prev, property.id]);
                            } else {
                              setSelectedProperties(prev => prev.filter(id => id !== property.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{property.property_name}</p>
                          <p className="text-sm text-gray-500">{property.address}, {property.city}</p>
                          {property.region && property.market && (
                            <div className="flex space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">{property.region}</Badge>
                              <Badge variant="outline" className="text-xs">{property.market}</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsBulkAssignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkAssign}>
                    Assign Properties
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search managers or properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Regions</SelectItem>
                {availableRegions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={marketFilter} onValueChange={setMarketFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Markets</SelectItem>
                {availableMarkets.map(market => (
                  <SelectItem key={market} value={market}>{market}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setRegionFilter("");
                setMarketFilter("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="managers">
            <Users className="h-4 w-4 mr-2" />
            Property Managers ({filteredManagers.length})
          </TabsTrigger>
          <TabsTrigger value="properties">
            <Building className="h-4 w-4 mr-2" />
            Properties ({filteredProperties.length})
          </TabsTrigger>
          <TabsTrigger value="unassigned">
            <MapPin className="h-4 w-4 mr-2" />
            Unassigned ({unassignedProperties.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="managers">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredManagers.map((manager) => (
              <Card key={manager.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{manager.name}</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditDialog(manager)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {manager.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {manager.phone}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="h-4 w-4 mr-2" />
                      {manager.company}
                    </div>
                    <div className="flex space-x-2 mt-3">
                      {manager.region && (
                        <Badge variant="secondary">{manager.region}</Badge>
                      )}
                      {manager.market && (
                        <Badge variant="outline">{manager.market}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      Managing {manager.properties_count || 0} properties
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="properties">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Region/Market
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Property Manager
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProperties.map((property) => (
                      <tr key={property.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{property.property_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {property.address}, {property.city}, {property.state}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {property.region && (
                              <Badge variant="secondary">{property.region}</Badge>
                            )}
                            {property.market && (
                              <Badge variant="outline">{property.market}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {property.property_manager_name ? (
                            <div>
                              <div className="font-medium text-gray-900">{property.property_manager_name}</div>
                              <div className="text-sm text-gray-500">{property.property_manager_email}</div>
                            </div>
                          ) : (
                            <Badge variant="destructive">Unassigned</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unassigned">
          <Card>
            <CardHeader>
              <CardTitle>Unassigned Properties</CardTitle>
              <p className="text-sm text-gray-600">
                These properties don't have a property manager assigned yet.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unassignedProperties.map((property) => (
                  <Card key={property.id} className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-gray-900">{property.property_name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {property.address}, {property.city}, {property.state}
                      </p>
                      <div className="flex space-x-2 mt-2">
                        {property.region && (
                          <Badge variant="secondary">{property.region}</Badge>
                        )}
                        {property.market && (
                          <Badge variant="outline">{property.market}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Manager Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Property Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditManager}>
                Update Manager
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}