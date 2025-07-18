import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { MapPin, TrendingUp, Users, Building, DollarSign, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RegionalMetrics {
  region: string;
  market: string;
  propertyCount: number;
  totalSqFt: number;
  avgPropertyAge: number;
  propertyManagerCount: number;
  avgPropertiesPerManager: number;
  totalCapitalBudget: number;
  totalPreventativeBudget: number;
  warrantyExpirations: number;
  leakIncidents: number;
  riskScore: number;
}

interface PropertyManagerWorkload {
  managerName: string;
  propertyCount: number;
  totalSqFt: number;
  avgCostPerSqFt: number;
  warrantyRate: number;
  leakRate: number;
  budgetVariance: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function RegionalTab() {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [regionalMetrics, setRegionalMetrics] = useState<RegionalMetrics[]>([]);
  const [propertyManagerData, setPropertyManagerData] = useState<PropertyManagerWorkload[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegionalData();
  }, [selectedRegion, selectedMarket]);

  const fetchRegionalData = async () => {
    setLoading(true);
    try {
      // Fetch all roofs with related data
      let query = supabase
        .from('roofs')
        .select(`
          *,
          clients(company_name),
          property_contact_assignments(
            client_contacts(first_name, last_name, role)
          )
        `)
        .eq('is_deleted', false);

      if (selectedRegion !== 'all') {
        query = query.eq('region', selectedRegion);
      }
      if (selectedMarket !== 'all') {
        query = query.eq('market', selectedMarket);
      }

      const { data: roofsData, error } = await query;
      if (error) throw error;

      const roofs = roofsData || [];

      // Extract unique regions and markets
      const uniqueRegions = [...new Set(roofs.map(r => r.region).filter(Boolean))];
      const uniqueMarkets = [...new Set(roofs.map(r => r.market).filter(Boolean))];
      setRegions(uniqueRegions);
      setMarkets(uniqueMarkets);

      // Calculate regional metrics
      const regionGroups = groupBy(roofs, 'region');
      const metrics: RegionalMetrics[] = Object.entries(regionGroups).map(([region, properties]: [string, any[]]) => {
        const currentYear = new Date().getFullYear();
        const totalSqFt = properties.reduce((sum, p) => sum + (p.roof_area || 0), 0);
        const propertiesWithAge = properties.filter(p => p.install_year);
        const avgAge = propertiesWithAge.length > 0 
          ? Math.round(propertiesWithAge.reduce((sum, p) => sum + (currentYear - (p.install_year || currentYear)), 0) / propertiesWithAge.length)
          : 0;

        // Count unique property managers
        const propertyManagers = new Set();
        properties.forEach(p => {
          if (p.property_contact_assignments?.length > 0) {
            p.property_contact_assignments.forEach((assignment: any) => {
              if (assignment.client_contacts?.role === 'property_manager') {
                propertyManagers.add(`${assignment.client_contacts.first_name} ${assignment.client_contacts.last_name}`);
              }
            });
          }
        });

        const totalCapitalBudget = properties.reduce((sum, p) => sum + (p.capital_budget_estimated || 0), 0);
        const totalPreventativeBudget = properties.reduce((sum, p) => sum + (p.preventative_budget_estimated || 0), 0);

        // Calculate warranty expirations in next 6 months
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
        const warrantyExpirations = properties.filter(p => 
          (p.manufacturer_warranty_expiration && new Date(p.manufacturer_warranty_expiration) < sixMonthsFromNow) ||
          (p.installer_warranty_expiration && new Date(p.installer_warranty_expiration) < sixMonthsFromNow)
        ).length;

        // Calculate leak incidents (properties with leaks in last 12 months)
        const leakIncidents = properties.filter(p => 
          p.total_leaks_12mo && parseInt(p.total_leaks_12mo) > 0
        ).length;

        // Simple risk score calculation
        const riskScore = Math.round(
          (warrantyExpirations / properties.length * 40) +
          (leakIncidents / properties.length * 30) +
          (avgAge > 15 ? 30 : avgAge > 10 ? 20 : 10)
        );

        return {
          region: region || 'Unknown',
          market: properties[0]?.market || 'Unknown',
          propertyCount: properties.length,
          totalSqFt,
          avgPropertyAge: avgAge,
          propertyManagerCount: propertyManagers.size,
          avgPropertiesPerManager: propertyManagers.size > 0 ? Math.round(properties.length / propertyManagers.size) : 0,
          totalCapitalBudget,
          totalPreventativeBudget,
          warrantyExpirations,
          leakIncidents,
          riskScore
        };
      });

      setRegionalMetrics(metrics);

      // Calculate property manager workload data
      const managerWorkloads: PropertyManagerWorkload[] = [];
      const managerProperties = new Map<string, any[]>();

      roofs.forEach(property => {
        if (property.property_contact_assignments?.length > 0) {
          property.property_contact_assignments.forEach((assignment: any) => {
            if (assignment.client_contacts?.role === 'property_manager') {
              const managerName = `${assignment.client_contacts.first_name} ${assignment.client_contacts.last_name}`;
              if (!managerProperties.has(managerName)) {
                managerProperties.set(managerName, []);
              }
              managerProperties.get(managerName)?.push(property);
            }
          });
        }
      });

      managerProperties.forEach((properties, managerName) => {
        const totalSqFt = properties.reduce((sum, p) => sum + (p.roof_area || 0), 0);
        const totalBudget = properties.reduce((sum, p) => sum + (p.capital_budget_estimated || 0) + (p.preventative_budget_estimated || 0), 0);
        const avgCostPerSqFt = totalSqFt > 0 ? totalBudget / totalSqFt : 0;
        
        const propertiesWithWarranty = properties.filter(p => p.manufacturer_has_warranty || p.installer_has_warranty);
        const warrantyRate = properties.length > 0 ? (propertiesWithWarranty.length / properties.length) * 100 : 0;
        
        const propertiesWithLeaks = properties.filter(p => p.total_leaks_12mo && parseInt(p.total_leaks_12mo) > 0);
        const leakRate = properties.length > 0 ? (propertiesWithLeaks.length / properties.length) * 100 : 0;

        // Mock budget variance calculation
        const budgetVariance = Math.round((Math.random() - 0.5) * 30); // -15% to +15%

        managerWorkloads.push({
          managerName,
          propertyCount: properties.length,
          totalSqFt,
          avgCostPerSqFt,
          warrantyRate,
          leakRate,
          budgetVariance
        });
      });

      setPropertyManagerData(managerWorkloads);
    } catch (error) {
      console.error('Error fetching regional data:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupBy = (array: any[], key: string) => {
    return array.reduce((result, item) => {
      const group = item[key] || 'Unknown';
      if (!result[group]) result[group] = [];
      result[group].push(item);
      return result;
    }, {});
  };

  const exportRegionalReport = () => {
    const csvData = regionalMetrics.map(metric => ({
      'Region': metric.region,
      'Market': metric.market,
      'Properties': metric.propertyCount,
      'Total Sq Ft': metric.totalSqFt,
      'Avg Property Age': metric.avgPropertyAge,
      'Property Managers': metric.propertyManagerCount,
      'Props per Manager': metric.avgPropertiesPerManager,
      'Capital Budget': metric.totalCapitalBudget,
      'Preventative Budget': metric.totalPreventativeBudget,
      'Warranty Expirations': metric.warrantyExpirations,
      'Leak Incidents': metric.leakIncidents,
      'Risk Score': metric.riskScore
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regional-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2">Loading regional analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Regional Analytics</h1>
          <p className="text-muted-foreground">Performance insights by region and market</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              {markets.map(market => (
                <SelectItem key={market} value={market}>{market}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={exportRegionalReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Regional Performance Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {regionalMetrics.slice(0, 4).map((metric, index) => (
          <Card key={metric.region}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.region}</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.propertyCount}</div>
              <p className="text-xs text-muted-foreground mb-2">
                {metric.totalSqFt.toLocaleString()} sq ft
              </p>
              <div className="flex items-center gap-2">
                <Badge variant={metric.riskScore > 70 ? 'destructive' : metric.riskScore > 40 ? 'default' : 'secondary'}>
                  Risk: {metric.riskScore}%
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {metric.propertyManagerCount} PMs
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Property Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={regionalMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="propertyCount" fill="#8884d8" name="Properties" />
                <Bar dataKey="totalSqFt" fill="#82ca9d" name="Total Sq Ft" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Assessment Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={regionalMetrics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ region, riskScore }) => `${region}: ${riskScore}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="riskScore"
                >
                  {regionalMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Property Manager Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Property Manager Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Manager</th>
                  <th className="text-left p-2">Properties</th>
                  <th className="text-left p-2">Total Sq Ft</th>
                  <th className="text-left p-2">Cost/Sq Ft</th>
                  <th className="text-left p-2">Warranty Rate</th>
                  <th className="text-left p-2">Leak Rate</th>
                  <th className="text-left p-2">Budget Variance</th>
                </tr>
              </thead>
              <tbody>
                {propertyManagerData.map((manager, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{manager.managerName}</td>
                    <td className="p-2">{manager.propertyCount}</td>
                    <td className="p-2">{manager.totalSqFt.toLocaleString()}</td>
                    <td className="p-2">${manager.avgCostPerSqFt.toFixed(2)}</td>
                    <td className="p-2">{manager.warrantyRate.toFixed(1)}%</td>
                    <td className="p-2">
                      <span className={manager.leakRate > 10 ? 'text-red-600' : 'text-green-600'}>
                        {manager.leakRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2">
                      <Badge variant={manager.budgetVariance > 10 ? 'destructive' : manager.budgetVariance < -10 ? 'secondary' : 'default'}>
                        {manager.budgetVariance > 0 ? '+' : ''}{manager.budgetVariance}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Regional Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Allocation by Region</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regionalMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, '']} />
              <Legend />
              <Bar dataKey="totalCapitalBudget" stackId="a" fill="#8884d8" name="Capital Budget" />
              <Bar dataKey="totalPreventativeBudget" stackId="a" fill="#82ca9d" name="Preventative Budget" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}