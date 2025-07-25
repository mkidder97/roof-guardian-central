import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Shield,
  Wrench,
  Brain,
  RefreshCw,
  Download,
  Filter,
  ChevronRight,
  Building2,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { riskAnalysisEngine, RiskAnalysis, Recommendation } from '@/lib/risk-analysis';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function RiskAnalysisDashboard() {
  const [analyses, setAnalyses] = useState<RiskAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<RiskAnalysis | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'risk' | 'cost' | 'date'>('risk');

  useEffect(() => {
    loadRiskAnalyses();
  }, []);

  const loadRiskAnalyses = async () => {
    try {
      setLoading(true);
      const portfolioAnalysis = await riskAnalysisEngine.analyzePortfolio();
      setAnalyses(portfolioAnalysis);
    } catch (error) {
      console.error('Failed to load risk analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAnalyses = () => {
    let filtered = analyses;
    
    if (filterLevel !== 'all') {
      filtered = filtered.filter(analysis => analysis.riskLevel === filterLevel);
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'risk':
          return b.riskScore - a.riskScore;
        case 'cost':
          return b.costEstimate - a.costEstimate;
        case 'date':
          return new Date(a.predictedMaintenanceDate).getTime() - new Date(b.predictedMaintenanceDate).getTime();
        default:
          return 0;
      }
    });
  };

  const getPortfolioSummary = () => {
    const total = analyses.length;
    const critical = analyses.filter(a => a.riskLevel === 'critical').length;
    const high = analyses.filter(a => a.riskLevel === 'high').length;
    const medium = analyses.filter(a => a.riskLevel === 'medium').length;
    const low = analyses.filter(a => a.riskLevel === 'low').length;
    
    const totalCost = analyses.reduce((sum, a) => sum + a.costEstimate, 0);
    const averageRisk = analyses.reduce((sum, a) => sum + a.riskScore, 0) / total;
    
    return { total, critical, high, medium, low, totalCost, averageRisk };
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRiskLevelBadge = (level: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    
    return (
      <Badge className={cn('capitalize', colors[level as keyof typeof colors])}>
        {level}
      </Badge>
    );
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Zap className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Calendar className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Shield className="h-4 w-4 text-green-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const exportAnalysis = () => {
    const csvData = analyses.map(analysis => ({
      'Property': analysis.propertyName,
      'Risk Score': analysis.riskScore,
      'Risk Level': analysis.riskLevel,
      'Predicted Maintenance': format(new Date(analysis.predictedMaintenanceDate), 'yyyy-MM-dd'),
      'Cost Estimate': analysis.costEstimate,
      'Confidence': (analysis.confidenceScore * 100).toFixed(1) + '%',
      'Top Recommendation': analysis.recommendations[0]?.description || 'None'
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAnalyses = getFilteredAnalyses();
  const summary = getPortfolioSummary();

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="h-8 w-8 animate-pulse text-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Analyzing risk patterns...</p>
          </div>
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
            <Brain className="h-6 w-6 text-blue-600" />
            AI Risk Analysis
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Predictive maintenance insights powered by machine learning
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={exportAnalysis}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={loadRiskAnalyses} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Properties</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Risk Score</p>
                <p className="text-2xl font-bold">{summary.averageRisk.toFixed(1)}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost Estimate</p>
                <p className="text-2xl font-bold">${(summary.totalCost / 1000).toFixed(0)}K</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Risk Properties</p>
                <p className="text-2xl font-bold text-red-600">{summary.critical + summary.high}</p>
              </div>
              <Zap className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Risk Distribution</CardTitle>
          <CardDescription>
            Portfolio risk breakdown by severity level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="font-medium">Critical</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                <span className="font-medium">High</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{summary.high}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                <span className="font-medium">Medium</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{summary.medium}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="font-medium">Low</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{summary.low}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Controls */}
      <div className="flex items-center gap-4">
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="risk">Risk Score</SelectItem>
            <SelectItem value="cost">Cost Estimate</SelectItem>
            <SelectItem value="date">Maintenance Date</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-gray-600">
          Showing {filteredAnalyses.length} of {analyses.length} properties
        </div>
      </div>

      {/* Properties List */}
      <div className="grid gap-4">
        {filteredAnalyses.map((analysis) => (
          <Card 
            key={analysis.propertyId}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedProperty(analysis);
              setDetailsOpen(true);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{analysis.propertyName}</h3>
                    {getRiskLevelBadge(analysis.riskLevel)}
                    <Badge variant="outline" className="text-xs">
                      {(analysis.confidenceScore * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-gray-500" />
                      <span>Risk Score: <span className="font-medium">{analysis.riskScore.toFixed(1)}</span></span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>Maintenance: <span className="font-medium">
                        {format(new Date(analysis.predictedMaintenanceDate), 'MMM dd, yyyy')}
                      </span></span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span>Est. Cost: <span className="font-medium">
                        ${analysis.costEstimate.toLocaleString()}
                      </span></span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-gray-500" />
                      <span>Actions: <span className="font-medium">
                        {analysis.recommendations.length} recommendations
                      </span></span>
                    </div>
                  </div>
                  
                  {analysis.recommendations.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      {getPriorityIcon(analysis.recommendations[0].priority)}
                      <span className="text-gray-600">
                        Next: {analysis.recommendations[0].description}
                      </span>
                    </div>
                  )}
                </div>
                
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
              
              {/* Risk Score Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Risk Score</span>
                  <span>{analysis.riskScore.toFixed(1)}/100</span>
                </div>
                <Progress 
                  value={analysis.riskScore} 
                  className="h-2"
                  style={{
                    '--progress-background': analysis.riskScore >= 80 ? '#ef4444' :
                                           analysis.riskScore >= 60 ? '#f97316' :
                                           analysis.riskScore >= 35 ? '#eab308' : '#22c55e'
                  } as React.CSSProperties}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAnalyses.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No analysis data available</h3>
            <p className="text-gray-600 mt-2">
              {analyses.length === 0 
                ? "Run the risk analysis to see predictive insights for your properties."
                : "No properties match the current filter criteria."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Property Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {selectedProperty?.propertyName} - Risk Analysis
            </DialogTitle>
            <DialogDescription>
              Detailed predictive insights and maintenance recommendations
            </DialogDescription>
          </DialogHeader>
          
          {selectedProperty && (
            <Tabs defaultValue="overview" className="flex-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="h-[500px] mt-4">
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Risk Score</span>
                          {getRiskLevelBadge(selectedProperty.riskLevel)}
                        </div>
                        <p className="text-2xl font-bold">{selectedProperty.riskScore.toFixed(1)}/100</p>
                        <Progress value={selectedProperty.riskScore} className="mt-2" />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium">Predicted Maintenance</span>
                        </div>
                        <p className="text-lg font-semibold">
                          {format(new Date(selectedProperty.predictedMaintenanceDate), 'MMMM dd, yyyy')}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm font-medium">Estimated Cost</span>
                        </div>
                        <p className="text-lg font-semibold">
                          ${selectedProperty.costEstimate.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4" />
                          <span className="text-sm font-medium">Confidence Level</span>
                        </div>
                        <p className="text-lg font-semibold">
                          {(selectedProperty.confidenceScore * 100).toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="recommendations" className="space-y-4">
                  {selectedProperty.recommendations.map((rec, index) => (
                    <Card key={rec.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(rec.priority)}
                            <span className="font-medium">{rec.description}</span>
                          </div>
                          <Badge className={cn(
                            'capitalize',
                            rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          )}>
                            {rec.priority}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                          <div>
                            <span className="text-gray-600">Timeframe:</span>
                            <p className="font-medium">{rec.timeframe}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Cost:</span>
                            <p className="font-medium">${rec.estimatedCost.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Risk Reduction:</span>
                            <p className="font-medium">{rec.riskReduction}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                
                <TabsContent value="trends" className="space-y-4">
                  {selectedProperty.trends.map((trend, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{trend.metric}</span>
                          <div className="flex items-center gap-2">
                            {trend.direction === 'improving' ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : trend.direction === 'declining' ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <div className="w-4 h-1 bg-gray-400 rounded" />
                            )}
                            <span className="text-sm capitalize">{trend.direction}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Change Rate:</span>
                            <p className="font-medium">{trend.changeRate.toFixed(1)}%</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Timeframe:</span>
                            <p className="font-medium">{trend.timeframe}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Significance:</span>
                            <p className="font-medium">{(trend.significanceLevel * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}