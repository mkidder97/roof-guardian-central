import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, FileDown, Phone, Mail, MapPin, Wrench, Star, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Contractor {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  vendor_type: string | null;
  status: string | null;
  // Performance metrics (calculated)
  totalProjects: number;
  activeProjects: number;
  avgRating: number;
  onTimeCompletion: number;
  totalRevenue: number;
}

interface ContractorFromBuildings {
  name: string;
  type: 'installer' | 'repair';
  count: number;
  properties: string[];
}

export function ContractorsTab() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [buildingContractors, setBuildingContractors] = useState<ContractorFromBuildings[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      setLoading(true);
      
      // Fetch vendors/contractors
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .order('company_name');

      if (vendorsError) throw vendorsError;

      // Fetch work orders to calculate performance metrics
      const { data: workOrders, error: workOrdersError } = await supabase
        .from('work_orders')
        .select('vendor_id, status, actual_cost, completed_date, scheduled_end');

      if (workOrdersError) throw workOrdersError;

      // Process contractors with performance metrics
      const processedContractors = (vendorsData || []).map(vendor => {
        const vendorWorkOrders = (workOrders || []).filter(wo => wo.vendor_id === vendor.id);
        const completedOrders = vendorWorkOrders.filter(wo => wo.status === 'completed');
        const onTimeOrders = completedOrders.filter(wo => 
          wo.completed_date && wo.scheduled_end && 
          new Date(wo.completed_date) <= new Date(wo.scheduled_end)
        );
        
        return {
          ...vendor,
          totalProjects: vendorWorkOrders.length,
          activeProjects: vendorWorkOrders.filter(wo => wo.status === 'in-progress').length,
          avgRating: 4.2 + Math.random() * 0.8, // Mock rating for now
          onTimeCompletion: completedOrders.length > 0 ? (onTimeOrders.length / completedOrders.length) * 100 : 0,
          totalRevenue: vendorWorkOrders.reduce((sum, wo) => sum + (wo.actual_cost || 0), 0),
        };
      });

      setContractors(processedContractors);

      // Fetch contractors from building data
      const { data: roofsData, error: roofsError } = await supabase
        .from('roofs')
        .select('property_name, installing_contractor, repair_contractor')
        .eq('is_deleted', false);

      if (roofsError) throw roofsError;

      // Process building contractors
      const contractorMap = new Map<string, ContractorFromBuildings>();
      
      (roofsData || []).forEach(roof => {
        if (roof.installing_contractor) {
          const key = `${roof.installing_contractor}-installer`;
          if (!contractorMap.has(key)) {
            contractorMap.set(key, {
              name: roof.installing_contractor,
              type: 'installer',
              count: 0,
              properties: []
            });
          }
          const contractor = contractorMap.get(key)!;
          contractor.count++;
          contractor.properties.push(roof.property_name);
        }

        if (roof.repair_contractor) {
          const key = `${roof.repair_contractor}-repair`;
          if (!contractorMap.has(key)) {
            contractorMap.set(key, {
              name: roof.repair_contractor,
              type: 'repair',
              count: 0,
              properties: []
            });
          }
          const contractor = contractorMap.get(key)!;
          contractor.count++;
          contractor.properties.push(roof.property_name);
        }
      });

      setBuildingContractors(Array.from(contractorMap.values()).sort((a, b) => b.count - a.count));

    } catch (error) {
      console.error('Error fetching contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContractors = contractors.filter(contractor => {
    if (searchTerm && !contractor.company_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (typeFilter !== "all" && contractor.vendor_type !== typeFilter) return false;
    if (statusFilter !== "all" && contractor.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getTypeBadge = (type: string | null) => {
    const colors = {
      roofing: "bg-blue-100 text-blue-800",
      hvac: "bg-purple-100 text-purple-800",
      maintenance: "bg-orange-100 text-orange-800",
      emergency: "bg-red-100 text-red-800",
      inspection: "bg-green-100 text-green-800",
      installer: "bg-indigo-100 text-indigo-800",
      repair: "bg-yellow-100 text-yellow-800"
    };
    
    return (
      <Badge variant="outline" className={colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown'}
      </Badge>
    );
  };

  const getRatingStars = (rating: number) => {
    return (
      <div className="flex items-center">
        <span className="text-sm font-medium mr-1">{rating.toFixed(1)}</span>
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
          ))}
        </div>
      </div>
    );
  };

  const getPerformanceIndicator = (value: number, threshold: number = 80) => {
    if (value >= threshold) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (value >= threshold * 0.7) {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    } else {
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Wrench className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-semibold">Contractor Management</h2>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Contractor
          </Button>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{contractors.length}</div>
                <p className="text-sm text-gray-600">Active Contractors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {contractors.reduce((sum, c) => sum + c.totalProjects, 0)}
                </div>
                <p className="text-sm text-gray-600">Total Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">
                  {contractors.length > 0 ? (contractors.reduce((sum, c) => sum + c.avgRating, 0) / contractors.length).toFixed(1) : '0'}
                </div>
                <p className="text-sm text-gray-600">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">
                  {contractors.reduce((sum, c) => sum + c.activeProjects, 0)}
                </div>
                <p className="text-sm text-gray-600">Active Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="registered" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="registered">Registered Contractors</TabsTrigger>
          <TabsTrigger value="building-data">From Building Data</TabsTrigger>
        </TabsList>

        <TabsContent value="registered" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search contractors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="roofing">Roofing</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contractors Table */}
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>On-Time %</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContractors.map((contractor) => (
                    <TableRow key={contractor.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contractor.company_name}</div>
                          <div className="text-sm text-gray-500">{contractor.city}, {contractor.state}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{contractor.contact_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{contractor.email || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(contractor.vendor_type)}</TableCell>
                      <TableCell>{getRatingStars(contractor.avgRating)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{contractor.totalProjects}</span>
                          {contractor.activeProjects > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {contractor.activeProjects} active
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getPerformanceIndicator(contractor.onTimeCompletion)}
                          <span>{contractor.onTimeCompletion.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>${contractor.totalRevenue.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(contractor.status)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">View</Button>
                          <Button variant="outline" size="sm">Assign</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="building-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contractors from Building Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Installing Contractors */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Installing Contractors</h3>
                  <div className="space-y-3">
                    {buildingContractors.filter(c => c.type === 'installer').map((contractor, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{contractor.name}</div>
                            <div className="text-sm text-gray-500">{contractor.count} properties</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getTypeBadge('installer')}
                            <Button variant="outline" size="sm">Add to Registry</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Repair Contractors */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Repair Contractors</h3>
                  <div className="space-y-3">
                    {buildingContractors.filter(c => c.type === 'repair').map((contractor, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{contractor.name}</div>
                            <div className="text-sm text-gray-500">{contractor.count} properties</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getTypeBadge('repair')}
                            <Button variant="outline" size="sm">Add to Registry</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}