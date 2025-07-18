import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PropertyManagerData {
  manager: string;
  properties: number;
  totalSqFt: number;
  costPerSqFt: number;
  warrantyRate: number;
  leakRate: number;
  budgetVariance: number;
}

export function PropertyManagerPerformance() {
  const [performanceData, setPerformanceData] = useState<PropertyManagerData[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('PropertyManagerPerformance component rendered', { performanceData, loading });

  useEffect(() => {
    const fetchPropertyManagerData = async () => {
      try {
        const { data: roofs, error } = await supabase
          .from('roofs')
          .select(`
            site_contact,
            roof_area,
            capital_budget_estimated,
            preventative_budget_estimated,
            manufacturer_has_warranty,
            installer_has_warranty,
            total_leaks_12mo,
            capital_budget_actual,
            preventative_budget_actual
          `)
          .not('site_contact', 'is', null);

        if (error) throw error;

        // Group by property manager and calculate metrics
        const managerStats = new Map<string, {
          properties: number;
          totalSqFt: number;
          totalBudget: number;
          totalActual: number;
          warrantyCount: number;
          totalLeaks: number;
        }>();

        roofs?.forEach(roof => {
          const manager = roof.site_contact || 'Unknown';
          const roofArea = roof.roof_area || 0;
          const estimatedBudget = (roof.capital_budget_estimated || 0) + (roof.preventative_budget_estimated || 0);
          
          // Parse actual budget values more carefully
          const parseActualValue = (value: string | null): number => {
            if (!value) return 0;
            // Remove currency symbols, commas, and other non-numeric characters except decimal points and minus signs
            const cleaned = value.replace(/[^\d.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          };
          
          const actualBudget = parseActualValue(roof.capital_budget_actual) + parseActualValue(roof.preventative_budget_actual);
          const hasWarranty = roof.manufacturer_has_warranty || roof.installer_has_warranty;
          const leaks = parseInt(roof.total_leaks_12mo || '0', 10);

          if (!managerStats.has(manager)) {
            managerStats.set(manager, {
              properties: 0,
              totalSqFt: 0,
              totalBudget: 0,
              totalActual: 0,
              warrantyCount: 0,
              totalLeaks: 0
            });
          }

          const stats = managerStats.get(manager)!;
          stats.properties += 1;
          stats.totalSqFt += roofArea;
          stats.totalBudget += estimatedBudget;
          stats.totalActual += actualBudget;
          stats.warrantyCount += hasWarranty ? 1 : 0;
          stats.totalLeaks += leaks;
        });

        // Convert to performance data array
        const performanceArray: PropertyManagerData[] = Array.from(managerStats.entries()).map(([manager, stats]) => ({
          manager,
          properties: stats.properties,
          totalSqFt: stats.totalSqFt,
          costPerSqFt: stats.totalSqFt > 0 ? stats.totalBudget / stats.totalSqFt : 0,
          warrantyRate: stats.properties > 0 ? (stats.warrantyCount / stats.properties) * 100 : 0,
          leakRate: stats.totalSqFt > 0 ? (stats.totalLeaks / stats.totalSqFt) * 100 : 0,
          budgetVariance: stats.totalBudget > 0 ? ((stats.totalActual - stats.totalBudget) / stats.totalBudget) * 100 : (stats.totalActual > 0 ? 100 : 0)
        }));

        // Sort by total square footage descending
        performanceArray.sort((a, b) => b.totalSqFt - a.totalSqFt);

        setPerformanceData(performanceArray);
      } catch (error) {
        console.error('Error fetching property manager data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyManagerData();
  }, []);

  const getBudgetVarianceColor = (variance: number) => {
    if (variance > 10) return 'text-red-600 bg-red-100';
    if (variance < -10) return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getWarrantyRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Property Manager Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading performance data...</div>
        </CardContent>
      </Card>
    );
  }

  if (performanceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Property Manager Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">No Property Manager Data</h4>
            <p className="text-gray-500 mb-4">
              Property manager names need to be populated in your roof data to see performance analytics.
            </p>
            <p className="text-sm text-gray-400">
              Import updated data or manually assign property managers to see performance metrics.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Property Manager Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manager</TableHead>
                <TableHead className="text-right">Properties</TableHead>
                <TableHead className="text-right">Total Sq Ft</TableHead>
                <TableHead className="text-right">Cost/Sq Ft</TableHead>
                <TableHead className="text-right">Warranty Rate</TableHead>
                <TableHead className="text-right">Leak Rate</TableHead>
                <TableHead className="text-right">Budget Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceData.map((manager, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{manager.manager}</TableCell>
                  <TableCell className="text-right">{manager.properties}</TableCell>
                  <TableCell className="text-right">{manager.totalSqFt.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${manager.costPerSqFt.toFixed(2)}</TableCell>
                  <TableCell className={`text-right ${getWarrantyRateColor(manager.warrantyRate)}`}>
                    {manager.warrantyRate.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {manager.leakRate.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="outline" 
                      className={getBudgetVarianceColor(manager.budgetVariance)}
                    >
                      <div className="flex items-center gap-1">
                        {manager.budgetVariance > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : manager.budgetVariance < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : null}
                        {manager.budgetVariance > 0 ? '+' : ''}{manager.budgetVariance.toFixed(0)}%
                      </div>
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}