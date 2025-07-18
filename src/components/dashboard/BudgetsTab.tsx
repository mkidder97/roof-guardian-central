import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Search, Download, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BudgetData {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  // Capital Budget
  capital_budget_year: number | null;
  capital_budget_estimated: number | null;
  capital_budget_actual: string | null;
  capital_budget_category: string | null;
  capital_budget_scope_of_work: string | null;
  capital_budget_completed: string | null;
  // Preventative Budget
  preventative_budget_year: number | null;
  preventative_budget_estimated: number | null;
  preventative_budget_actual: string | null;
  preventative_budget_category: string | null;
  preventative_budget_scope_of_work: string | null;
  preventative_budget_completed: string | null;
}

export function BudgetsTab() {
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [filteredBudgets, setFilteredBudgets] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");

  useEffect(() => {
    fetchBudgets();
  }, []);

  useEffect(() => {
    filterBudgets();
  }, [budgets, searchTerm, yearFilter, categoryFilter, completionFilter]);

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from('roofs')
        .select(`
          id,
          property_name,
          address,
          city,
          state,
          capital_budget_year,
          capital_budget_estimated,
          capital_budget_actual,
          capital_budget_category,
          capital_budget_scope_of_work,
          capital_budget_completed,
          preventative_budget_year,
          preventative_budget_estimated,
          preventative_budget_actual,
          preventative_budget_category,
          preventative_budget_scope_of_work,
          preventative_budget_completed
        `)
        .eq('is_deleted', false)
        .order('property_name');

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBudgets = () => {
    let filtered = budgets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((budget) =>
        budget.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        budget.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        budget.capital_budget_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        budget.preventative_budget_category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Year filter
    if (yearFilter !== "all") {
      filtered = filtered.filter((budget) =>
        budget.capital_budget_year?.toString() === yearFilter ||
        budget.preventative_budget_year?.toString() === yearFilter
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((budget) =>
        budget.capital_budget_category === categoryFilter ||
        budget.preventative_budget_category === categoryFilter
      );
    }

    // Completion filter
    if (completionFilter !== "all") {
      filtered = filtered.filter((budget) => {
        const capitalCompleted = budget.capital_budget_completed?.toLowerCase() === 'yes';
        const preventativeCompleted = budget.preventative_budget_completed?.toLowerCase() === 'yes';
        
        if (completionFilter === "completed") {
          return capitalCompleted || preventativeCompleted;
        } else if (completionFilter === "pending") {
          return !capitalCompleted && !preventativeCompleted;
        }
        return true;
      });
    }

    setFilteredBudgets(filtered);
  };

  const parseAmount = (value: string | number | null): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const cleanValue = value.toString().replace(/[,$]/g, '');
    return parseFloat(cleanValue) || 0;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVariance = (estimated: number | null, actual: string | null): number => {
    if (!estimated || !actual) return 0;
    const actualAmount = parseAmount(actual);
    return actualAmount - estimated;
  };

  const getVarianceBadge = (variance: number) => {
    if (variance === 0) {
      return <Badge variant="outline" className="flex items-center gap-1"><Minus className="w-3 h-3" />On Budget</Badge>;
    } else if (variance > 0) {
      return <Badge variant="destructive" className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />Over by {formatCurrency(variance)}</Badge>;
    } else {
      return <Badge variant="default" className="flex items-center gap-1"><TrendingDown className="w-3 h-3" />Under by {formatCurrency(Math.abs(variance))}</Badge>;
    }
  };

  const getUniqueValues = (field: keyof BudgetData) => {
    const values = budgets.map(b => b[field]).filter(Boolean) as string[];
    return [...new Set(values)].sort();
  };

  const exportBudgets = (type: 'capital' | 'preventative') => {
    const headers = type === 'capital' 
      ? ["Property Name", "Location", "Year", "Category", "Estimated", "Actual", "Scope of Work", "Completed", "Variance"]
      : ["Property Name", "Location", "Year", "Category", "Estimated", "Actual", "Scope of Work", "Completed", "Variance"];

    const csvContent = [
      headers,
      ...filteredBudgets.map(budget => {
        if (type === 'capital') {
          const variance = getVariance(budget.capital_budget_estimated, budget.capital_budget_actual);
          return [
            budget.property_name,
            `${budget.address}, ${budget.city}, ${budget.state}`,
            budget.capital_budget_year?.toString() || "N/A",
            budget.capital_budget_category || "N/A",
            budget.capital_budget_estimated ? formatCurrency(budget.capital_budget_estimated) : "N/A",
            budget.capital_budget_actual || "N/A",
            budget.capital_budget_scope_of_work || "N/A",
            budget.capital_budget_completed || "N/A",
            variance !== 0 ? formatCurrency(variance) : "On Budget"
          ];
        } else {
          const variance = getVariance(budget.preventative_budget_estimated, budget.preventative_budget_actual);
          return [
            budget.property_name,
            `${budget.address}, ${budget.city}, ${budget.state}`,
            budget.preventative_budget_year?.toString() || "N/A",
            budget.preventative_budget_category || "N/A",
            budget.preventative_budget_estimated ? formatCurrency(budget.preventative_budget_estimated) : "N/A",
            budget.preventative_budget_actual || "N/A",
            budget.preventative_budget_scope_of_work || "N/A",
            budget.preventative_budget_completed || "N/A",
            variance !== 0 ? formatCurrency(variance) : "On Budget"
          ];
        }
      })
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-budgets-report.csv`;
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

  const capitalBudgets = filteredBudgets.filter(b => b.capital_budget_year || b.capital_budget_estimated);
  const preventativeBudgets = filteredBudgets.filter(b => b.preventative_budget_year || b.preventative_budget_estimated);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-semibold">Budget Management</h2>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search properties, categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Budget Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {getUniqueValues('capital_budget_year').concat(getUniqueValues('preventative_budget_year'))
                  .filter((value, index, self) => self.indexOf(value) === index)
                  .map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getUniqueValues('capital_budget_category').concat(getUniqueValues('preventative_budget_category'))
                  .filter((value, index, self) => self.indexOf(value) === index)
                  .map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={completionFilter} onValueChange={setCompletionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Completion Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Budget Tabs */}
      <Tabs defaultValue="capital" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="capital">Capital Budgets</TabsTrigger>
          <TabsTrigger value="preventative">Preventative Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="capital" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Capital Budget Analysis ({capitalBudgets.length} properties)</h3>
            <Button onClick={() => exportBudgets('capital')} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export Capital Report</span>
            </Button>
          </div>

          <Card>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Estimated</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scope of Work</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capitalBudgets.map((budget) => {
                      const variance = getVariance(budget.capital_budget_estimated, budget.capital_budget_actual);
                      return (
                        <TableRow key={budget.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{budget.property_name}</div>
                              <div className="text-sm text-gray-500">{budget.city}, {budget.state}</div>
                            </div>
                          </TableCell>
                          <TableCell>{budget.capital_budget_year || "N/A"}</TableCell>
                          <TableCell>{budget.capital_budget_category || "N/A"}</TableCell>
                          <TableCell>
                            {budget.capital_budget_estimated ? formatCurrency(budget.capital_budget_estimated) : "N/A"}
                          </TableCell>
                          <TableCell>{budget.capital_budget_actual || "N/A"}</TableCell>
                          <TableCell>{getVarianceBadge(variance)}</TableCell>
                          <TableCell>
                            <Badge variant={budget.capital_budget_completed?.toLowerCase() === 'yes' ? "default" : "outline"}>
                              {budget.capital_budget_completed?.toLowerCase() === 'yes' ? "Completed" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {budget.capital_budget_scope_of_work || "N/A"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preventative" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Preventative Budget Analysis ({preventativeBudgets.length} properties)</h3>
            <Button onClick={() => exportBudgets('preventative')} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export Preventative Report</span>
            </Button>
          </div>

          <Card>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Estimated</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scope of Work</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preventativeBudgets.map((budget) => {
                      const variance = getVariance(budget.preventative_budget_estimated, budget.preventative_budget_actual);
                      return (
                        <TableRow key={budget.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{budget.property_name}</div>
                              <div className="text-sm text-gray-500">{budget.city}, {budget.state}</div>
                            </div>
                          </TableCell>
                          <TableCell>{budget.preventative_budget_year || "N/A"}</TableCell>
                          <TableCell>{budget.preventative_budget_category || "N/A"}</TableCell>
                          <TableCell>
                            {budget.preventative_budget_estimated ? formatCurrency(budget.preventative_budget_estimated) : "N/A"}
                          </TableCell>
                          <TableCell>{budget.preventative_budget_actual || "N/A"}</TableCell>
                          <TableCell>{getVarianceBadge(variance)}</TableCell>
                          <TableCell>
                            <Badge variant={budget.preventative_budget_completed?.toLowerCase() === 'yes' ? "default" : "outline"}>
                              {budget.preventative_budget_completed?.toLowerCase() === 'yes' ? "Completed" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {budget.preventative_budget_scope_of_work || "N/A"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}