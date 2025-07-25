import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleSidebar } from "@/components/layout/SimpleSidebar";
import { useAuth } from "@/contexts/AuthContext";

// Import all the dashboard tab components
import { PortfolioOverviewTab } from "@/components/dashboard/PortfolioOverviewTab";
import { RoofsTab } from "@/components/dashboard/RoofsTab";
import { InspectionsTab } from "@/components/dashboard/InspectionsTab";
import { CampaignTracker } from "@/components/dashboard/CampaignTracker";
import { WorkOrdersTab } from "@/components/dashboard/WorkOrdersTab";
import { AccountsTab } from "@/components/dashboard/AccountsTab";

export function UnifiedDashboard() {
  const { user, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Portfolio overview content (temporarily simplified)</p>
              </CardContent>
            </Card>
          </div>
        );
      case 'roofs':
        return (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Properties content (temporarily simplified)</p>
              </CardContent>
            </Card>
          </div>
        );
      case 'inspections':
        return <InspectionsTab />;
      case 'campaigns':
        return <CampaignTracker />;
      case 'workorders':
        return <WorkOrdersTab />;
      case 'accounts':
        return <AccountsTab />;
      default:
        return (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Welcome to RoofMind</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <SimpleSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        userRole={userRole || 'inspector'} 
      />
      <div className="flex-1 overflow-auto">
        {renderActiveTab()}
      </div>
    </div>
  );
}