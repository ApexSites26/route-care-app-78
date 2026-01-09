import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Car, 
  ClipboardList, 
  Route, 
  Wrench, 
  Palette,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalDrivers: number;
  totalEscorts: number;
  missingEntriesToday: number;
  issuesThisWeek: number;
  hoursThisWeek: number;
  incompleteToday: string[];
}

export default function ManagerOverview() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalDrivers: 0,
    totalEscorts: 0,
    missingEntriesToday: 0,
    issuesThisWeek: 0,
    hoursThisWeek: 0,
    incompleteToday: [],
  });
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'EEEE, d MMMM yyyy');
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  useEffect(() => {
    async function fetchStats() {
      if (!profile?.company_id) return;

      // Fetch all profiles for this company
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, role')
        .eq('company_id', profile.company_id);

      const drivers = profiles?.filter(p => p.role === 'driver') || [];
      const escorts = profiles?.filter(p => p.role === 'escort') || [];

      // Fetch today's entries
      const { data: driverEntriesToday } = await supabase
        .from('driver_entries')
        .select('user_id, morning_start_time, afternoon_start_time')
        .eq('entry_date', todayDate)
        .eq('company_id', profile.company_id);

      const { data: escortEntriesToday } = await supabase
        .from('escort_entries')
        .select('user_id, morning_start_time, afternoon_start_time')
        .eq('entry_date', todayDate)
        .eq('company_id', profile.company_id);

      // Find who hasn't submitted
      const driverUserIdsWithEntries = new Set(driverEntriesToday?.map(e => e.user_id) || []);
      const escortUserIdsWithEntries = new Set(escortEntriesToday?.map(e => e.user_id) || []);

      const incomplete: string[] = [];
      drivers.forEach(d => {
        if (!driverUserIdsWithEntries.has(d.user_id)) {
          incomplete.push(d.full_name);
        }
      });
      escorts.forEach(e => {
        if (!escortUserIdsWithEntries.has(e.user_id)) {
          incomplete.push(e.full_name);
        }
      });

      // Fetch week's entries for issues and hours
      const [{ data: driverEntriesWeek }, { data: escortEntriesWeek }] = await Promise.all([
        supabase
          .from('driver_entries')
          .select('*')
          .gte('entry_date', weekStart)
          .lte('entry_date', weekEnd)
          .eq('company_id', profile.company_id),
        supabase
          .from('escort_entries')
          .select('*')
          .gte('entry_date', weekStart)
          .lte('entry_date', weekEnd)
          .eq('company_id', profile.company_id),
      ]);

      // Count issues
      const driverIssues = driverEntriesWeek?.filter(e => !e.no_issues).length || 0;
      const escortIssues = escortEntriesWeek?.filter(e => !e.no_issues).length || 0;

      // Calculate hours
      const calculateHours = (start: string | null, finish: string | null): number => {
        if (!start || !finish) return 0;
        const [startH, startM] = start.split(':').map(Number);
        const [finishH, finishM] = finish.split(':').map(Number);
        return Math.max(0, (finishH * 60 + finishM - startH * 60 - startM) / 60);
      };

      let totalHours = 0;
      driverEntriesWeek?.forEach(e => {
        totalHours += calculateHours(e.morning_start_time, e.morning_finish_time);
        totalHours += calculateHours(e.afternoon_start_time, e.afternoon_finish_time);
      });
      escortEntriesWeek?.forEach(e => {
        totalHours += calculateHours(e.morning_start_time, e.morning_finish_time);
        totalHours += calculateHours(e.afternoon_start_time, e.afternoon_finish_time);
      });

      setStats({
        totalDrivers: drivers.length,
        totalEscorts: escorts.length,
        missingEntriesToday: incomplete.length,
        issuesThisWeek: driverIssues + escortIssues,
        hoursThisWeek: Math.round(totalHours * 10) / 10,
        incompleteToday: incomplete,
      });
      setLoading(false);
    }

    fetchStats();
  }, [profile?.company_id]);

  const menuItems = [
    { to: '/manager/users', icon: Users, label: 'Manage Staff', description: 'Add drivers and escorts' },
    { to: '/manager/vehicles', icon: Car, label: 'Manage Vehicles', description: 'Vehicle registrations' },
    { to: '/manager/runs', icon: Route, label: 'Routes', description: 'Routes and allocations' },
    { to: '/manager/garage', icon: Wrench, label: 'Garage Work', description: 'Maintenance alerts' },
    { to: '/manager/entries', icon: ClipboardList, label: 'View Entries', description: 'Timesheets and checklists' },
    { to: '/manager/branding', icon: Palette, label: 'Company Settings', description: 'Logo and colour scheme' },
    { to: '/manager/audit', icon: FileText, label: 'Audit Logs', description: 'Compliance records' },
  ];

  const getStatusColor = (value: number, thresholds: { green: number; amber: number }) => {
    if (value <= thresholds.green) return 'text-success bg-success/10 border-success/20';
    if (value <= thresholds.amber) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  return (
    <MobileLayout title="Manager Dashboard">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Hello, {profile?.full_name?.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground">{today}</p>
        </div>

        {/* Quick Stats */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3">
            <div className="touch-card text-center">
              <p className="text-3xl font-bold text-primary">{stats.totalDrivers}</p>
              <p className="text-sm text-muted-foreground">Drivers</p>
            </div>
            <div className="touch-card text-center">
              <p className="text-3xl font-bold text-primary">{stats.totalEscorts}</p>
              <p className="text-sm text-muted-foreground">Escorts</p>
            </div>
          </div>
        )}

        {/* Status Cards */}
        {!loading && (
          <div className="space-y-3">
            {/* Missing Entries */}
            <div className={cn(
              "touch-card border-2",
              getStatusColor(stats.missingEntriesToday, { green: 0, amber: 2 })
            )}>
              <div className="flex items-center gap-3">
                {stats.missingEntriesToday === 0 ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Clock className="w-6 h-6" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">
                    {stats.missingEntriesToday === 0 
                      ? 'All staff submitted today' 
                      : `${stats.missingEntriesToday} missing entries today`}
                  </p>
                  {stats.incompleteToday.length > 0 && (
                    <p className="text-sm opacity-80">
                      {stats.incompleteToday.slice(0, 3).join(', ')}
                      {stats.incompleteToday.length > 3 && ` +${stats.incompleteToday.length - 3} more`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Issues This Week */}
            <div className={cn(
              "touch-card border-2",
              getStatusColor(stats.issuesThisWeek, { green: 0, amber: 3 })
            )}>
              <div className="flex items-center gap-3">
                {stats.issuesThisWeek === 0 ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
                <div>
                  <p className="font-semibold">
                    {stats.issuesThisWeek === 0 
                      ? 'No issues this week' 
                      : `${stats.issuesThisWeek} issues flagged this week`}
                  </p>
                </div>
              </div>
            </div>

            {/* Hours This Week */}
            <div className="touch-card border-2 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-semibold text-primary">{stats.hoursThisWeek}h logged this week</p>
                  <p className="text-sm text-muted-foreground">Total staff hours</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
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
