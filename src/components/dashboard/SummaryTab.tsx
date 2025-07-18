import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Calendar, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, isBefore, subMonths, startOfMonth } from "date-fns";

interface DashboardMetrics {
  totalRoofs: number;
  pendingInspections: number;
  criticalIssues: number;
  completedThisMonth: number;
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

export function SummaryTab() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRoofs: 0,
    pendingInspections: 0,
    criticalIssues: 0,
    completedThisMonth: 0,
  });
  const [recentInspections, setRecentInspections] = useState<RecentActivity[]>([]);
  const [upcomingExpirations, setUpcomingExpirations] = useState<UpcomingExpiration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get total roofs count
      const { count: roofCount } = await supabase
        .from('roofs')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false);

      // Get pending inspections
      const { count: pendingCount } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
        .in('status', ['scheduled', 'in-progress']);

      // Get critical issues (expired warranties)
      const today = new Date().toISOString().split('T')[0];
      const { count: criticalCount } = await supabase
        .from('roofs')
        .select('*', { count: 'exact', head: true })
        .or(`manufacturer_warranty_expiration.lt.${today},installer_warranty_expiration.lt.${today}`)
        .eq('is_deleted', false);

      // Get completed inspections this month
      const firstDayOfMonth = startOfMonth(new Date()).toISOString().split('T')[0];
      const { count: completedCount } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_date', firstDayOfMonth);

      // Get recent inspections
      const { data: recentData } = await supabase
        .from('inspections')
        .select(`
          id,
          status,
          completed_date,
          scheduled_date,
          roofs!inner(property_name)
        `)
        .order('created_at', { ascending: false })
        .limit(4);

      // Get upcoming warranty expirations
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      const futureDate = threeMonthsLater.toISOString().split('T')[0];
      
      const { data: expirationData } = await supabase
        .from('roofs')
        .select('id, property_name, manufacturer_warranty_expiration, installer_warranty_expiration')
        .or(`manufacturer_warranty_expiration.gte.${today},installer_warranty_expiration.gte.${today}`)
        .or(`manufacturer_warranty_expiration.lt.${futureDate},installer_warranty_expiration.lt.${futureDate}`)
        .eq('is_deleted', false)
        .order('manufacturer_warranty_expiration', { ascending: true })
        .limit(4);

      setMetrics({
        totalRoofs: roofCount || 0,
        pendingInspections: pendingCount || 0,
        criticalIssues: criticalCount || 0,
        completedThisMonth: completedCount || 0,
      });

      setRecentInspections(recentData?.map(item => ({
        id: item.id,
        property_name: (item.roofs as any)?.property_name || 'Unknown Property',
        completed_date: item.completed_date,
        scheduled_date: item.scheduled_date,
        status: item.status || 'unknown'
      })) || []);

      setUpcomingExpirations(expirationData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roofs</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRoofs}</div>
            <p className="text-xs text-muted-foreground">
              Total properties managed
            </p>
          </CardContent>
        </Card>
        
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
      </div>

      {/* Recent Activity */}
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