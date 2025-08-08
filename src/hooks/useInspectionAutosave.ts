import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { criticalIssueDetector } from '@/lib/CriticalIssueDetector';
import type { Deficiency } from '@/types/deficiency';
import type { CriticalityAnalysis } from '@/lib/CriticalIssueDetector';

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
  enableCriticalDetection?: boolean; // Enable automatic critical issue detection
  onCriticalIssueDetected?: (deficiency: Deficiency, analysis: CriticalityAnalysis) => void;
}

interface CriticalIssueAlert {
  deficiency: Deficiency;
  analysis: CriticalityAnalysis;
  timestamp: string;
}

export function useInspectionAutosave({
  propertyId,
  inspectionData,
  autoSaveInterval = 30000, // 30 seconds default
  enabled = true,
  enableCriticalDetection = true,
  onCriticalIssueDetected
}: UseInspectionAutosaveProps) {
  const lastSavedRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout>();
  const sessionIdRef = useRef<string | null>(null);
  
  // Critical issue detection state
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalIssueAlert[]>([]);
  const [lastAnalyzedDeficiencies, setLastAnalyzedDeficiencies] = useState<string>('');
  const criticalDetectionRef = useRef<NodeJS.Timeout>();

  // Analyze deficiencies for critical issues
  const analyzeCriticalIssues = useCallback(async (deficiencies: Deficiency[]) => {
    if (!enableCriticalDetection || !deficiencies?.length) return;

    try {
      const newAlerts: CriticalIssueAlert[] = [];
      
      for (const deficiency of deficiencies) {
        // Skip if deficiency is already analyzed (has criticality score)
        if (deficiency.criticalityScore !== undefined) continue;
        
        const analysis = criticalIssueDetector.analyzeDeficiency(deficiency);
        
        // If this is a critical issue, create an alert
        if (analysis.needsSupervisorAlert || analysis.isImmediateRepair) {
          const alert: CriticalIssueAlert = {
            deficiency: {
              ...deficiency,
              isImmediateRepair: analysis.isImmediateRepair,
              needsSupervisorAlert: analysis.needsSupervisorAlert,
              criticalityScore: analysis.score,
              detectionTimestamp: new Date().toISOString()
            },
            analysis,
            timestamp: new Date().toISOString()
          };
          
          newAlerts.push(alert);
          
          // Call the callback if provided
          if (onCriticalIssueDetected) {
            onCriticalIssueDetected(alert.deficiency, analysis);
          }
        }
      }
      
      if (newAlerts.length > 0) {
        setCriticalAlerts(prev => [...prev, ...newAlerts]);
        
        // Log critical issues for debugging
        console.warn(`🚨 ${newAlerts.length} critical issues detected:`, 
          newAlerts.map(a => ({
            description: a.deficiency.description,
            score: a.analysis.score,
            urgency: a.analysis.urgencyLevel
          }))
        );
      }
    } catch (error) {
      console.error('Error analyzing critical issues:', error);
    }
  }, [enableCriticalDetection, onCriticalIssueDetected]);

  // Enhanced save session with critical issue tracking
  const enhancedSaveSession = useCallback(async (data: any, status: 'active' | 'completed' | 'abandoned' = 'active') => {
    try {
      // Analyze deficiencies for critical issues before saving
      if (data?.deficiencies && enableCriticalDetection) {
        await analyzeCriticalIssues(data.deficiencies);
      }
      
      // Continue with original save logic
      return await saveSession(data, status);
    } catch (error) {
      console.error('Error in enhanced save session:', error);
      // Fall back to original save if critical analysis fails
      return await saveSession(data, status);
    }
  }, [analyzeCriticalIssues, enableCriticalDetection]);

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
        // Check for existing active session for this property before creating new one
        const { data: existingSession } = await supabase
          .from('inspection_sessions')
          .select('id')
          .eq('property_id', propertyId)
          .eq('inspector_id', user.user.id)
          .eq('status', 'active')
          .order('last_updated', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingSession) {
          // Update existing session instead of creating new one
          sessionIdRef.current = existingSession.id;
          const { data: updatedSession, error } = await supabase
            .from('inspection_sessions')
            .update({
              session_data: data,
              status,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingSession.id)
            .select()
            .single();

          if (error) throw error;
          console.log('🔄 Updated existing session:', existingSession.id);
          return updatedSession;
        } else {
          // Mark any old sessions for this property as abandoned
          await supabase
            .from('inspection_sessions')
            .update({ status: 'abandoned' })
            .eq('property_id', propertyId)
            .eq('inspector_id', user.user.id)
            .eq('status', 'active');

          // Create new session with retry logic for race conditions
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            try {
              const { data: newSession, error } = await supabase
                .from('inspection_sessions')
                .insert(sessionData)
                .select()
                .single();

              if (error) throw error;
              sessionIdRef.current = newSession.id;
              console.log('✨ Created new session:', newSession.id);
              return newSession;
              
            } catch (insertError: any) {
              // If unique constraint violation, try to find the existing session
              if (insertError?.code === '23505') { // unique_violation
                console.log('Unique violation detected, checking for existing session...');
                
                const { data: existingSession } = await supabase
                  .from('inspection_sessions')
                  .select('id')
                  .eq('property_id', propertyId)
                  .eq('inspector_id', user.user.id)
                  .eq('status', 'active')
                  .order('last_updated', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (existingSession) {
                  sessionIdRef.current = existingSession.id;
                  const { data: updatedSession, error: updateError } = await supabase
                    .from('inspection_sessions')
                    .update({
                      session_data: data,
                      status,
                      last_updated: new Date().toISOString()
                    })
                    .eq('id', existingSession.id)
                    .select()
                    .single();

                  if (updateError) throw updateError;
                  console.log('🔄 Found and updated existing session after race condition:', existingSession.id);
                  return updatedSession;
                }
              }
              
              retryCount++;
              if (retryCount >= maxRetries) {
                throw insertError;
              }
              
              // Wait a bit before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
            }
          }
        }
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
      
      // Set new save timeout with enhanced critical detection
      intervalRef.current = setTimeout(() => {
        enhancedSaveSession(inspectionData);
      }, autoSaveInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [inspectionData, enabled, autoSaveInterval, enhancedSaveSession]);

  // Critical issue detection effect - runs independently from auto-save
  useEffect(() => {
    if (!enableCriticalDetection || !inspectionData?.deficiencies) return;

    const deficienciesString = JSON.stringify(inspectionData.deficiencies);
    
    // Only analyze if deficiencies have changed
    if (deficienciesString !== lastAnalyzedDeficiencies) {
      setLastAnalyzedDeficiencies(deficienciesString);
      
      // Clear existing timeout
      if (criticalDetectionRef.current) {
        clearTimeout(criticalDetectionRef.current);
      }
      
      // Set timeout for critical analysis (faster than auto-save for urgent issues)
      criticalDetectionRef.current = setTimeout(() => {
        analyzeCriticalIssues(inspectionData.deficiencies);
      }, 2000); // 2 seconds for critical detection
    }

    return () => {
      if (criticalDetectionRef.current) {
        clearTimeout(criticalDetectionRef.current);
      }
    };
  }, [inspectionData?.deficiencies, enableCriticalDetection, lastAnalyzedDeficiencies, analyzeCriticalIssues]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      if (criticalDetectionRef.current) {
        clearTimeout(criticalDetectionRef.current);
      }
    };
  }, []);

  // Complete session
  const completeSession = useCallback(async () => {
    if (inspectionData) {
      await enhancedSaveSession(inspectionData, 'completed');
      sessionIdRef.current = null;
    }
  }, [inspectionData, enhancedSaveSession]);

  // Abandon session
  const abandonSession = useCallback(async () => {
    if (sessionIdRef.current) {
      await enhancedSaveSession(inspectionData, 'abandoned');
      sessionIdRef.current = null;
    }
  }, [inspectionData, enhancedSaveSession]);

  // Force save current data immediately
  const forceSave = useCallback(async () => {
    if (inspectionData) {
      const session = await enhancedSaveSession(inspectionData);
      return session;
    }
    return null;
  }, [inspectionData, enhancedSaveSession]);

  // Clear critical alerts
  const clearCriticalAlerts = useCallback(() => {
    setCriticalAlerts([]);
  }, []);

  // Get critical issues for inspection
  const getCurrentCriticalIssues = useCallback(() => {
    if (!inspectionData?.deficiencies) return [];
    
    return inspectionData.deficiencies.filter((def: Deficiency) => 
      def.isImmediateRepair || def.needsSupervisorAlert || (def.criticalityScore && def.criticalityScore >= 60)
    );
  }, [inspectionData]);

  return {
    saveSession,
    loadSession,
    completeSession,
    abandonSession,
    forceSave,
    sessionId: sessionIdRef.current,
    // Critical issue management
    criticalAlerts,
    clearCriticalAlerts,
    analyzeCriticalIssues,
    getCurrentCriticalIssues,
    hasCriticalIssues: criticalAlerts.length > 0,
    criticalIssueCount: criticalAlerts.length
  };
}