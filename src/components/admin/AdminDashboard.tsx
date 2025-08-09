import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Users, 
  AlertTriangle, 
  Building2, 
  ClipboardCheck,
  TrendingUp,
  Clock,
  MapPin,
  Settings,
  Plus,
  Filter,
  Search,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { InspectionSchedulingModal } from '@/components/inspections/InspectionSchedulingModal';
import { CriticalIssueAlertCenter } from './CriticalIssueAlertCenter';
import { ActiveInspectionMonitor } from './ActiveInspectionMonitor';
import { PerformanceAnalytics } from './PerformanceAnalytics';
import { QuickActions } from './QuickActions';

interface AdminDashboardProps {
  className?: string;
}

export function AdminDashboard({ className = '' }: AdminDashboardProps) {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('overview');
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  
  // Dashboard metrics state
  const [dashboardMetrics, setDashboardMetrics] = useState({
    activeInspections: 0,
    scheduledToday: 0,
    criticalIssues: 0,
    completedThisWeek: 0,
    availableInspectors: 0,
    overdueTasks: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Load dashboard data
    loadDashboardMetrics();
    loadRecentActivity();
    loadCriticalAlerts();
  }, []);

  const loadDashboardMetrics = async () => {
    // TODO: Implement real API calls
    setDashboardMetrics({
      activeInspections: 12,
      scheduledToday: 8,
      criticalIssues: 3,
      completedThisWeek: 45,
      availableInspectors: 6,
      overdueTasks: 2
    });
  };

  const loadRecentActivity = async () => {
    // TODO: Implement real API calls
    setRecentActivity([
      {
        id: '1',
        type: 'inspection_completed',
        inspector: 'John Smith',
        property: 'Oakwood Plaza',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: 'completed'
      },
      {
        id: '2',
        type: 'critical_issue',
        inspector: 'Sarah Johnson',
        property: 'Metro Center',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        status: 'critical'
      }
    ]);
  };

  const loadCriticalAlerts = async () => {
    // TODO: Implement real API calls
    setCriticalAlerts([
      {
        id: '1',
        property: 'Downtown Complex',
        issue: 'Structural damage detected',
        severity: 'high',
        inspector: 'Mike Wilson',
        timestamp: new Date(Date.now() - 1000 * 60 * 15)
      }
    ]);
  };

  const MetricCard = ({ title, value, icon: Icon, variant = 'default', subtitle }: any) => (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <div className="text-2xl font-bold">
              {variant === 'critical' && value > 0 ? (
                <span className="text-red-600">{value}</span>
              ) : (
                <span>{value}</span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${
            variant === 'critical' ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            <Icon className={`h-6 w-6 ${
              variant === 'critical' ? 'text-red-600' : 'text-blue-600'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage inspections, monitor progress, and track critical issues</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="hidden md:flex"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button
              onClick={() => setShowSchedulingModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Inspection
            </Button>
          </div>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                🚨 {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''} Require Immediate Attention
              </p>
              <p className="text-xs text-red-700">
                Latest: {criticalAlerts[0].property} - {criticalAlerts[0].issue}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-100"
              onClick={() => setCurrentTab('alerts')}
            >
              View All
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <TabsTrigger value="overview">
              <TrendingUp className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="scheduling">
              <Calendar className="h-4 w-4 mr-2" />
              Scheduling
            </TabsTrigger>
            <TabsTrigger value="inspectors">
              <Users className="h-4 w-4 mr-2" />
              Inspectors
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Alerts
              {criticalAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {criticalAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="properties">
              <Building2 className="h-4 w-4 mr-2" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <MetricCard
                title="Active Inspections"
                value={dashboardMetrics.activeInspections}
                icon={ClipboardCheck}
                subtitle="In progress now"
              />
              <MetricCard
                title="Scheduled Today"
                value={dashboardMetrics.scheduledToday}
                icon={Calendar}
                subtitle={`${dashboardMetrics.availableInspectors} inspectors available`}
              />
              <MetricCard
                title="Critical Issues"
                value={dashboardMetrics.criticalIssues}
                icon={AlertTriangle}
                variant="critical"
                subtitle="Require immediate action"
              />
              <MetricCard
                title="Completed This Week"
                value={dashboardMetrics.completedThisWeek}
                icon={CheckCircle}
                subtitle="Inspections finished"
              />
              <MetricCard
                title="Available Inspectors"
                value={dashboardMetrics.availableInspectors}
                icon={Users}
                subtitle="Ready for assignments"
              />
              <MetricCard
                title="Overdue Tasks"
                value={dashboardMetrics.overdueTasks}
                icon={Clock}
                variant={dashboardMetrics.overdueTasks > 0 ? 'critical' : 'default'}
                subtitle="Need attention"
              />
            </div>

            {/* Quick Actions & Active Monitors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuickActions onScheduleInspection={() => setShowSchedulingModal(true)} />
              <ActiveInspectionMonitor />
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'critical' ? 'bg-red-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {activity.inspector} - {activity.property}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.type === 'inspection_completed' ? 'Completed inspection' : 'Reported critical issue'}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No recent activity
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scheduling Tab */}
          <TabsContent value="scheduling" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Inspection Scheduling</h2>
                <p className="text-muted-foreground">Manage inspection schedules and assignments</p>
              </div>
              <Button onClick={() => setShowSchedulingModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Inspection
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar View Placeholder */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Calendar View</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-muted-foreground">Calendar integration coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Inspections */}
              <Card>
                <CardHeader>
                  <CardTitle>Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">9:00 AM - Oakwood Plaza</p>
                        <p className="text-xs text-muted-foreground">John Smith</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                      <Clock className="h-4 w-4 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">11:30 AM - Metro Center</p>
                        <p className="text-xs text-muted-foreground">Sarah Johnson</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Critical Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <CriticalIssueAlertCenter 
              alerts={criticalAlerts}
              onAlertUpdate={loadCriticalAlerts}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <PerformanceAnalytics />
          </TabsContent>

          {/* Other tabs would be implemented similarly */}
          <TabsContent value="inspectors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inspector Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Inspector management interface coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Property Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Property management interface coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Scheduling Modal */}
      <InspectionSchedulingModal
        open={showSchedulingModal}
        onOpenChange={(open) => {
          setShowSchedulingModal(open);
          if (!open) {
            loadDashboardMetrics();
            loadRecentActivity();
          }
        }}
      />
    </div>
  );
}