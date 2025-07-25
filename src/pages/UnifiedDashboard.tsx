import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { SmartSearchTab } from "@/components/dashboard/SmartSearchTab";
import { DashboardWidgets } from "@/components/dashboard/DashboardWidgets";
import { CommandPalette, useCommandPalette } from "@/components/ui/command-palette";
import { NotificationCenter } from "@/components/ui/notification-center";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bell, 
  Settings, 
  User, 
  LogOut, 
  Menu,
  X,
  Moon,
  Sun,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Command,
  Search,
  Zap
} from "lucide-react";

// Import all existing tab components
import { PortfolioOverviewTab } from "@/components/dashboard/PortfolioOverviewTab";
import { RoofsTab } from "@/components/dashboard/RoofsTab";
import { InspectionsTab } from "@/components/dashboard/InspectionsTab";
import { CampaignTracker } from "@/components/dashboard/CampaignTracker";
import { WorkOrdersTab } from "@/components/dashboard/WorkOrdersTab";
import { HistoricalInspectionUploader } from "@/components/admin/HistoricalInspectionUploader";
import { AccountsTab } from "@/components/dashboard/AccountsTab";

interface DashboardStats {
  totalProperties: number;
  activeInspections: number;
  pendingWorkOrders: number;
  campaignProgress: number;
  criticalIssues: number;
  budgetUtilization: number;
}

export function UnifiedDashboard() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProperties: 0,
    activeInspections: 0,
    pendingWorkOrders: 0,
    campaignProgress: 0,
    criticalIssues: 0,
    budgetUtilization: 0
  });

  // Command palette
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  // Load dashboard statistics
  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        // Load properties count
        const { count: propertiesCount } = await supabase
          .from('roofs')
          .select('*', { count: 'exact', head: true })
          .eq('is_deleted', false);

        // Load active inspections
        const { count: inspectionsCount } = await supabase
          .from('inspections')
          .select('*', { count: 'exact', head: true })
          .in('status', ['scheduled', 'in_progress']);

        // Load pending work orders
        const { count: workOrdersCount } = await supabase
          .from('work_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Load campaign progress
        const { data: campaigns } = await supabase
          .from('inspection_campaigns')
          .select('progress_percentage');
        
        const avgProgress = campaigns?.length > 0 
          ? campaigns.reduce((sum, c) => sum + (c.progress_percentage || 0), 0) / campaigns.length
          : 0;

        setDashboardStats({
          totalProperties: propertiesCount || 0,
          activeInspections: inspectionsCount || 0,
          pendingWorkOrders: workOrdersCount || 0,
          campaignProgress: Math.round(avgProgress),
          criticalIssues: 0, // This would need more complex logic
          budgetUtilization: 0 // This would need budget calculations
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      }
    };

    loadDashboardStats();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigateToInspectorTools = () => {
    navigate('/inspector');
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'inspector-tools') {
      navigateToInspectorTools();
      return;
    }
    setActiveTab(tab);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <EnhancedOverviewTab stats={dashboardStats} />;
      case 'properties':
        return <RoofsTab />;
      case 'inspections':
        return <InspectionsTab />;
      case 'campaigns':
        return <CampaignTracker />;
      case 'work-orders':
        return <WorkOrdersTab />;
      case 'search':
        return <SmartSearchTab />;
      case 'historical-upload':
        return <HistoricalInspectionUploader />;
      case 'accounts':
        return <AccountsTab />;
      default:
        return <EnhancedOverviewTab stats={dashboardStats} />;
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <UnifiedSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        userRole={userRole}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">
                {getTabTitle(activeTab)}
              </h1>
              {activeTab === 'search' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI-Powered
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-4 mr-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-muted-foreground">{dashboardStats.totalProperties} Properties</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3 w-3 text-blue-500" />
                  <span className="text-muted-foreground">{dashboardStats.activeInspections} Active</span>
                </div>
                {dashboardStats.criticalIssues > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-red-600">{dashboardStats.criticalIssues} Critical</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <NotificationCenter />
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                <div className="text-sm">
                  <div className="font-medium">{user?.email}</div>
                  <div className="text-xs text-muted-foreground capitalize">{userRole}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Quick Action Bar */}
          <div className="border-b px-6 py-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCommandPaletteOpen(true)}
                  className="text-xs"
                >
                  <Command className="h-3 w-3 mr-1" />
                  Press ⌘K for quick actions
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                  <span>AI-Powered Dashboard</span>
                </div>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-green-500" />
                  <span>Real-time Updates</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <main className="flex-1 overflow-auto p-6">
          {renderTabContent()}
        </main>
      </div>
      
      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={handleTabChange}
        onCreateInspection={() => {
          // Handle create inspection
          console.log('Create inspection');
        }}
        onCreateWorkOrder={() => {
          // Handle create work order
          console.log('Create work order');
        }}
        onCreateCampaign={() => {
          // Handle create campaign
          console.log('Create campaign');
        }}
      />
    </div>
  );
}

// Enhanced Overview Tab with modern design
function EnhancedOverviewTab({ stats }: { stats: DashboardStats }) {
  const { setOpen: setCommandPaletteOpen } = useCommandPalette();
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back!</h2>
          <p className="text-muted-foreground">
            Here's what's happening with your portfolio today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCommandPaletteOpen(true)}>
            <Command className="h-4 w-4 mr-2" />
            Quick Actions
          </Button>
          <Button size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
          <Button variant="outline" size="sm">
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">
              Active portfolio size
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Inspections</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeInspections}</div>
            <p className="text-xs text-muted-foreground">
              In progress or scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Work Orders</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingWorkOrders}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting assignment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaign Progress</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.campaignProgress}%</div>
            <p className="text-xs text-muted-foreground">
              Average completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Fallback to original overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <div className="flex-1">
                  <p className="text-sm">New inspection completed at Dallas Corporate Center</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <p className="text-sm">Campaign "Q1 Inspections" is 85% complete</p>
                  <p className="text-xs text-muted-foreground">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                <div className="flex-1">
                  <p className="text-sm">Work order assigned to ABC Roofing</p>
                  <p className="text-xs text-muted-foreground">6 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
            <CardDescription>Intelligent recommendations for your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Inspection Opportunity</p>
                  <p className="text-xs text-muted-foreground">15 properties haven't been inspected in 12+ months</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Cost Optimization</p>
                  <p className="text-xs text-muted-foreground">Bundling inspections could save $2,400 this quarter</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Warranty Alert</p>
                  <p className="text-xs text-muted-foreground">3 warranties expire within 60 days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Dashboard Widgets */}
      <DashboardWidgets layout="grid" editable={false} />
      
      {/* Include original overview content for backward compatibility */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Detailed Portfolio View</h3>
        <PortfolioOverviewTab />
      </div>
    </div>
  );
}

// Helper function to get tab titles
function getTabTitle(tab: string): string {
  const titles: Record<string, string> = {
    overview: 'Portfolio Overview',
    properties: 'Properties',
    inspections: 'Inspections',
    campaigns: 'Campaigns',
    'work-orders': 'Work Orders',
    search: 'Smart Search',
    'historical-upload': 'Historical Upload',
    accounts: 'User Accounts'
  };
  return titles[tab] || 'Dashboard';
}