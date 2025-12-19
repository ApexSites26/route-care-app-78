import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, FileText, Users, Car, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
}

export function MobileLayout({ children, title }: MobileLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const getNavItems = () => {
    if (!profile) return [];
    
    switch (profile.role) {
      case 'driver':
        return [
          { to: '/driver', icon: Home, label: 'Home' },
          { to: '/driver/form', icon: FileText, label: 'Daily Form' },
        ];
      case 'escort':
        return [
          { to: '/escort', icon: Home, label: 'Home' },
          { to: '/escort/form', icon: FileText, label: 'Daily Form' },
        ];
      case 'manager':
        return [
          { to: '/manager', icon: Home, label: 'Home' },
          { to: '/manager/users', icon: Users, label: 'Users' },
          { to: '/manager/vehicles', icon: Car, label: 'Vehicles' },
          { to: '/manager/entries', icon: ClipboardList, label: 'Entries' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 safe-top sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {title || 'School Taxi'}
            </h1>
            {profile && (
              <p className="text-xs text-muted-foreground capitalize">
                {profile.full_name} • {profile.role}
              </p>
            )}
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        <div className="max-w-lg mx-auto p-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
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
    </div>
  );
}
