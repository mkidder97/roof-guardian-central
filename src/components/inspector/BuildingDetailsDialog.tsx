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
  Wrench
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';

interface BuildingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roofId: string;
}

export const BuildingDetailsDialog: React.FC<BuildingDetailsDialogProps> = ({
  open,
  onOpenChange,
  roofId
}) => {
  const [roofData, setRoofData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
            inspection_type
          )
        `)
        .eq('id', roofId)
        .single();

      if (error) throw error;
      setRoofData(data);
    } catch (error) {
      console.error('Error fetching roof data:', error);
    } finally {
      setLoading(false);
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
            <TabsTrigger value="contacts">Contacts & Access</TabsTrigger>
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

          <TabsContent value="contacts" className="space-y-4">
            {/* Property Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Property Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {roofData.property_manager_name && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{roofData.property_manager_name}</p>
                      <p className="text-sm text-muted-foreground">Property Manager</p>
                      <div className="flex gap-4 mt-2">
                        {roofData.property_manager_phone && (
                          <a 
                            href={`tel:${roofData.property_manager_phone}`}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {roofData.property_manager_phone}
                          </a>
                        )}
                        {roofData.property_manager_email && (
                          <a 
                            href={`mailto:${roofData.property_manager_email}`}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            {roofData.property_manager_email}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {roofData.asset_manager_name && (
                  <div className="flex items-start gap-3 pt-4 border-t">
                    <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{roofData.asset_manager_name}</p>
                      <p className="text-sm text-muted-foreground">Asset Manager</p>
                      <div className="flex gap-4 mt-2">
                        {roofData.asset_manager_phone && (
                          <a 
                            href={`tel:${roofData.asset_manager_phone}`}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {roofData.asset_manager_phone}
                          </a>
                        )}
                        {roofData.asset_manager_email && (
                          <a 
                            href={`mailto:${roofData.asset_manager_email}`}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            {roofData.asset_manager_email}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {roofData.onsite_contact && (
                  <div className="flex items-start gap-3 pt-4 border-t">
                    <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{roofData.onsite_contact}</p>
                      <p className="text-sm text-muted-foreground">On-Site Contact</p>
                      {roofData.onsite_contact_phone && (
                        <a 
                          href={`tel:${roofData.onsite_contact_phone}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                        >
                          <Phone className="h-3 w-3" />
                          {roofData.onsite_contact_phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Access Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Access Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Access Type</p>
                  <Badge variant="outline" className="capitalize">
                    <Shield className="h-3 w-3 mr-1" />
                    {roofData.roof_access || 'Not specified'}
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
    </Dialog>
  );
};