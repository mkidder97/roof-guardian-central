import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  InspectionStatusBadge, 
  InspectionStatus, 
  getNextStatus,
  STATUS_WORKFLOW_ORDER 
} from "@/components/ui/inspection-status-badge";
import { StatusTransitionDialog } from "@/components/ui/status-transition-dialog";
import { useInspectionStatus } from "@/hooks/useInspectionStatus";
import { 
  Building2, 
  Calendar, 
  Clock, 
  Eye, 
  CheckCircle,
  Search,
  Filter,
  ArrowRight,
  MoreHorizontal
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InspectionItem {
  id: string;
  property_id: string;
  inspection_status: InspectionStatus;
  property_name: string;
  full_address: string;
  inspector_email: string;
  created_at: string;
  last_updated: string;
  status_change_count: number;
  last_status_change: string;
}

export function InspectionStatusDashboard() {
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<InspectionItem[]>([]);
  const [statusCounts, setStatusCounts] = useState({
    scheduled: 0,
    in_progress: 0,
    ready_for_review: 0,
    completed: 0
  });
  const [selectedStatus, setSelectedStatus] = useState<InspectionStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInspection, setSelectedInspection] = useState<InspectionItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<InspectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const { 
    updateStatus, 
    getInspectionsByStatus, 
    getStatusCounts,
    loading: statusLoading 
  } = useInspectionStatus();

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inspectionsData, countsData] = await Promise.all([
        getInspectionsByStatus(),
        getStatusCounts()
      ]);
      
      setInspections(inspectionsData);
      setStatusCounts(countsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter inspections
  useEffect(() => {
    let filtered = inspections;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.inspection_status === selectedStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.property_name?.toLowerCase().includes(term) ||
        item.full_address?.toLowerCase().includes(term) ||
        item.inspector_email?.toLowerCase().includes(term)
      );
    }

    setFilteredInspections(filtered);
  }, [inspections, selectedStatus, searchTerm]);

  const handleStatusChange = async (inspection: InspectionItem, newStatus: InspectionStatus) => {
    setSelectedInspection(inspection);
    setTargetStatus(newStatus);
  };

  const confirmStatusChange = async (reason?: string) => {
    if (!selectedInspection || !targetStatus) return;

    const success = await updateStatus(selectedInspection.id, targetStatus, { reason });
    
    if (success) {
      setSelectedInspection(null);
      setTargetStatus(null);
      loadData(); // Reload data
    }
  };

  const getStatusIcon = (status: InspectionStatus) => {
    const icons = {
      scheduled: Calendar,
      in_progress: Clock,
      ready_for_review: Eye,
      completed: CheckCircle
    };
    return icons[status];
  };

  const StatusCard = ({ status, count }: { status: InspectionStatus; count: number }) => {
    const Icon = getStatusIcon(status);
    const isSelected = selectedStatus === status;
    
    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => setSelectedStatus(isSelected ? 'all' : status)}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Icon className="w-8 h-8 text-gray-600" />
            <div>
              <div className="text-2xl font-bold">{count}</div>
              <InspectionStatusBadge status={status} showIcon={false} size="sm" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard status="scheduled" count={statusCounts.scheduled} />
        <StatusCard status="in_progress" count={statusCounts.in_progress} />
        <StatusCard status="ready_for_review" count={statusCounts.ready_for_review} />
        <StatusCard status="completed" count={statusCounts.completed} />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Inspection Management
            {selectedStatus !== 'all' && (
              <Badge variant="outline" className="ml-2">
                {filteredInspections.length} filtered
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by property name, address, or inspector..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select 
              value={selectedStatus} 
              onValueChange={(value) => setSelectedStatus(value as InspectionStatus | 'all')}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_WORKFLOW_ORDER.map(status => (
                  <SelectItem key={status} value={status}>
                    <InspectionStatusBadge status={status} size="sm" />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inspections List */}
          <div className="space-y-3">
            {filteredInspections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'No inspections match your filters'
                  : 'No inspections found'
                }
              </div>
            ) : (
              filteredInspections.map(inspection => {
                const nextStatus = getNextStatus(inspection.inspection_status);
                
                return (
                  <Card key={inspection.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{inspection.property_name}</h3>
                            <InspectionStatusBadge status={inspection.inspection_status} />
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>{inspection.full_address}</div>
                            <div>Inspector: {inspection.inspector_email}</div>
                            <div>
                              Last updated: {formatDistanceToNow(new Date(inspection.last_updated))} ago
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {nextStatus && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(inspection, nextStatus)}
                              disabled={statusLoading}
                              className="flex items-center gap-1"
                            >
                              <ArrowRight className="w-3 h-3" />
                              <InspectionStatusBadge status={nextStatus} showIcon={false} size="sm" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Transition Dialog */}
      {selectedInspection && targetStatus && (
        <StatusTransitionDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedInspection(null);
              setTargetStatus(null);
            }
          }}
          currentStatus={selectedInspection.inspection_status}
          targetStatus={targetStatus}
          propertyName={selectedInspection.property_name}
          onConfirm={confirmStatusChange}
          loading={statusLoading}
        />
      )}
    </div>
  );
}