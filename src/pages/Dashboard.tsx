import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import { PortfolioOverviewTab } from "@/components/dashboard/PortfolioOverviewTab";
import { RoofsTab } from "@/components/dashboard/RoofsTab";
import { InspectionsTab } from "@/components/dashboard/InspectionsTab";
import { WorkOrdersTab } from "@/components/dashboard/WorkOrdersTab";
import { ClientsTab } from "@/components/dashboard/ClientsTab";
import { ContractorsTab } from "@/components/dashboard/VendorsTab";
import { AccountsTab } from "@/components/dashboard/AccountsTab";
import { WarrantiesTab } from "@/components/dashboard/WarrantiesTab";
import { BudgetsTab } from "@/components/dashboard/BudgetsTab";
import { MaintenanceTab } from "@/components/dashboard/MaintenanceTab";
import { PropertyManagersTab } from "@/components/dashboard/PropertyManagersTab";
import { CampaignTracker } from "@/components/dashboard/CampaignTracker";
import { HistoricalInspectionUploader } from "@/components/admin/HistoricalInspectionUploader";
import { useNavigate } from "react-router-dom";
import { Brain, Upload } from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("portfolio");
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">RoofMind</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {user?.email} ({userRole || 'loading...'})
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full h-12 bg-gray-100 rounded-none border-b flex overflow-x-auto">
                <TabsTrigger value="portfolio" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Portfolio Overview
                </TabsTrigger>
                <TabsTrigger value="roofs" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Roofs
                </TabsTrigger>
                <TabsTrigger value="warranties" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Warranties
                </TabsTrigger>
                <TabsTrigger value="budgets" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Budgets
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Maintenance
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Campaigns
                </TabsTrigger>
                <TabsTrigger value="inspections" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Inspections
                </TabsTrigger>
                <TabsTrigger value="work-orders" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Work Orders
                </TabsTrigger>
                <TabsTrigger value="clients" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Clients
                </TabsTrigger>
                <TabsTrigger value="contractors" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Contractors
                </TabsTrigger>
                <TabsTrigger value="property-managers" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                  Property Managers
                </TabsTrigger>
                {(userRole === 'super_admin' || userRole === 'manager') && (
                  <TabsTrigger value="accounts" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                    Accounts
                  </TabsTrigger>
                )}
                {(userRole === 'inspector' || userRole === 'super_admin') && (
                  <TabsTrigger value="inspector-tools" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                    Inspector Tools
                  </TabsTrigger>
                )}
                {userRole === 'super_admin' && (
                  <TabsTrigger value="historical-upload" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                    Historical Upload
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="portfolio" className="mt-0">
                <PortfolioOverviewTab />
              </TabsContent>
              <TabsContent value="roofs" className="mt-0">
                <RoofsTab />
              </TabsContent>
              
              <TabsContent value="warranties" className="mt-0">
                <WarrantiesTab />
              </TabsContent>
              
              <TabsContent value="budgets" className="mt-0">
                <BudgetsTab />
              </TabsContent>
              
              <TabsContent value="maintenance" className="mt-0">
                <MaintenanceTab />
              </TabsContent>
              
              <TabsContent value="campaigns" className="mt-0">
                <CampaignTracker />
              </TabsContent>
              
              <TabsContent value="inspections" className="mt-0">
                <InspectionsTab />
              </TabsContent>
              
              <TabsContent value="work-orders" className="mt-0">
                <WorkOrdersTab />
              </TabsContent>
              
              <TabsContent value="clients" className="mt-0">
                <ClientsTab />
              </TabsContent>
              
              <TabsContent value="contractors" className="mt-0">
                <ContractorsTab />
              </TabsContent>
              
              <TabsContent value="property-managers" className="mt-0">
                <PropertyManagersTab />
              </TabsContent>
              
              {(userRole === 'super_admin' || userRole === 'manager') && (
                <TabsContent value="accounts" className="mt-0">
                  <AccountsTab />
                </TabsContent>
              )}
              
              {(userRole === 'inspector' || userRole === 'super_admin') && (
                <TabsContent value="inspector-tools" className="mt-0">
                  <div className="p-6">
                    <div className="max-w-4xl mx-auto">
                      <div className="text-center mb-8">
                        <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Inspector Intelligence</h2>
                        <p className="text-gray-600">AI-powered tools to optimize your inspections</p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg border border-blue-200">
                          <h3 className="text-xl font-semibold text-gray-900 mb-3">Pre-Inspection Intelligence</h3>
                          <p className="text-gray-600 mb-4">Get AI-powered briefings with critical focus areas, recurring issues, and cost estimates before you arrive on-site.</p>
                          <Button 
                            onClick={() => navigate('/inspector')}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            Launch Inspector Interface
                          </Button>
                        </div>
                        
                        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-lg border border-green-200">
                          <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Features</h3>
                          <ul className="text-gray-600 space-y-2 mb-4">
                            <li>• Voice-to-notes recording</li>
                            <li>• Pattern recognition analysis</li>
                            <li>• Historical photo references</li>
                            <li>• Cross-portfolio intelligence</li>
                          </ul>
                          <div className="text-sm text-green-700 font-medium">
                            Save 45+ minutes per inspection
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}
              
              {userRole === 'super_admin' && (
                <TabsContent value="historical-upload" className="mt-0">
                  <div className="p-6">
                    <HistoricalInspectionUploader />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}