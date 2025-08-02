import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout, isCorsError, getAuthErrorMessage } from '@/lib/authUtils';

export type UserRole = 'super_admin' | 'manager' | 'inspector';

interface Profile {
  id: string;
  auth_user_id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  error: string | null;
  isRetrying: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  retryAuth: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  userRole: null,
  loading: true,
  error: null,
  isRetrying: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  retryAuth: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Safety check for React dispatcher
  let user, setUser, session, setSession, profile, setProfile, userRole, setUserRole, loading, setLoading, error, setError, isRetrying, setIsRetrying;
  
  try {
    [user, setUser] = useState<User | null>(null);
    [session, setSession] = useState<Session | null>(null);
    [profile, setProfile] = useState<Profile | null>(null);
    [userRole, setUserRole] = useState<UserRole | null>(null);
    [loading, setLoading] = useState(true);
    [error, setError] = useState<string | null>(null);
    [isRetrying, setIsRetrying] = useState(false);
  } catch (error) {
    console.error('React dispatcher error in AuthProvider:', error);
    // Fallback to force remount
    window.location.reload();
    return null;
  }

  const fetchProfile = async (userId: string) => {
    try {
      console.log('🔍 AuthContext: Starting profile fetch for user:', userId);
      
      // Fetch profile data with reduced timeout
      console.log('📋 AuthContext: Fetching profile data...');
      const profileQuery = supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .single();
        
      const { data: profileData, error: profileError } = await withTimeout(
        profileQuery,
        3000, // Reduced from 8000ms to 3000ms
        'Profile fetch'
      );

      if (profileError) {
        console.warn('⚠️ AuthContext: Profile fetch returned error:', profileError);
        // For 406 errors, likely schema issues - continue without profile
        if (profileError.code === 'PGRST106' || profileError.message?.includes('406')) {
          console.warn('🔧 AuthContext: Database schema issue detected - continuing without profile');
          setProfile(null);
          setUserRole(null);
          return;
        }
      } else {
        console.log('✅ AuthContext: Profile data fetched successfully:', profileData);
      }

      // Fetch role data with reduced timeout
      console.log('👤 AuthContext: Fetching user role...');
      const roleQuery = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      const { data: roleData, error: roleError } = await withTimeout(
        roleQuery,
        3000, // Reduced from 8000ms to 3000ms
        'Role fetch'
      );

      if (roleError) {
        console.warn('⚠️ AuthContext: Role fetch returned error:', roleError);
        // For 406 errors, likely schema issues - continue without role
        if (roleError.code === 'PGRST106' || roleError.message?.includes('406')) {
          console.warn('🔧 AuthContext: Database schema issue detected - continuing without role');
        }
      } else {
        console.log('✅ AuthContext: Role data fetched successfully:', roleData);
      }

      setProfile(profileData || null);
      setUserRole(roleData?.role || null);
      console.log('🎯 AuthContext: Profile and role set successfully');
    } catch (error) {
      console.error('❌ AuthContext: Error fetching profile:', error);
      console.error('🔍 AuthContext: Profile fetch error details:', getAuthErrorMessage(error));
      
      // Don't fail completely if profile fetch fails - continue without profile data
      console.warn('⚠️ AuthContext: Continuing without profile data due to fetch error');
      setProfile(null);
      setUserRole(null);
      
      if (isCorsError(error)) {
        console.warn('🌐 AuthContext: CORS/timeout detected during profile fetch - user can still proceed');
      }
    } finally {
      // CRITICAL: Always ensure loading is set to false after profile fetch attempt
      console.log('🔓 AuthContext: Profile fetch complete - ensuring loading is false');
      setLoading(false);
    }
  };

  // Add recovery mechanism for auth state corruption
  useEffect(() => {
    const handleAuthError = () => {
      console.log('Auth state corruption detected, forcing reload');
      window.location.reload();
    };

    window.addEventListener('unhandledrejection', handleAuthError);
    return () => window.removeEventListener('unhandledrejection', handleAuthError);
  }, []);

  useEffect(() => {
    console.log('🚀 AuthContext: Setting up auth state listener...');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 AuthContext: Auth state changed. Event:', event, 'Session:', !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 AuthContext: User logged in, fetching profile...');
          // Don't set loading to false here - let fetchProfile handle it
          fetchProfile(session.user.id);
        } else {
          console.log('👤 AuthContext: No user session, clearing profile data');
          setProfile(null);
          setUserRole(null);
          console.log('✅ AuthContext: No session - setting loading to false');
          setLoading(false);
        }
      }
    );

    // Check for existing session with reduced timeout
    console.log('🔍 AuthContext: Checking for existing session...');
    withTimeout(
      supabase.auth.getSession(),
      5000, // Reduced from 10000ms to 5000ms
      'Session check'
    ).then(({ data: { session } }) => {
      console.log('📋 AuthContext: Session check complete. Session exists:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('👤 AuthContext: Found existing session, fetching profile...');
        // Don't set loading to false here - let fetchProfile handle it
        fetchProfile(session.user.id);
      } else {
        console.log('👤 AuthContext: No existing session found');
        console.log('✅ AuthContext: Initial session check - no session - setting loading to false');
        setLoading(false);
      }
    }).catch(error => {
      console.error('❌ AuthContext: Error getting session:', error);
      console.error('🔍 AuthContext: Session error details:', getAuthErrorMessage(error));
      
      // Set error state for user feedback
      setError(getAuthErrorMessage(error));
      
      // Always set loading to false, even on timeout/error
      console.log('⚠️ AuthContext: Session check failed - setting loading to false anyway');
      setLoading(false);
      
      // If it's a CORS/timeout issue, we might want to retry later
      if (isCorsError(error)) {
        console.warn('🌐 AuthContext: CORS/timeout detected - authentication may be unavailable');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Retry authentication function
  const retryAuth = () => {
    setIsRetrying(true);
    setError(null);
    setLoading(true);
    
    // Retry session check with timeout protection
    withTimeout(
      supabase.auth.getSession(),
      10000,
      'Session retry'
    ).then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
      setIsRetrying(false);
      setError(null); // Clear error on successful retry
    }).catch(error => {
      console.error('AuthContext: Retry failed:', error);
      setError(getAuthErrorMessage(error));
      setLoading(false);
      setIsRetrying(false);
    });
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    loading,
    error,
    isRetrying,
    signIn,
    signUp,
    signOut,
    retryAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};