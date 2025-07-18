import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Database, 
  TrendingUp, 
  Users, 
  Building,
  BarChart3,
  Zap,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { assessDataQuality, PropertyValidationSchema, type DataQualityScore, type DataQualityIssue } from '@/lib/validation';

interface DashboardMetrics {
  totalProperties: number;
  totalClients: number;
  totalContacts: number;
  totalSqFt: number;
  averagePropertyAge: number;
  regionalBreakdown: Array<{ region: string; count: number; sqFt: number }>;
  contactsPerClient: number;
  propertyManagerWorkload: number;
  dataQuality: DataQualityScore;
  recentActivity: Array<{ type: string; description: string; timestamp: string }>;
}

export function DataQualityDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    setLoading(true);
    try {
      // Fetch all data needed for dashboard
      const [roofsData, clientsData, contactsData] = await Promise.all([
        supabase.from('roofs').select('*').eq('is_deleted', false),
        supabase.from('clients').select('*'),
        supabase.from('client_contacts').select('*').eq('is_active', true)
      ]);

      if (roofsData.error || clientsData.error || contactsData.error) {
        throw new Error('Failed to fetch dashboard data');
      }

      const roofs = roofsData.data || [];
      const clients = clientsData.data || [];
      const contacts = contactsData.data || [];

      // Calculate metrics
      const totalProperties = roofs.length;
      const totalClients = clients.length;
      const totalContacts = contacts.length;
      const totalSqFt = roofs.reduce((sum, roof) => sum + (roof.roof_area || 0), 0);

      // Calculate average property age
      const currentYear = new Date().getFullYear();
      const propertiesWithAge = roofs.filter(r => r.install_year);
      const averagePropertyAge = propertiesWithAge.length > 0
        ? Math.round(propertiesWithAge.reduce((sum, roof) => sum + (currentYear - (roof.install_year || currentYear)), 0) / propertiesWithAge.length)
        : 0;

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
      }));

      // Contact metrics
      const contactsPerClient = totalClients > 0 ? Math.round((totalContacts / totalClients) * 10) / 10 : 0;
      const propertyManagerWorkload = contacts.filter(c => c.role === 'property_manager').length > 0
        ? Math.round(totalProperties / contacts.filter(c => c.role === 'property_manager').length)
        : 0;

      // Data quality assessment
      const dataQuality = assessDataQuality(roofs, PropertyValidationSchema);

      // Recent activity (mock for now)
      const recentActivity = [
        { type: 'import', description: 'Excel data imported - 288 properties processed', timestamp: new Date().toISOString() },
        { type: 'contact', description: 'New contact added to Prologis', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { type: 'validation', description: 'Data quality check completed', timestamp: new Date(Date.now() - 7200000).toISOString() }
      ];

      setMetrics({
        totalProperties,
        totalClients,
        totalContacts,
        totalSqFt,
        averagePropertyAge,
        regionalBreakdown,
        contactsPerClient,
        propertyManagerWorkload,
        dataQuality,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getIssueIcon = (type: DataQualityIssue['type']) => {
    switch (type) {
      case 'invalid': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'missing': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'duplicate': return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return <div className="p-6">Failed to load dashboard data</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Data Quality Dashboard</h1>
        <Button onClick={fetchDashboardMetrics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProperties.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalSqFt.toLocaleString()} sq ft total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.contactsPerClient} contacts per client
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Property Age</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averagePropertyAge} years</div>
            <p className="text-xs text-muted-foreground">
              Based on install year data
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

      {/* Data Quality Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Quality Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold p-3 rounded-lg ${getQualityColor(metrics.dataQuality.overall)}`}>
                {metrics.dataQuality.overall}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">Overall Score</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold p-3 rounded-lg ${getQualityColor(metrics.dataQuality.completeness)}`}>
                {metrics.dataQuality.completeness}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">Completeness</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold p-3 rounded-lg ${getQualityColor(metrics.dataQuality.accuracy)}`}>
                {metrics.dataQuality.accuracy}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">Accuracy</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold p-3 rounded-lg ${getQualityColor(metrics.dataQuality.consistency)}`}>
                {metrics.dataQuality.consistency}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">Consistency</p>
            </div>
          </div>

          {metrics.dataQuality.issues.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Top Data Quality Issues</h4>
              <div className="space-y-2">
                {metrics.dataQuality.issues.slice(0, 5).map((issue, index) => (
                  <Alert key={index}>
                    <div className="flex items-center gap-2">
                      {getIssueIcon(issue.type)}
                      <AlertDescription className="flex-1">
                        <span className="font-medium">{issue.field}:</span> {issue.message}
                        {issue.suggested_fix && (
                          <span className="text-blue-600 ml-2">• {issue.suggested_fix}</span>
                        )}
                      </AlertDescription>
                      <Badge variant={issue.severity === 'high' ? 'destructive' : issue.severity === 'medium' ? 'default' : 'secondary'}>
                        {issue.severity}
                      </Badge>
                    </div>
                  </Alert>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regional Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Portfolio Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Total Sq Ft</TableHead>
                <TableHead>Avg Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.regionalBreakdown.slice(0, 8).map((region) => (
                <TableRow key={region.region}>
                  <TableCell className="font-medium">{region.region}</TableCell>
                  <TableCell>{region.count}</TableCell>
                  <TableCell>{region.sqFt.toLocaleString()}</TableCell>
                  <TableCell>{Math.round(region.sqFt / region.count).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <Badge variant="outline">{activity.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}