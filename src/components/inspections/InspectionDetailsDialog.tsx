import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CommentSystem } from '@/components/communication/CommentSystem';
import { 
  Calendar, 
  User, 
  Building2, 
  FileText, 
  Cloud, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface InspectionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: {
    id: string;
    scheduled_date: string | null;
    completed_date: string | null;
    inspection_type: string | null;
    status: string | null;
    notes: string | null;
    weather_conditions: string | null;
    roof_id: string | null;
    inspector_id: string | null;
    created_at: string;
    roofs?: {
      property_name: string;
      address?: string;
      city?: string;
      state?: string;
    } | null;
    users?: {
      first_name: string | null;
      last_name: string | null;
      email?: string;
    } | null;
    inspection_reports?: Array<{
      id: string;
      findings: string;
      recommendations: string;
      estimated_cost: number;
      priority_level: string;
    }>;
  } | null;
}

export function InspectionDetailsDialog({ 
  open, 
  onOpenChange, 
  inspection 
}: InspectionDetailsDialogProps) {
  if (!inspection) return null;

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {inspection.roofs?.property_name || 'Unknown Property'}
          </DialogTitle>
          <DialogDescription>
            Inspection Details and Communication
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="h-3 w-3" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px] mt-4">
            <TabsContent value="overview" className="space-y-4">
              {/* Status and Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getStatusIcon(inspection.status)}
                      Inspection Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={cn('capitalize', getStatusColor(inspection.status))}>
                        {inspection.status || 'Unknown'}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {inspection.inspection_type || 'Standard'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {inspection.scheduled_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Scheduled: {format(new Date(inspection.scheduled_date), 'PPP')}</span>
                        </div>
                      )}
                      
                      {inspection.completed_date && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Completed: {format(new Date(inspection.completed_date), 'PPP')}</span>
                        </div>
                      )}
                      
                      {inspection.users && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Inspector: {inspection.users.first_name} {inspection.users.last_name}
                          </span>
                        </div>
                      )}

                      {inspection.weather_conditions && (
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4 text-muted-foreground" />
                          <span>Weather: {inspection.weather_conditions}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Property Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {inspection.roofs?.property_name}
                    </div>
                    {inspection.roofs?.address && (
                      <div>
                        <span className="font-medium">Address:</span> {inspection.roofs.address}
                        {inspection.roofs.city && inspection.roofs.state && (
                          <span>, {inspection.roofs.city}, {inspection.roofs.state}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              {inspection.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Inspection Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{inspection.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              {inspection.inspection_reports && inspection.inspection_reports.length > 0 ? (
                inspection.inspection_reports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Inspection Report</CardTitle>
                        <Badge className={getPriorityColor(report.priority_level)}>
                          {report.priority_level} Priority
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {report.findings && (
                        <div>
                          <h4 className="font-medium mb-2">Findings</h4>
                          <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                            {report.findings}
                          </p>
                        </div>
                      )}
                      
                      {report.recommendations && (
                        <div>
                          <h4 className="font-medium mb-2">Recommendations</h4>
                          <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                            {report.recommendations}
                          </p>
                        </div>
                      )}
                      
                      {report.estimated_cost > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                          <span className="font-medium">Estimated Cost:</span>
                          <span className="text-lg font-bold text-green-600">
                            ${report.estimated_cost.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No inspection reports available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="comments">
              <CommentSystem 
                entityType="inspection" 
                entityId={inspection.id}
                showHeader={false}
              />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Inspection Timeline</CardTitle>
                  <CardDescription>
                    Track the progress of this inspection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium">Inspection Created</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(inspection.created_at), 'PPP p')}
                        </div>
                      </div>
                    </div>
                    
                    {inspection.scheduled_date && (
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <div>
                          <div className="font-medium">Scheduled</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(inspection.scheduled_date), 'PPP p')}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {inspection.completed_date && (
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="font-medium">Completed</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(inspection.completed_date), 'PPP p')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}