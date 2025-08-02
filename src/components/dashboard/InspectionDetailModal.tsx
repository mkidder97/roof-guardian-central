import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  MapPin, 
  User, 
  AlertTriangle,
  DollarSign,
  Image as ImageIcon,
  FileText,
  Clock,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";

interface InspectionDetailModalProps {
  inspection: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InspectionDetailModal({ inspection, open, onOpenChange }: InspectionDetailModalProps) {
  if (!inspection) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Inspection Details - {inspection.property_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Status
                </div>
                <Badge className={getStatusColor(inspection.status)}>
                  {inspection.status?.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  Inspector
                </div>
                <p className="font-medium">
                  {inspection.users?.first_name} {inspection.users?.last_name}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  Date
                </div>
                <p className="font-medium">
                  {inspection.scheduled_date ? format(new Date(inspection.scheduled_date), 'MMM dd, yyyy') : 'Not scheduled'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deficiencies">Deficiencies</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="expenses">Capital Expenses</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Address:</span>
                      <p className="font-medium">{inspection.property_address}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">City, State:</span>
                      <p className="font-medium">{inspection.city}, {inspection.state}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Roof Type:</span>
                      <p className="font-medium">{inspection.roof_type || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Roof Area:</span>
                      <p className="font-medium">
                        {inspection.roof_area ? `${inspection.roof_area.toLocaleString()} sq ft` : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {inspection.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Inspection Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{inspection.notes}</p>
                  </CardContent>
                </Card>
              )}

              {inspection.session_data && (
                <Card>
                  <CardHeader>
                    <CardTitle>Session Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {inspection.session_data.deficiencies?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Deficiencies</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {inspection.session_data.overviewPhotos?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Photos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {inspection.session_data.capitalExpenses?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Capital Items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          ${(inspection.session_data.capitalExpenses?.reduce((sum: number, exp: any) => sum + (exp.estimatedCost || 0), 0) || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Cost</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="deficiencies" className="space-y-4">
              {inspection.session_data?.deficiencies?.length > 0 ? (
                <div className="space-y-3">
                  {inspection.session_data.deficiencies.map((deficiency: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">{deficiency.category}</span>
                          </div>
                          <Badge className={getSeverityColor(deficiency.severity)}>
                            {deficiency.severity?.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Location:</span>
                            <p className="text-sm">{deficiency.location}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Description:</span>
                            <p className="text-sm">{deficiency.description}</p>
                          </div>
                          {deficiency.budgetAmount > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <DollarSign className="h-3 w-3" />
                              <span className="font-medium">${deficiency.budgetAmount.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">No Deficiencies Found</p>
                    <p className="text-muted-foreground">This inspection found no issues requiring attention.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="photos" className="space-y-4">
              {inspection.session_data?.overviewPhotos?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {inspection.session_data.overviewPhotos.map((photo: any, index: number) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          {photo.url ? (
                            <img 
                              src={photo.url} 
                              alt={`Inspection photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {photo.type || 'Overview'}
                          </Badge>
                          {photo.timestamp && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(photo.timestamp), 'MMM dd, HH:mm')}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium">No Photos Available</p>
                    <p className="text-muted-foreground">No photos were captured during this inspection.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="space-y-4">
              {inspection.session_data?.capitalExpenses?.length > 0 ? (
                <div className="space-y-3">
                  {inspection.session_data.capitalExpenses.map((expense: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{expense.description}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">${expense.estimatedCost?.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">Year {expense.year}</div>
                          </div>
                        </div>
                        {expense.scopeOfWork && (
                          <div>
                            <span className="text-sm text-muted-foreground">Scope of Work:</span>
                            <p className="text-sm">{expense.scopeOfWork}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Capital Expenses:</span>
                      <span className="text-xl font-bold text-blue-600">
                        ${inspection.session_data.capitalExpenses.reduce((sum: number, exp: any) => sum + (exp.estimatedCost || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium">No Capital Expenses</p>
                    <p className="text-muted-foreground">No capital expenses were identified during this inspection.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}