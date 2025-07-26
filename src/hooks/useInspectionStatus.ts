import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InspectionStatus } from '@/components/ui/inspection-status-badge';
import { useToast } from '@/hooks/use-toast';

interface StatusChangeOptions {
  reason?: string;
  notifyReviewers?: boolean;
}

export function useInspectionStatus() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateStatus = useCallback(async (
    sessionId: string,
    newStatus: InspectionStatus,
    options: StatusChangeOptions = {}
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('inspection_sessions')
        .update({
          inspection_status: newStatus,
          status_change_reason: options.reason,
          last_updated: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Show success toast
      const statusLabels = {
        scheduled: 'Scheduled',
        in_progress: 'In Progress', 
        ready_for_review: 'Ready for Review',
        completed: 'Completed'
      };

      toast({
        title: "Status Updated",
        description: `Inspection status changed to ${statusLabels[newStatus]}`,
      });

      return true;
    } catch (error) {
      console.error('Failed to update inspection status:', error);
      toast({
        title: "Error",
        description: "Failed to update inspection status. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getStatusHistory = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('inspection_status_history')
        .select(`
          *,
          changed_by_user:auth.users!changed_by(email)
        `)
        .eq('inspection_session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch status history:', error);
      return [];
    }
  }, []);

  const getInspectionsByStatus = useCallback(async (status?: InspectionStatus) => {
    try {
      let query = supabase
        .from('inspection_status_dashboard')
        .select('*')
        .order('last_updated', { ascending: false });

      if (status) {
        query = query.eq('inspection_status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch inspections by status:', error);
      return [];
    }
  }, []);

  const bulkUpdateStatus = useCallback(async (
    sessionIds: string[],
    newStatus: InspectionStatus,
    reason?: string
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('inspection_sessions')
        .update({
          inspection_status: newStatus,
          status_change_reason: reason,
          last_updated: new Date().toISOString()
        })
        .in('id', sessionIds);

      if (error) throw error;

      toast({
        title: "Bulk Update Complete",
        description: `Updated ${sessionIds.length} inspection(s) to ${newStatus}`,
      });

      return true;
    } catch (error) {
      console.error('Failed to bulk update inspection status:', error);
      toast({
        title: "Error",
        description: "Failed to update inspection statuses. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getStatusCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('inspection_sessions')
        .select('inspection_status')
        .not('inspection_status', 'is', null);

      if (error) throw error;

      const counts = {
        scheduled: 0,
        in_progress: 0,
        ready_for_review: 0,
        completed: 0
      };

      data?.forEach(item => {
        if (item.inspection_status in counts) {
          counts[item.inspection_status as InspectionStatus]++;
        }
      });

      return counts;
    } catch (error) {
      console.error('Failed to fetch status counts:', error);
      return {
        scheduled: 0,
        in_progress: 0,
        ready_for_review: 0,
        completed: 0
      };
    }
  }, []);

  return {
    updateStatus,
    getStatusHistory,
    getInspectionsByStatus,
    bulkUpdateStatus,
    getStatusCounts,
    loading
  };
}