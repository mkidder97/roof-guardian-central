import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Calendar, DollarSign, User, Plus, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WorkHistoryTabProps {
  roof: any;
}

export function WorkHistoryTab({ roof }: WorkHistoryTabProps) {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkOrders();
  }, [roof.id]);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          vendors(company_name),
          users!work_orders_assigned_to_fkey(first_name, last_name)
        `)
        .eq('roof_id', roof.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Work Orders Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{workOrders.length}</div>
            <p className="text-sm text-gray-600">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {workOrders.filter(wo => wo.status === 'completed').length}
            </div>
            <p className="text-sm text-gray-600">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {workOrders.filter(wo => wo.status === 'in-progress').length}
            </div>
            <p className="text-sm text-gray-600">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {workOrders.filter(wo => wo.status === 'pending').length}
            </div>
            <p className="text-sm text-gray-600">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Work Order Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Work Order History</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Work Order
        </Button>
      </div>

      {/* Work Orders List */}
      {workOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Work Orders</h3>
            <p className="text-gray-600 mb-4">
              No work orders have been created for this property yet.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create First Work Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workOrders.map((workOrder) => (
            <Card key={workOrder.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{workOrder.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Created {new Date(workOrder.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityColor(workOrder.priority)}>
                      {workOrder.priority || 'Medium'} Priority
                    </Badge>
                    <Badge variant={getStatusColor(workOrder.status)}>
                      {workOrder.status || 'Pending'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Description */}
                  <div className="md:col-span-2">
                    {workOrder.description && (
                      <div className="mb-4">
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="text-sm mt-1">{workOrder.description}</p>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      {workOrder.scheduled_start && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Scheduled Start
                          </label>
                          <p className="text-sm">{new Date(workOrder.scheduled_start).toLocaleDateString()}</p>
                        </div>
                      )}
                      {workOrder.scheduled_end && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Scheduled End
                          </label>
                          <p className="text-sm">{new Date(workOrder.scheduled_end).toLocaleDateString()}</p>
                        </div>
                      )}
                      {workOrder.completed_date && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Completed
                          </label>
                          <p className="text-sm">{new Date(workOrder.completed_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-4">
                    {/* Cost Information */}
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Cost Information
                      </label>
                      <div className="mt-1 space-y-1">
                        {workOrder.estimated_cost && (
                          <p className="text-sm">
                            Estimated: ${workOrder.estimated_cost.toLocaleString()}
                          </p>
                        )}
                        {workOrder.actual_cost && (
                          <p className="text-sm">
                            Actual: ${workOrder.actual_cost.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Assigned To */}
                    {workOrder.users && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Assigned To
                        </label>
                        <p className="text-sm mt-1">
                          {workOrder.users.first_name} {workOrder.users.last_name}
                        </p>
                      </div>
                    )}

                    {/* Vendor */}
                    {workOrder.vendors && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Vendor</label>
                        <p className="text-sm mt-1">{workOrder.vendors.company_name}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}