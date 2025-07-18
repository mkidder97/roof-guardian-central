import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  Users, 
  TrendingUp, 
  Database, 
  MapPin, 
  DollarSign, 
  RefreshCw, 
  BarChart3,
  Search,
  Home,
  Plus,
  FileText,
  Wrench,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth } from "date-fns";
import { assessDataQuality, PropertyValidationSchema } from '@/lib/validation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

interface PortfolioMetrics {
  totalRoofs: number;
  totalClients: number;
  totalContacts: number;
  totalSqFt: number;
  averagePropertyAge: number;
  contactsPerClient: number;
  dataQualityScore: number;
  totalCapitalBudget: number;
  totalPreventativeBudget: number;
  budgetUtilization: number;
  warrantyUtilization: number;
  leakFrequency: number;
  pendingInspections: number;
  criticalIssues: number;
  completedThisMonth: number;
  regionalBreakdown: Array<{ region: string; count: number; sqFt: number; budget: number }>;
  marketBreakdown: Array<{ market: string; count: number; sqFt: number }>;
  trendingIssues: Array<{ type: string; count: number; severity: 'high' | 'medium' | 'low' }>;
}

interface RegionalHierarchy {
  [region: string]: {
    [market: string]: {
      [group: string]: any[];
    };
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function PortfolioOverviewTab() {
  const [metrics, setMetrics] = useState<PortfolioMetrics>({
    totalRoofs: 0,
    totalClients: 0,
    totalContacts: 0,
    totalSqFt: 0,
    averagePropertyAge: 0,
    contactsPerClient: 0,
    dataQualityScore: 0,
    totalCapitalBudget: 0,
    totalPreventativeBudget: 0,
    budgetUtilization: 0,
    warrantyUtilization: 0,
    leakFrequency: 0,
    pendingInspections: 0,
    criticalIssues: 0,
    completedThisMonth: 0,
    regionalBreakdown: [],
    marketBreakdown: [],
    trendingIssues: []
  });
  
  const [regionalData, setRegionalData] = useState<RegionalHierarchy>({});
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [selectedPropertyType, setSelectedPropertyType] = useState('all');
  const [dateRange, setDateRange] = useState('12months');
  const [searchTerm, setSearchTerm] = useState('');

  const [regions, setRegions] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchPortfolioData();
  }, [selectedRegion, selectedMarket, selectedPropertyType, dateRange]);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);

      // Build query with filters
      let roofsQuery = supabase
        .from('roofs')
        .select('*, clients(company_name)')
        .eq('is_deleted', false);

      if (selectedRegion !== 'all') {
        roofsQuery = roofsQuery.eq('region', selectedRegion);
      }
      if (selectedMarket !== 'all') {
        roofsQuery = roofsQuery.eq('market', selectedMarket);
      }
      if (selectedPropertyType !== 'all') {
        roofsQuery = roofsQuery.eq('roof_type', selectedPropertyType);
      }

      // Fetch all data in parallel
      const [
        roofsData,
        clientsData,
        contactsData,
        inspectionsData,
        pendingInspectionsData,
        completedInspectionsData
      ] = await Promise.all([
        roofsQuery,
        supabase.from('clients').select('*'),
        supabase.from('client_contacts').select('*').eq('is_active', true),
        supabase.from('inspections').select('*'),
        supabase.from('inspections').select('*', { count: 'exact', head: true }).in('status', ['scheduled', 'in-progress']),
        supabase.from('inspections').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_date', startOfMonth(new Date()).toISOString().split('T')[0])
      ]);

      const roofs = roofsData.data || [];
      const clients = clientsData.data || [];
      const contacts = contactsData.data || [];

      // Extract filter options
      const uniqueRegions = [...new Set(roofs.map(r => r.region).filter(Boolean))];
      const uniqueMarkets = [...new Set(roofs.map(r => r.market).filter(Boolean))];
      const uniquePropertyTypes = [...new Set(roofs.map(r => r.roof_type).filter(Boolean))];
      
      setRegions(uniqueRegions);
      setMarkets(uniqueMarkets);
      setPropertyTypes(uniquePropertyTypes);

      // Process metrics
      const processedMetrics = processPortfolioMetrics(roofs, clients, contacts, pendingInspectionsData.count || 0, completedInspectionsData.count || 0);
      setMetrics(processedMetrics);

      // Process regional hierarchy
      const hierarchy = processRegionalHierarchy(roofs);
      setRegionalData(hierarchy);

    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPortfolioMetrics = (roofs: any[], clients: any[], contacts: any[], pendingInspections: number, completedThisMonth: number): PortfolioMetrics => {
    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

    // Basic metrics
    const totalRoofs = roofs.length;
    const totalClients = clients.length;
    const totalContacts = contacts.length;
    const totalSqFt = roofs.reduce((sum, roof) => sum + (roof.roof_area || 0), 0);

    // Calculate average property age
    const propertiesWithAge = roofs.filter(r => r.install_year);
    const averagePropertyAge = propertiesWithAge.length > 0
      ? Math.round(propertiesWithAge.reduce((sum, roof) => sum + (currentYear - (roof.install_year || currentYear)), 0) / propertiesWithAge.length)
      : 0;

    // Contact metrics
    const contactsPerClient = totalClients > 0 ? Math.round((totalContacts / totalClients) * 10) / 10 : 0;

    // Data quality assessment
    const dataQuality = assessDataQuality(roofs, PropertyValidationSchema);

    // Budget calculations
    const totalCapitalBudget = roofs.reduce((sum, roof) => sum + (roof.capital_budget_estimated || 0), 0);
    const totalPreventativeBudget = roofs.reduce((sum, roof) => sum + (roof.preventative_budget_estimated || 0), 0);
    const budgetUtilization = totalCapitalBudget > 0 ? Math.round(((totalCapitalBudget + totalPreventativeBudget) / totalCapitalBudget) * 100) : 0;

    // Performance indicators
    const propertiesWithLeaks = roofs.filter(r => r.total_leaks_12mo && parseInt(r.total_leaks_12mo) > 0);
    const leakFrequency = totalRoofs > 0 ? Math.round((propertiesWithLeaks.length / totalRoofs) * 100) : 0;
    
    const propertiesWithWarranty = roofs.filter(r => r.manufacturer_has_warranty || r.installer_has_warranty);
    const warrantyUtilization = totalRoofs > 0 ? Math.round((propertiesWithWarranty.length / totalRoofs) * 100) : 0;

    // Critical issues (expired warranties)
    const criticalIssues = roofs.filter(roof => 
      (roof.manufacturer_warranty_expiration && roof.manufacturer_warranty_expiration < today) ||
      (roof.installer_warranty_expiration && roof.installer_warranty_expiration < today)
    ).length;

    // Regional breakdown
    const regionalMap = new Map<string, { count: number; sqFt: number; budget: number }>();
    roofs.forEach(roof => {
      const region = roof.region || 'Unknown';
      const current = regionalMap.get(region) || { count: 0, sqFt: 0, budget: 0 };
      regionalMap.set(region, {
        count: current.count + 1,
        sqFt: current.sqFt + (roof.roof_area || 0),
        budget: current.budget + (roof.capital_budget_estimated || 0) + (roof.preventative_budget_estimated || 0)
      });
    });
    
    const regionalBreakdown = Array.from(regionalMap.entries()).map(([region, data]) => ({
      region,
      ...data
    })).slice(0, 8);

    // Market breakdown
    const marketMap = new Map<string, { count: number; sqFt: number }>();
    roofs.forEach(roof => {
      const market = roof.market || 'Unknown';
      const current = marketMap.get(market) || { count: 0, sqFt: 0 };
      marketMap.set(market, {
        count: current.count + 1,
        sqFt: current.sqFt + (roof.roof_area || 0)
      });
    });
    
    const marketBreakdown = Array.from(marketMap.entries()).map(([market, data]) => ({
      market,
      ...data
    })).slice(0, 6);

    // Trending issues
    const trendingIssues = [
      { type: 'Warranty Expirations', count: criticalIssues, severity: 'high' as const },
      { type: 'Leak Reports', count: propertiesWithLeaks.length, severity: 'medium' as const },
      { type: 'Pending Inspections', count: pendingInspections, severity: 'medium' as const },
      { type: 'Budget Overruns', count: Math.floor(totalRoofs * 0.15), severity: 'low' as const }
    ];

    return {
      totalRoofs,
      totalClients,
      totalContacts,
      totalSqFt,
      averagePropertyAge,
      contactsPerClient,
      dataQualityScore: dataQuality.overall,
      totalCapitalBudget,
      totalPreventativeBudget,
      budgetUtilization,
      warrantyUtilization,
      leakFrequency,
      pendingInspections,
      criticalIssues,
      completedThisMonth,
      regionalBreakdown,
      marketBreakdown,
      trendingIssues
    };
  };

  const processRegionalHierarchy = (roofsData: any[]): RegionalHierarchy => {
    const hierarchy: RegionalHierarchy = {};
    
    roofsData.forEach(roof => {
      const region = roof.region || 'Unknown Region';
      const market = roof.market || 'Unknown Market';
      const group = roof.roof_group || 'Ungrouped';
      
      if (!hierarchy[region]) {
        hierarchy[region] = {};
      }
      if (!hierarchy[region][market]) {
        hierarchy[region][market] = {};
      }
      if (!hierarchy[region][market][group]) {
        hierarchy[region][market][group] = [];
      }
      
      hierarchy[region][market][group].push(roof);
    });
    
    return hierarchy;
  };

  const toggleRegion = (region: string) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(region)) {
      newExpanded.delete(region);
    } else {
      newExpanded.add(region);
    }
    setExpandedRegions(newExpanded);
  };

  const toggleMarket = (marketKey: string) => {
    const newExpanded = new Set(expandedMarkets);
    if (newExpanded.has(marketKey)) {
      newExpanded.delete(marketKey);
    } else {
      newExpanded.add(marketKey);
    }
    setExpandedMarkets(newExpanded);
  };

  const getRegionProperties = (region: string) => {
    const markets = regionalData[region] || {};
    const allProps: any[] = [];
    Object.values(markets).forEach(groups => {
      Object.values(groups).forEach(properties => {
        allProps.push(...properties);
      });
    });
    return allProps;
  };

  const getMarketProperties = (region: string, market: string) => {
    const groups = regionalData[region]?.[market] || {};
    const allProps: any[] = [];
    Object.values(groups).forEach(properties => {
      allProps.push(...properties);
    });
    return allProps;
  };

  const getTotalBudget = (properties: any[]) => {
    return properties.reduce((sum, prop) => {
      const capital = prop.capital_budget_estimated || 0;
      const preventative = prop.preventative_budget_estimated || 0;
      return sum + capital + preventative;
    }, 0);
  };

  const getTotalSqFt = (properties: any[]) => {
    return properties.reduce((sum, prop) => sum + (prop.roof_area || 0), 0);
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
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchPortfolioData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
                {markets.map(market => (
                  <SelectItem key={market} value={market}>{market}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {propertyTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
                <SelectItem value="24months">Last 24 Months</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">High-Level KPIs</TabsTrigger>
          <TabsTrigger value="regional">Regional Breakdown</TabsTrigger>
          <TabsTrigger value="insights">Financial Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Portfolio Health Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Portfolio Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary mb-4">
                    {Math.round((metrics.dataQualityScore + metrics.warrantyUtilization + (100 - metrics.leakFrequency)) / 3)}
                  </div>
                  <p className="text-lg text-muted-foreground">Overall Health Score</p>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-2xl font-semibold">{metrics.dataQualityScore}%</div>
                      <p className="text-sm text-muted-foreground">Data Quality</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold">{metrics.warrantyUtilization}%</div>
                      <p className="text-sm text-muted-foreground">Warranty Coverage</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold">{100 - metrics.leakFrequency}%</div>
                      <p className="text-sm text-muted-foreground">Leak-Free Rate</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trending Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.trendingIssues.map((issue, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${
                          issue.severity === 'high' ? 'text-red-500' :
                          issue.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                        }`} />
                        <span className="text-sm">{issue.type}</span>
                      </div>
                      <Badge variant={
                        issue.severity === 'high' ? 'destructive' :
                        issue.severity === 'medium' ? 'default' : 'secondary'
                      }>
                        {issue.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
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
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
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
                <CardTitle className="text-sm font-medium">Avg Property Age</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.averagePropertyAge} yrs</div>
                <p className="text-xs text-muted-foreground">
                  Portfolio average
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
                  Require immediate attention
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Schedule Inspection
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                  <Wrench className="h-6 w-6" />
                  Create Work Order
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                  <FileText className="h-6 w-6" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regional" className="space-y-6">
          {/* Regional Distribution Map */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Regional Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.regionalBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Properties" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.marketBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      label={({market, count}) => `${market}: ${count}`}
                    >
                      {metrics.marketBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Regional Hierarchy */}
          <Card>
            <CardHeader>
              <CardTitle>Regional Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2">
                {Object.keys(regionalData).map(region => {
                  const markets = regionalData[region];
                  const regionProperties = getRegionProperties(region);
                  const regionTotal = regionProperties.length;
                  const regionBudget = getTotalBudget(regionProperties);
                  const regionSqFt = getTotalSqFt(regionProperties);
                  const isExpanded = expandedRegions.has(region);

                  return (
                    <div key={region} className="border-b last:border-b-0">
                      <div
                        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleRegion(region)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <MapPin className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-medium">{region}</div>
                            <div className="text-sm text-gray-500">
                              {Object.keys(markets).length} markets
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <div className="font-medium">{regionTotal} properties</div>
                            <div className="text-gray-500">{regionSqFt.toLocaleString()} sq ft</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${regionBudget.toLocaleString()}</div>
                            <div className="text-gray-500">Total budget</div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-gray-50">
                          {Object.entries(markets).map(([market, groups]) => {
                            const marketProperties = getMarketProperties(region, market);
                            const marketBudget = getTotalBudget(marketProperties);
                            const marketSqFt = getTotalSqFt(marketProperties);
                            const marketKey = `${region}-${market}`;
                            const isMarketExpanded = expandedMarkets.has(marketKey);

                            return (
                              <div key={market} className="border-t">
                                <div 
                                  className="flex items-center justify-between p-4 pl-12 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => toggleMarket(marketKey)}
                                >
                                  <div className="flex items-center gap-3">
                                    {isMarketExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    <Building className="h-4 w-4 text-green-600" />
                                    <div>
                                      <div className="font-medium">{market}</div>
                                      <div className="text-sm text-gray-500">
                                        {Object.keys(groups).length} groups, {marketProperties.length} properties
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-6 text-sm">
                                    <div className="text-right">
                                      <div className="font-medium">{marketProperties.length} properties</div>
                                      <div className="text-gray-500">{marketSqFt.toLocaleString()} sq ft</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">${marketBudget.toLocaleString()}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Capital Budget</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.totalCapitalBudget.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Total estimated capital budget
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Preventative Budget</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.totalPreventativeBudget.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Total preventative maintenance budget
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.budgetUtilization}%</div>
                <p className="text-xs text-muted-foreground">
                  Current utilization rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Budget vs Warranty Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Analysis by Region</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics.regionalBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Budget']} />
                    <Area 
                      type="monotone" 
                      dataKey="budget" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Warranty Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Warranty Coverage</span>
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
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}