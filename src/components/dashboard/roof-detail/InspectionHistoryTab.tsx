import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, FileText, Download, Eye, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { inspectorEventBus, INSPECTOR_EVENTS } from '@/lib/eventBus';
import { InspectionReviewInterface } from '../InspectionReviewInterface';
import type { UnifiedInspection, InspectionStatus, InspectionType, InspectionPriority, InspectionSyncData } from '@/types/inspection';

interface InspectionHistoryTabProps {
  roof: {
    id: string;
    property_name: string;
  };
}

export function InspectionHistoryTab({ roof }: InspectionHistoryTabProps) {
  const [inspections, setInspections] = useState<UnifiedInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspection, setSelectedInspection] = useState<InspectionSyncData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { toast } = useToast();

  const fetchInspections = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          roofs(
            id,
            property_name,
            address,
            city,
            state
          ),
          users(
            id,
            first_name,
            last_name,
            email
          ),
          inspection_reports(
            id,
            status,
            priority_level,
            findings
          )
        `)
        .eq('roof_id', roof.id)
        .is('archived_at', null)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      const transformedInspections: UnifiedInspection[] = (data || []).map(inspection => ({
        id: inspection.id,
        roof_id: inspection.roof_id,
        inspector_id: inspection.inspector_id,
        scheduled_date: inspection.scheduled_date,
        completed_date: inspection.completed_date,
        status: (inspection.status || 'scheduled') as InspectionStatus,
        inspection_type: (inspection.inspection_type || 'routine') as InspectionType,
        priority: ('medium') as InspectionPriority, // Default priority since it may not exist in DB
        notes: inspection.notes,
        weather_conditions: inspection.weather_conditions,
        created_at: inspection.created_at,
        updated_at: inspection.updated_at,
        roofs: inspection.roofs ? {
          id: inspection.roofs.id,
          property_name: inspection.roofs.property_name,
          address: inspection.roofs.address,
          city: inspection.roofs.city,
          state: inspection.roofs.state
        } : null,
        users: inspection.users
      }));

      setInspections(transformedInspections);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      toast({
        title: "Error",
        description: "Failed to load inspection history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Listen for building-specific inspection events
  useEffect(() => {
    const unsubscribeBuildingHistory = inspectorEventBus.on(INSPECTOR_EVENTS.buildingInspectionHistoryUpdated, (event) => {
      if (event.payload?.roofId === roof.id) {
        if (event.payload?.inspections) {
          setInspections(event.payload.inspections);
        }
        toast({
          title: "History Updated",
          description: `Inspection history updated for ${roof.property_name || 'this property'}`,
        });
      }
    });

    const unsubscribeInspectionCreated = inspectorEventBus.on(INSPECTOR_EVENTS.inspectionCreated, (event) => {
      if (event.payload?.inspection?.roof_id === roof.id) {
        toast({
          title: "New Inspection",
          description: `Inspection scheduled for ${roof.property_name || 'this property'}`,
        });
        fetchInspections();
      }
    });

    const unsubscribeStatusChanged = inspectorEventBus.on(INSPECTOR_EVENTS.inspectionStatusChanged, (event) => {
      const inspection = inspections.find(i => i.id === event.payload?.inspectionId);
      if (inspection && event.payload?.newStatus) {
        const updatedInspection = { ...inspection, status: event.payload.newStatus };
        setInspections(prev => prev.map(i => 
          i.id === inspection.id ? updatedInspection : i
        ));
        toast({
          title: "Status Updated",
          description: `Inspection status changed to ${event.payload.newStatus}`,
        });
      }
    });

    return () => {
      unsubscribeBuildingHistory();
      unsubscribeInspectionCreated();
      unsubscribeStatusChanged();
    };
  }, [roof.id, roof.property_name, inspections, toast]);

  useEffect(() => {
    fetchInspections();
  }, [roof.id]);

  const handleViewInspection = (inspection: UnifiedInspection) => {
    // Convert UnifiedInspection to InspectionSyncData format
    const inspectionData: InspectionSyncData = {
      id: inspection.id,
      roof_id: inspection.roof_id,
      inspector_id: inspection.inspector_id,
      scheduled_date: inspection.scheduled_date,
      completed_date: inspection.completed_date,
      status: inspection.status,
      inspection_type: inspection.inspection_type,
      notes: inspection.notes,
      weather_conditions: inspection.weather_conditions,
      created_at: inspection.created_at,
      updated_at: inspection.updated_at,
      session_data: inspection.session_data,
      roofs: inspection.roofs,
      users: inspection.users
    };
    setSelectedInspection(inspectionData);
    setShowDetailModal(true);
  };

  const handleInspectionUpdate = (updatedInspection: InspectionSyncData) => {
    // Update the inspection in the local state
    setInspections(prevInspections => 
      prevInspections.map(inspection => 
        inspection.id === updatedInspection.id 
          ? { 
              ...inspection, 
              status: updatedInspection.status as InspectionStatus,
              notes: updatedInspection.notes,
              weather_conditions: updatedInspection.weather_conditions,
              updated_at: updatedInspection.updated_at
            }
          : inspection
      )
    );
    setShowDetailModal(false);
  };

  const getStatusBadgeVariant = (status: InspectionStatus) => {
    switch (status) {
      case 'scheduled': return 'secondary';
      case 'in_progress': return 'default';
      case 'ready_for_review': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Inspection History</h3>
        <span className="text-sm text-gray-600">
          {inspections.length} inspection{inspections.length !== 1 ? 's' : ''}
        </span>
      </div>

      {inspections.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No inspection history found for this property</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {inspections.map((inspection) => (
            <Card key={inspection.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-base">
                      {inspection.inspection_type === 'routine' ? 'Routine Inspection' :
                       inspection.inspection_type === 'emergency' ? 'Emergency Inspection' :
                       inspection.inspection_type === 'follow-up' ? 'Follow-up Inspection' :
                       'Inspection'}
                    </CardTitle>
                    <Badge variant={getStatusBadgeVariant(inspection.status)}>
                      {inspection.status}
                    </Badge>
                    <span className={`text-xs font-medium ${getPriorityColor(inspection.priority)}`}>
                      {inspection.priority} priority
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewInspection(inspection)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </Button>
                    {inspection.status === 'completed' && (
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Report
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      Scheduled: {inspection.scheduled_date 
                        ? format(new Date(inspection.scheduled_date), 'MMM dd, yyyy')
                        : 'Not scheduled'
                      }
                    </span>
                  </div>
                  
                  {inspection.completed_date && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        Completed: {format(new Date(inspection.completed_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>
                      Inspector: {inspection.users 
                        ? `${inspection.users.first_name || ''} ${inspection.users.last_name || ''}`.trim()
                        : 'Not assigned'
                      }
                    </span>
                  </div>
                  
                  {inspection.weather_conditions && (
                    <div className="flex items-center space-x-2 md:col-span-2 lg:col-span-3">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span>Weather: {inspection.weather_conditions}</span>
                    </div>
                  )}
                </div>
                
                {inspection.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Notes:</span> {inspection.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InspectionReviewInterface
        inspection={selectedInspection}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onSave={handleInspectionUpdate}
      />
    </div>
  );
}