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
  Building2, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Shield, 
  MessageCircle,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';

interface PropertyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    id: string;
    property_name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    roof_area?: number;
    roof_system?: string;
    last_inspection_date?: string;
    warranty_expiration?: string;
    capital_budget?: number;
    preventative_budget?: number;
    property_manager_name?: string;
    property_manager_email?: string;
    property_manager_phone?: string;
    client_id?: string;
    created_at?: string;
  } | null;
}

export function PropertyDetailsDialog({ 
  open, 
  onOpenChange, 
  property 
}: PropertyDetailsDialogProps) {
  if (!property) return null;

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatArea = (area: number | null | undefined) => {
    if (!area) return 'Not specified';
    return `${area.toLocaleString()} sq ft`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {property.property_name}
          </DialogTitle>
          <DialogDescription>
            Property Details and Communication
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="roof">Roof Details</TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="h-3 w-3" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="financial">Budget</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px] mt-4">
            <TabsContent value="overview" className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Property Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">Name:</span>
                      <p className="text-sm text-muted-foreground">{property.property_name}</p>
                    </div>
                    
                    {property.address && (
                      <div>
                        <span className="text-sm font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Address:
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {property.address}
                          {property.city && property.state && (
                            <span><br />{property.city}, {property.state} {property.zip}</span>
                          )}
                        </p>
                      </div>
                    )}

                    {property.created_at && (
                      <div>
                        <span className="text-sm font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Added:
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(property.created_at), 'PPP')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contact Information */}
                {(property.property_manager_name || property.property_manager_email || property.property_manager_phone) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Property Manager
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {property.property_manager_name && (
                        <div>
                          <span className="text-sm font-medium">Name:</span>
                          <p className="text-sm text-muted-foreground">{property.property_manager_name}</p>
                        </div>
                      )}
                      
                      {property.property_manager_email && (
                        <div>
                          <span className="text-sm font-medium flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Email:
                          </span>
                          <p className="text-sm text-muted-foreground">{property.property_manager_email}</p>
                        </div>
                      )}
                      
                      {property.property_manager_phone && (
                        <div>
                          <span className="text-sm font-medium flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Phone:
                          </span>
                          <p className="text-sm text-muted-foreground">{property.property_manager_phone}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Roof Area</p>
                        <p className="text-xs text-muted-foreground">{formatArea(property.roof_area)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Last Inspection</p>
                        <p className="text-xs text-muted-foreground">
                          {property.last_inspection_date 
                            ? format(new Date(property.last_inspection_date), 'MMM dd, yyyy')
                            : 'Never'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">Warranty Status</p>
                        <p className="text-xs text-muted-foreground">
                          {property.warranty_expiration 
                            ? `Expires ${format(new Date(property.warranty_expiration), 'MMM yyyy')}`
                            : 'No warranty'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="roof" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Roof Specifications</CardTitle>
                  <CardDescription>
                    Technical details about the roof system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">System Type:</span>
                      <p className="text-sm text-muted-foreground">{property.roof_system || 'Not specified'}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium">Total Area:</span>
                      <p className="text-sm text-muted-foreground">{formatArea(property.roof_area)}</p>
                    </div>
                  </div>

                  {property.last_inspection_date && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Last Inspection</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Inspected on {format(new Date(property.last_inspection_date), 'PPP')}
                      </p>
                    </div>
                  )}

                  {property.warranty_expiration && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Warranty Information</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Warranty expires on {format(new Date(property.warranty_expiration), 'PPP')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments">
              <CommentSystem 
                entityType="property" 
                entityId={property.id}
              />
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Budget Overview
                  </CardTitle>
                  <CardDescription>
                    Financial planning and budget allocation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Capital Budget</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(property.capital_budget)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Major improvements and replacements
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Preventative Budget</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(property.preventative_budget)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Maintenance and preventative care
                      </p>
                    </div>
                  </div>

                  {(property.capital_budget || property.preventative_budget) && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total Budget:</span>
                        <span className="text-lg font-bold">
                          {formatCurrency((property.capital_budget || 0) + (property.preventative_budget || 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}