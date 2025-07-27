import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertTriangle, Calendar, TrendingUp, Users } from 'lucide-react';
import { useInspectionSync } from '@/hooks/useInspectionSync';
import { useToast } from '@/hooks/use-toast';
import type { InspectionItem, InspectionStatus, InspectionPriority, InspectionType, toInspectionItem } from '@/types/inspection';

interface DashboardStats {
  totalInspections: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

export function InspectionStatusDashboard() {
  const [recentInspections, setRecentInspections] = useState<InspectionItem[]>([]);
  const { toast } = useToast();

  const {
    inspections,
    loading,
    error,
    scheduledCount,
    completedCount,
    inProgressCount,
    pastDueCount
  } = useInspectionSync({
    autoRefresh: true,
    enableRealTimeSync: true
  });

  const stats: DashboardStats = {
    totalInspections: inspections.length,
    scheduled: scheduledCount,
    inProgress: inProgressCount,
    completed: completedCount,
    overdue: pastDueCount,
    completionRate: inspections.length > 0 ? Math.round((completedCount / inspections.length) * 100) : 0
  };

  // Transform inspections to InspectionItems for display
  useEffect(() => {
    const items = inspections.slice(0, 10).map(inspection => ({
      id: inspection.id,
      property_id: inspection.roof_id || '',
      inspection_status: (inspection.inspection_status || inspection.status || 'scheduled') as InspectionStatus,
      property_name: inspection.roofs?.property_name || 'Unknown Property',
      full_address: inspection.roofs?.address || 'Unknown Address',
      inspector_name: inspection.users ? `${inspection.users.first_name || ''} ${inspection.users.last_name || ''}`.trim() : 'Not assigned',
      scheduled_date: inspection.scheduled_date,
      priority: 'medium' as InspectionPriority,
      inspection_type: 'routine' as InspectionType,
      notes: inspection.notes || undefined
    }));
    
    setRecentInspections(items);
  }, [inspections]);

  const getStatusBadgeVariant = (status: InspectionStatus) => {
    switch (status) {
      case 'scheduled': return 'secondary';
      case 'in_progress': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Inspections</p>
                <p className="text-2xl font-bold">{stats.totalInspections}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Completion Rate</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">{stats.completionRate}%</span>
            </div>
            <Progress value={stats.completionRate} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Inspections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Recent Inspections</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentInspections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No inspections found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentInspections.map((inspection) => (
                <div key={inspection.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-medium">{inspection.property_name}</h4>
                      <Badge variant={getStatusBadgeVariant(inspection.inspection_status)}>
                        {inspection.inspection_status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span>{inspection.full_address}</span>
                      <span className="ml-4">Inspector: {inspection.inspector_name}</span>
                    </div>
                    {inspection.scheduled_date && (
                      <div className="text-xs text-gray-500 mt-1">
                        Scheduled: {new Date(inspection.scheduled_date).toLocaleDateString()}
                      </div>
                    )}
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