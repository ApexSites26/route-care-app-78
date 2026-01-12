import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, FileText, ClipboardList, LogOut, Route, Wrench } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBranding';
import { cn } from '@/lib/utils';
import { FloatingMenu } from '@/components/FloatingMenu';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  vehicleId?: string;
}

export function MobileLayout({ children, title, vehicleId }: MobileLayoutProps) {
  const { profile, signOut } = useAuth();
  const { branding } = useBranding();
  const location = useLocation();

  const getNavItems = () => {
    if (!profile) return [];
    
    switch (profile.role) {
      case 'driver':
        return [
          { to: '/driver', icon: Home, label: 'Home' },
          { to: '/driver/form', icon: FileText, label: 'Daily Form' },
          { to: '/driver/garage-visit', icon: Wrench, label: 'Garage Visit' },
        ];
      case 'escort':
        return [
          { to: '/escort', icon: Home, label: 'Home' },
          { to: '/escort/form', icon: FileText, label: 'Daily Form' },
        ];
      case 'manager':
        return [
          { to: '/manager', icon: Home, label: 'Home' },
          { to: '/manager/runs', icon: Route, label: 'Runs' },
          { to: '/manager/garage', icon: Wrench, label: 'Garage' },
          { to: '/manager/entries', icon: ClipboardList, label: 'Entries' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const showFloatingMenu = profile?.role === 'driver' || profile?.role === 'escort';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 safe-top sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white p-0.5" />
            )}
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                {title || branding.company_name || 'School Taxi'}
              </h1>
              {profile && (
                <p className="text-xs text-muted-foreground capitalize">
                  {profile.full_name} • {profile.role}
                </p>
              )}
            </div>
          </div>
          {/* Floating Menu for Driver/Escort in header */}
          {showFloatingMenu ? (
            <FloatingMenu 
              items={navItems} 
              role={profile?.role as 'driver' | 'escort'} 
              vehicleId={vehicleId}
              onLogout={signOut}
            />
          ) : (
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("flex-1 overflow-auto", profile?.role === 'manager' ? "pb-20" : "pb-4")}>
        <div className="max-w-lg mx-auto p-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Only for Manager */}
      {profile?.role === 'manager' && (
        <nav className="bottom-nav">
          <div className="flex items-center justify-around max-w-lg mx-auto py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                    isActive 
                      ? "text-primary bg-primary/10" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
