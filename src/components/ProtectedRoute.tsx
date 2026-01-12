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
  const { user, profile, loading, signOut } = useAuth();
  const [managerEmail, setManagerEmail] = useState<string | null>(null);
  const [loadingManager, setLoadingManager] = useState(false);

  useEffect(() => {
    async function fetchManagerEmail() {
      if (!user || profile) return;
      
      setLoadingManager(true);
      try {
        // Try to find a manager from any company (since user doesn't have a profile yet)
        const { data } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('role', 'manager')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (data?.user_id) {
          // Get the email from auth.users via the user's email in their session
          const { data: userData } = await supabase.auth.admin?.getUserById?.(data.user_id) || {};
          if (userData?.user?.email) {
            setManagerEmail(userData.user.email);
          }
        }
      } catch (error) {
        // Silently fail - we'll just show the default message
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

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard
    switch (profile.role) {
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

  return <>{children}</>;
}
