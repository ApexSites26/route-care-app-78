import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { ManagerSidebar } from './ManagerSidebar';
import { useBranding } from '@/hooks/useBranding';
import { useAuth } from '@/hooks/useAuth';

interface DesktopManagerLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DesktopManagerLayout({ children, title }: DesktopManagerLayoutProps) {
  const { branding } = useBranding();
  const { profile } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ManagerSidebar />
        <SidebarInset className="flex-1">
          {/* Desktop Header */}
          <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-40">
            <div className="flex items-center gap-4 max-w-6xl mx-auto">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-foreground">
                  {title || branding.company_name || 'School Taxi'}
                </h1>
                {profile && (
                  <p className="text-sm text-muted-foreground">
                    Welcome back, {profile.full_name}
                  </p>
                )}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
