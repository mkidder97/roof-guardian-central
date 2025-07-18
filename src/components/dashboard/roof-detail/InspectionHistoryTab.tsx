import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Calendar, User, FileText, Plus, CloudRain, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InspectionHistoryTabProps {
  roof: any;
}

export function InspectionHistoryTab({ roof }: InspectionHistoryTabProps) {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspections();
  }, [roof.id]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          users!inspections_inspector_id_fkey(first_name, last_name),
          inspection_reports(*)
        `)
        .eq('roof_id', roof.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'scheduled': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in-progress': return <Eye className="h-4 w-4" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
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
      {/* Inspection Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{inspections.length}</div>
            <p className="text-sm text-gray-600">Total Inspections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {inspections.filter(i => i.status === 'completed').length}
            </div>
            <p className="text-sm text-gray-600">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {inspections.filter(i => i.status === 'scheduled').length}
            </div>
            <p className="text-sm text-gray-600">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {roof.last_inspection_date 
                ? new Date(roof.last_inspection_date).toLocaleDateString()
                : 'Never'
              }
            </div>
            <p className="text-sm text-gray-600">Last Inspection</p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Inspection Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Inspection History</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Inspection
        </Button>
      </div>

      {/* Inspections List */}
      {inspections.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Inspections</h3>
            <p className="text-gray-600 mb-4">
              No inspections have been scheduled for this property yet.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule First Inspection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {inspections.map((inspection) => (
            <Card key={inspection.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(inspection.status)}
                      {inspection.inspection_type || 'Routine Inspection'}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Created {new Date(inspection.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(inspection.status)}>
                    {inspection.status || 'Scheduled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Main Information */}
                  <div className="md:col-span-2">
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {inspection.scheduled_date && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Scheduled Date
                          </label>
                          <p className="text-sm">{new Date(inspection.scheduled_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {inspection.completed_date && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Completed Date
                          </label>
                          <p className="text-sm">{new Date(inspection.completed_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {/* Weather Conditions */}
                    {inspection.weather_conditions && (
                      <div className="mb-4">
                        <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <CloudRain className="h-3 w-3" />
                          Weather Conditions
                        </label>
                        <p className="text-sm mt-1">{inspection.weather_conditions}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {inspection.notes && (
                      <div className="mb-4">
                        <label className="text-sm font-medium text-gray-600">Notes</label>
                        <p className="text-sm mt-1 p-2 bg-gray-50 rounded">{inspection.notes}</p>
                      </div>
                    )}

                    {/* Reports */}
                    {inspection.inspection_reports && inspection.inspection_reports.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-2">
                          <FileText className="h-3 w-3" />
                          Inspection Reports ({inspection.inspection_reports.length})
                        </label>
                        <div className="space-y-2">
                          {inspection.inspection_reports.map((report: any) => (
                            <div key={report.id} className="p-2 bg-gray-50 rounded text-sm">
                              <div className="flex items-center justify-between">
                                <span>{report.status || 'Draft'}</span>
                                <Badge variant="outline">
                                  {report.priority_level || 'Low'}
                                </Badge>
                              </div>
                              {report.findings && (
                                <p className="text-gray-600 mt-1 text-xs">{report.findings}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-4">
                    {/* Inspector */}
                    {inspection.users && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Inspector
                        </label>
                        <p className="text-sm mt-1">
                          {inspection.users.first_name} {inspection.users.last_name}
                        </p>
                      </div>
                    )}

                    {/* Inspection Type */}
                    <div>
                      <label className="text-sm font-medium text-gray-600">Type</label>
                      <p className="text-sm mt-1">{inspection.inspection_type || 'Routine'}</p>
                    </div>

                    {/* Status Details */}
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1 flex items-center gap-2">
                        {getStatusIcon(inspection.status)}
                        <span className="text-sm">{inspection.status || 'Scheduled'}</span>
                      </div>
                    </div>

                    {/* Report Count */}
                    <div>
                      <label className="text-sm font-medium text-gray-600">Reports</label>
                      <p className="text-sm mt-1">
                        {inspection.inspection_reports?.length || 0} report(s)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  {inspection.status !== 'completed' && (
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  )}
                  {inspection.inspection_reports && inspection.inspection_reports.length > 0 && (
                    <Button size="sm">
                      View Reports
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}