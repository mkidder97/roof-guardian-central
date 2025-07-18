import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SummaryTab } from "@/components/dashboard/SummaryTab";
import { RoofsTab } from "@/components/dashboard/RoofsTab";
import { InspectionsTab } from "@/components/dashboard/InspectionsTab";
import { WorkOrdersTab } from "@/components/dashboard/WorkOrdersTab";
import { ClientsTab } from "@/components/dashboard/ClientsTab";
import { ContractorsTab } from "@/components/dashboard/VendorsTab";
import { AnalysisTab } from "@/components/dashboard/AnalysisTab";
import { RegionalTab } from "@/components/dashboard/RegionalTab";
import { InspectionSchedulingModal } from "@/components/inspections/InspectionSchedulingModal";
import { CampaignTracker } from "@/components/dashboard/CampaignTracker";
import { CampaignDetailModal } from "@/components/dashboard/CampaignDetailModal";

export function NewDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "summary");
  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  const [campaignDetailModalOpen, setCampaignDetailModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const campaignId = searchParams.get('campaign');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (campaignId) {
      setSelectedCampaignId(campaignId);
      setCampaignDetailModalOpen(true);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams(params => {
      params.set('tab', value);
      return params;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="roofs">Properties</TabsTrigger>
            <TabsTrigger value="inspections">Inspections</TabsTrigger>
            <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
          <Button onClick={() => setSchedulingModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Inspections
          </Button>
        </div>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SummaryTab />
            </div>
            <div>
              <CampaignTracker maxCampaigns={5} showCompleted={false} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roofs" className="space-y-6">
          <RoofsTab />
        </TabsContent>

        <TabsContent value="inspections" className="space-y-6">
          <InspectionsTab />
        </TabsContent>

        <TabsContent value="work-orders" className="space-y-6">
          <WorkOrdersTab />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignTracker refreshInterval={15000} showCompleted={true} />
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <ClientsTab />
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          <ContractorsTab />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <AnalysisTab />
        </TabsContent>
      </Tabs>

      <InspectionSchedulingModal 
        open={schedulingModalOpen} 
        onOpenChange={setSchedulingModalOpen}
      />
      
      <CampaignDetailModal
        campaignId={selectedCampaignId}
        open={campaignDetailModalOpen}
        onOpenChange={(open) => {
          setCampaignDetailModalOpen(open);
          if (!open) {
            setSelectedCampaignId(null);
            setSearchParams(params => {
              params.delete('campaign');
              return params;
            });
          }
        }}
      />
    </div>
  );
}