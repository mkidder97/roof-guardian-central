import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Edit, Upload, Calendar, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

interface RoofOverviewTabProps {
  roof: any;
  isEditing?: boolean;
}

export function RoofOverviewTab({ roof, isEditing = false }: RoofOverviewTabProps) {
  // Calculate roof age and replacement timeline
  const currentYear = new Date().getFullYear();
  const installYear = roof.install_year || 2017;
  const roofAge = currentYear - installYear;
  const averageLifespan = 20; // Default for TPO
  const replacementYear = installYear + averageLifespan;
  const ageProgress = (roofAge / averageLifespan) * 100;

  // Calculate budget per square foot
  const capitalBudget = roof.capital_budget_estimated || 0;
  const maintenanceBudget = roof.preventative_budget_estimated || 0;
  const roofArea = roof.roof_area || 1;
  const capitalPerSqFt = capitalBudget / roofArea;
  const maintenancePerSqFt = maintenanceBudget / roofArea;

  // Check warranty status
  const hasManufacturerWarranty = roof.manufacturer_has_warranty;
  const hasInstallerWarranty = roof.installer_has_warranty;
  const mfgWarrantyExpired = roof.manufacturer_warranty_expiration && 
    new Date(roof.manufacturer_warranty_expiration) < new Date();
  const installWarrantyExpired = roof.installer_warranty_expiration && 
    new Date(roof.installer_warranty_expiration) < new Date();

  const getWarrantyStatus = () => {
    if (!hasManufacturerWarranty && !hasInstallerWarranty) return { status: "No Warranty", color: "destructive" };
    if (mfgWarrantyExpired && installWarrantyExpired) return { status: "Expired", color: "destructive" };
    if (hasManufacturerWarranty && !mfgWarrantyExpired) return { status: "Active", color: "default" };
    if (hasInstallerWarranty && !installWarrantyExpired) return { status: "Active", color: "default" };
    return { status: "Partial", color: "secondary" };
  };

  const warrantyStatus = getWarrantyStatus();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Key Info */}
      <div className="space-y-6">
        {/* Property Summary */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              Property Summary
              <Badge variant={warrantyStatus.color as any} className="ml-2">
                {warrantyStatus.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Client:</span>
              <span className="font-medium">{roof.clients?.company_name || roof.customer || 'Not Assigned'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Roof Area:</span>
              <span className="font-medium">{roof.roof_area?.toLocaleString() || 'N/A'} sq. ft.</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Roof System:</span>
              <span className="font-medium">{roof.roof_type || roof.roof_system || 'Not Specified'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Install Year:</span>
              <span className="font-medium">{installYear}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Region:</span>
              <span className="font-medium">{roof.region || 'Not Assigned'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Market:</span>
              <span className="font-medium">{roof.market || 'Not Assigned'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Replacement Planning */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Replacement Planning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">{replacementYear}</div>
              <p className="text-sm text-gray-600 mb-4">Installed in {installYear}</p>
              
              {/* Age Timeline */}
              <div className="relative mb-4">
                <Progress value={Math.min(ageProgress, 100)} className="h-3" />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>{installYear}</span>
                  <span className="font-medium">{roofAge} years old</span>
                  <span>{replacementYear}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-sm">
                {ageProgress < 50 ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : ageProgress < 80 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-gray-600">
                  Average {roof.roof_type || 'TPO'} Roof Life {averageLifespan} Years
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Information */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Capital Expense
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">
              ${capitalBudget.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 mb-2">${capitalPerSqFt.toFixed(2)} / sq. ft.</p>
            <p className="text-xs text-gray-500">
              {roof.capital_budget_scope_of_work || 'Roof Replacement (Partial tear off)'}
            </p>
            {roof.capital_budget_year && (
              <p className="text-xs text-gray-400 mt-1">Budget Year: {roof.capital_budget_year}</p>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Budget */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Maintenance Budget
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              ${maintenanceBudget.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">${maintenancePerSqFt.toFixed(2)} / sq. ft.</p>
            {roof.preventative_budget_scope_of_work && (
              <p className="text-xs text-gray-500 mt-1">{roof.preventative_budget_scope_of_work}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Center Column - Photos */}
      <div className="space-y-6">
        {/* Building Photo */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              Building/Front Sign Photo
              <Button variant="outline" size="sm" disabled={!isEditing}>
                <Upload className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1487958449943-2429e8be8625?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=6000&q=80"
                alt="Building exterior"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="text-gray-400 text-center p-8"><Upload class="h-12 w-12 mx-auto mb-2" /><p>No building photo available</p><p class="text-xs">Click edit to upload</p></div>';
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Roof Photo */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              Roof Section Photo
              <Button variant="outline" size="sm" disabled={!isEditing}>
                <Upload className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1439337153520-7082a56a81f4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=4000&q=80"
                alt="Roof section"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="text-gray-400 text-center p-8"><Upload class="h-12 w-12 mx-auto mb-2" /><p>No roof photo available</p><p class="text-xs">Click edit to upload</p></div>';
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Work Orders & Map */}
      <div className="space-y-6">
        {/* Aerial View */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Aerial View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
              <img 
                src="https://images.unsplash.com/photo-1433086966358-54859d0ed716?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=4000&q=80"
                alt="Aerial view"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="text-gray-400 text-center p-8"><Upload class="h-12 w-12 mx-auto mb-2" /><p>No aerial photo available</p></div>';
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Work Order History */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Work Orders</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-2xl font-bold mb-1">Total Orders</div>
            <div className="text-4xl font-bold text-blue-600 mb-2">0</div>
            <p className="text-sm text-gray-600">No work orders on record</p>
          </CardContent>
        </Card>

        {/* Leak History */}
        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Leak History</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-2">From Past 12 Months</p>
            <div className="text-4xl font-bold text-gray-600 mb-2">
              {roof.total_leaks_12mo || 0}
            </div>
            {roof.total_leak_expense_12mo && (
              <p className="text-sm text-gray-500">
                ${roof.total_leak_expense_12mo} expense
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        {roof.site_contact && (
          <Card className="hover-scale transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Site Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{roof.site_contact}</p>
                {roof.site_contact_email && (
                  <p className="text-sm text-gray-600">{roof.site_contact_email}</p>
                )}
                {roof.site_contact_office_phone && (
                  <p className="text-sm text-gray-600">Office: {roof.site_contact_office_phone}</p>
                )}
                {roof.site_contact_mobile_phone && (
                  <p className="text-sm text-gray-600">Mobile: {roof.site_contact_mobile_phone}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}