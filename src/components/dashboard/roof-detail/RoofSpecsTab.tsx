import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers, Calendar, Shield, Ruler, Wrench, Factory } from "lucide-react";

interface RoofSpecsTabProps {
  roof: any;
  isEditing?: boolean;
}

export function RoofSpecsTab({ roof, isEditing = false }: RoofSpecsTabProps) {
  const currentYear = new Date().getFullYear();
  const installYear = roof.install_year || currentYear;
  const roofAge = currentYear - installYear;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Roof System Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Roof System Specifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Roof Type</label>
              <p className="font-medium">{roof.roof_type || 'Not Specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Roof System</label>
              <p className="font-medium">{roof.roof_system || 'Not Specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Roof Category</label>
              <p className="font-medium">{roof.roof_category || 'Not Specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Roof Section</label>
              <p className="font-medium">{roof.roof_section || 'Not Specified'}</p>
            </div>
          </div>

          {roof.roof_system_description && (
            <div>
              <label className="text-sm font-medium text-gray-600">System Description</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-sm">{roof.roof_system_description}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Area & Measurements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Area & Measurements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {roof.roof_area?.toLocaleString() || 'N/A'}
            </div>
            <p className="text-sm text-gray-600">{roof.roof_area_unit || 'sq ft'}</p>
          </div>
          
          {roof.roof_area && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-sm text-gray-600">Acres</p>
                <p className="font-medium">{(roof.roof_area / 43560).toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Square Meters</p>
                <p className="font-medium">{(roof.roof_area * 0.092903).toLocaleString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Installation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Install Year</label>
              <p className="font-medium">{installYear}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Current Age</label>
              <p className="font-medium">{roofAge} years</p>
            </div>
          </div>

          {roof.install_date && (
            <div>
              <label className="text-sm font-medium text-gray-600">Install Date</label>
              <p className="font-medium">{new Date(roof.install_date).toLocaleDateString()}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-600">Installing Contractor</label>
            <p className="font-medium">{roof.installing_contractor || 'Not Specified'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Repair Contractor</label>
            <p className="font-medium">{roof.repair_contractor || 'Not Specified'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Manufacturer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Manufacturer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Manufacturer</label>
            <p className="font-medium">{roof.manufacturer || 'Not Specified'}</p>
          </div>

          {/* Manufacturer Warranty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">Manufacturer Warranty</label>
              <Badge variant={roof.manufacturer_has_warranty ? "default" : "secondary"}>
                {roof.manufacturer_has_warranty ? "Active" : "No Warranty"}
              </Badge>
            </div>
            
            {roof.manufacturer_has_warranty && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-blue-200">
                <div>
                  <label className="text-xs text-gray-500">Warranty Number</label>
                  <p className="text-sm font-medium">{roof.manufacturer_warranty_number || 'Not Provided'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Warranty Term</label>
                  <p className="text-sm font-medium">{roof.manufacturer_warranty_term || 'Not Specified'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">Expiration Date</label>
                  <p className="text-sm font-medium">
                    {roof.manufacturer_warranty_expiration 
                      ? new Date(roof.manufacturer_warranty_expiration).toLocaleDateString()
                      : 'Not Specified'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Installer Warranty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">Installer Warranty</label>
              <Badge variant={roof.installer_has_warranty ? "default" : "secondary"}>
                {roof.installer_has_warranty ? "Active" : "No Warranty"}
              </Badge>
            </div>
            
            {roof.installer_has_warranty && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-green-200">
                <div>
                  <label className="text-xs text-gray-500">Warranty Number</label>
                  <p className="text-sm font-medium">{roof.installer_warranty_number || 'Not Provided'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Warranty Term</label>
                  <p className="text-sm font-medium">{roof.installer_warranty_term || 'Not Specified'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">Expiration Date</label>
                  <p className="text-sm font-medium">
                    {roof.installer_warranty_expiration 
                      ? new Date(roof.installer_warranty_expiration).toLocaleDateString()
                      : 'Not Specified'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {roof.total_leaks_12mo || 0}
              </div>
              <p className="text-sm text-gray-600">Leaks (12mo)</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${roof.total_leak_expense_12mo || '0'}
              </div>
              <p className="text-sm text-gray-600">Leak Expense</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {roof.last_inspection_date 
                  ? new Date(roof.last_inspection_date).toLocaleDateString()
                  : 'Never'
                }
              </div>
              <p className="text-sm text-gray-600">Last Inspection</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {roof.next_inspection_due 
                  ? new Date(roof.next_inspection_due).toLocaleDateString()
                  : 'Not Scheduled'
                }
              </div>
              <p className="text-sm text-gray-600">Next Due</p>
            </div>
          </div>

          {/* Inspection Status */}
          {roof.next_inspection_due && (
            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-gray-600 mb-2 block">Inspection Timeline</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Progress value={75} className="h-2" />
                </div>
                <span className="text-sm text-gray-600">Due Soon</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}