import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Building2,
  BarChart3
} from 'lucide-react';

interface AnalyticsData {
  period: string;
  inspectionsCompleted: number;
  averageInspectionTime: number;
  criticalIssuesFound: number;
  inspectorEfficiency: Array<{
    name: string;
    completed: number;
    avgTime: number;
    criticalFound: number;
  }>;
  trends: {
    inspections: number; // percentage change
    avgTime: number;
    criticalIssues: number;
  };
}

export function PerformanceAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics(selectedPeriod);
  }, [selectedPeriod]);

  const loadAnalytics = async (period: string) => {
    setLoading(true);
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: AnalyticsData = {
        period,
        inspectionsCompleted: period === '7d' ? 23 : period === '30d' ? 89 : 342,
        averageInspectionTime: period === '7d' ? 95 : period === '30d' ? 102 : 98,
        criticalIssuesFound: period === '7d' ? 8 : period === '30d' ? 27 : 95,
        inspectorEfficiency: [
          { name: 'John Smith', completed: 8, avgTime: 87, criticalFound: 3 },
          { name: 'Sarah Johnson', completed: 6, avgTime: 92, criticalFound: 2 },
          { name: 'Mike Wilson', completed: 5, avgTime: 105, criticalFound: 2 },
          { name: 'Lisa Chen', completed: 4, avgTime: 98, criticalFound: 1 }
        ],
        trends: {
          inspections: period === '7d' ? 12.5 : period === '30d' ? 8.3 : 15.2,
          avgTime: period === '7d' ? -5.2 : period === '30d' ? 2.1 : -3.8,
          criticalIssues: period === '7d' ? 25.0 : period === '30d' ? -12.5 : 8.7
        }
      };
      
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const TrendIndicator = ({ value }: { value: number }) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    
    if (Math.abs(value) < 0.1) {
      return <span className="text-gray-500 text-sm">No change</span>;
    }
    
    return (
      <div className={`flex items-center gap-1 text-sm ${
        isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
      }`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span>{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  };

  const MetricCard = ({ title, value, unit, trend, icon: Icon, description }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <TrendIndicator value={trend} />
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold">
            {value}{unit}
          </div>
          <div className="text-sm font-medium text-gray-900">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Performance Analytics</h2>
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Failed to load analytics data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Performance Analytics</h2>
          <p className="text-muted-foreground">Track inspection performance and efficiency</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Inspections Completed"
          value={analyticsData.inspectionsCompleted}
          unit=""
          trend={analyticsData.trends.inspections}
          icon={CheckCircle}
          description={`Total completed in ${selectedPeriod.replace('d', ' days')}`}
        />
        <MetricCard
          title="Average Inspection Time"
          value={analyticsData.averageInspectionTime}
          unit=" min"
          trend={analyticsData.trends.avgTime}
          icon={Clock}
          description="Time from start to completion"
        />
        <MetricCard
          title="Critical Issues Found"
          value={analyticsData.criticalIssuesFound}
          unit=""
          trend={analyticsData.trends.criticalIssues}
          icon={AlertTriangle}
          description="Issues requiring immediate attention"
        />
      </div>

      {/* Inspector Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Inspector Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.inspectorEfficiency.map((inspector, index) => (
              <div key={inspector.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{inspector.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {inspector.completed} completed • {inspector.avgTime}min avg
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="text-xs">
                    {inspector.criticalFound} critical
                  </Badge>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {((inspector.completed / analyticsData.inspectionsCompleted) * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">of total</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Efficiency Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-green-800">High Performance</div>
                <div className="text-xs text-green-700">
                  John Smith consistently delivers fast, thorough inspections
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-yellow-800">Attention Needed</div>
                <div className="text-xs text-yellow-700">
                  Mike Wilson's inspection times are above average
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Critical Issue Detection Rate</span>
                <span className="font-medium">
                  {((analyticsData.criticalIssuesFound / analyticsData.inspectionsCompleted) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full"
                  style={{ 
                    width: `${Math.min(((analyticsData.criticalIssuesFound / analyticsData.inspectionsCompleted) * 100), 100)}%` 
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Completion Rate</span>
                <span className="font-medium">96.8%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '96.8%' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}