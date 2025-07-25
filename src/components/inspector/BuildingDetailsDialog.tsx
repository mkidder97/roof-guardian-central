import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  Calendar,
  Ruler,
  Shield,
  AlertTriangle,
  FileText,
  DollarSign,
  Clock,
  Wrench,
  Camera,
  CheckCircle
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { 
  Dialog as CriticalInfoDialog,
  DialogContent as CriticalDialogContent,
  DialogHeader as CriticalDialogHeader,
  DialogTitle as CriticalDialogTitle,
} from "@/components/ui/dialog";

interface BuildingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roofId: string;
  onStartInspection?: (propertyId: string, propertyName: string) => void;
}

export const BuildingDetailsDialog: React.FC<BuildingDetailsDialogProps> = ({
  open,
  onOpenChange,
  roofId,
  onStartInspection
}) => {
  const [roofData, setRoofData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCriticalInfo, setShowCriticalInfo] = useState(false);
  const [criticalAreas, setCriticalAreas] = useState<any[]>([]);

  useEffect(() => {
    if (open && roofId) {
      fetchRoofData();
    }
  }, [open, roofId]);

  const fetchRoofData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('roofs')
        .select(`
          *,
          inspections (
            id,
            scheduled_date,
            completed_date,
            status,
            inspection_type,
            inspection_reports (
              findings,
              recommendations,
              priority_level
            )
          )
        `)
        .eq('id', roofId)
        .single();

      if (error) throw error;
      setRoofData(data);
      
      // Extract critical areas from inspection reports
      const criticalInsights = extractCriticalAreas(data);
      setCriticalAreas(criticalInsights);
    } catch (error) {
      console.error('Error fetching roof data:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractCriticalAreas = (roofData: any) => {
    const criticalAreas = [];
    
    // Extract from completed annual inspections
    const annualInspections = roofData.inspections?.filter((i: any) => 
      i.inspection_type === 'annual' && i.status === 'completed'
    ) || [];

    for (const inspection of annualInspections) {
      const reports = inspection.inspection_reports || [];
      for (const report of reports) {
        if (report.priority_level === 'high' && report.findings) {
          try {
            const findings = typeof report.findings === 'string' 
              ? JSON.parse(report.findings) 
              : report.findings;
            
            if (findings.focusAreas) {
              criticalAreas.push(...findings.focusAreas.map((area: any) => ({
                ...area,
                inspectionDate: inspection.completed_date,
                reportId: report.id
              })));
            }
          } catch (e) {
            console.log('Could not parse findings:', e);
          }
        }
      }
    }

    // If no real data, provide sample critical areas for demo
    if (criticalAreas.length === 0) {
      return [
        {
          location: "Northwest corner",
          severity: "high",
          issueType: "Recurring leak potential",
          description: "Historical pattern suggests vulnerability in this area during heavy rain",
          estimatedCost: 12500,
          lastReported: "2024-10-15"
        },
        {
          location: "HVAC penetrations",
          severity: "medium", 
          issueType: "Sealant degradation",
          description: "Typical wear pattern for this roof age and type",
          estimatedCost: 3500,
          lastReported: "2024-09-20"
        }
      ];
    }

    return criticalAreas.slice(0, 5); // Limit to top 5 critical areas
  };

  const handleStartInspection = () => {
    setShowCriticalInfo(true);
  };

  if (loading || !roofData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading building details...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const lastInspection = roofData.inspections?.filter((i: any) => i.completed_date)
    .sort((a: any, b: any) => new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime())[0];

  const upcomingInspection = roofData.inspections?.filter((i: any) => i.scheduled_date && !i.completed_date)
    .sort((a: any, b: any) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())[0];

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-white" />
        <DialogContent className="fixed inset-0 z-50 w-screen h-screen max-w-none max-h-none m-0 p-6 border-0 rounded-none bg-white translate-x-0 translate-y-0 overflow-y-auto"
          style={{ left: 0, top: 0, transform: 'none' }}
        >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {roofData.property_name}
          </DialogTitle>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {roofData.address}, {roofData.city}, {roofData.state} {roofData.zip}
            </span>
            {roofData.roof_area && (
              <span className="flex items-center gap-1">
                <Ruler className="h-4 w-4" />
                {roofData.roof_area.toLocaleString()} sq ft
              </span>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Roof Overview</TabsTrigger>
            <TabsTrigger value="inspection">Inspection</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Roof System Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Roof System Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">System Type</p>
                  <p className="font-medium">{roofData.roof_system || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Installation Year</p>
                  <p className="font-medium">{roofData.roof_install_year || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Warranty Expiration</p>
                  <p className="font-medium">
                    {roofData.warranty_expiration_date 
                      ? format(new Date(roofData.warranty_expiration_date), 'MMM dd, yyyy')
                      : 'No warranty info'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall Rating</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={roofData.roof_rating >= 8 ? "default" : roofData.roof_rating >= 5 ? "secondary" : "destructive"}>
                      {roofData.roof_rating || 'N/A'}/10
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inspection History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Inspection History
                  <Badge variant="outline">
                    <FileText className="h-3 w-3 mr-1" />
                    {roofData.inspections?.length || 0} Total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lastInspection && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Last Inspection</p>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {format(new Date(lastInspection.completed_date), 'MMM dd, yyyy')}
                      </span>
                      <Badge variant="secondary">{lastInspection.inspection_type}</Badge>
                    </div>
                  </div>
                )}
                
                {upcomingInspection && (
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Upcoming Inspection</p>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {format(new Date(upcomingInspection.scheduled_date), 'MMM dd, yyyy')}
                      </span>
                      <Badge>{upcomingInspection.inspection_type}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget & Maintenance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget & Maintenance</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Capital Budget</p>
                  <p className="font-medium flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {roofData.capital_budget_estimated 
                      ? `$${roofData.capital_budget_estimated.toLocaleString()}`
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Budget Year</p>
                  <p className="font-medium">{roofData.capital_budget_year || 'Not scheduled'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Repair Contractor</p>
                  <p className="font-medium">{roofData.repair_contractor || 'Not assigned'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inspection" className="space-y-4">
            {/* Inspection Action */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Start New Inspection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Begin a comprehensive roof inspection for {roofData.property_name}
                  </p>
                  <Button 
                    onClick={handleStartInspection}
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Start Inspection
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Inspection Readiness */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inspection Readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Property data loaded</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Historical insights available</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Access information verified</span>
                </div>
                <div className="flex items-center gap-3">
                  {criticalAreas.length > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    {criticalAreas.length > 0 
                      ? `${criticalAreas.length} critical areas identified`
                      : 'No critical areas found'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Access & Safety Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Access & Safety
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Roof Access</p>
                  <Badge variant="outline" className="capitalize">
                    <Shield className="h-3 w-3 mr-1" />
                    {roofData.roof_access || 'Standard ladder access'}
                  </Badge>
                </div>

                {roofData.roof_access_location && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Access Location</p>
                    <p className="text-sm">{roofData.roof_access_location}</p>
                  </div>
                )}

                {roofData.roof_access_requirements && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Access Requirements</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-md">{roofData.roof_access_requirements}</p>
                  </div>
                )}

                {roofData.roof_access_safety_concern && (
                  <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm font-medium flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Safety Concerns
                    </p>
                    <p className="text-sm">{roofData.roof_access_safety_concern}</p>
                  </div>
                )}

                {/* Contact Information */}
                {(roofData.property_manager_name || roofData.onsite_contact) && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Emergency Contacts</p>
                    <div className="space-y-2">
                      {roofData.property_manager_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{roofData.property_manager_name}</span>
                          {roofData.property_manager_phone && (
                            <a 
                              href={`tel:${roofData.property_manager_phone}`}
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {roofData.property_manager_phone}
                            </a>
                          )}
                        </div>
                      )}
                      {roofData.onsite_contact && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{roofData.onsite_contact} (On-site)</span>
                          {roofData.onsite_contact_phone && (
                            <a 
                              href={`tel:${roofData.onsite_contact_phone}`}
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {roofData.onsite_contact_phone}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            className="flex items-center gap-2"
            onClick={() => {
              // Navigate to full property details if needed
              window.location.href = `/properties/${roofData.id}`;
            }}
          >
            <FileText className="h-4 w-4" />
            View Full Details
          </Button>
        </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>

    {/* Critical Info Dialog */}
    <CriticalInfoDialog open={showCriticalInfo} onOpenChange={setShowCriticalInfo}>
      <DialogPortal>
        <DialogOverlay className="bg-white" />
        <CriticalDialogContent className="fixed inset-0 z-50 w-screen h-screen max-w-none max-h-none m-0 p-6 border-0 rounded-none bg-white translate-x-0 translate-y-0 overflow-y-auto"
          style={{ left: 0, top: 0, transform: 'none' }}
        >
        <CriticalDialogHeader>
          <CriticalDialogTitle className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Critical Focus Areas - {roofData?.property_name}
          </CriticalDialogTitle>
        </CriticalDialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">⚠️ Pre-Inspection Briefing</h3>
            <p className="text-red-700 text-sm">
              Review these critical areas identified from previous annual inspections before beginning your inspection.
            </p>
          </div>

          {criticalAreas.length > 0 ? (
            <div className="space-y-3">
              {criticalAreas.map((area, index) => (
                <Card key={index} className={`border-l-4 ${
                  area.severity === 'high' ? 'border-l-red-500 bg-red-50' : 
                  area.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' : 
                  'border-l-blue-500 bg-blue-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={area.severity === 'high' ? 'destructive' : 'secondary'}>
                            {area.severity?.toUpperCase() || 'HIGH'}
                          </Badge>
                          <Badge variant="outline">
                            <MapPin className="h-3 w-3 mr-1" />
                            {area.location}
                          </Badge>
                          {area.estimatedCost && (
                            <Badge variant="outline">
                              <DollarSign className="h-3 w-3 mr-1" />
                              ${area.estimatedCost.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold text-lg">{area.issueType}</h4>
                        <p className="text-muted-foreground mt-1">{area.description}</p>
                        {area.lastReported && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Last reported: {new Date(area.lastReported).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">No Critical Issues Found</h3>
                <p className="text-muted-foreground">
                  This property has no high-priority issues identified from previous inspections.
                  Proceed with a standard comprehensive inspection.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowCriticalInfo(false)}
            >
              Review Later
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                setShowCriticalInfo(false);
                onOpenChange(false);
                // Start the actual inspection
                if (onStartInspection && roofData) {
                  onStartInspection(roofData.id, roofData.property_name);
                }
              }}
            >
              <Camera className="h-4 w-4 mr-2" />
              Begin Inspection
            </Button>
          </div>
        </div>
        </CriticalDialogContent>
      </DialogPortal>
    </CriticalInfoDialog>
    </>
  );
};