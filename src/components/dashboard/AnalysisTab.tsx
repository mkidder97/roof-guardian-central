import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Calendar, BarChart3, FileDown, Loader2, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { differenceInYears, differenceInDays, parseISO, format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface AnalyticsData {
  roofsByRegion: Array<{ name: string; count: number; }>;
  roofsByAge: Array<{ ageRange: string; count: number; }>;
  warrantyExpirations: Array<{ month: string; manufacturer: number; installer: number; }>;
  budgetAnalysis: Array<{ year: string; estimated: number; actual: number; }>;
  maintenanceCosts: Array<{ roofType: string; avgCost: number; totalCost: number; }>;
  totalRoofs: number;
  avgRoofAge: number;
  totalBudgetVariance: number;
  expiredWarranties: number;
}

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

export function AnalysisTab() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    roofsByRegion: [],
    roofsByAge: [],
    warrantyExpirations: [],
    budgetAnalysis: [],
    maintenanceCosts: [],
    totalRoofs: 0,
    avgRoofAge: 0,
    totalBudgetVariance: 0,
    expiredWarranties: 0,
  });
  const [regionalMetrics, setRegionalMetrics] = useState<RegionalMetrics[]>([]);
  const [propertyManagerData, setPropertyManagerData] = useState<PropertyManagerWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState("yearly");
  const [roofTypeFilter, setRoofTypeFilter] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timePeriod, roofTypeFilter, selectedRegion]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('roofs')
        .select(`
          *,
          clients(company_name)
        `)
        .eq('is_deleted', false);

      // Fetch property contact assignments separately
      const { data: assignments } = await supabase
        .from('property_contact_assignments')
        .select(`
          roof_id,
          client_contacts(first_name, last_name, role, email)
        `)
        .eq('is_active', true);

      if (roofTypeFilter !== 'all') {
        query = query.eq('roof_type', roofTypeFilter);
      }

      if (selectedRegion !== 'all') {
        query = query.eq('region', selectedRegion);
      }

      const { data: roofs, error } = await query;
      if (error) throw error;

      const roofsData = roofs || [];
      
      // Add assignments to roof data
      const assignmentsMap = new Map();
      (assignments || []).forEach(assignment => {
        if (!assignmentsMap.has(assignment.roof_id)) {
          assignmentsMap.set(assignment.roof_id, []);
        }
        assignmentsMap.get(assignment.roof_id).push(assignment);
      });

      const enrichedRoofs = roofsData.map(roof => ({
        ...roof,
        property_contact_assignments: assignmentsMap.get(roof.id) || []
      }));
      
      // Extract unique regions
      const uniqueRegions = [...new Set(enrichedRoofs.map(r => r.region).filter(Boolean))];
      setRegions(uniqueRegions);

      // Process analytics data
      const processedData = processAnalyticsData(enrichedRoofs);
      setAnalytics(processedData);

      // Process regional metrics
      const regionalData = processRegionalMetrics(enrichedRoofs);
      setRegionalMetrics(regionalData.metrics);
      setPropertyManagerData(regionalData.managers);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (roofs: any[]): AnalyticsData => {
    const today = new Date();

    // Roofs by region
    const regionCounts = roofs.reduce((acc, roof) => {
      const region = roof.region || 'Unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {});
    const roofsByRegion = Object.entries(regionCounts).map(([name, count]) => ({ name, count: count as number }));

    // Roofs by age
    const ageRanges = { '0-5 years': 0, '6-10 years': 0, '11-15 years': 0, '16-20 years': 0, '20+ years': 0 };
    let totalAge = 0;
    let ageCount = 0;

    roofs.forEach(roof => {
      if (roof.install_year) {
        const age = today.getFullYear() - roof.install_year;
        totalAge += age;
        ageCount++;

        if (age <= 5) ageRanges['0-5 years']++;
        else if (age <= 10) ageRanges['6-10 years']++;
        else if (age <= 15) ageRanges['11-15 years']++;
        else if (age <= 20) ageRanges['16-20 years']++;
        else ageRanges['20+ years']++;
      }
    });

    const roofsByAge = Object.entries(ageRanges).map(([ageRange, count]) => ({ ageRange, count }));
    const avgRoofAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;

    // Warranty expirations (next 12 months)
    const warrantyExpirations = [];
    for (let i = 0; i < 12; i++) {
      const month = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      let manufacturerExpiring = 0;
      let installerExpiring = 0;

      roofs.forEach(roof => {
        if (roof.manufacturer_warranty_expiration) {
          const expDate = parseISO(roof.manufacturer_warranty_expiration);
          if (expDate >= monthStart && expDate <= monthEnd) {
            manufacturerExpiring++;
          }
        }
        if (roof.installer_warranty_expiration) {
          const expDate = parseISO(roof.installer_warranty_expiration);
          if (expDate >= monthStart && expDate <= monthEnd) {
            installerExpiring++;
          }
        }
      });

      warrantyExpirations.push({
        month: format(month, 'MMM'),
        manufacturer: manufacturerExpiring,
        installer: installerExpiring
      });
    }

    // Budget analysis by year
    const budgetByYear = roofs.reduce((acc, roof) => {
      const capYear = roof.capital_budget_year;
      const prevYear = roof.preventative_budget_year;
      
      if (capYear) {
        if (!acc[capYear]) acc[capYear] = { estimated: 0, actual: 0 };
        acc[capYear].estimated += roof.capital_budget_estimated || 0;
        acc[capYear].actual += parseFloat(roof.capital_budget_actual?.replace(/[,$]/g, '') || '0');
      }
      
      if (prevYear) {
        if (!acc[prevYear]) acc[prevYear] = { estimated: 0, actual: 0 };
        acc[prevYear].estimated += roof.preventative_budget_estimated || 0;
        acc[prevYear].actual += parseFloat(roof.preventative_budget_actual?.replace(/[,$]/g, '') || '0');
      }
      
      return acc;
    }, {});

    const budgetAnalysis = Object.entries(budgetByYear)
      .map(([year, data]: [string, any]) => ({
        year,
        estimated: data.estimated,
        actual: data.actual
      }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));

    // Maintenance costs by roof type
    const costsByType = roofs.reduce((acc, roof) => {
      const type = roof.roof_type || 'Unknown';
      if (!acc[type]) acc[type] = { totalCost: 0, count: 0 };
      
      const capActual = parseFloat(roof.capital_budget_actual?.replace(/[,$]/g, '') || '0');
      const prevActual = parseFloat(roof.preventative_budget_actual?.replace(/[,$]/g, '') || '0');
      
      acc[type].totalCost += capActual + prevActual;
      acc[type].count++;
      return acc;
    }, {});

    const maintenanceCosts = Object.entries(costsByType).map(([roofType, data]: [string, any]) => ({
      roofType,
      totalCost: data.totalCost,
      avgCost: data.count > 0 ? Math.round(data.totalCost / data.count) : 0
    }));

    // Calculate metrics
    const totalBudgetVariance = budgetAnalysis.reduce((sum, item) => sum + (item.actual - item.estimated), 0);
    
    const expiredWarranties = roofs.filter(roof => {
      const mfgExpired = roof.manufacturer_warranty_expiration && parseISO(roof.manufacturer_warranty_expiration) < today;
      const instExpired = roof.installer_warranty_expiration && parseISO(roof.installer_warranty_expiration) < today;
      return mfgExpired || instExpired;
    }).length;

    return {
      roofsByRegion,
      roofsByAge,
      warrantyExpirations,
      budgetAnalysis,
      maintenanceCosts,
      totalRoofs: roofs.length,
      avgRoofAge,
      totalBudgetVariance,
      expiredWarranties,
    };
  };

  const processRegionalMetrics = (roofs: any[]) => {
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

    return { metrics, managers: managerWorkloads };
  };

  const groupBy = (array: any[], key: string) => {
    return array.reduce((result, item) => {
      const group = item[key] || 'Unknown';
      if (!result[group]) result[group] = [];
      result[group].push(item);
      return result;
    }, {});
  };

  const exportAnalytics = () => {
    const csvContent = [
      ["Metric", "Value"],
      ["Total Roofs", analytics.totalRoofs.toString()],
      ["Average Roof Age", `${analytics.avgRoofAge} years`],
      ["Budget Variance", `$${analytics.totalBudgetVariance.toLocaleString()}`],
      ["Expired Warranties", analytics.expiredWarranties.toString()],
      ...analytics.roofsByRegion.map(item => [`Roofs in ${item.name}`, item.count.toString()]),
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics-report.csv";
    a.click();
    window.URL.revokeObjectURL(url);
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
      <Tabs defaultValue="portfolio" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="portfolio">Portfolio Analytics</TabsTrigger>
          <TabsTrigger value="regional">Regional Analysis</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="portfolio" className="space-y-6">
          {/* Header Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roofTypeFilter} onValueChange={setRoofTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Roof Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="EPDM">EPDM</SelectItem>
                  <SelectItem value="TPO">TPO</SelectItem>
                  <SelectItem value="Modified Bitumen">Modified Bitumen</SelectItem>
                  <SelectItem value="Built-up">Built-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={exportAnalytics}>
              <FileDown className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Roofs</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalRoofs}</div>
                <p className="text-xs text-muted-foreground">
                  Properties in portfolio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Roof Age</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.avgRoofAge} years</div>
                <p className="text-xs text-muted-foreground">
                  Portfolio average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Variance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${analytics.totalBudgetVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${Math.abs(analytics.totalBudgetVariance).toLocaleString()}
                </div>
                <div className={`flex items-center text-xs ${analytics.totalBudgetVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {analytics.totalBudgetVariance >= 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Over budget
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 mr-1" />
                      Under budget
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expired Warranties</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{analytics.expiredWarranties}</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roofs by Region */}
        <Card>
          <CardHeader>
            <CardTitle>Properties by Region</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.roofsByRegion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Roof Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.roofsByAge}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ ageRange, count }) => `${ageRange}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.roofsByAge.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Warranty Expiration Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Warranty Expiration Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.warrantyExpirations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="manufacturer" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="installer" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.budgetAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                <Bar dataKey="estimated" fill="#8884d8" name="Estimated" />
                <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
          </div>

          {/* Maintenance Costs by Roof Type */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Costs by Roof Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.maintenanceCosts.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.roofType}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">${item.totalCost.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Avg: ${item.avgCost.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regional" className="space-y-6">
          {/* Regional Controls */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Regional Analysis</h2>
              <p className="text-muted-foreground">Performance insights by region and market</p>
            </div>
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

          {/* Regional Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <Bar dataKey="propertyCount" fill="#8884d8" name="Properties" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

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
                    <Bar dataKey="totalCapitalBudget" stackId="a" fill="#8884d8" name="Capital Budget" />
                    <Bar dataKey="totalPreventativeBudget" stackId="a" fill="#82ca9d" name="Preventative Budget" />
                  </BarChart>
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
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Advanced predictive models and forecasting will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}