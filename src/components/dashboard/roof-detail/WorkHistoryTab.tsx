import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Eye, Edit, FileText } from "lucide-react";

export function WorkHistoryTab({ roof }: { roof: any }) {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('work_orders')
          .select(`
            *,
            vendors(company_name),
            users(first_name, last_name)
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

    fetchWorkOrders();
  }, [roof.id]);

  return (
    <div className="space-y-6">
      {/* Work Orders Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Work Order History</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Work Order
        </Button>
      </div>

      {/* Work Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading work orders...</div>
        ) : workOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">No Work Orders</h4>
              <p className="text-muted-foreground mb-4">No work orders have been recorded for this property yet.</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Work Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          workOrders.map((workOrder) => (
            <Card key={workOrder.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{workOrder.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(workOrder.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={
                        workOrder.status === 'completed' ? 'default' :
                        workOrder.status === 'in_progress' ? 'secondary' :
                        workOrder.status === 'assigned' ? 'outline' :
                        'destructive'
                      }
                    >
                      {workOrder.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge 
                      variant={
                        workOrder.priority === 'emergency' ? 'destructive' :
                        workOrder.priority === 'high' ? 'secondary' :
                        'outline'
                      }
                    >
                      {workOrder.priority.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Vendor</label>
                    <p className="font-medium">{workOrder.vendors?.company_name || 'Not assigned'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Assigned To</label>
                    <p className="font-medium">
                      {workOrder.users ? 
                        `${workOrder.users.first_name} ${workOrder.users.last_name}` : 
                        'Unassigned'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Estimated Cost</label>
                    <p className="font-medium">
                      {workOrder.estimated_cost ? 
                        `$${workOrder.estimated_cost.toLocaleString()}` : 
                        'TBD'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Actual Cost</label>
                    <p className="font-medium">
                      {workOrder.actual_cost ? 
                        `$${workOrder.actual_cost.toLocaleString()}` : 
                        'Pending'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Scheduled Start</label>
                    <p className="font-medium">
                      {workOrder.scheduled_start ? 
                        new Date(workOrder.scheduled_start).toLocaleDateString() : 
                        'Not scheduled'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Scheduled End</label>
                    <p className="font-medium">
                      {workOrder.scheduled_end ? 
                        new Date(workOrder.scheduled_end).toLocaleDateString() : 
                        'Not scheduled'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Completed Date</label>
                    <p className="font-medium">
                      {workOrder.completed_date ? 
                        new Date(workOrder.completed_date).toLocaleDateString() : 
                        'Not completed'
                      }
                    </p>
                  </div>
                </div>
                
                {workOrder.description && (
                  <div className="mb-4">
                    <label className="text-sm text-muted-foreground">Description</label>
                    <p className="text-sm mt-1">{workOrder.description}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Work Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Work Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {workOrders.filter(wo => wo.status === 'pending').length}
              </div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">
                {workOrders.filter(wo => wo.status === 'in_progress').length}
              </div>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {workOrders.filter(wo => wo.status === 'completed').length}
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                ${workOrders.reduce((sum, wo) => sum + (wo.actual_cost || wo.estimated_cost || 0), 0).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Total Cost</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}