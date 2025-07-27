import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInspectionSync } from "@/hooks/useInspectionSync";
import { useUnifiedInspectionEvents, useInspectionEventEmitter } from "@/hooks/useUnifiedInspectionEvents";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Eye, Edit, FileText, User, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function InspectionHistoryTab({ roof }: { roof: any }) {
  const [reports, setReports] = useState<any[]>([]);
  const { toast } = useToast();

  // Use unified inspection synchronization for this specific roof
  const {
    inspections,
    loading,
    error,
    syncStatus,
    lastSyncTime,
    refresh,
    updateInspectionStatus,
    scheduledCount,
    completedCount,
    inProgressCount
  } = useInspectionSync({
    autoRefresh: true,
    refreshInterval: 60000, // 1 minute for building-specific data
    enableRealTimeSync: true,
    filters: {
      roofId: roof.id
    }
  });

  // Event system for real-time updates
  const { on, dataSync } = useUnifiedInspectionEvents();
  const { emitDataRefresh } = useInspectionEventEmitter();

  // Listen for building-specific inspection events
  useEffect(() => {
    const unsubscribeBuildingHistory = on('buildingInspectionHistoryUpdated', ({ roofId, inspections: updatedInspections }) => {
      if (roofId === roof.id) {
        toast({
          title: "History Updated",
          description: `Inspection history updated for ${roof.property_name || 'this property'}`,
        });
      }
    });

    const unsubscribeInspectionCreated = on('inspectionCreated', ({ inspection }) => {
      if (inspection.roof_id === roof.id) {
        toast({
          title: "New Inspection",
          description: `Inspection scheduled for ${roof.property_name || 'this property'}`,
        });
      }
    });

    const unsubscribeStatusChanged = on('inspectionStatusChanged', ({ inspection, newStatus }) => {
      if (inspection?.roof_id === roof.id) {
        toast({
          title: "Status Updated",
          description: `Inspection status changed to ${newStatus}`,
        });
      }
    });

    return () => {
      unsubscribeBuildingHistory();
      unsubscribeInspectionCreated();
      unsubscribeStatusChanged();
    };
  }, [on, roof.id, roof.property_name, toast]);

  // Fetch inspection reports when inspections change
  useEffect(() => {
    const fetchReports = async () => {
      if (inspections.length === 0) {
        setReports([]);
        return;
      }

      try {
        const { data: reportData, error: reportError } = await supabase
          .from('inspection_reports')
          .select('*')
          .in('inspection_id', inspections.map(i => i.id));

        if (reportError) throw reportError;
        setReports(reportData || []);
      } catch (error) {
        console.error('Error fetching inspection reports:', error);
        toast({
          title: "Error",
          description: "Failed to fetch inspection reports",
          variant: "destructive"
        });
      }
    };

    fetchReports();
  }, [inspections, toast]);

  const handleManualRefresh = useCallback(() => {
    refresh();
    dataSync.syncBuildingHistory(roof.id);
    emitDataRefresh(['inspection_history']);
    toast({
      title: "Refreshing",
      description: "Updating inspection history...",
    });
  }, [refresh, dataSync, roof.id, emitDataRefresh, toast]);

  const handleStatusChange = useCallback(async (inspectionId: string, newStatus: string) => {
    try {
      await updateInspectionStatus(inspectionId, newStatus);
      toast({
        title: "Status Updated",
        description: `Inspection status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update inspection status",
        variant: "destructive"
      });
    }
  }, [updateInspectionStatus, toast]);

  return (
    <div className="space-y-6">
      {/* Inspection Timeline Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Inspection History</h3>
          
          {/* Sync Status Indicator */}
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            {syncStatus === 'syncing' ? (
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            ) : syncStatus === 'error' ? (
              <WifiOff className="h-4 w-4 text-red-600" />
            ) : syncStatus === 'stale' ? (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">Stale</Badge>
            ) : (
              <Wifi className="h-4 w-4 text-green-600" />
            )}
            {lastSyncTime && (
              <span className="text-xs">
                Last sync: {format(lastSyncTime, 'HH:mm')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Manual Refresh Button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading || syncStatus === 'syncing'}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || syncStatus === 'syncing') ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Inspection
          </Button>
        </div>
      </div>

      {/* Inspection Findings - Recent Report */}
      {inspections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Inspection Findings
              <Badge variant="outline">Latest Report</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Latest Inspection Date */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-medium">
                    April 27, 2025
                  </div>
                  <div className="text-muted-foreground">February 12, 2025</div>
                </div>

                {/* Inspection Findings */}
                <div className="prose prose-sm max-w-none text-sm">
                  <p>
                    <strong>2025:</strong> The roof composition consists of a mechanically attached, 45 mil TPO single ply membrane, over 
                    mechanically attached, 1.25" polyisocyanurate insulation, on a metal deck. The roof system was installed in 
                    2017 and is under warranty until 2032. No significant membrane failure was observed in the roof system.
                  </p>
                  
                  <p>
                    Primary drainage is provided by two-way slope in the steel deck towards external gutter systems installed 
                    along the building's east and west elevations, where it is collected and discharged at grade via recessed 
                    downspouts directly onto the building's concrete loading dock aprons. Secondary drainage is provided by 
                    internal roof drains and leaders sited in the building corners that also discharge onto the loading dock 
                    aprons. No standing water was observed along the gutter lines. SRC noted expansion joints are not installed 
                    in the gutter troughs.
                  </p>

                  <p>
                    The perimeter details of the roof consist of low and intermediate height tilt wall parapets on the north and 
                    south elevations and corners and the gutter systems on the east and west elevations. The parapets are 
                    membrane flashed to approximately 18-inches and are completed using exposed term bar.
                  </p>

                  <p>
                    Penetrations throughout the field of roof are comprised of, but not limited to, curb mounted HVAC units, curb 
                    mounted exhaust fans, soil stacks, and power vents. Five low profile, membrane wrapped expansion joints 
                    are installed east to west and north to south across the roof.
                  </p>
                </div>
              </div>

              {/* Inspector Image */}
              <div className="flex justify-center">
                <div className="w-32 h-40 bg-muted rounded-lg flex items-center justify-center">
                  <User className="h-16 w-16 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspection List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading inspections...</div>
        ) : inspections.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium text-foreground mb-2">No Inspections</h4>
              <p className="text-muted-foreground mb-4">No inspections have been scheduled for this property yet.</p>
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule First Inspection
              </Button>
            </CardContent>
          </Card>
        ) : (
          inspections.map((inspection) => {
            const associatedReport = reports.find(r => r.inspection_id === inspection.id);
            
            return (
              <Card key={inspection.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {inspection.inspection_type || 'Routine Inspection'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Scheduled: {new Date(inspection.scheduled_date).toLocaleDateString()}
                        {inspection.completed_date && (
                          <span> • Completed: {new Date(inspection.completed_date).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          inspection.status === 'completed' ? 'default' :
                          inspection.status === 'in_progress' ? 'secondary' :
                          inspection.status === 'scheduled' ? 'outline' :
                          'destructive'
                        }
                      >
                        {inspection.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {associatedReport && (
                        <Badge 
                          variant={
                            associatedReport.priority_level === 'critical' ? 'destructive' :
                            associatedReport.priority_level === 'high' ? 'secondary' :
                            'outline'
                          }
                        >
                          {associatedReport.priority_level?.toUpperCase() || 'LOW'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Inspector</label>
                      <p className="font-medium">
                        {inspection.users ? 
                          `${inspection.users.first_name} ${inspection.users.last_name}` : 
                          'Not assigned'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Weather Conditions</label>
                      <p className="font-medium">{inspection.weather_conditions || 'Not recorded'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Estimated Cost</label>
                      <p className="font-medium">
                        {associatedReport?.estimated_cost ? 
                          `$${associatedReport.estimated_cost.toLocaleString()}` : 
                          'No issues found'
                        }
                      </p>
                    </div>
                  </div>

                  {inspection.notes && (
                    <div className="mb-4">
                      <label className="text-sm text-muted-foreground">Notes</label>
                      <p className="text-sm mt-1">{inspection.notes}</p>
                    </div>
                  )}

                  {associatedReport && (
                    <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                      <h5 className="font-medium mb-2">Inspection Findings</h5>
                      <p className="text-sm text-foreground mb-2">{associatedReport.findings}</p>
                      {associatedReport.recommendations && (
                        <div>
                          <h6 className="font-medium text-sm mb-1">Recommendations</h6>
                          <p className="text-sm text-foreground">{associatedReport.recommendations}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    {associatedReport && (
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        View Report
                      </Button>
                    )}
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
            );
          })
        )}
      </div>

      {/* Enhanced Inspection Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Inspection Summary
            {error && (
              <Badge variant="destructive" className="text-xs">
                Sync Error
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {completedCount}
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {scheduledCount}
              </div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {inProgressCount}
              </div>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {reports.filter(r => r.priority_level === 'high' || r.priority_level === 'critical').length}
              </div>
              <p className="text-sm text-muted-foreground">High Priority Issues</p>
            </div>
          </div>
          
          {/* Additional metrics */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Total Inspections: {inspections.length}
              </span>
              <span className="text-muted-foreground">
                Days Since Last: {inspections.length > 0 ? 
                  Math.round((new Date().getTime() - new Date(inspections[0]?.completed_date || inspections[0]?.scheduled_date || new Date()).getTime()) / (1000 * 60 * 60 * 24)) : 
                  0
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}