import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, User, Clock, AlertTriangle, Eye, Play, Pause, CheckCircle, Filter, Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useInspectionSync } from '@/hooks/useInspectionSync';
import type { InspectionSyncData, InspectionStatus } from '@/types/inspection';

interface InspectionsTabProps {
  onOpenSchedulingModal?: () => void;
  onViewInspection?: (inspectionId: string, roofId: string, propertyName: string) => void;
}

export function InspectionsTab({ onOpenSchedulingModal, onViewInspection }: InspectionsTabProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inspections, setInspections] = useState<InspectionSyncData[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<InspectionSyncData[]>([]);

  // Use the inspection sync hook for real-time data
  const {
    inspections: syncedInspections,
    loading,
    error,
    refresh,
    updateInspectionStatus,
    scheduledCount,
    completedCount,
    inProgressCount,
    pastDueCount
  } = useInspectionSync({
    autoRefresh: true,
    enableRealTimeSync: true
  });

  // Update local state when synced data changes
  useEffect(() => {
    if (syncedInspections) {
      setInspections(syncedInspections);
    }
  }, [syncedInspections]);

  // Apply filters
  useEffect(() => {
    let filtered = [...inspections];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inspection => 
        inspection.roofs?.property_name?.toLowerCase().includes(term) ||
        inspection.notes?.toLowerCase().includes(term) ||
        `${inspection.users?.first_name || ''} ${inspection.users?.last_name || ''}`.toLowerCase().includes(term)
      );
    }

    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(inspection => inspection.status === statusFilter);
    }

    setFilteredInspections(filtered);
  }, [inspections, searchTerm, statusFilter]);

  const getInspectorName = (inspection: InspectionSyncData) => {
    if (inspection.users?.first_name || inspection.users?.last_name) {
      return `${inspection.users.first_name || ''} ${inspection.users.last_name || ''}`.trim();
    }
    return 'Not assigned';
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case 'scheduled': return 'secondary';
      case 'in_progress': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleStatusUpdate = async (inspectionId: string, newStatus: InspectionStatus) => {
    try {
      await updateInspectionStatus(inspectionId, newStatus);
      toast({
        title: "Status Updated",
        description: `Inspection status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update inspection status",
        variant: "destructive"
      });
    }
  };

  const renderInspectionActions = (inspection: InspectionSyncData) => {
    const currentStatus = inspection.status || 'scheduled';
    
    return (
      <div className="flex items-center space-x-2">
        {currentStatus === 'scheduled' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusUpdate(inspection.id, 'in_progress')}
            className="flex items-center space-x-1"
          >
            <Play className="h-3 w-3" />
            <span>Start</span>
          </Button>
        )}
        
        {currentStatus === 'in_progress' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate(inspection.id, 'completed')}
              className="flex items-center space-x-1"
            >
              <CheckCircle className="h-3 w-3" />
              <span>Complete</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate(inspection.id, 'scheduled')}
              className="flex items-center space-x-1"
            >
              <Pause className="h-3 w-3" />
              <span>Pause</span>
            </Button>
          </>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          className="flex items-center space-x-1"
          onClick={() => {
            if (onViewInspection && inspection.roof_id) {
              onViewInspection(
                inspection.id, 
                inspection.roof_id, 
                inspection.roofs?.property_name || 'Unknown Property'
              );
            }
          }}
        >
          <Eye className="h-3 w-3" />
          <span>View</span>
        </Button>
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Error loading inspections: {error}</span>
              <Button variant="outline" size="sm" onClick={() => refresh()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold">{scheduledCount}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{inProgressCount}</p>
              </div>
              <Play className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Past Due</p>
                <p className="text-2xl font-bold">{pastDueCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Inspections</span>
            <div className="flex items-center gap-2">
              {onOpenSchedulingModal && (
                <Button variant="default" size="sm" onClick={onOpenSchedulingModal}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Inspections
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search inspections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Inspections List */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredInspections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {inspections.length === 0 ? (
                <div>
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No inspections found</p>
                </div>
              ) : (
                <div>
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No inspections match your search criteria</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInspections.map((inspection) => (
                <div key={inspection.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {inspection.roofs?.property_name || 'Unknown Property'}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(inspection.status)}>
                          {inspection.status || 'Unknown'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>Inspector: {getInspectorName(inspection)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            Scheduled: {inspection.scheduled_date 
                              ? format(new Date(inspection.scheduled_date), 'MMM dd, yyyy')
                              : 'Not scheduled'
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>Type: {inspection.inspection_type || 'Standard'}</span>
                        </div>
                      </div>
                      
                      {inspection.notes && (
                        <div className="mt-2 text-sm text-gray-700">
                          <span className="font-medium">Notes:</span> {inspection.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      {renderInspectionActions(inspection)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}