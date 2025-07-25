import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Building2, 
  ClipboardCheck, 
  Wrench, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Users,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Sparkles,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart as RechartsPieChart, Cell, BarChart, Bar, Area, AreaChart } from 'recharts';
import { cn } from '@/lib/utils';

interface Widget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'list' | 'progress' | 'ai_insight';
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  data?: any;
  refreshInterval?: number;
  expanded?: boolean;
}

interface DashboardWidgetsProps {
  layout?: 'grid' | 'masonry';
  editable?: boolean;
}

export function DashboardWidgets({ layout = 'grid', editable = false }: DashboardWidgetsProps) {
  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: 'portfolio-overview',
      title: 'Portfolio Overview',
      type: 'metric',
      size: 'small',
      position: { x: 0, y: 0 }
    },
    {
      id: 'inspection-trends',
      title: 'Inspection Trends',
      type: 'chart',
      size: 'large',
      position: { x: 1, y: 0 }
    },
    {
      id: 'budget-utilization',
      title: 'Budget Utilization',
      type: 'progress',
      size: 'medium',
      position: { x: 0, y: 1 }
    },
    {
      id: 'ai-insights',
      title: 'AI Insights',
      type: 'ai_insight',
      size: 'large',
      position: { x: 1, y: 1 }
    },
    {
      id: 'recent-activity',
      title: 'Recent Activity',
      type: 'list',
      size: 'medium',
      position: { x: 2, y: 0 }
    }
  ]);

  const toggleExpanded = (widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, expanded: !widget.expanded }
        : widget
    ));
  };

  const refreshWidget = (widgetId: string) => {
    // Simulate data refresh
    console.log('Refreshing widget:', widgetId);
  };

  return (
    <div className={cn(
      "space-y-6",
      layout === 'grid' && "grid gap-6",
      "lg:grid-cols-3 md:grid-cols-2 grid-cols-1"
    )}>
      {widgets.map((widget) => (
        <WidgetContainer
          key={widget.id}
          widget={widget}
          editable={editable}
          onToggleExpanded={() => toggleExpanded(widget.id)}
          onRefresh={() => refreshWidget(widget.id)}
        />
      ))}
    </div>
  );
}

interface WidgetContainerProps {
  widget: Widget;
  editable: boolean;
  onToggleExpanded: () => void;
  onRefresh: () => void;
}

function WidgetContainer({ widget, editable, onToggleExpanded, onRefresh }: WidgetContainerProps) {
  const getSizeClasses = (size: Widget['size'], expanded?: boolean) => {
    if (expanded) return 'col-span-full row-span-2';
    
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 md:col-span-2';
      case 'large': return 'col-span-1 md:col-span-2 lg:col-span-2';
      default: return 'col-span-1';
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-lg",
      getSizeClasses(widget.size, widget.expanded)
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onRefresh} className="h-6 w-6 p-0">
            <RefreshCw className="h-3 w-3" />
          </Button>
          {editable && (
            <>
              <Button variant="ghost" size="sm" onClick={onToggleExpanded} className="h-6 w-6 p-0">
                {widget.expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <WidgetContent widget={widget} />
      </CardContent>
    </Card>
  );
}

function WidgetContent({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case 'metric':
      return <MetricWidget />;
    case 'chart':
      return <ChartWidget />;
    case 'progress':
      return <ProgressWidget />;
    case 'ai_insight':
      return <AIInsightWidget />;
    case 'list':
      return <ListWidget />;
    default:
      return <div>Unknown widget type</div>;
  }
}

function MetricWidget() {
  const metrics = [
    { label: 'Total Properties', value: 247, change: +12, icon: Building2, color: 'text-blue-500' },
    { label: 'Active Inspections', value: 18, change: +3, icon: ClipboardCheck, color: 'text-green-500' },
    { label: 'Pending Work Orders', value: 7, change: -2, icon: Wrench, color: 'text-orange-500' },
    { label: 'Budget Remaining', value: '$1.2M', change: -5, icon: DollarSign, color: 'text-purple-500' }
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((metric, index) => (
        <div key={index} className="text-center">
          <div className={cn('mx-auto mb-2 p-2 rounded-lg w-fit', 
            metric.color.replace('text-', 'bg-').replace('-500', '-100')
          )}>
            <metric.icon className={cn('h-4 w-4', metric.color)} />
          </div>
          <div className="text-2xl font-bold">{metric.value}</div>
          <p className="text-xs text-muted-foreground">{metric.label}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            {metric.change > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={cn(
              'text-xs font-medium',
              metric.change > 0 ? 'text-green-500' : 'text-red-500'
            )}>
              {Math.abs(metric.change)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartWidget() {
  const data = [
    { month: 'Jan', inspections: 45, workOrders: 12 },
    { month: 'Feb', inspections: 52, workOrders: 19 },
    { month: 'Mar', inspections: 48, workOrders: 15 },
    { month: 'Apr', inspections: 61, workOrders: 22 },
    { month: 'May', inspections: 55, workOrders: 18 },
    { month: 'Jun', inspections: 67, workOrders: 25 }
  ];

  return (
    <Tabs defaultValue="line" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="line">Trends</TabsTrigger>
        <TabsTrigger value="bar">Compare</TabsTrigger>
        <TabsTrigger value="area">Area</TabsTrigger>
      </TabsList>
      
      <TabsContent value="line">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="inspections" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="workOrders" stroke="#f59e0b" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </TabsContent>
      
      <TabsContent value="bar">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="inspections" fill="#3b82f6" />
            <Bar dataKey="workOrders" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </TabsContent>
      
      <TabsContent value="area">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="inspections" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            <Area type="monotone" dataKey="workOrders" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </TabsContent>
    </Tabs>
  );
}

function ProgressWidget() {
  const budgetData = [
    { category: 'Capital Projects', used: 75, total: 100, color: 'bg-blue-500' },
    { category: 'Preventative Maintenance', used: 60, total: 100, color: 'bg-green-500' },
    { category: 'Emergency Repairs', used: 30, total: 100, color: 'bg-red-500' },
    { category: 'Inspections', used: 85, total: 100, color: 'bg-purple-500' }
  ];

  return (
    <div className="space-y-4">
      {budgetData.map((item, index) => (
        <div key={index}>
          <div className="flex justify-between text-sm mb-1">
            <span>{item.category}</span>
            <span className="text-muted-foreground">{item.used}%</span>
          </div>
          <Progress value={item.used} className="h-2" />
        </div>
      ))}
      <div className="mt-4 p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">Budget Health: Good</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          All categories are within expected ranges for this quarter.
        </p>
      </div>
    </div>
  );
}

function AIInsightWidget() {
  const insights = [
    {
      title: 'Cost Optimization Opportunity',
      description: 'Bundling 15 pending inspections could save $2,400',
      impact: 'High',
      confidence: 92,
      action: 'Schedule Bundle'
    },
    {
      title: 'Maintenance Prediction',
      description: 'Dallas Corporate Center likely needs maintenance within 60 days',
      impact: 'Medium',
      confidence: 78,
      action: 'Schedule Inspection'
    },
    {
      title: 'Vendor Performance Alert',
      description: 'ABC Roofing has 15% longer completion times recently',
      impact: 'Low',
      confidence: 85,
      action: 'Review Performance'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium">AI-Powered Insights</span>
        <Badge variant="secondary" className="text-xs">Live</Badge>
      </div>
      
      {insights.map((insight, index) => (
        <div key={index} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-medium">{insight.title}</h4>
            <Badge variant={
              insight.impact === 'High' ? 'destructive' : 
              insight.impact === 'Medium' ? 'default' : 'secondary'
            } className="text-xs">
              {insight.impact}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">
            {insight.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <div className="flex items-center gap-1">
                <Progress value={insight.confidence} className="h-1 w-16" />
                <span className="text-xs font-medium">{insight.confidence}%</span>
              </div>
            </div>
            
            <Button variant="outline" size="sm" className="text-xs h-6">
              {insight.action}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListWidget() {
  const activities = [
    {
      id: 1,
      type: 'inspection',
      title: 'Inspection completed at Dallas Corporate Center',
      timestamp: '2 hours ago',
      status: 'completed',
      icon: ClipboardCheck,
      color: 'text-green-500'
    },
    {
      id: 2,
      type: 'work_order',
      title: 'Work order assigned to ABC Roofing',
      timestamp: '4 hours ago',
      status: 'assigned',
      icon: Wrench,
      color: 'text-blue-500'
    },
    {
      id: 3,
      type: 'campaign',
      title: 'Q1 Inspections campaign 85% complete',
      timestamp: '6 hours ago',
      status: 'in_progress',
      icon: Users,
      color: 'text-purple-500'
    },
    {
      id: 4,
      type: 'alert',
      title: 'Warranty expiration alert for 3 properties',
      timestamp: '1 day ago',
      status: 'alert',
      icon: AlertTriangle,
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
          <div className={cn('mt-0.5', activity.color)}>
            <activity.icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight">
              {activity.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {activity.timestamp}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {activity.status}
          </Badge>
        </div>
      ))}
      
      <div className="pt-2 border-t">
        <Button variant="ghost" size="sm" className="w-full text-xs">
          View All Activity
        </Button>
      </div>
    </div>
  );
}