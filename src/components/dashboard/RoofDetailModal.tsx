import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, X, MapPin, Building, FileText, History, Wrench, Eye } from "lucide-react";
import { RoofOverviewTab } from "./roof-detail/RoofOverviewTab";
import { BuildingDetailsTab } from "./roof-detail/BuildingDetailsTab";
import { RoofSpecsTab } from "./roof-detail/RoofSpecsTab";
import { WorkHistoryTab } from "./roof-detail/WorkHistoryTab";
import { InspectionHistoryTab } from "./roof-detail/InspectionHistoryTab";
import { FilesTab } from "./roof-detail/FilesTab";

interface RoofDetailModalProps {
  roof: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (updatedRoof: any) => void;
}

export function RoofDetailModal({ roof, open, onOpenChange, onSave }: RoofDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);

  if (!roof) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {roof.property_name}
              </DialogTitle>
              
              {/* Property Location */}
              <div className="flex items-center text-gray-600 mt-2">
                <MapPin className="h-4 w-4 mr-2" />
                <span className="text-sm">
                  {roof.address}, {roof.city}, {roof.state} {roof.zip}
                </span>
              </div>

              {/* Property Code & Client */}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                {roof.property_code && (
                  <span>Property Code: {roof.property_code}</span>
                )}
                {roof.client_id && (
                  <span>Client: {roof.clients?.company_name || 'N/A'}</span>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="px-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-6 bg-gray-100">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="building" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Building</span>
              </TabsTrigger>
              <TabsTrigger value="roof-specs" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Roof Specs</span>
              </TabsTrigger>
              <TabsTrigger value="work-history" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">Work History</span>
              </TabsTrigger>
              <TabsTrigger value="inspection-history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Inspections</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Files</span>
              </TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto max-h-[calc(95vh-200px)] pb-6">
              <TabsContent value="overview" className="mt-6">
                <RoofOverviewTab roof={roof} isEditing={isEditing} />
              </TabsContent>
              
              <TabsContent value="building" className="mt-6">
                <BuildingDetailsTab roof={roof} isEditing={isEditing} />
              </TabsContent>
              
              <TabsContent value="roof-specs" className="mt-6">
                <RoofSpecsTab roof={roof} isEditing={isEditing} />
              </TabsContent>
              
              <TabsContent value="work-history" className="mt-6">
                <WorkHistoryTab roof={roof} />
              </TabsContent>
              
              <TabsContent value="inspection-history" className="mt-6">
                <InspectionHistoryTab roof={roof} />
              </TabsContent>
              
              <TabsContent value="files" className="mt-6">
                <FilesTab roof={roof} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}