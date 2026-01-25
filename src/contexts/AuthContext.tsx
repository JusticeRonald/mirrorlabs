import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase/database.types';
import { AccountType, ACCOUNT_PERMISSIONS, AccountPermissions, User } from '@/types/user';

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
  name: 'Demo Client',
  email: 'demo@example.com',
  initials: 'DC',
};

const demoProfile: Profile = {
  id: 'demo-user',
  email: 'demo@example.com',
  name: 'Demo Client',
  avatar_url: null,
  initials: 'DC',
  account_type: 'client',
  is_staff: false,
  primary_workspace_id: 'demo',
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
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          console.warn('[Auth] Session error, clearing stale state:', error.message);
          // Clear potentially corrupted storage
          try {
            const keysToRemove = Object.keys(localStorage).filter(
              key => key.startsWith('sb-') || key.includes('supabase') || key.includes('mirrorlabs-auth')
            );
            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log('[Auth] Cleared', keysToRemove.length, 'stale auth keys from storage');
          } catch (e) {
            console.warn('[Auth] Could not clear storage:', e);
          }
          setSession(null);
          setProfile(null);
          return;
        }

        setSession(session);
        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        } else {
          // No valid session - ensure clean state
          setProfile(null);
        }
      })
      .catch((error) => {
        // Handle promise rejection (network error, invalid credentials, etc.)
        console.error('[Auth] Failed to get session:', error);
        setSession(null);
        setProfile(null);
      })
      .finally(() => {
        // ALWAYS set loading to false, whether promise resolves or rejects
        setIsLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state change:', event, session?.user?.email);

        // Handle specific events
        switch (event) {
          case 'SIGNED_OUT':
            // Explicitly clear all state on sign out
            setSession(null);
            setProfile(null);
            setIsDemoMode(false);
            break;

          case 'TOKEN_REFRESHED':
            // Token was refreshed - update session but don't refetch profile
            console.log('[Auth] Token refreshed successfully');
            setSession(session);
            break;

          case 'SIGNED_IN':
          case 'USER_UPDATED':
            // User signed in or updated - fetch/refresh profile
            setSession(session);
            setIsDemoMode(false);
            if (session?.user) {
              const userProfile = await fetchProfile(session.user.id);
              setProfile(userProfile);
            }
            break;

          case 'INITIAL_SESSION':
            // Initial session load - handled by getSession above
            break;

          default:
            // Any other event - update session state
            setSession(session);
            setIsDemoMode(false);
            if (session?.user) {
              const userProfile = await fetchProfile(session.user.id);
              setProfile(userProfile);
            } else {
              setProfile(null);
            }
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
    // Admin-Centric Model:
    // - Staff (@mirrorlabs3d.com): Gets a personal workspace
    // - Clients: Profile only - admin adds them to workspaces

    return { error };
  };

  const logout = async (): Promise<void> => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setProfile(null);
      return;
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Logout error:', error.message);
      }
      // Always clear local state - don't rely solely on onAuthStateChange
      // The listener will also fire, but double-setting to null is safe
      setSession(null);
      setProfile(null);
    } else {
      // Not configured - just clear local state
      setSession(null);
      setProfile(null);
    }
  };

  const loginAsDemo = (): void => {
    setIsDemoMode(true);
    setProfile(demoProfile);
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error: Error | null }> => {
    // Filter out restricted fields to prevent privilege escalation
    const { is_staff: _staff, account_type: _type, id: _id, created_at: _created, ...safeUpdates } = updates;

    if (isDemoMode) {
      setProfile(prev => prev ? { ...prev, ...safeUpdates } : null);
      return { error: null };
    }

    if (!session?.user || !isSupabaseConfigured()) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', session.user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...safeUpdates } : null);
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
    // Check profile is_staff flag first (works for both demo and real users)
    if (profile?.is_staff) {
      console.log('[Auth] Profile is_staff flag = true');
      return true;
    }
    // Demo mode without is_staff flag defaults to client
    if (isDemoMode) {
      console.log('[Auth] Demo mode without is_staff flag - isStaff = false');
      return false;
    }
    // Check email domain for real users
    const email = user?.email || '';
    const emailIsStaff = email.endsWith('@mirrorlabs3d.com');
    console.log(`[Auth] Email "${email}" isStaff = ${emailIsStaff}`);
    return emailIsStaff;
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
