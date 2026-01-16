import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, addDays, isAfter, isSameDay } from 'date-fns';

interface RunException {
  id: string;
  run_id: string;
  exception_date: string;
  affected_leg: 'home_to_school' | 'school_to_home';
  override_pickup_time: string;
  note: string | null;
}

interface UpcomingNotification {
  runCode: string;
  date: string;
  leg: string;
  time: string;
  note: string | null;
}

export function useRunExceptions() {
  const { profile } = useAuth();
  const [exceptions, setExceptions] = useState<RunException[]>([]);
  const [upcomingNotifications, setUpcomingNotifications] = useState<UpcomingNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExceptions() {
      if (!profile?.company_id) return;

      // Fetch exceptions for today and tomorrow
      const today = format(new Date(), 'yyyy-MM-dd');
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

      const { data: exceptionsData, error } = await supabase
        .from('run_exceptions')
        .select(`
          id,
          run_id,
          exception_date,
          affected_leg,
          override_pickup_time,
          note,
          school_runs!inner(run_code, company_id)
        `)
        .eq('school_runs.company_id', profile.company_id)
        .in('exception_date', [today, tomorrow]);

      if (error) {
        console.error('Error fetching exceptions:', error);
        setLoading(false);
        return;
      }

      // Transform the data
      const formattedExceptions = (exceptionsData || []).map((exc: any) => ({
        id: exc.id,
        run_id: exc.run_id,
        exception_date: exc.exception_date,
        affected_leg: exc.affected_leg,
        override_pickup_time: exc.override_pickup_time,
        note: exc.note,
      }));

      setExceptions(formattedExceptions);

      // Build notifications for tomorrow's exceptions
      const notifications: UpcomingNotification[] = (exceptionsData || [])
        .filter((exc: any) => exc.exception_date === tomorrow)
        .map((exc: any) => ({
          runCode: exc.school_runs.run_code,
          date: exc.exception_date,
          leg: exc.affected_leg === 'home_to_school' ? 'AM' : 'PM',
          time: exc.override_pickup_time.slice(0, 5),
          note: exc.note,
        }));

      setUpcomingNotifications(notifications);
      setLoading(false);
    }

    fetchExceptions();
  }, [profile?.company_id]);

  // Helper function to get the effective pickup time for a run on a specific date
  const getEffectiveTime = (
    runId: string, 
    date: Date | string, 
    leg: 'home_to_school' | 'school_to_home',
    defaultTime: string | null
  ): { time: string | null; isOverridden: boolean; note: string | null } => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    
    const exception = exceptions.find(
      exc => exc.run_id === runId && 
             exc.exception_date === dateStr && 
             exc.affected_leg === leg
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

  // Check if a date has any exceptions for a specific run
  const hasException = (runId: string, date: Date | string) => {
    const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    return exceptions.some(exc => exc.run_id === runId && exc.exception_date === dateStr);
  };

  return {
    exceptions,
    upcomingNotifications,
    loading,
    getEffectiveTime,
    hasException,
  };
}
