import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileDown, Calendar, User, Building, Loader2 } from "lucide-react";
import { InspectionSchedulingModal } from "@/components/inspections/InspectionSchedulingModal";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Inspection {
  id: string;
  scheduled_date: string | null;
  completed_date: string | null;
  inspection_type: string | null;
  status: string | null;
  notes: string | null;
  weather_conditions: string | null;
  roof_id: string | null;
  inspector_id: string | null;
  created_at: string;
  // Joined data
  roofs?: {
    property_name: string;
  } | null;
  users?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export function InspectionsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspections();
  }, []);

  useEffect(() => {
    filterInspections();
  }, [searchTerm, statusFilter, inspections]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      
      const { data: inspectionsData, error } = await supabase
        .from('inspections')
        .select(`
          *,
          roofs!roof_id(property_name),
          users!inspector_id(first_name, last_name)
        `)
        .order('scheduled_date', { ascending: false });
        
      if (error) {
        console.error('Error fetching inspections:', error);
        return;
      }
      
      setInspections((inspectionsData as unknown as Inspection[]) || []);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInspections = () => {
    let filtered = inspections;

    if (searchTerm) {
      filtered = filtered.filter(inspection => 
        inspection.roofs?.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${inspection.users?.first_name || ''} ${inspection.users?.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inspection.inspection_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(inspection => inspection.status === statusFilter);
    }

    setFilteredInspections(filtered);
  };

  const getInspectorName = (inspection: Inspection) => {
    if (inspection.users?.first_name || inspection.users?.last_name) {
      return `${inspection.users.first_name || ''} ${inspection.users.last_name || ''}`.trim();
    }
    return 'Unassigned';
  };

  const getInspectionStatus = (inspection: Inspection): 'draft' | 'scheduled' | 'in-progress' | 'completed' | 'past-due' | 'cancelled' => {
    if (!inspection.scheduled_date) return 'draft';
    
    const scheduledDate = new Date(inspection.scheduled_date);
    const today = new Date();
    const isPastDue = scheduledDate < today && !inspection.completed_date;
    
    if (inspection.completed_date) return 'completed';
    if (isPastDue) return 'past-due';
    if (inspection.status === 'in-progress') return 'in-progress';
    if (inspection.status === 'cancelled') return 'cancelled';
    return 'scheduled';
  };

  const getStatusBadge = (inspection: Inspection) => {
    const status = getInspectionStatus(inspection);
    
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case "in-progress":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case "past-due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      case "draft":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (inspection: Inspection) => {
    // Determine priority based on inspection type and status
    let priority = 'medium';
    
    if (inspection.inspection_type?.toLowerCase().includes('emergency')) {
      priority = 'high';
    } else if (inspection.inspection_type?.toLowerCase().includes('routine')) {
      priority = 'low';
    } else if (getInspectionStatus(inspection) === 'past-due') {
      priority = 'high';
    }

    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const exportData = () => {
    const csvData = filteredInspections.map(inspection => ({
      'Property': inspection.roofs?.property_name || 'Unknown Property',
      'Inspector': getInspectorName(inspection),
      'Scheduled Date': inspection.scheduled_date || '',
      'Completed Date': inspection.completed_date || '',
      'Type': inspection.inspection_type || '',
      'Status': getInspectionStatus(inspection),
      'Weather': inspection.weather_conditions || '',
      'Notes': inspection.notes || ''
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspections-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Loading inspections...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search inspections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="past-due">Past Due</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={exportData}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSchedulingModalOpen(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Inspection
          </Button>
          <Button variant="outline" size="sm">
            Assign Review
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Inspection
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Property</TableHead>
              <TableHead className="font-semibold">Inspector</TableHead>
              <TableHead className="font-semibold">Scheduled Date</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Priority</TableHead>
              <TableHead className="font-semibold">Weather</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInspections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-center">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No inspections found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {inspections.length === 0 
                        ? "Get started by scheduling your first inspection."
                        : "No inspections match your current filters."
                      }
                    </p>
                    <Button 
                      className="mt-4" 
                      size="sm"
                      onClick={() => setSchedulingModalOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Inspection
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredInspections.map((inspection) => (
              <TableRow key={inspection.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center">
                    <Building className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium">{inspection.roofs?.property_name || 'Unknown Property'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    {getInspectorName(inspection)}
                  </div>
                </TableCell>
                <TableCell>
                  {inspection.scheduled_date 
                    ? format(new Date(inspection.scheduled_date), 'MMM dd, yyyy')
                    : 'Not Scheduled'
                  }
                  {inspection.completed_date && (
                    <div className="text-sm text-green-600">
                      Completed: {format(new Date(inspection.completed_date), 'MMM dd')}
                    </div>
                  )}
                </TableCell>
                <TableCell>{inspection.inspection_type || 'Not Specified'}</TableCell>
                <TableCell>{getStatusBadge(inspection)}</TableCell>
                <TableCell>{getPriorityBadge(inspection)}</TableCell>
                <TableCell>{inspection.weather_conditions || 'Not Recorded'}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View</Button>
                    <Button variant="outline" size="sm">Edit</Button>
                    {getInspectionStatus(inspection) === "completed" && (
                      <Button variant="outline" size="sm">Report</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Showing {filteredInspections.length} of {inspections.length} inspections</p>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Scheduled: {inspections.filter(i => getInspectionStatus(i) === 'scheduled').length}</span>
          <span>Completed: {inspections.filter(i => getInspectionStatus(i) === 'completed').length}</span>
          <span>Past Due: {inspections.filter(i => getInspectionStatus(i) === 'past-due').length}</span>
        </div>
      </div>

      <InspectionSchedulingModal
        open={schedulingModalOpen}
        onOpenChange={setSchedulingModalOpen}
      />
    </div>
  );
}