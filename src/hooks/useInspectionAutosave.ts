import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InspectionSession {
  property_id: string;
  inspector_id: string;
  session_data: any;
  status: 'active' | 'completed' | 'abandoned';
}

interface UseInspectionAutosaveProps {
  propertyId: string;
  inspectionData: any;
  autoSaveInterval?: number; // milliseconds
  enabled?: boolean;
}

export function useInspectionAutosave({
  propertyId,
  inspectionData,
  autoSaveInterval = 30000, // 30 seconds default
  enabled = true
}: UseInspectionAutosaveProps) {
  const lastSavedRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout>();
  const sessionIdRef = useRef<string | null>(null);

  // Save session to database
  const saveSession = useCallback(async (data: any, status: 'active' | 'completed' | 'abandoned' = 'active') => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const sessionData = {
        property_id: propertyId,
        inspector_id: user.user.id,
        session_data: data,
        status,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
      };

      if (sessionIdRef.current) {
        // Update existing session
        const { data: updatedSession, error } = await supabase
          .from('inspection_sessions')
          .update({
            session_data: data,
            status,
            last_updated: new Date().toISOString()
          })
          .eq('id', sessionIdRef.current)
          .select()
          .single();

        if (error) throw error;
        return updatedSession;
      } else {
        // Create new session
        const { data: newSession, error } = await supabase
          .from('inspection_sessions')
          .insert(sessionData)
          .select()
          .single();

        if (error) throw error;
        sessionIdRef.current = newSession.id;
        return newSession;
      }
    } catch (error) {
      console.error('Failed to save inspection session:', error);
      return null;
    }
  }, [propertyId]);

  // Load existing session
  const loadSession = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data: session, error } = await supabase
        .from('inspection_sessions')
        .select('*')
        .eq('property_id', propertyId)
        .eq('inspector_id', user.user.id)
        .eq('status', 'active')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (session) {
        sessionIdRef.current = session.id;
        return session.session_data;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to load inspection session:', error);
      return null;
    }
  }, [propertyId]);

  // Auto-save effect
  useEffect(() => {
    if (!enabled || !inspectionData) return;

    const dataString = JSON.stringify(inspectionData);
    
    // Only save if data has changed
    if (dataString !== lastSavedRef.current) {
      lastSavedRef.current = dataString;
      
      // Clear existing interval
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      
      // Set new save timeout
      intervalRef.current = setTimeout(() => {
        saveSession(inspectionData);
      }, autoSaveInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [inspectionData, enabled, autoSaveInterval, saveSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  // Complete session
  const completeSession = useCallback(async () => {
    if (inspectionData) {
      await saveSession(inspectionData, 'completed');
      sessionIdRef.current = null;
    }
  }, [inspectionData, saveSession]);

  // Abandon session
  const abandonSession = useCallback(async () => {
    if (sessionIdRef.current) {
      await saveSession(inspectionData, 'abandoned');
      sessionIdRef.current = null;
    }
  }, [inspectionData, saveSession]);

  // Force save current data immediately
  const forceSave = useCallback(async () => {
    if (inspectionData) {
      const session = await saveSession(inspectionData);
      return session;
    }
    return null;
  }, [inspectionData, saveSession]);

  return {
    saveSession,
    loadSession,
    completeSession,
    abandonSession,
    forceSave,
    sessionId: sessionIdRef.current
  };
}