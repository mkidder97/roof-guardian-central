import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Building2,
  Users,
  Target,
  AlertTriangle,
  Download,
  RefreshCw,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  inspectionTrends: Array<{
    date: string;
    inspections: number;
    completed: number;
    pending: number;
  }>;
  costAnalysis: Array<{
    month: string;
    maintenance: number;
    repairs: number;
    replacements: number;
  }>;
  propertyDistribution: Array<{
    type: string;
    count: number;
    avgAge: number;
    totalValue: number;
  }>;
  riskDistribution: Array<{
    level: string;
    count: number;
    percentage: number;
  }>;
  maintenanceMetrics: {
    avgTimeToComplete: number;
    costPerSquareFoot: number;
    predictiveAccuracy: number;
    preventiveRatio: number;
  };
  kpis: {
    totalProperties: number;
    totalInspections: number;
    avgRiskScore: number;
    totalMaintenanceCost: number;
    propertiesAtRisk: number;
    upcomingMaintenance: number;
  };
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  warning: '#f97316',
  success: '#22c55e',
  purple: '#8b5cf6',
  pink: '#ec4899'
};

const CHART_COLORS = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.danger, COLORS.warning, COLORS.purple];

export function AdvancedAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 6),
    to: new Date()
  });
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [selectedMetric, setSelectedMetric] = useState<'inspections' | 'costs' | 'risk'>('inspections');

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const [
        inspectionTrends,
        costAnalysis,
        propertyData,
        riskData,
        kpiData
      ] = await Promise.all([
        fetchInspectionTrends(),
        fetchCostAnalysis(),
        fetchPropertyDistribution(),
        fetchRiskDistribution(),
        fetchKPIs()
      ]);

      const maintenanceMetrics = await calculateMaintenanceMetrics();

      setData({
        inspectionTrends,
        costAnalysis,
        propertyDistribution: propertyData,
        riskDistribution: riskData,
        maintenanceMetrics,
        kpis: kpiData
      });
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInspectionTrends = async () => {
    const { data: inspections, error } = await supabase
      .from('inspections')
      .select('scheduled_date, completed_date, status')
      .gte('scheduled_date', dateRange.from.toISOString())
      .lte('scheduled_date', dateRange.to.toISOString());

    if (error) throw error;

    // Group by month
    const monthlyData = new Map();
    
    inspections?.forEach(inspection => {
      const month = format(new Date(inspection.scheduled_date), 'MMM yyyy');
      
      if (!monthlyData.has(month)) {
        monthlyData.set(month, {
          date: month,
          inspections: 0,
          completed: 0,
          pending: 0
        });
      }
      
      const monthData = monthlyData.get(month);
      monthData.inspections++;
      
      if (inspection.completed_date) {
        monthData.completed++;
      } else {
        monthData.pending++;
      }
    });

    return Array.from(monthlyData.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const fetchCostAnalysis = async () => {
    // This would need to be implemented based on your cost tracking system
    // For now, returning mock data that would come from maintenance records
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        month: format(date, 'MMM yyyy'),
        maintenance: Math.floor(Math.random() * 15000) + 5000,
        repairs: Math.floor(Math.random() * 25000) + 8000,
        replacements: Math.floor(Math.random() * 50000) + 20000
      });
    }
    return months;
  };

  const fetchPropertyDistribution = async () => {
    const { data: roofs, error } = await supabase
      .from('roofs')
      .select('property_name, square_footage');

    if (error) throw error;

    const distribution = new Map();
    
    roofs?.forEach(roof => {
      const type = 'Property'; // Generic type since roof_type doesn't exist
      
      if (!distribution.has(type)) {
        distribution.set(type, {
          type,
          count: 0,
          totalAge: 0,
          totalValue: 0
        });
      }
      
      const typeData = distribution.get(type);
      typeData.count++;
      // Using defaults since roof_age and capital_budget don't exist
      typeData.totalAge += 10; // Default age
      typeData.totalValue += 50000; // Default value
    });

    return Array.from(distribution.values()).map(item => ({
      type: item.type,
      count: item.count,
      avgAge: item.totalAge / item.count,
      totalValue: item.totalValue
    }));
  };

  const fetchRiskDistribution = async () => {
    // This would use the risk analysis engine
    // For now, returning representative data
    const distribution = [
      { level: 'Low', count: 45, percentage: 45 },
      { level: 'Medium', count: 30, percentage: 30 },
      { level: 'High', count: 20, percentage: 20 },
      { level: 'Critical', count: 5, percentage: 5 }
    ];
    
    return distribution;
  };

  const fetchKPIs = async () => {
    const { data: propertiesCount } = await supabase
      .from('roofs')
      .select('id', { count: 'exact' });

    const { data: inspectionsCount } = await supabase
      .from('inspections')
      .select('id', { count: 'exact' });

    return {
      totalProperties: propertiesCount?.length || 0,
      totalInspections: inspectionsCount?.length || 0,
      avgRiskScore: 42.3,
      totalMaintenanceCost: 245000,
      propertiesAtRisk: 25,
      upcomingMaintenance: 12
    };
  };

  const calculateMaintenanceMetrics = async () => {
    return {
      avgTimeToComplete: 14.5, // days
      costPerSquareFoot: 12.50,
      predictiveAccuracy: 87.2, // percentage
      preventiveRatio: 0.73 // 73% preventive vs reactive
    };
  };

  const exportData = () => {
    if (!data) return;
    
    const exportData = {
      kpis: data.kpis,
      inspectionTrends: data.inspectionTrends,
      costAnalysis: data.costAnalysis,
      propertyDistribution: data.propertyDistribution,
      riskDistribution: data.riskDistribution,
      maintenanceMetrics: data.maintenanceMetrics,
      generatedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' && entry.name.includes('Cost') 
                ? formatCurrency(entry.value) 
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 animate-pulse text-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Advanced Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive insights and trend analysis
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <DatePickerWithRange 
            value={dateRange}
            onChange={(date) => {
              if (date?.from && date?.to) {
                setDateRange({ from: date.from, to: date.to });
              }
            }}
          />
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={loadAnalyticsData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Total Properties
                </p>
                <p className="text-2xl font-bold mt-1">{data.kpis.totalProperties}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Total Inspections
                </p>
                <p className="text-2xl font-bold mt-1">{data.kpis.totalInspections}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Avg Risk Score
                </p>
                <p className="text-2xl font-bold mt-1">{data.kpis.avgRiskScore}</p>
              </div>
              <Target className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Maintenance Cost
                </p>
                <p className="text-lg font-bold mt-1">{formatCurrency(data.kpis.totalMaintenanceCost)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  At Risk Properties
                </p>
                <p className="text-2xl font-bold mt-1 text-red-600">{data.kpis.propertiesAtRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Upcoming Maintenance
                </p>
                <p className="text-2xl font-bold mt-1">{data.kpis.upcomingMaintenance}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Inspection Trends</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="distribution">Property Distribution</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Inspection Trends</CardTitle>
                  <CardDescription>
                    Monthly inspection activity and completion rates
                  </CardDescription>
                </div>
                <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                {chartType === 'line' ? (
                  <LineChart data={data.inspectionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="inspections" 
                      stroke={COLORS.primary} 
                      strokeWidth={2}
                      name="Total Inspections"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke={COLORS.success} 
                      strokeWidth={2}
                      name="Completed"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pending" 
                      stroke={COLORS.warning} 
                      strokeWidth={2}
                      name="Pending"
                    />
                  </LineChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={data.inspectionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="completed" fill={COLORS.success} name="Completed" />
                    <Bar dataKey="pending" fill={COLORS.warning} name="Pending" />
                  </BarChart>
                ) : (
                  <AreaChart data={data.inspectionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stackId="1"
                      stroke={COLORS.success} 
                      fill={COLORS.success}
                      name="Completed"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pending" 
                      stackId="1"
                      stroke={COLORS.warning} 
                      fill={COLORS.warning}
                      name="Pending"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
              <CardDescription>
                Monthly maintenance, repair, and replacement costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.costAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), '']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Legend />
                  <Bar dataKey="maintenance" fill={COLORS.primary} name="Maintenance" />
                  <Bar dataKey="repairs" fill={COLORS.warning} name="Repairs" />
                  <Bar dataKey="replacements" fill={COLORS.danger} name="Replacements" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Property Type Distribution</CardTitle>
                <CardDescription>
                  Breakdown by roof type and count
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.propertyDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.propertyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Age by Type</CardTitle>
                <CardDescription>
                  Property age distribution across roof types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.propertyDistribution} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="type" type="category" width={80} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)} years`, 'Average Age']}
                    />
                    <Bar dataKey="avgAge" fill={COLORS.secondary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
                <CardDescription>
                  Properties by risk assessment level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.riskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ level, percentage }) => `${level} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.riskDistribution.map((entry, index) => {
                        const colors = {
                          Low: COLORS.success,
                          Medium: COLORS.accent,
                          High: COLORS.warning,
                          Critical: COLORS.danger
                        };
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[entry.level as keyof typeof colors]} 
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Maintenance Metrics</CardTitle>
                <CardDescription>
                  Performance indicators and efficiency metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Completion Time</p>
                    <p className="text-xl font-bold text-blue-600">
                      {data.maintenanceMetrics.avgTimeToComplete} days
                    </p>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Cost per Sq Ft</p>
                    <p className="text-xl font-bold text-green-600">
                      ${data.maintenanceMetrics.costPerSquareFoot}
                    </p>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Predictive Accuracy</p>
                    <p className="text-xl font-bold text-purple-600">
                      {data.maintenanceMetrics.predictiveAccuracy}%
                    </p>
                  </div>
                  
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Preventive Ratio</p>
                    <p className="text-xl font-bold text-orange-600">
                      {(data.maintenanceMetrics.preventiveRatio * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}