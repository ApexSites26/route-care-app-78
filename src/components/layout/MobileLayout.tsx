import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, FileText, ClipboardList, LogOut, Route, Wrench, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBranding';
import { cn } from '@/lib/utils';
import { FloatingMenu } from '@/components/FloatingMenu';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { useIsMobile } from '@/hooks/use-mobile';
import { DesktopManagerLayout } from './DesktopManagerLayout';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  vehicleId?: string;
}

export function MobileLayout({ children, title, vehicleId }: MobileLayoutProps) {
  const { profile, roles, activeRole, signOut } = useAuth();
  const { branding } = useBranding();
  const location = useLocation();
  const isMobile = useIsMobile();

  const getNavItems = () => {
    if (!profile) return [];
    
    // Use activeRole if available, otherwise fall back to profile.role
    const currentRole = activeRole || profile.role;
    
    switch (currentRole) {
      case 'driver':
        return [
          { to: '/driver', icon: Home, label: 'Home' },
          { to: '/driver/form', icon: FileText, label: 'Daily Form' },
          { to: '/driver/garage-visit', icon: Wrench, label: 'Garage Visit' },
          { to: '/driver/profile', icon: Settings, label: 'My Profile' },
        ];
      case 'escort':
        return [
          { to: '/escort', icon: Home, label: 'Home' },
          { to: '/escort/form', icon: FileText, label: 'Daily Form' },
          { to: '/escort/profile', icon: Settings, label: 'My Profile' },
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
  const currentRole = activeRole || profile?.role;
  const showFloatingMenu = currentRole === 'driver' || currentRole === 'escort';
  const hasMultipleRoles = roles.length > 1;

  // For managers on desktop, use the enhanced desktop layout with sidebar
  if (currentRole === 'manager' && !isMobile) {
    return (
      <DesktopManagerLayout title={title}>
        {children}
      </DesktopManagerLayout>
    );
  }

  // For drivers/escorts on desktop, enhance the layout but keep similar structure
  const isDesktopDriverEscort = !isMobile && (currentRole === 'driver' || currentRole === 'escort');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className={cn(
        "bg-card border-b border-border px-4 py-3 safe-top sticky top-0 z-40",
        isDesktopDriverEscort && "md:px-8"
      )}>
        <div className={cn(
          "flex items-center justify-between max-w-lg mx-auto",
          isDesktopDriverEscort && "md:max-w-3xl"
        )}>
          <div className="flex items-center gap-3">
            {branding.logo_url && (
              <img 
                src={branding.logo_url} 
                alt="Logo" 
                className={cn(
                  "w-10 h-10 object-contain rounded-lg bg-white p-0.5",
                  isDesktopDriverEscort && "md:w-12 md:h-12"
                )} 
              />
            )}
            <div>
              <h1 className={cn(
                "text-lg font-semibold text-foreground",
                isDesktopDriverEscort && "md:text-xl"
              )}>
                {title || branding.company_name || 'School Taxi'}
              </h1>
              {profile && (
                <p className="text-xs text-muted-foreground capitalize md:text-sm">
                  {profile.full_name} • {currentRole}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Role Switcher for multi-role users */}
            {hasMultipleRoles && <RoleSwitcher />}
            
            {/* Floating Menu for Driver/Escort in header */}
            {showFloatingMenu ? (
              <FloatingMenu 
                items={navItems} 
                role={currentRole as 'driver' | 'escort'} 
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
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-auto", 
        currentRole === 'manager' ? "pb-20" : "pb-4",
        isDesktopDriverEscort && "md:pb-8"
      )}>
        <div className={cn(
          "max-w-lg mx-auto p-4",
          isDesktopDriverEscort && "md:max-w-2xl md:p-6"
        )}>
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Only for Manager on Mobile */}
      {currentRole === 'manager' && isMobile && (
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
