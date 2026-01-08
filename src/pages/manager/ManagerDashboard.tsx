import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Users, Car, ClipboardList, Route, Wrench, Palette } from 'lucide-react';
import { format } from 'date-fns';

export default function ManagerDashboard() {
  const { profile } = useAuth();
  const today = format(new Date(), 'EEEE, d MMMM yyyy');

  const menuItems = [
    { to: '/manager/users', icon: Users, label: 'Manage Users', description: 'Add drivers and escorts' },
    { to: '/manager/vehicles', icon: Car, label: 'Manage Vehicles', description: 'Vehicle registrations' },
    { to: '/manager/runs', icon: Route, label: 'School Runs', description: 'Runs and allocations' },
    { to: '/manager/garage', icon: Wrench, label: 'Garage Work', description: 'Maintenance alerts' },
    { to: '/manager/entries', icon: ClipboardList, label: 'View Entries', description: 'Timesheets and checklists' },
    { to: '/manager/branding', icon: Palette, label: 'Branding', description: 'Logo and colour scheme' },
  ];

  return (
    <MobileLayout title="Manager Dashboard">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Hello, {profile?.full_name?.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground">{today}</p>
        </div>

        <div className="space-y-3">
          {menuItems.map((item) => (
            <Link key={item.to} to={item.to} className="block touch-card touch-highlight">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
