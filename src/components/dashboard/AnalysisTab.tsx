import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Calendar, BarChart3, FileDown } from "lucide-react";

export function AnalysisTab() {
  return (
    <div className="p-6 space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select defaultValue="yearly">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="industrial">Industrial</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$247,390</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              +23% from last year
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inspection Efficiency</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              +5.2% this quarter
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3 days</div>
            <div className="flex items-center text-xs text-red-600">
              <TrendingDown className="h-4 w-4 mr-1" />
              -18% improvement
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Low</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingDown className="h-4 w-4 mr-1" />
              Reduced from Medium
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Cost Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { category: "Emergency Repairs", amount: 125000, percentage: 32, trend: "up" },
                { category: "Routine Maintenance", amount: 89000, percentage: 23, trend: "down" },
                { category: "Preventive Inspections", amount: 67000, percentage: 17, trend: "stable" },
                { category: "Material Replacement", amount: 45000, percentage: 12, trend: "up" },
                { category: "Equipment Upgrades", amount: 38000, percentage: 10, trend: "down" }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-sm text-gray-500">${item.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{item.percentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { risk: "Warranty Expirations", count: 8, severity: "high", description: "Properties with warranties expiring in 30 days" },
                { risk: "Overdue Inspections", count: 12, severity: "medium", description: "Inspections past scheduled date" },
                { risk: "High Leak History", count: 5, severity: "high", description: "Properties with 3+ leaks in past 12 months" },
                { risk: "Aging Roof Systems", count: 23, severity: "low", description: "Roofs over 15 years old" },
                { risk: "Weather Damage Risk", count: 7, severity: "medium", description: "Properties in high-risk weather zones" }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.risk}</span>
                      <Badge variant={
                        item.severity === "high" ? "destructive" :
                        item.severity === "medium" ? "secondary" : "outline"
                      }>
                        {item.count} properties
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">↗ 15%</div>
              <p className="text-sm text-gray-600">Inspection Completion Rate</p>
              <p className="text-xs text-gray-500 mt-1">vs last quarter</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">↘ 8%</div>
              <p className="text-sm text-gray-600">Average Repair Costs</p>
              <p className="text-xs text-gray-500 mt-1">vs last quarter</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">↗ 12%</div>
              <p className="text-sm text-gray-600">Client Satisfaction</p>
              <p className="text-xs text-gray-500 mt-1">vs last quarter</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}