import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Calendar, BarChart3, FileDown, Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState("yearly");
  const [roofTypeFilter, setRoofTypeFilter] = useState("all");

  useEffect(() => {
    fetchAnalyticsData();
  }, [timePeriod, roofTypeFilter]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('roofs')
        .select('*')
        .eq('is_deleted', false);

      if (roofTypeFilter !== 'all') {
        query = query.eq('roof_type', roofTypeFilter);
      }

      const { data: roofs, error } = await query;
      if (error) throw error;

      // Process analytics data
      const processedData = processAnalyticsData(roofs || []);
      setAnalytics(processedData);
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
    </div>
  );
}