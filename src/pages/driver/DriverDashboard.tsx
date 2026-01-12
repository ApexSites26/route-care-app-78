import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Car, CheckCircle2, Clock, Calendar, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WeeklyRota } from '@/components/WeeklyRota';
import { GarageAlert } from '@/components/GarageAlert';

interface Vehicle {
  id: string;
  registration: string;
  make: string | null;
  model: string | null;
}

interface DriverEntry {
  id: string;
  entry_date: string;
  submitted_at: string;
  morning_start_time: string | null;
  morning_finish_time: string | null;
  afternoon_start_time: string | null;
  afternoon_finish_time: string | null;
}

export default function DriverDashboard() {
  const { profile, user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [todayEntry, setTodayEntry] = useState<DriverEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!profile || !user) return;

      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('assigned_driver_id', profile.id)
        .maybeSingle();

      setVehicle(vehicleData);

      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: entryData } = await supabase
        .from('driver_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();

      setTodayEntry(entryData);
      setLoading(false);
    }

    fetchData();
  }, [profile, user]);

  const today = format(new Date(), 'EEEE, d MMMM yyyy');
  
  const morningComplete = !!(todayEntry?.morning_start_time && todayEntry?.morning_finish_time);
  const afternoonComplete = !!(todayEntry?.afternoon_start_time && todayEntry?.afternoon_finish_time);
  const fullyComplete = morningComplete && afternoonComplete;

  return (
    <MobileLayout title="Driver Dashboard">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Hello, {profile?.full_name?.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground">{today}</p>
        </div>

        {/* Garage Alert */}
        <GarageAlert />

        {/* Today's Status */}
        <div className="touch-card">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Today's Status</h3>
          </div>
          
          {loading ? (
            <div className="py-4 text-center text-muted-foreground">Loading...</div>
          ) : fullyComplete ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle2 className="w-6 h-6 text-success" />
              <div>
                <p className="font-medium text-success">Fully Submitted</p>
                <p className="text-sm text-muted-foreground">Morning & afternoon complete</p>
              </div>
            </div>
          ) : morningComplete ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Clock className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-primary">Morning Complete</p>
                  <p className="text-sm text-muted-foreground">Afternoon run pending</p>
                </div>
              </div>
              <Link to="/driver/form">
                <Button className="w-full h-12 shadow-primary">Submit Afternoon Run</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <Clock className="w-6 h-6 text-warning" />
                <div>
                  <p className="font-medium text-warning">Pending</p>
                  <p className="text-sm text-muted-foreground">Complete your daily form</p>
                </div>
              </div>
              <Link to="/driver/form">
                <Button className="w-full h-12 shadow-primary">Complete Daily Form</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Weekly Rota */}
        <WeeklyRota role="driver" />

        {/* Assigned Vehicle */}
        <div className="touch-card">
          <div className="flex items-center gap-3 mb-4">
            <Car className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Assigned Vehicle</h3>
          </div>
          
          {loading ? (
            <div className="py-4 text-center text-muted-foreground">Loading...</div>
          ) : vehicle ? (
            <>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-2xl font-bold text-primary tracking-wider">{vehicle.registration}</p>
                {(vehicle.make || vehicle.model) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>
              <Link to="/driver/garage-visit">
                <Button variant="outline" className="w-full mt-3">
                  <Wrench className="w-4 h-4 mr-2" />
                  Log Garage Visit
                </Button>
              </Link>
            </>
          ) : (
            <p className="text-muted-foreground py-4 text-center">No vehicle assigned. Contact your manager.</p>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}