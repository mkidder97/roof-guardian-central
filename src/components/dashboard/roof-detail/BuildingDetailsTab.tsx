import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, User, Shield, AlertTriangle } from "lucide-react";

interface BuildingDetailsTabProps {
  roof: any;
  isEditing?: boolean;
}

export function BuildingDetailsTab({ roof, isEditing = false }: BuildingDetailsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Property Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Property Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Property Name</label>
              <p className="font-medium">{roof.property_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Property Code</label>
              <p className="font-medium">{roof.property_code || 'Not Assigned'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Region</label>
              <p className="font-medium">{roof.region || 'Not Assigned'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Market</label>
              <p className="font-medium">{roof.market || 'Not Assigned'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Roof Group</label>
              <p className="font-medium">{roof.roof_group || 'Ungrouped'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Customer</label>
              <p className="font-medium">{roof.customer || 'Not Specified'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Street Address</label>
            <p className="font-medium">{roof.address}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">City</label>
              <p className="font-medium">{roof.city}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">State</label>
              <p className="font-medium">{roof.state}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">ZIP Code</label>
              <p className="font-medium">{roof.zip}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Site Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {roof.site_contact ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-600">Contact Name</label>
                <p className="font-medium">{roof.site_contact}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Office Phone</label>
                  <p className="font-medium">{roof.site_contact_office_phone || 'Not Provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Mobile Phone</label>
                  <p className="font-medium">{roof.site_contact_mobile_phone || 'Not Provided'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="font-medium">{roof.site_contact_email || 'Not Provided'}</p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No site contact information available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roof Access & Safety */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Roof Access & Safety
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Roof Access Type</label>
            <p className="font-medium">{roof.roof_access || 'Not Specified'}</p>
          </div>
          
          {roof.roof_access_location && (
            <div>
              <label className="text-sm font-medium text-gray-600">Access Location</label>
              <p className="font-medium">{roof.roof_access_location}</p>
            </div>
          )}

          {roof.roof_access_requirements && (
            <div>
              <label className="text-sm font-medium text-gray-600">Access Requirements</label>
              <p className="font-medium">{roof.roof_access_requirements}</p>
            </div>
          )}

          {roof.roof_access_safety_concern && (
            <div>
              <label className="text-sm font-medium text-gray-600">Safety Concerns</label>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <p className="font-medium text-amber-700">{roof.roof_access_safety_concern}</p>
              </div>
            </div>
          )}

          {roof.customer_sensitivity && (
            <div>
              <label className="text-sm font-medium text-gray-600">Customer Sensitivity</label>
              <Badge variant="outline" className="mt-1">
                {roof.customer_sensitivity}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Status */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Property Status & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Current Status</label>
              <Badge variant={roof.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                {roof.status || 'Active'}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Last Updated</label>
              <p className="font-medium">
                {roof.updated_at ? new Date(roof.updated_at).toLocaleDateString() : 'Not Available'}
              </p>
            </div>
          </div>

          {roof.notes && (
            <div>
              <label className="text-sm font-medium text-gray-600">Notes</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-sm whitespace-pre-wrap">{roof.notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}