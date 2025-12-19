import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type AppRole = 'driver' | 'escort' | 'manager';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

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
        <p className="text-sm text-muted-foreground">
          Please contact your manager to complete your registration.
        </p>
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
