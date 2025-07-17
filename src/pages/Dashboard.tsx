import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { SummaryTab } from "@/components/dashboard/SummaryTab";
import { RoofsTab } from "@/components/dashboard/RoofsTab";
import { InspectionsTab } from "@/components/dashboard/InspectionsTab";
import { WorkOrdersTab } from "@/components/dashboard/WorkOrdersTab";
import { ClientsTab } from "@/components/dashboard/ClientsTab";
import { VendorsTab } from "@/components/dashboard/VendorsTab";
import { AnalysisTab } from "@/components/dashboard/AnalysisTab";
import { AccountsTab } from "@/components/dashboard/AccountsTab";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Roof Controller</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome back</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-8 h-12 bg-gray-100 rounded-none border-b">
                <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Summary
                </TabsTrigger>
                <TabsTrigger value="roofs" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Roofs
                </TabsTrigger>
                <TabsTrigger value="analysis" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="clients" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Clients
                </TabsTrigger>
                <TabsTrigger value="vendors" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Vendors
                </TabsTrigger>
                <TabsTrigger value="accounts" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Accounts
                </TabsTrigger>
                <TabsTrigger value="inspections" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Inspections
                </TabsTrigger>
                <TabsTrigger value="work-orders" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Work Orders
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-0">
                <SummaryTab />
              </TabsContent>
              
              <TabsContent value="roofs" className="mt-0">
                <RoofsTab />
              </TabsContent>
              
              <TabsContent value="analysis" className="mt-0">
                <AnalysisTab />
              </TabsContent>
              
              <TabsContent value="clients" className="mt-0">
                <ClientsTab />
              </TabsContent>
              
              <TabsContent value="vendors" className="mt-0">
                <VendorsTab />
              </TabsContent>
              
              <TabsContent value="accounts" className="mt-0">
                <AccountsTab />
              </TabsContent>
              
              <TabsContent value="inspections" className="mt-0">
                <InspectionsTab />
              </TabsContent>
              
              <TabsContent value="work-orders" className="mt-0">
                <WorkOrdersTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}