import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface EscortEntry {
  id: string;
  entry_date: string;
  submitted_at: string;
}

export default function EscortDashboard() {
  const { profile, user } = useAuth();
  const [todayEntry, setTodayEntry] = useState<EscortEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      // Check for today's entry
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: entryData } = await supabase
        .from('escort_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();

      setTodayEntry(entryData);
      setLoading(false);
    }

    fetchData();
  }, [user]);

  const today = format(new Date(), 'EEEE, d MMMM yyyy');

  return (
    <MobileLayout title="Escort Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Hello, {profile?.full_name?.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground">{today}</p>
        </div>

        {/* Today's Status */}
        <div className="touch-card">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Today's Status</h3>
          </div>
          
          {loading ? (
            <div className="py-4 text-center text-muted-foreground">Loading...</div>
          ) : todayEntry ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="w-6 h-6 text-success" />
              <div>
                <p className="font-medium text-success">Form Submitted</p>
                <p className="text-sm text-muted-foreground">
                  Submitted at {format(new Date(todayEntry.submitted_at), 'HH:mm')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <Clock className="w-6 h-6 text-warning" />
                <div>
                  <p className="font-medium text-warning">Pending</p>
                  <p className="text-sm text-muted-foreground">
                    Complete your daily form
                  </p>
                </div>
              </div>
              <Link to="/escort/form">
                <Button className="w-full h-12 shadow-primary">
                  Complete Daily Form
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
