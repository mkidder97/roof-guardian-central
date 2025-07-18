import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Plus } from "lucide-react";

interface BuildingDetailsTabProps {
  roof: any;
  isEditing?: boolean;
}

export function BuildingDetailsTab({ roof, isEditing = false }: BuildingDetailsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      {/* Building Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Building Address</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Address</label>
            <p className="font-medium">{roof.address}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">City</label>
            <p className="font-medium">{roof.city}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">State</label>
            <p className="font-medium">{roof.state}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">ZIP Code</label>
            <p className="font-medium">{roof.zip}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Latitude & Longitude</label>
            <p className="font-medium">{roof.latitude || '32.6373574'}, {roof.longitude || '-96.8080434'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Time Zone</label>
            <p className="font-medium">{roof.time_zone || 'UTC'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Roof ID */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Roof ID</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Roof Name</label>
            <p className="font-medium">{roof.property_name}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Construction Year</label>
            <p className="font-medium">{roof.install_year || '---'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Code</label>
            <p className="font-medium">{roof.property_code || 'dal06001'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Work Order NTE Amount</label>
            <p className="font-medium">$---</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Client</label>
            <div className="flex items-center">
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                P
              </div>
              <span className="font-medium text-primary">Prologis</span>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Managed By</label>
            <p className="font-medium">---</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Region</label>
            <p className="font-medium">{roof.region || 'Central'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Market</label>
            <p className="font-medium">{roof.market || 'Dallas'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Property Manager</label>
            <p className="font-medium text-primary">{roof.property_manager_name || 'Marci Sherburn'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Asset Manager</label>
            <p className="font-medium">{roof.asset_manager_name || '---'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Roof Group</label>
            <p className="font-medium">{roof.roof_group || 'LPT'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Property Manager */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Property Manager</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Name</label>
            <p className="font-medium text-primary">{roof.property_manager_name || 'Marci Sherburn'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Office Phone</label>
            <p className="font-medium">{roof.property_manager_phone || '---'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Mobile Phone</label>
            <p className="font-medium">{roof.property_manager_mobile || '---'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="font-medium text-primary">{roof.property_manager_email || 'msherbur@prologis.com'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Site Contact */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Site Contact</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Name</label>
            <p className="font-medium">{roof.site_contact || 'Marci Sherburn'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Office Phone</label>
            <p className="font-medium">{roof.site_contact_office_phone || '972-884-9213'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Mobile Phone</label>
            <p className="font-medium">{roof.site_contact_mobile_phone || '---'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="font-medium text-primary">{roof.site_contact_email || 'msherbur@prologis.com'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Asset Manager */}
      <Card className="lg:col-span-2 xl:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Asset Manager</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Name</label>
            <p className="font-medium">{roof.asset_manager_name || '---'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Office Phone</label>
            <p className="font-medium">{roof.asset_manager_phone || '---'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Mobile Phone</label>
            <p className="font-medium">---</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="font-medium">{roof.asset_manager_email || '---'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Contact */}
      <Card className="lg:col-span-2 xl:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Maintenance Contact</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Name</label>
            <p className="font-medium">{roof.maintenance_contact_name || 'Barry'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Office Phone</label>
            <p className="font-medium">---</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Mobile Phone</label>
            <p className="font-medium">{roof.maintenance_contact_phone || '214-783-3119'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="font-medium">---</p>
          </div>
        </CardContent>
      </Card>

      {/* Building Inspections */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Building Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Annual</p>
                <p className="text-sm text-muted-foreground">Maintenance Budget</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${roof.preventative_budget_estimated?.toLocaleString() || '950.00'}</p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Capital</p>
                <p className="text-sm text-muted-foreground">Budget</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${roof.capital_budget_estimated?.toLocaleString() || '950.00'}</p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Building Work Orders */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Building Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">There are no recorded Work Orders for this roof.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}