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
      // Fetch profile data with timeout protection
      const { data: profileData } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', userId)
          .single(),
        8000,
        'Profile fetch'
      );

      // Fetch role data with timeout protection
      const { data: roleData } = await withTimeout(
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        8000,
        'Role fetch'
      );

      setProfile(profileData);
      setUserRole(roleData?.role || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      console.error('Profile fetch error details:', getAuthErrorMessage(error));
      
      // Don't fail completely if profile fetch fails
      // User can still be authenticated without profile details
      if (isCorsError(error)) {
        console.warn('CORS/timeout detected during profile fetch - continuing without profile data');
      }
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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session with timeout protection
    withTimeout(
      supabase.auth.getSession(),
      10000,
      'Session check'
    ).then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    }).catch(error => {
      console.error('AuthContext: Error getting session:', error);
      console.error('Error details:', getAuthErrorMessage(error));
      
      // Set error state for user feedback
      setError(getAuthErrorMessage(error));
      
      // Always set loading to false, even on timeout/error
      setLoading(false);
      
      // If it's a CORS/timeout issue, we might want to retry later
      if (isCorsError(error)) {
        console.warn('CORS/timeout detected - authentication may be unavailable');
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