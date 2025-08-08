/**
 * RoofMind API Client
 * Centralized API utilities with offline support, caching, and error handling
 */

import { supabase } from '@/integrations/supabase/client';
import { offlineManager } from '../offlineManager';

export interface ApiResponse<T = any> {
  data: T;
  error?: string;
  offline?: boolean;
  cached?: boolean;
}

export interface ApiOptions {
  cache?: boolean;
  offline?: boolean;
  priority?: 'high' | 'medium' | 'low';
  retries?: number;
}

class RoofMindApi {
  private baseUrl: string;
  private defaultOptions: ApiOptions = {
    cache: true,
    offline: true,
    priority: 'medium',
    retries: 3
  };

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  }

  // Inspections
  async getInspections(options: ApiOptions = {}): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          roofs(id, property_name, address, city, state),
          users!inspections_inspector_id_fkey(id, first_name, last_name, email),
          inspection_reports(id, status, priority_level, findings)
        `)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      return { data, cached: false };
    } catch (error) {
      console.error('Failed to fetch inspections:', error);
      
      if (options.offline !== false) {
        // Try offline fallback
        const offlineData = await offlineManager.getAllInspectionsOffline();
        return { 
          data: offlineData, 
          offline: true,
          error: 'Using offline data'
        };
      }
      
      throw error;
    }
  }

  async createInspection(data: any, options: ApiOptions = {}): Promise<ApiResponse> {
    try {
      const { data: result, error } = await supabase
        .from('inspections')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      return { data: result };
    } catch (error) {
      console.error('Failed to create inspection:', error);
      
      if (options.offline !== false) {
        // Save offline
        const offlineId = await offlineManager.saveInspectionOffline({
          ...data,
          syncPriority: options.priority || 'medium'
        });
        
        return { 
          data: { ...data, id: offlineId }, 
          offline: true,
          error: 'Saved offline, will sync when online'
        };
      }
      
      throw error;
    }
  }

  async updateInspection(id: string, data: any, options: ApiOptions = {}): Promise<ApiResponse> {
    try {
      const { data: result, error } = await supabase
        .from('inspections')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { data: result };
    } catch (error) {
      console.error('Failed to update inspection:', error);
      
      if (options.offline !== false) {
        // Save offline
        await offlineManager.saveInspectionOffline({
          id,
          ...data,
          syncPriority: options.priority || 'medium'
        });
        
        return { 
          data: { id, ...data }, 
          offline: true,
          error: 'Saved offline, will sync when online'
        };
      }
      
      throw error;
    }
  }

  // Properties
  async getProperties(): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase
        .from('roofs')
        .select(`
          *,
          inspections(count),
          work_orders(count)
        `)
        .order('property_name');

      if (error) throw error;

      return { data };
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      throw error;
    }
  }

  async getProperty(id: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase
        .from('roofs')
        .select(`
          *,
          inspections(
            id,
            scheduled_date,
            completed_date,
            status,
            inspection_type,
            users!inspections_inspector_id_fkey(first_name, last_name)
          ),
          work_orders(
            id,
            title,
            status,
            priority,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return { data };
    } catch (error) {
      console.error('Failed to fetch property:', error);
      throw error;
    }
  }

  // Photos
  async uploadPhoto(file: File, inspectionId: string, metadata: any = {}): Promise<ApiResponse> {
    try {
      const filename = `${inspectionId}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(filename, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(filename);

      const photoRecord = {
        inspection_id: inspectionId,
        filename,
        url: publicUrlData.publicUrl,
        file_size: file.size,
        metadata: {
          ...metadata,
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      };

      // Save photo record
      const { data, error } = await supabase
        .from('inspection_photos')
        .insert(photoRecord)
        .select()
        .single();

      if (error) throw error;

      return { data };
    } catch (error) {
      console.error('Failed to upload photo:', error);
      
      // Save offline
      const offlineId = await offlineManager.savePhotoOffline({
        file,
        inspectionId,
        ...metadata
      });
      
      return { 
        data: { id: offlineId, offline: true }, 
        offline: true,
        error: 'Saved offline, will upload when online'
      };
    }
  }

  // Critical Issues
  async createCriticalIssue(data: any): Promise<ApiResponse> {
    try {
      const { data: result, error } = await supabase
        .from('critical_issues')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      return { data: result };
    } catch (error) {
      console.error('Failed to create critical issue:', error);
      
      // Save offline with high priority
      const offlineId = await offlineManager.saveCriticalIssueOffline(data);
      
      return { 
        data: { ...data, id: offlineId }, 
        offline: true,
        error: 'Saved offline, will sync when online'
      };
    }
  }

  async getCriticalIssues(): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase
        .from('critical_issues')
        .select(`
          *,
          inspections(
            id,
            roofs(property_name)
          ),
          users!critical_issues_inspector_id_fkey(first_name, last_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data };
    } catch (error) {
      console.error('Failed to fetch critical issues:', error);
      throw error;
    }
  }

  // Reports
  async generateReport(inspectionId: string, format: 'pdf' | 'json' = 'pdf'): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inspectionId,
          format
        })
      });

      if (!response.ok) throw new Error('Report generation failed');

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  // Workflow Integration (n8n)
  async triggerWorkflow(workflowId: string, data: any): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/workflows/${workflowId}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Workflow trigger failed');

      const result = await response.json();
      return { data: result };
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      throw error;
    }
  }

  // Batch operations
  async batchUpdate(updates: Array<{ table: string; id: string; data: any }>): Promise<ApiResponse> {
    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { data, error } = await supabase
          .from(update.table)
          .update(update.data)
          .eq('id', update.id)
          .select();

        if (error) throw error;
        results.push({ id: update.id, data: data[0] });
      } catch (error) {
        errors.push({ id: update.id, error: error.message });
      }
    }

    return {
      data: {
        successful: results,
        failed: errors,
        total: updates.length
      }
    };
  }

  // Real-time subscriptions
  subscribeToInspections(callback: (payload: any) => void) {
    return supabase
      .channel('inspections')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'inspections' }, 
        callback
      )
      .subscribe();
  }

  subscribeToCriticalIssues(callback: (payload: any) => void) {
    return supabase
      .channel('critical_issues')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'critical_issues' }, 
        callback
      )
      .subscribe();
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('health-check');
      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Health check failed:', error);
      return { data: { ok: false }, error: 'unhealthy' };
    }
  }
}

export const roofmindApi = new RoofMindApi();