import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
      
      console.log('Fetched roof data:', data); // Debug logging
      setRoofData(data);
      
      // Extract critical areas from inspection reports
      const criticalInsights = extractCriticalAreas(data);
      setCriticalAreas(criticalInsights);
    } catch (error) {
      console.error('Error fetching roof data:', error);
      console.error('Error details:', error);
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
        <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {roofData.property_name || 'Unknown Property'}
            </DialogTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {roofData.address || 'Address not available'}, {roofData.city || 'Unknown'}, {roofData.state || 'Unknown'} {roofData.zip || ''}
              </span>
              {roofData.roof_area && (
                <span className="flex items-center gap-1">
                  <Ruler className="h-4 w-4" />
                  {roofData.roof_area.toLocaleString()} sq ft
                </span>
              )}
            </div>
          </DialogHeader>

          <Tabs defaultValue="roof-summary" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="roof-summary">Roof Summary</TabsTrigger>
              <TabsTrigger value="my-inspection">My Inspection</TabsTrigger>
            </TabsList>

          <TabsContent value="roof-summary" className="space-y-4">
            <Tabs defaultValue="overview" className="mb-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="roof-assembly">Roof Assembly</TabsTrigger>
                <TabsTrigger value="repair-history">Repair History</TabsTrigger>
                <TabsTrigger value="daylighting">Daylighting</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Roof System Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Roof System Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Budget & Maintenance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Budget & Maintenance</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <TabsContent value="roof-assembly" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Roof Assembly Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">Detailed roof assembly information will be displayed here.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="repair-history" className="space-y-4">
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
              </TabsContent>

              <TabsContent value="daylighting" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Daylighting Systems</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">Skylights and daylighting system information will be displayed here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="my-inspection" className="space-y-4">
            {/* Simple Start Inspection Card - matching screenshot */}
            <Card>
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <Camera className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Ready to inspect</h3>
                    <p className="text-muted-foreground mb-6">
                      Begin your comprehensive roof inspection for {roofData.property_name}
                    </p>
                  </div>
                  <Button 
                    onClick={handleStartInspection}
                    className="w-full max-w-md bg-green-600 hover:bg-green-700 text-white h-14 text-lg font-semibold"
                  >
                    Start Inspection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          </Tabs>
        
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
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
    </Dialog>

    {/* Critical Info Dialog - Pre-Inspection Briefing */}
    <Dialog open={showCriticalInfo} onOpenChange={setShowCriticalInfo}>
        <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Critical Focus Areas - {roofData?.property_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 pt-4 border-t">
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
        </DialogContent>
    </Dialog>
    </>
  );
};