import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppRole = 'driver' | 'escort' | 'manager';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, roles, activeRole, loading, signOut } = useAuth();
  const [managerEmail, setManagerEmail] = useState<string | null>(null);
  const [loadingManager, setLoadingManager] = useState(false);

  useEffect(() => {
    async function fetchManagerEmail() {
      if (!user || profile) return;
      
      setLoadingManager(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('role', 'manager')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (data?.user_id) {
          const { data: userData } = await supabase.auth.admin?.getUserById?.(data.user_id) || {};
          if (userData?.user?.email) {
            setManagerEmail(userData.user.email);
          }
        }
      } catch (error) {
        console.log('Could not fetch manager email');
      }
      setLoadingManager(false);
    }

    fetchManagerEmail();
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">Profile Not Set Up</h2>
        <p className="text-muted-foreground mb-4">
          Your account exists but your manager hasn't set up your profile yet.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Please contact your manager to complete your registration.
        </p>
        
        {managerEmail && (
          <a 
            href={`mailto:${managerEmail}`}
            className="flex items-center gap-2 text-primary hover:underline mb-6"
          >
            <Mail className="w-4 h-4" />
            {managerEmail}
          </a>
        )}

        <Button 
          variant="outline" 
          onClick={signOut}
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    );
  }

  // Check if user has any of the allowed roles (using user_roles or activeRole)
  if (allowedRoles) {
    const hasAllowedRole = roles.some(r => allowedRoles.includes(r)) || 
                           (activeRole && allowedRoles.includes(activeRole));
    
    if (!hasAllowedRole) {
      // Redirect to appropriate dashboard based on active role or first available role
      const redirectRole = activeRole || roles[0] || profile.role;
      switch (redirectRole) {
        case 'driver':
          return <Navigate to="/driver" replace />;
        case 'escort':
          return <Navigate to="/escort" replace />;
        case 'manager':
          return <Navigate to="/manager" replace />;
        default:
          return <Navigate to="/auth" replace />;
      }
    }
  }

  return <>{children}</>;
}
