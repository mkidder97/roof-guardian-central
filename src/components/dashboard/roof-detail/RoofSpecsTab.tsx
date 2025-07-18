import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Edit, AlertTriangle, RotateCcw } from "lucide-react";

interface RoofSpecsTabProps {
  roof: any;
  isEditing?: boolean;
}

export function RoofSpecsTab({ roof, isEditing = false }: RoofSpecsTabProps) {
  const calculateRemainingLife = () => {
    if (!roof.install_year) return "Unknown";
    const currentYear = new Date().getFullYear();
    const age = currentYear - roof.install_year;
    const typicalLife = 20; // Assume 20 year typical life
    const remainingLife = Math.max(0, typicalLife - age);
    return `${remainingLife} years`;
  };

  const getReplacementYear = () => {
    if (!roof.install_year) return "Unknown";
    return roof.install_year + 20; // Assume 20 year typical life
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      {/* Roof Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Roof Summary</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Roof Section Name</label>
            <p className="font-medium">{roof.property_name}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Roof Area</label>
            <p className="font-medium">{roof.roof_area?.toLocaleString()} sq. ft.</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Year Installed</label>
            <p className="font-medium">{roof.install_year || '2017'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Replacement Year</label>
            <p className="font-medium">{getReplacementYear()}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Remaining Life</label>
            <p className="font-medium">{calculateRemainingLife()}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Manufacturer</label>
            <p className="font-medium text-primary">{roof.manufacturer || 'Carlisle SynTec Systems'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Installing Contractor</label>
            <div className="flex items-center">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                R
              </div>
              <span className="font-medium">{roof.installing_contractor || 'R&B Roofing'}</span>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Repairing Contractor</label>
            <p className="font-medium text-primary">{roof.repair_contractor || 'Empire Roofing - Dallas/Fort Worth, TX Office'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Rating</label>
            <p className="font-medium">{roof.roof_rating || '3'}</p>
          </div>
          
          <Button variant="outline" className="w-full mt-4">
            <Edit className="h-4 w-4 mr-2" />
            Edit Roof Map
          </Button>
        </CardContent>
      </Card>

      {/* Warranty Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Warranty Details</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Manufacturer Warranty</label>
            <p className="font-medium text-green-600">{roof.manufacturer_has_warranty ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Issued By</label>
            <p className="font-medium text-primary">{roof.manufacturer || 'Carlisle SynTec Systems'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Term</label>
            <p className="font-medium">{roof.manufacturer_warranty_term || '15 years'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Guarantee Number</label>
            <p className="font-medium">{roof.manufacturer_warranty_number || '10153211 REV.01'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Expiration Date</label>
            <p className="font-medium">
              {roof.manufacturer_warranty_expiration 
                ? new Date(roof.manufacturer_warranty_expiration).toLocaleDateString()
                : '9/6/2032'
              }
            </p>
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <label className="text-sm text-muted-foreground">Installing Contractor Warranty</label>
            <p className="font-medium text-red-600">{roof.installer_has_warranty ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Term</label>
            <p className="font-medium">{roof.installer_warranty_term || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Expiration Date</label>
            <p className="font-medium">
              {roof.installer_warranty_expiration 
                ? new Date(roof.installer_warranty_expiration).toLocaleDateString()
                : '---'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Roof Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Roof Details</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Roof System</label>
            <p className="font-medium">{roof.roof_system || 'TPO (45mil)'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">System Description</label>
            <p className="font-medium">{roof.roof_system_description || '45mil TPO MA'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Estimated LTTR Value</label>
            <p className="font-medium">{roof.estimated_lttr_value || '6.8'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Perimeter Detail</label>
            <p className="font-medium">{roof.perimeter_detail || 'Three sided parapet wall w/ edge metal'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Flashing Detail</label>
            <p className="font-medium">{roof.flashing_detail || 'TPO membrane terminated with metal term bar'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Drainage System</label>
            <p className="font-medium">{roof.drainage_system || 'Deck drains w/ Overflow drains and external gutter'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Roof Access */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Roof Access</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Occupant Concern</label>
            <p className="font-medium">{roof.occupant_concern || 'Low'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Roof Access</label>
            <p className="font-medium">{roof.roof_access || 'Interior ladder/hatch in electrical room, left of pump room door: Lock box code is 9728.'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Access Requirement</label>
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
              <span className="font-medium">{roof.access_requirements || 'Notify Tenant'}</span>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Safety Concerns</label>
            <p className="font-medium">{roof.safety_concerns ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Access Location</label>
            <p className="font-medium">{roof.access_location || 'Middle of west elevation'}</p>
          </div>
          
          {/* Aerial Map */}
          <div className="mt-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
              <img 
                src="/placeholder.svg" 
                alt="Property aerial view"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-background rounded-full p-1">
                <RotateCcw className="h-4 w-4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roof Assembly */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Roof Assembly</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Core Photo */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Core Photo</h4>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img 
                src="/placeholder.svg" 
                alt="Roof core sample"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Assembly Table */}
          <div className="border rounded-lg">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Layer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Attachment</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Thickness</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-4 py-3">Membrane</td>
                  <td className="px-4 py-3">TPO</td>
                  <td className="px-4 py-3">Mechanically Attached</td>
                  <td className="px-4 py-3">45mil</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sustainability */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Sustainability</CardTitle>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <span className="font-medium">Has Solar?</span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {roof.has_solar ? 'YES' : 'NO'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <span className="font-medium">Has Daylighting?</span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {roof.has_daylighting ? 'YES' : 'NO'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}