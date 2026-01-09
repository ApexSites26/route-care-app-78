import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Calendar } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'driver' | 'escort' | 'manager';
  contracted_hours: number | null;
}

interface DayHours {
  date: string;
  dayName: string;
  morningHours: number;
  afternoonHours: number;
  totalHours: number;
}

interface StaffHoursBreakdownProps {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaffHoursBreakdown({ profile: staffProfile, open, onOpenChange }: StaffHoursBreakdownProps) {
  const { profile: authProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weekData, setWeekData] = useState<DayHours[]>([]);
  const [weekStart, setWeekStart] = useState<Date | null>(null);

  useEffect(() => {
    if (!open || !staffProfile || !authProfile?.company_id) return;
    fetchWeeklyBreakdown();
  }, [open, staffProfile, authProfile?.company_id]);

  const fetchWeeklyBreakdown = async () => {
    if (!staffProfile || !authProfile?.company_id) return;
    setLoading(true);

    // Get current week's Monday and Sunday
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    setWeekStart(monday);

    const days: DayHours[] = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      days.push({
        date: dateStr,
        dayName: dayNames[i],
        morningHours: 0,
        afternoonHours: 0,
        totalHours: 0
      });
    }

    const mondayStr = monday.toISOString().split('T')[0];
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayStr = sunday.toISOString().split('T')[0];

    const calculateHours = (start: string | null, finish: string | null): number => {
      if (!start || !finish) return 0;
      const [startH, startM] = start.split(':').map(Number);
      const [finishH, finishM] = finish.split(':').map(Number);
      return Math.max(0, (finishH + finishM / 60) - (startH + startM / 60));
    };

    // Fetch entries based on role
    if (staffProfile.role === 'driver') {
      const { data: entries } = await supabase
        .from('driver_entries')
        .select('entry_date, morning_start_time, morning_finish_time, afternoon_start_time, afternoon_finish_time')
        .eq('user_id', staffProfile.user_id)
        .eq('company_id', authProfile.company_id)
        .gte('entry_date', mondayStr)
        .lte('entry_date', sundayStr);

      entries?.forEach(entry => {
        const dayIndex = days.findIndex(d => d.date === entry.entry_date);
        if (dayIndex >= 0) {
          days[dayIndex].morningHours = calculateHours(entry.morning_start_time, entry.morning_finish_time);
          days[dayIndex].afternoonHours = calculateHours(entry.afternoon_start_time, entry.afternoon_finish_time);
          days[dayIndex].totalHours = days[dayIndex].morningHours + days[dayIndex].afternoonHours;
        }
      });
    } else if (staffProfile.role === 'escort') {
      const { data: entries } = await supabase
        .from('escort_entries')
        .select('entry_date, morning_start_time, morning_finish_time, afternoon_start_time, afternoon_finish_time')
        .eq('user_id', staffProfile.user_id)
        .eq('company_id', authProfile.company_id)
        .gte('entry_date', mondayStr)
        .lte('entry_date', sundayStr);

      entries?.forEach(entry => {
        const dayIndex = days.findIndex(d => d.date === entry.entry_date);
        if (dayIndex >= 0) {
          days[dayIndex].morningHours = calculateHours(entry.morning_start_time, entry.morning_finish_time);
          days[dayIndex].afternoonHours = calculateHours(entry.afternoon_start_time, entry.afternoon_finish_time);
          days[dayIndex].totalHours = days[dayIndex].morningHours + days[dayIndex].afternoonHours;
        }
      });
    }

    setWeekData(days);
    setLoading(false);
  };

  const totalWeekHours = weekData.reduce((sum, d) => sum + d.totalHours, 0);
  const contracted = staffProfile?.contracted_hours ?? 40;
  const overtime = Math.max(0, totalWeekHours - contracted);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {staffProfile?.full_name} - Weekly Hours
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {weekStart && (
              <p className="text-sm text-muted-foreground text-center">
                Week of {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">Day</th>
                    <th className="text-right p-2 font-medium">AM</th>
                    <th className="text-right p-2 font-medium">PM</th>
                    <th className="text-right p-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {weekData.map((day, idx) => (
                    <tr key={day.date} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-2">
                        <span className="font-medium">{day.dayName.slice(0, 3)}</span>
                        <span className="text-muted-foreground ml-1">{formatDate(day.date)}</span>
                      </td>
                      <td className="text-right p-2 tabular-nums">
                        {day.morningHours > 0 ? `${day.morningHours.toFixed(1)}h` : '-'}
                      </td>
                      <td className="text-right p-2 tabular-nums">
                        {day.afternoonHours > 0 ? `${day.afternoonHours.toFixed(1)}h` : '-'}
                      </td>
                      <td className="text-right p-2 font-medium tabular-nums">
                        {day.totalHours > 0 ? `${day.totalHours.toFixed(1)}h` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Worked</span>
                <span className="font-semibold tabular-nums">{totalWeekHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contracted</span>
                <span className="tabular-nums">{contracted}h</span>
              </div>
              {overtime > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span className="font-medium">Overtime</span>
                  <span className="font-semibold tabular-nums">+{overtime.toFixed(1)}h</span>
                </div>
              )}
              {totalWeekHours < contracted && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Remaining</span>
                  <span className="tabular-nums">{(contracted - totalWeekHours).toFixed(1)}h</span>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}