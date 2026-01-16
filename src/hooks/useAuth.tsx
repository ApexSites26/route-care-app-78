import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'driver' | 'escort' | 'manager';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: AppRole;
  is_active: boolean;
  company_id: string | null;
  contracted_hours: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  hasRole: (role: AppRole) => boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile | null;
  };

  const fetchUserRoles = async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
    
    return (data || []).map(r => r.role as AppRole);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch
        if (session?.user) {
          setTimeout(async () => {
            const [profileData, userRoles] = await Promise.all([
              fetchProfile(session.user.id),
              fetchUserRoles(session.user.id)
            ]);
            
            setProfile(profileData);
            
            // If no roles in user_roles table, fallback to profile.role
            const effectiveRoles = userRoles.length > 0 ? userRoles : (profileData?.role ? [profileData.role] : []);
            setRoles(effectiveRoles);
            
            // Restore active role from localStorage or use first role
            const savedRole = localStorage.getItem('activeRole') as AppRole | null;
            if (savedRole && effectiveRoles.includes(savedRole)) {
              setActiveRoleState(savedRole);
            } else if (effectiveRoles.length > 0) {
              // Prioritize manager > driver > escort
              const priorityOrder: AppRole[] = ['manager', 'driver', 'escort'];
              const defaultRole = priorityOrder.find(r => effectiveRoles.includes(r)) || effectiveRoles[0];
              setActiveRoleState(defaultRole);
            }
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setActiveRoleState(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const [profileData, userRoles] = await Promise.all([
          fetchProfile(session.user.id),
          fetchUserRoles(session.user.id)
        ]);
        
        setProfile(profileData);
        
        const effectiveRoles = userRoles.length > 0 ? userRoles : (profileData?.role ? [profileData.role] : []);
        setRoles(effectiveRoles);
        
        const savedRole = localStorage.getItem('activeRole') as AppRole | null;
        if (savedRole && effectiveRoles.includes(savedRole)) {
          setActiveRoleState(savedRole);
        } else if (effectiveRoles.length > 0) {
          const priorityOrder: AppRole[] = ['manager', 'driver', 'escort'];
          const defaultRole = priorityOrder.find(r => effectiveRoles.includes(r)) || effectiveRoles[0];
          setActiveRoleState(defaultRole);
        }
        
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setActiveRole = (role: AppRole) => {
    if (roles.includes(role)) {
      setActiveRoleState(role);
      localStorage.setItem('activeRole', role);
    }
  };

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    return { error };
  };

  const signOut = async () => {
    localStorage.removeItem('activeRole');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setActiveRoleState(null);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      roles, 
      activeRole, 
      setActiveRole, 
      hasRole, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      resetPassword, 
      updatePassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
