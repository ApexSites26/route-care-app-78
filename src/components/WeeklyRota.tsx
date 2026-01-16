import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Sun, Moon, AlertTriangle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';

interface RunAllocation {
  id: string;
  day_of_week: number;
  shift_type: string;
  run: {
    id: string;
    run_code: string;
    description: string | null;
    pickup_time_home: string | null;
    pickup_time_school: string | null;
  };
}

interface RunException {
  run_id: string;
  exception_date: string;
  affected_leg: string;
  override_pickup_time: string;
  note: string | null;
}

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WeeklyRotaProps {
  role: 'driver' | 'escort';
}

export function WeeklyRota({ role }: WeeklyRotaProps) {
  const { profile } = useAuth();
  const [allocations, setAllocations] = useState<RunAllocation[]>([]);
  const [exceptions, setExceptions] = useState<RunException[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllocations() {
      if (!profile) return;

      const column = role === 'driver' ? 'driver_id' : 'escort_id';
      
      const { data } = await supabase
        .from('run_allocations')
        .select('id, day_of_week, run_id, shift_type')
        .eq(column, profile.id)
        .eq('is_active', true);

      if (data && data.length > 0) {
        // Fetch run details
        const runIds = [...new Set(data.map(a => a.run_id))];
        const { data: runsData } = await supabase
          .from('school_runs')
          .select('id, run_code, description, pickup_time_home, pickup_time_school')
          .in('id', runIds);

        const runMap = new Map(runsData?.map(r => [r.id, r]) || []);
        
        const enriched = data.map(a => ({
          id: a.id,
          day_of_week: a.day_of_week,
          shift_type: a.shift_type,
          run: runMap.get(a.run_id) || { id: a.run_id, run_code: 'Unknown', description: null, pickup_time_home: null, pickup_time_school: null },
        }));

        setAllocations(enriched);

        // Fetch exceptions for this week
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const weekDates = Array.from({ length: 5 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'));

        const { data: exceptionsData } = await supabase
          .from('run_exceptions')
          .select('run_id, exception_date, affected_leg, override_pickup_time, note')
          .in('run_id', runIds)
          .in('exception_date', weekDates);

        setExceptions(exceptionsData || []);
      }
      
      setLoading(false);
    }

    fetchAllocations();
  }, [profile, role]);

  // Get the effective time for a run on a specific date
  const getEffectiveTime = (
    runId: string,
    dayOfWeek: number,
    shiftType: string,
    defaultTime: string | null
  ): { time: string | null; isOverridden: boolean; note: string | null } => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const targetDate = addDays(weekStart, dayOfWeek - 1); // dayOfWeek 1 = Monday
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    const affectedLeg = shiftType === 'am' ? 'home_to_school' : 'school_to_home';
    
    const exception = exceptions.find(
      exc => exc.run_id === runId && 
             exc.exception_date === dateStr && 
             exc.affected_leg === affectedLeg
    );

    if (exception) {
      return {
        time: exception.override_pickup_time.slice(0, 5),
        isOverridden: true,
        note: exception.note,
      };
    }

    return {
      time: defaultTime?.slice(0, 5) || null,
      isOverridden: false,
      note: null,
    };
  };

  if (loading) {
    return (
      <div className="touch-card">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <div className="touch-card">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Weekly Rota</h3>
        </div>
        <p className="text-center text-muted-foreground py-4">
          No runs allocated. Contact your manager.
        </p>
      </div>
    );
  }

  // Group by day and shift
  const byDayShift: Record<string, RunAllocation[]> = {};
  allocations.forEach(a => {
    const key = `${a.day_of_week}-${a.shift_type}`;
    if (!byDayShift[key]) byDayShift[key] = [];
    byDayShift[key].push(a);
  });

  const todayIndex = new Date().getDay();

  return (
    <div className="touch-card">
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Weekly Rota</h3>
      </div>
      
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(day => {
          const amAllocs = byDayShift[`${day}-am`] || [];
          const pmAllocs = byDayShift[`${day}-pm`] || [];
          const isToday = day === todayIndex;
          const hasRuns = amAllocs.length > 0 || pmAllocs.length > 0;
          
          return (
            <div 
              key={day} 
              className={`p-3 rounded-lg border ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {FULL_DAYS[day]}
                  {isToday && <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">Today</span>}
                </span>
              </div>
              
              {!hasRuns ? (
                <p className="text-sm text-muted-foreground">No runs</p>
              ) : (
                <div className="space-y-2">
                  {/* Morning Runs */}
                  {amAllocs.length > 0 && (
                    <div className="flex items-start gap-2">
                      <div className="flex items-center gap-1 text-amber-600 min-w-[50px]">
                        <Sun className="w-4 h-4" />
                        <span className="text-xs font-medium">AM</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {amAllocs.map(alloc => {
                          const { time, isOverridden, note } = getEffectiveTime(
                            alloc.run.id,
                            day,
                            'am',
                            alloc.run.pickup_time_home
                          );
                          return (
                            <span 
                              key={alloc.id} 
                              className={`font-bold text-sm px-2 py-0.5 rounded ${
                                isOverridden 
                                  ? 'text-warning bg-warning/20 border border-warning/30' 
                                  : 'text-primary bg-primary/10'
                              }`}
                              title={note || undefined}
                            >
                              {isOverridden && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                              {alloc.run.run_code}
                              {time && (
                                <span className={`font-normal ml-1 ${isOverridden ? 'text-warning' : 'text-muted-foreground'}`}>
                                  @ {time}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Afternoon Runs */}
                  {pmAllocs.length > 0 && (
                    <div className="flex items-start gap-2">
                      <div className="flex items-center gap-1 text-indigo-600 min-w-[50px]">
                        <Moon className="w-4 h-4" />
                        <span className="text-xs font-medium">PM</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pmAllocs.map(alloc => {
                          const { time, isOverridden, note } = getEffectiveTime(
                            alloc.run.id,
                            day,
                            'pm',
                            alloc.run.pickup_time_school
                          );
                          return (
                            <span 
                              key={alloc.id} 
                              className={`font-bold text-sm px-2 py-0.5 rounded ${
                                isOverridden 
                                  ? 'text-warning bg-warning/20 border border-warning/30' 
                                  : 'text-primary bg-primary/10'
                              }`}
                              title={note || undefined}
                            >
                              {isOverridden && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                              {alloc.run.run_code}
                              {time && (
                                <span className={`font-normal ml-1 ${isOverridden ? 'text-warning' : 'text-muted-foreground'}`}>
                                  @ {time}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
