import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Calendar, AlertTriangle, CheckCircle, Loader2, Users, TrendingUp, Database, MapPin, DollarSign, RefreshCw, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, isBefore, subMonths, startOfMonth } from "date-fns";
import { assessDataQuality, PropertyValidationSchema } from '@/lib/validation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface EnhancedDashboardMetrics {
  // Original metrics
  totalRoofs: number;
  pendingInspections: number;
  criticalIssues: number;
  completedThisMonth: number;
  
  // New enhanced metrics
  totalClients: number;
  totalContacts: number;
  totalSqFt: number;
  averagePropertyAge: number;
  contactsPerClient: number;
  propertyManagerWorkload: number;
  dataQualityScore: number;
  
  // Budget metrics
  totalCapitalBudget: number;
  totalPreventativeBudget: number;
  budgetUtilization: number;
  
  // Regional data
  regionalBreakdown: Array<{ region: string; count: number; sqFt: number }>;
  
  // Performance indicators
  leakFrequency: number;
  warrantyUtilization: number;
}

interface RecentActivity {
  id: string;
  property_name: string;
  completed_date: string | null;
  scheduled_date: string | null;
  status: string;
}

interface UpcomingExpiration {
  id: string;
  property_name: string;
  manufacturer_warranty_expiration: string | null;
  installer_warranty_expiration: string | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function SummaryTab() {
  const [metrics, setMetrics] = useState<EnhancedDashboardMetrics>({
    totalRoofs: 0,
    pendingInspections: 0,
    criticalIssues: 0,
    completedThisMonth: 0,
    totalClients: 0,
    totalContacts: 0,
    totalSqFt: 0,
    averagePropertyAge: 0,
    contactsPerClient: 0,
    propertyManagerWorkload: 0,
    dataQualityScore: 0,
    totalCapitalBudget: 0,
    totalPreventativeBudget: 0,
    budgetUtilization: 0,
    regionalBreakdown: [],
    leakFrequency: 0,
    warrantyUtilization: 0,
  });
  const [recentInspections, setRecentInspections] = useState<RecentActivity[]>([]);
  const [upcomingExpirations, setUpcomingExpirations] = useState<UpcomingExpiration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnhancedDashboardData();
  }, []);

  const fetchEnhancedDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel for better performance
      const [
        roofsData,
        clientsData,
        contactsData,
        inspectionsData,
        pendingInspectionsData,
        completedInspectionsData,
        recentInspectionsData,
        expirationData
      ] = await Promise.all([
        supabase.from('roofs').select('*').eq('is_deleted', false),
        supabase.from('clients').select('*'),
        supabase.from('client_contacts').select('*').eq('is_active', true),
        supabase.from('inspections').select('*'),
        supabase.from('inspections').select('*', { count: 'exact', head: true }).in('status', ['scheduled', 'in-progress']),
        supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_date', startOfMonth(new Date()).toISOString().split('T')[0]),
        supabase.from('inspections').select(`id, status, completed_date, scheduled_date, roofs!inner(property_name)`).order('created_at', { ascending: false }).limit(4),
        supabase.from('roofs').select('id, property_name, manufacturer_warranty_expiration, installer_warranty_expiration').eq('is_deleted', false).order('manufacturer_warranty_expiration', { ascending: true }).limit(4)
      ]);

      const roofs = roofsData.data || [];
      const clients = clientsData.data || [];
      const contacts = contactsData.data || [];
      const inspections = inspectionsData.data || [];

      // Calculate enhanced metrics
      const totalRoofs = roofs.length;
      const totalClients = clients.length;
      const totalContacts = contacts.length;
      const totalSqFt = roofs.reduce((sum, roof) => sum + (roof.roof_area || 0), 0);

      // Calculate average property age
      const currentYear = new Date().getFullYear();
      const propertiesWithAge = roofs.filter(r => r.install_year);
      const averagePropertyAge = propertiesWithAge.length > 0
        ? Math.round(propertiesWithAge.reduce((sum, roof) => sum + (currentYear - (roof.install_year || currentYear)), 0) / propertiesWithAge.length)
        : 0;

      // Contact metrics
      const contactsPerClient = totalClients > 0 ? Math.round((totalContacts / totalClients) * 10) / 10 : 0;
      const propertyManagerWorkload = contacts.filter(c => c.role === 'property_manager').length > 0
        ? Math.round(totalRoofs / contacts.filter(c => c.role === 'property_manager').length)
        : 0;

      // Data quality assessment
      const dataQuality = assessDataQuality(roofs, PropertyValidationSchema);

      // Budget calculations
      const totalCapitalBudget = roofs.reduce((sum, roof) => sum + (roof.capital_budget_estimated || 0), 0);
      const totalPreventativeBudget = roofs.reduce((sum, roof) => sum + (roof.preventative_budget_estimated || 0), 0);
      const budgetUtilization = totalCapitalBudget > 0 ? Math.round(((totalCapitalBudget + totalPreventativeBudget) / totalCapitalBudget) * 100) : 0;

      // Regional breakdown
      const regionalMap = new Map<string, { count: number; sqFt: number }>();
      roofs.forEach(roof => {
        const region = roof.region || 'Unknown';
        const current = regionalMap.get(region) || { count: 0, sqFt: 0 };
        regionalMap.set(region, {
          count: current.count + 1,
          sqFt: current.sqFt + (roof.roof_area || 0)
        });
      });
      const regionalBreakdown = Array.from(regionalMap.entries()).map(([region, data]) => ({
        region,
        ...data
      })).slice(0, 6); // Top 6 regions

      // Performance indicators
      const propertiesWithLeaks = roofs.filter(r => r.total_leaks_12mo && parseInt(r.total_leaks_12mo) > 0);
      const leakFrequency = totalRoofs > 0 ? Math.round((propertiesWithLeaks.length / totalRoofs) * 100) : 0;
      
      const propertiesWithWarranty = roofs.filter(r => r.manufacturer_has_warranty || r.installer_has_warranty);
      const warrantyUtilization = totalRoofs > 0 ? Math.round((propertiesWithWarranty.length / totalRoofs) * 100) : 0;

      // Critical issues (expired warranties)
      const today = new Date().toISOString().split('T')[0];
      const criticalIssues = roofs.filter(roof => 
        (roof.manufacturer_warranty_expiration && roof.manufacturer_warranty_expiration < today) ||
        (roof.installer_warranty_expiration && roof.installer_warranty_expiration < today)
      ).length;

      setMetrics({
        totalRoofs,
        pendingInspections: pendingInspectionsData.count || 0,
        criticalIssues,
        completedThisMonth: completedInspectionsData.count || 0,
        totalClients,
        totalContacts,
        totalSqFt,
        averagePropertyAge,
        contactsPerClient,
        propertyManagerWorkload,
        dataQualityScore: dataQuality.overall,
        totalCapitalBudget,
        totalPreventativeBudget,
        budgetUtilization,
        regionalBreakdown,
        leakFrequency,
        warrantyUtilization,
      });

      setRecentInspections(recentInspectionsData.data?.map(item => ({
        id: item.id,
        property_name: (item.roofs as any)?.property_name || 'Unknown Property',
        completed_date: item.completed_date,
        scheduled_date: item.scheduled_date,
        status: item.status || 'unknown'
      })) || []);

      setUpcomingExpirations(expirationData.data || []);
    } catch (error) {
      console.error('Error fetching enhanced dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Portfolio Overview</h1>
        <Button onClick={fetchEnhancedDashboardData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Overview</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRoofs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalSqFt.toLocaleString()} sq ft total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Management</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalContacts} contacts ({metrics.contactsPerClient} per client)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.dataQualityScore}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.dataQualityScore >= 90 ? 'Excellent' : metrics.dataQualityScore >= 70 ? 'Good' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averagePropertyAge} yrs</div>
            <p className="text-xs text-muted-foreground">
              Average property age
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Inspections</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingInspections}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled or in progress
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.criticalIssues}</div>
            <p className="text-xs text-muted-foreground">
              Expired warranties
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Inspections completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PM Workload</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.propertyManagerWorkload}</div>
            <p className="text-xs text-muted-foreground">
              Properties per manager
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Regional Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.regionalBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="Properties" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Health Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Data Quality</span>
                  <span className="text-sm">{metrics.dataQualityScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${metrics.dataQualityScore >= 90 ? 'bg-green-600' : metrics.dataQualityScore >= 70 ? 'bg-yellow-600' : 'bg-red-600'}`}
                    style={{ width: `${metrics.dataQualityScore}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Warranty Utilization</span>
                  <span className="text-sm">{metrics.warrantyUtilization}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${metrics.warrantyUtilization}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Leak Frequency</span>
                  <span className="text-sm">{metrics.leakFrequency}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${metrics.leakFrequency <= 10 ? 'bg-green-600' : metrics.leakFrequency <= 25 ? 'bg-yellow-600' : 'bg-red-600'}`}
                    style={{ width: `${Math.min(metrics.leakFrequency, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Upcoming Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentInspections.length > 0 ? recentInspections.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">{item.property_name}</p>
                    <p className="text-sm text-gray-500">
                      {item.completed_date 
                        ? format(new Date(item.completed_date), 'MMM dd, yyyy')
                        : item.scheduled_date 
                        ? format(new Date(item.scheduled_date), 'MMM dd, yyyy')
                        : 'No date set'
                      }
                    </p>
                  </div>
                  <Badge variant={
                    item.status === "completed" ? "default" :
                    item.status === "in-progress" ? "secondary" :
                    item.status === "scheduled" ? "outline" : "destructive"
                  }>
                    {item.status.replace("-", " ")}
                  </Badge>
                </div>
              )) : (
                <div className="text-center py-4 text-muted-foreground">
                  No recent inspections found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Warranty Expirations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingExpirations.length > 0 ? upcomingExpirations.map((item) => {
                const nearestExpiration = [
                  item.manufacturer_warranty_expiration,
                  item.installer_warranty_expiration
                ].filter(Boolean).sort()[0];
                
                const daysUntilExpiration = nearestExpiration 
                  ? Math.ceil((new Date(nearestExpiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;

                const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;
                const isUrgent = daysUntilExpiration !== null && daysUntilExpiration <= 30;

                return (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="font-medium">{item.property_name}</p>
                      <p className="text-sm text-gray-500">
                        {nearestExpiration 
                          ? `${isExpired ? 'Expired' : 'Expires'} ${format(new Date(nearestExpiration), 'MMM dd, yyyy')}`
                          : 'No warranty data'
                        }
                      </p>
                    </div>
                    <Badge variant={
                      isExpired ? "destructive" :
                      isUrgent ? "secondary" : "outline"
                    }>
                      {isExpired ? "Expired" : isUrgent ? "Urgent" : "Upcoming"}
                    </Badge>
                  </div>
                );
              }) : (
                <div className="text-center py-4 text-muted-foreground">
                  No warranty expirations in the next 3 months
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}