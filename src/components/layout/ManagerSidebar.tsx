import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Car, 
  ClipboardList, 
  Route, 
  Wrench, 
  Palette, 
  FileText, 
  Home,
  LogOut,
  BookOpen,
  AlertTriangle,
  Bell
} from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const mainNavItems = [
  { to: '/manager', icon: Home, label: 'Dashboard' },
  { to: '/manager/entries', icon: ClipboardList, label: 'View Entries' },
  { to: '/manager/runs', icon: Route, label: 'School Runs' },
  { to: '/manager/garage', icon: Wrench, label: 'Garage' },
];

const managementItems = [
  { to: '/manager/users', icon: Users, label: 'Staff' },
  { to: '/manager/vehicles', icon: Car, label: 'Vehicles' },
  { to: '/manager/defects', icon: AlertTriangle, label: 'Defects' },
  { to: '/manager/diary', icon: BookOpen, label: 'Vehicle Diary' },
];

const settingsItems = [
  { to: '/manager/notifications', icon: Bell, label: 'Notifications' },
  { to: '/manager/branding', icon: Palette, label: 'Branding' },
  { to: '/manager/audit', icon: FileText, label: 'Audit Logs' },
];

export function ManagerSidebar() {
  const location = useLocation();
  const { branding } = useBranding();
  const { profile, signOut } = useAuth();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {branding.logo_url && (
            <img 
              src={branding.logo_url} 
              alt="Logo" 
              className="w-10 h-10 object-contain rounded-lg bg-white p-0.5" 
            />
          )}
          <div className="min-w-0">
            <h2 className="font-semibold text-sidebar-foreground truncate">
              {branding.company_name || 'School Taxi'}
            </h2>
            <p className="text-xs text-sidebar-foreground/60 capitalize truncate">
              {profile?.full_name}
            </p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.to}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.to}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.to}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
