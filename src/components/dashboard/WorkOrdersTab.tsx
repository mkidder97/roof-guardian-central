import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, DollarSign, Plus, Search, Filter, FileText, Download, Wrench, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  completed_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  vendor_id: string | null;
  roof_id: string | null;
  inspection_report_id: string | null;
  created_at: string;
  // Joined data
  roof_property_name?: string;
  roof_address?: string;
  roof_city?: string;
  roof_state?: string;
  vendor_name?: string;
  assigned_user_name?: string;
  creator_name?: string;
  // Budget tracking
  preventative_budget_estimated?: number;
  capital_budget_estimated?: number;
  preventative_budget_actual?: string;
  capital_budget_actual?: string;
}

interface WorkOrderSummary {
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  totalEstimatedCost: number;
  totalActualCost: number;
  budgetVariance: number;
}

export function WorkOrdersTab() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<WorkOrder[]>([]);
  const [summary, setSummary] = useState<WorkOrderSummary>({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    totalEstimatedCost: 0,
    totalActualCost: 0,
    budgetVariance: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [vendors, setVendors] = useState<{ id: string; company_name: string }[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; property_name: string; address: string }[]>([]);

  useEffect(() => {
    fetchWorkOrders();
    fetchVendors();
    fetchBuildings();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, statusFilter, priorityFilter, vendorFilter, workOrders]);

  const fetchWorkOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          roofs!roof_id (
            property_name,
            address,
            city,
            state,
            preventative_budget_estimated,
            capital_budget_estimated,
            preventative_budget_actual,
            capital_budget_actual
          ),
          vendors!vendor_id (
            company_name
          ),
          assigned_user:users!assigned_to (
            first_name,
            last_name
          ),
          creator:users!created_by (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedOrders = (data || []).map(order => ({
        ...order,
        roof_property_name: order.roofs?.property_name,
        roof_address: order.roofs?.address,
        roof_city: order.roofs?.city,
        roof_state: order.roofs?.state,
        vendor_name: order.vendors?.company_name,
        assigned_user_name: order.assigned_user 
          ? `${order.assigned_user.first_name || ''} ${order.assigned_user.last_name || ''}`.trim()
          : null,
        creator_name: order.creator
          ? `${order.creator.first_name || ''} ${order.creator.last_name || ''}`.trim()
          : null,
        preventative_budget_estimated: order.roofs?.preventative_budget_estimated,
        capital_budget_estimated: order.roofs?.capital_budget_estimated,
        preventative_budget_actual: order.roofs?.preventative_budget_actual,
        capital_budget_actual: order.roofs?.capital_budget_actual
      }));

      setWorkOrders(processedOrders);
      calculateSummary(processedOrders);
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, company_name')
        .eq('status', 'active')
        .order('company_name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('roofs')
        .select('id, property_name, address')
        .eq('is_deleted', false)
        .order('property_name');

      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const calculateSummary = (orders: WorkOrder[]) => {
    const summary = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      inProgressOrders: orders.filter(o => o.status === 'in-progress').length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      totalEstimatedCost: orders.reduce((sum, o) => sum + (o.estimated_cost || 0), 0),
      totalActualCost: orders.reduce((sum, o) => sum + (o.actual_cost || 0), 0),
      budgetVariance: 0
    };

    summary.budgetVariance = summary.totalActualCost - summary.totalEstimatedCost;
    setSummary(summary);
  };

  const filterOrders = () => {
    let filtered = workOrders;

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.roof_property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter(order => order.priority === priorityFilter);
    }

    if (vendorFilter) {
      filtered = filtered.filter(order => order.vendor_id === vendorFilter);
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'in-progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-700">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      case 'medium':
        return <Badge variant="default">Medium</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'urgent':
        return <Badge variant="destructive" className="bg-red-600">Urgent</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getBudgetImpactBadge = (estimated: number | null, actual: number | null) => {
    if (!estimated && !actual) return <Badge variant="secondary">No Budget</Badge>;
    
    const est = estimated || 0;
    const act = actual || 0;
    
    if (act === 0) return <Badge variant="outline">Estimated Only</Badge>;
    
    const variance = ((act - est) / est) * 100;
    
    if (variance <= -10) return <Badge variant="outline" className="border-green-500 text-green-700">Under Budget</Badge>;
    if (variance <= 10) return <Badge variant="outline">On Budget</Badge>;
    return <Badge variant="destructive">Over Budget</Badge>;
  };

  const exportData = () => {
    const csvData = filteredOrders.map(order => ({
      'Work Order': order.title,
      'Property': order.roof_property_name || '',
      'Status': order.status || '',
      'Priority': order.priority || '',
      'Vendor': order.vendor_name || '',
      'Assigned To': order.assigned_user_name || '',
      'Estimated Cost': order.estimated_cost || '',
      'Actual Cost': order.actual_cost || '',
      'Scheduled Start': order.scheduled_start || '',
      'Scheduled End': order.scheduled_end || '',
      'Completed Date': order.completed_date || '',
      'Created Date': format(new Date(order.created_at), 'yyyy-MM-dd'),
      'Description': order.description || ''
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading work orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Wrench className="h-4 w-4 text-blue-500 mr-2" />
              Total Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders}</div>
            <div className="text-xs text-gray-600">
              {summary.pendingOrders} pending, {summary.inProgressOrders} in progress
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 text-green-500 mr-2" />
              Estimated Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalEstimatedCost.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Total budgeted amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 text-orange-500 mr-2" />
              Actual Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalActualCost.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Total spent amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="h-4 w-4 text-purple-500 mr-2" />
              Budget Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.budgetVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.budgetVariance >= 0 ? '+' : ''}${summary.budgetVariance.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600">
              {summary.budgetVariance >= 0 ? 'Over budget' : 'Under budget'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <CardTitle className="text-lg font-semibold">Work Orders</CardTitle>
            <div className="flex items-center space-x-2">
              <Button onClick={exportData} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Work Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Work Order</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" placeholder="Work order title..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="building">Building</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select building" />
                        </SelectTrigger>
                        <SelectContent>
                          {buildings.map(building => (
                            <SelectItem key={building.id} value={building.id}>
                              {building.property_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendor">Contractor</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contractor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map(vendor => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimated">Estimated Cost</Label>
                      <Input id="estimated" type="number" placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduled">Scheduled Start</Label>
                      <Input id="scheduled" type="date" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" placeholder="Work order description..." />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setCreateDialogOpen(false)}>
                      Create Work Order
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search work orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Contractors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Contractors</SelectItem>
                {vendors.map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
                setPriorityFilter("");
                setVendorFilter("");
              }}
              variant="outline"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Results Summary */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredOrders.length} of {workOrders.length} work orders
          </div>

          {/* Work Orders Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Costs</TableHead>
                  <TableHead>Budget Impact</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.title}</div>
                        <div className="text-sm text-gray-500">
                          {order.description ? order.description.substring(0, 50) + '...' : 'No description'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="font-medium">{order.roof_property_name || 'Unknown Property'}</div>
                          <div className="text-sm text-gray-500">
                            {order.roof_city}, {order.roof_state}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(order.priority)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.vendor_name || 'Not Assigned'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Est: ${(order.estimated_cost || 0).toLocaleString()}</div>
                        <div className="text-gray-500">
                          Act: ${(order.actual_cost || 0).toLocaleString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getBudgetImpactBadge(order.estimated_cost, order.actual_cost)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.scheduled_start 
                          ? format(new Date(order.scheduled_start), 'MMM dd, yyyy')
                          : 'Not Scheduled'
                        }
                        {order.completed_date && (
                          <div className="text-green-600">
                            Completed: {format(new Date(order.completed_date), 'MMM dd')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.assigned_user_name || 'Unassigned'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredOrders.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No work orders found matching your criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}