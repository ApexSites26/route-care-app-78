import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, Route } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface RunAllocation {
  id: string;
  day_of_week: number;
  run: {
    run_code: string;
    description: string | null;
    pickup_time_home: string | null;
    pickup_time_school: string | null;
  };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WeeklyRotaProps {
  role: 'driver' | 'escort';
}

export function WeeklyRota({ role }: WeeklyRotaProps) {
  const { profile } = useAuth();
  const [allocations, setAllocations] = useState<RunAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllocations() {
      if (!profile) return;

      const column = role === 'driver' ? 'driver_id' : 'escort_id';
      
      const { data } = await supabase
        .from('run_allocations')
        .select('id, day_of_week, run_id')
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
          run: runMap.get(a.run_id) || { run_code: 'Unknown', description: null, pickup_time_home: null, pickup_time_school: null },
        }));

        setAllocations(enriched);
      }
      
      setLoading(false);
    }

    fetchAllocations();
  }, [profile, role]);

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

  // Group by day
  const byDay: Record<number, RunAllocation[]> = {};
  allocations.forEach(a => {
    if (!byDay[a.day_of_week]) byDay[a.day_of_week] = [];
    byDay[a.day_of_week].push(a);
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
          const dayAllocs = byDay[day] || [];
          const isToday = day === todayIndex;
          
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
              
              {dayAllocs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No runs</p>
              ) : (
                <div className="space-y-2">
                  {dayAllocs.map(alloc => (
                    <div key={alloc.id} className="flex items-center gap-3 text-sm">
                      <span className="font-bold text-primary">{alloc.run.run_code}</span>
                      <div className="flex gap-2 text-muted-foreground">
                        {alloc.run.pickup_time_home && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {alloc.run.pickup_time_home.slice(0, 5)}
                          </span>
                        )}
                        {alloc.run.pickup_time_school && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {alloc.run.pickup_time_school.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}