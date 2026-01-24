import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase/database.types';
import { AccountType, ACCOUNT_PERMISSIONS, AccountPermissions } from '@/types/user';

// Legacy User type for backward compatibility
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isDemoMode: boolean;
  // Staff/client distinction
  isStaff: boolean;
  accountType: AccountType;
  permissions: AccountPermissions;
  canUpload: boolean;
  // Auth methods
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signup: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  loginAsDemo: () => void;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user for offline/demo mode
const demoUser: User = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@mirrorlabs.com',
  initials: 'DU',
};

const demoProfile: Profile = {
  id: 'demo-user',
  email: 'demo@mirrorlabs.com',
  name: 'Demo User',
  avatar_url: null,
  initials: 'DU',
  account_type: 'client',
  is_staff: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Helper to convert Supabase user to our User type
function supabaseUserToUser(supabaseUser: SupabaseUser, profile?: Profile | null): User {
  const name = profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User';
  const nameParts = name.split(' ');
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();

  return {
    id: supabaseUser.id,
    name,
    email: supabaseUser.email || '',
    avatar: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url,
    initials,
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Error fetching profile:', error.message);
      return null;
    }

    return data;
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // No Supabase configured - start in loading false, not demo mode
      // User can still log in via demo mode explicitly
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const userProfile = await fetchProfile(session.user.id);
        setProfile(userProfile);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setIsDemoMode(false);

        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { name: 'ConfigError', message: 'Supabase is not configured' } as AuthError };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signup = async (email: string, password: string, name: string): Promise<{ error: AuthError | null }> => {
    if (!isSupabaseConfigured()) {
      return { error: { name: 'ConfigError', message: 'Supabase is not configured' } as AuthError };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    // Note: Profile is created automatically by database trigger (handle_new_user)
    // The trigger uses the name from raw_user_meta_data and auto-detects staff from email domain

    return { error };
  };

  const logout = async (): Promise<void> => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setProfile(null);
      return;
    }

    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setProfile(null);
  };

  const loginAsDemo = (): void => {
    setIsDemoMode(true);
    setProfile(demoProfile);
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error: Error | null }> => {
    if (isDemoMode) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return { error: null };
    }

    if (!session?.user || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }

    return { error: error ? new Error(error.message) : null };
  };

  // Compute derived user state
  const isLoggedIn = isDemoMode || !!session?.user;
  const user: User | null = isDemoMode
    ? demoUser
    : session?.user
      ? supabaseUserToUser(session.user, profile)
      : null;

  // Staff detection: check email domain or profile is_staff flag
  const isStaff = useMemo(() => {
    if (isDemoMode) return false;
    if (profile?.is_staff) return true;
    const email = user?.email || '';
    return email.endsWith('@mirrorlabs3d.com');
  }, [isDemoMode, profile?.is_staff, user?.email]);

  // Account type: demo, staff, or client
  const accountType: AccountType = useMemo(() => {
    if (isDemoMode) return 'demo';
    if (isStaff) return 'staff';
    return 'client';
  }, [isDemoMode, isStaff]);

  // Permissions based on account type
  const permissions = useMemo(() => ACCOUNT_PERMISSIONS[accountType], [accountType]);

  // Shorthand for upload permission
  const canUpload = useMemo(() => permissions.canUploadScans, [permissions]);

  const value: AuthContextType = {
    isLoggedIn,
    isLoading,
    user,
    session,
    profile,
    isDemoMode,
    isStaff,
    accountType,
    permissions,
    canUpload,
    login,
    signup,
    logout,
    loginAsDemo,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Re-export User type for backward compatibility
export type { User as AuthUser };
