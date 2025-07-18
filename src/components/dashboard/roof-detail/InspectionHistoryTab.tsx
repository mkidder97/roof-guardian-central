import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Eye, Edit, FileText, User } from "lucide-react";

export function InspectionHistoryTab({ roof }: { roof: any }) {
  const [inspections, setInspections] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInspectionData = async () => {
      try {
        // Fetch inspections
        const { data: inspectionData, error: inspectionError } = await supabase
          .from('inspections')
          .select(`
            *,
            users(first_name, last_name)
          `)
          .eq('roof_id', roof.id)
          .order('scheduled_date', { ascending: false });

        if (inspectionError) throw inspectionError;

        // Fetch inspection reports
        const { data: reportData, error: reportError } = await supabase
          .from('inspection_reports')
          .select('*')
          .in('inspection_id', inspectionData?.map(i => i.id) || []);

        if (reportError) throw reportError;

        setInspections(inspectionData || []);
        setReports(reportData || []);
      } catch (error) {
        console.error('Error fetching inspection data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInspectionData();
  }, [roof.id]);

  return (
    <div className="space-y-6">
      {/* Inspection Timeline */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Inspection History</h3>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Inspection
        </Button>
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

      {/* Inspection Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {inspections.filter(i => i.status === 'completed').length}
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {inspections.filter(i => i.status === 'scheduled').length}
              </div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {reports.filter(r => r.priority_level === 'high' || r.priority_level === 'critical').length}
              </div>
              <p className="text-sm text-muted-foreground">High Priority Issues</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {inspections.length > 0 ? 
                  Math.round((new Date().getTime() - new Date(inspections[0].completed_date || inspections[0].scheduled_date).getTime()) / (1000 * 60 * 60 * 24)) : 
                  0
                } days
              </div>
              <p className="text-sm text-muted-foreground">Since Last Inspection</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}