import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import { SummaryTab } from "@/components/dashboard/SummaryTab";
import { RoofsTab } from "@/components/dashboard/RoofsTab";
import { InspectionsTab } from "@/components/dashboard/InspectionsTab";
import { WorkOrdersTab } from "@/components/dashboard/WorkOrdersTab";
import { ClientsTab } from "@/components/dashboard/ClientsTab";
import { VendorsTab } from "@/components/dashboard/VendorsTab";
import { AnalysisTab } from "@/components/dashboard/AnalysisTab";
import { AccountsTab } from "@/components/dashboard/AccountsTab";
import { Wrench, Building, ClipboardCheck, Briefcase, Users, Store, BarChart3, Settings } from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("summary");
  const { userRole } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Summary</span>
            </TabsTrigger>
            <TabsTrigger value="roofs" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">Roofs</span>
            </TabsTrigger>
            <TabsTrigger value="inspections" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Inspections</span>
            </TabsTrigger>
            <TabsTrigger value="work-orders" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Work Orders</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clients</span>
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Vendors</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analysis</span>
            </TabsTrigger>
            {(userRole === 'super_admin' || userRole === 'manager') && (
              <TabsTrigger value="accounts" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Accounts</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <SummaryTab />
          </TabsContent>
          
          <TabsContent value="roofs" className="space-y-4">
            <RoofsTab />
          </TabsContent>
          
          <TabsContent value="inspections" className="space-y-4">
            <InspectionsTab />
          </TabsContent>
          
          <TabsContent value="work-orders" className="space-y-4">
            <WorkOrdersTab />
          </TabsContent>
          
          <TabsContent value="clients" className="space-y-4">
            <ClientsTab />
          </TabsContent>
          
          <TabsContent value="vendors" className="space-y-4">
            <VendorsTab />
          </TabsContent>
          
          <TabsContent value="analysis" className="space-y-4">
            <AnalysisTab />
          </TabsContent>
          
          {(userRole === 'super_admin' || userRole === 'manager') && (
            <TabsContent value="accounts" className="space-y-4">
              <AccountsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}