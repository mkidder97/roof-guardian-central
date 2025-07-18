import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, DollarSign, AlertTriangle, Wrench, FileText, Download, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface MaintenanceRecord {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  total_leaks_12mo: string | null;
  total_leak_expense_12mo: string | null;
  last_inspection_date: string | null;
  next_inspection_due: string | null;
  repair_contractor: string | null;
  preventative_budget_estimated: number | null;
  preventative_budget_actual: string | null;
  capital_budget_estimated: number | null;
  capital_budget_actual: string | null;
  roof_type: string | null;
  install_year: number | null;
  region: string | null;
  market: string | null;
}

interface MaintenanceSummary {
  totalLeaks: number;
  totalCosts: number;
  overdueInspections: number;
  averageLeakCost: number;
  topContractors: { name: string; count: number }[];
}

export function MaintenanceTab() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[]>([]);
  const [summary, setSummary] = useState<MaintenanceSummary>({
    totalLeaks: 0,
    totalCosts: 0,
    overdueInspections: 0,
    averageLeakCost: 0,
    topContractors: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [contractorFilter, setContractorFilter] = useState<string>("");
  const [leakFilter, setLeakFilter] = useState<string>("");

  const [regions, setRegions] = useState<string[]>([]);
  const [contractors, setContractors] = useState<string[]>([]);

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, regionFilter, contractorFilter, leakFilter, records]);

  const fetchMaintenanceData = async () => {
    try {
      const { data, error } = await supabase
        .from('roofs')
        .select(`
          id,
          property_name,
          address,
          city,
          state,
          total_leaks_12mo,
          total_leak_expense_12mo,
          last_inspection_date,
          next_inspection_due,
          repair_contractor,
          preventative_budget_estimated,
          preventative_budget_actual,
          capital_budget_estimated,
          capital_budget_actual,
          roof_type,
          install_year,
          region,
          market
        `)
        .eq('is_deleted', false)
        .order('total_leak_expense_12mo', { ascending: false });

      if (error) throw error;

      const maintenanceRecords = data || [];
      setRecords(maintenanceRecords);

      // Extract unique values for filters
      const uniqueRegions = [...new Set(maintenanceRecords.map(r => r.region).filter(Boolean))].sort();
      const uniqueContractors = [...new Set(maintenanceRecords.map(r => r.repair_contractor).filter(Boolean))].sort();
      
      setRegions(uniqueRegions);
      setContractors(uniqueContractors);

      // Calculate summary stats
      calculateSummary(maintenanceRecords);
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: MaintenanceRecord[]) => {
    const totalLeaks = data.reduce((sum, record) => {
      const leaks = parseInt(record.total_leaks_12mo || '0');
      return sum + leaks;
    }, 0);

    const totalCosts = data.reduce((sum, record) => {
      const cost = parseFloat(record.total_leak_expense_12mo || '0');
      return sum + cost;
    }, 0);

    const today = new Date();
    const overdueInspections = data.filter(record => {
      if (!record.next_inspection_due) return false;
      const dueDate = new Date(record.next_inspection_due);
      return dueDate < today;
    }).length;

    const averageLeakCost = totalLeaks > 0 ? totalCosts / totalLeaks : 0;

    // Top contractors by building count
    const contractorCounts: { [key: string]: number } = {};
    data.forEach(record => {
      if (record.repair_contractor) {
        contractorCounts[record.repair_contractor] = (contractorCounts[record.repair_contractor] || 0) + 1;
      }
    });

    const topContractors = Object.entries(contractorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setSummary({
      totalLeaks,
      totalCosts,
      overdueInspections,
      averageLeakCost,
      topContractors
    });
  };

  const filterRecords = () => {
    let filtered = records;

    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (regionFilter) {
      filtered = filtered.filter(record => record.region === regionFilter);
    }

    if (contractorFilter) {
      filtered = filtered.filter(record => record.repair_contractor === contractorFilter);
    }

    if (leakFilter) {
      switch (leakFilter) {
        case 'with-leaks':
          filtered = filtered.filter(record => parseInt(record.total_leaks_12mo || '0') > 0);
          break;
        case 'no-leaks':
          filtered = filtered.filter(record => parseInt(record.total_leaks_12mo || '0') === 0);
          break;
        case 'high-cost':
          filtered = filtered.filter(record => parseFloat(record.total_leak_expense_12mo || '0') > 5000);
          break;
      }
    }

    setFilteredRecords(filtered);
  };

  const getLeakSeverityBadge = (leakCount: string | null, cost: string | null) => {
    const leaks = parseInt(leakCount || '0');
    const expenses = parseFloat(cost || '0');

    if (leaks === 0) return <Badge variant="secondary">No Leaks</Badge>;
    if (leaks <= 2 && expenses < 1000) return <Badge variant="outline">Low</Badge>;
    if (leaks <= 5 && expenses < 5000) return <Badge variant="default">Medium</Badge>;
    return <Badge variant="destructive">High</Badge>;
  };

  const getInspectionStatus = (nextDue: string | null) => {
    if (!nextDue) return <Badge variant="secondary">Not Scheduled</Badge>;
    
    const dueDate = new Date(nextDue);
    const today = new Date();
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (daysDiff < 0) return <Badge variant="destructive">Overdue</Badge>;
    if (daysDiff <= 30) return <Badge variant="default">Due Soon</Badge>;
    return <Badge variant="outline">Scheduled</Badge>;
  };

  const exportData = () => {
    const csvData = filteredRecords.map(record => ({
      'Property Name': record.property_name,
      'Address': `${record.address}, ${record.city}, ${record.state}`,
      'Region': record.region || '',
      'Market': record.market || '',
      'Total Leaks (12mo)': record.total_leaks_12mo || '0',
      'Leak Expenses (12mo)': record.total_leak_expense_12mo || '0',
      'Last Inspection': record.last_inspection_date || '',
      'Next Inspection Due': record.next_inspection_due || '',
      'Repair Contractor': record.repair_contractor || '',
      'Roof Type': record.roof_type || '',
      'Install Year': record.install_year || '',
      'Preventative Budget (Est)': record.preventative_budget_estimated || '',
      'Preventative Budget (Actual)': record.preventative_budget_actual || '',
      'Capital Budget (Est)': record.capital_budget_estimated || '',
      'Capital Budget (Actual)': record.capital_budget_actual || ''
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading maintenance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
              Total Leaks (12mo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalLeaks.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Across all properties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 text-green-500 mr-2" />
              Total Leak Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalCosts.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Last 12 months</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="h-4 w-4 text-red-500 mr-2" />
              Overdue Inspections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.overdueInspections}</div>
            <p className="text-xs text-gray-600">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Wrench className="h-4 w-4 text-blue-500 mr-2" />
              Avg Cost per Leak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.averageLeakCost.toFixed(0)}</div>
            <p className="text-xs text-gray-600">Repair cost average</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Contractors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Top Repair Contractors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {summary.topContractors.map((contractor, index) => (
              <div key={contractor.name} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{contractor.count}</div>
                <div className="text-sm text-gray-600 truncate" title={contractor.name}>
                  {contractor.name}
                </div>
                <div className="text-xs text-gray-500">properties</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <CardTitle className="text-lg font-semibold">Maintenance Records</CardTitle>
            <div className="flex items-center space-x-2">
              <Button onClick={exportData} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Regions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={contractorFilter} onValueChange={setContractorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Contractors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Contractors</SelectItem>
                {contractors.map(contractor => (
                  <SelectItem key={contractor} value={contractor}>{contractor}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={leakFilter} onValueChange={setLeakFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Leak Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Properties</SelectItem>
                <SelectItem value="with-leaks">With Leaks</SelectItem>
                <SelectItem value="no-leaks">No Leaks</SelectItem>
                <SelectItem value="high-cost">High Cost (&gt;$5K)</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={() => {
                setSearchTerm("");
                setRegionFilter("");
                setContractorFilter("");
                setLeakFilter("");
              }}
              variant="outline"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Results Summary */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredRecords.length} of {records.length} properties
          </div>

          {/* Maintenance Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Leaks (12mo)</TableHead>
                  <TableHead>Leak Costs</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Last Inspection</TableHead>
                  <TableHead>Inspection Status</TableHead>
                  <TableHead>Repair Contractor</TableHead>
                  <TableHead>Roof Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{record.property_name}</div>
                        <div className="text-sm text-gray-500">{record.roof_type || 'Unknown Type'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{record.city}, {record.state}</div>
                        <div className="text-gray-500">{record.region || 'No Region'}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="font-semibold">
                        {record.total_leaks_12mo || '0'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">
                        ${parseFloat(record.total_leak_expense_12mo || '0').toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getLeakSeverityBadge(record.total_leaks_12mo, record.total_leak_expense_12mo)}
                    </TableCell>
                    <TableCell>
                      {record.last_inspection_date 
                        ? format(new Date(record.last_inspection_date), 'MMM dd, yyyy')
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      {getInspectionStatus(record.next_inspection_due)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {record.repair_contractor || 'Not Assigned'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {record.install_year 
                          ? `${new Date().getFullYear() - record.install_year} years`
                          : 'Unknown'
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredRecords.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No maintenance records found matching your criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}