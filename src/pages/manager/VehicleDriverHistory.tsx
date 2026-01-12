import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Loader2, Car, User, Calendar, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Vehicle {
  id: string;
  registration: string;
  make: string | null;
  model: string | null;
  assigned_driver_id: string | null;
}

interface DriverHistoryEntry {
  id: string;
  driver_id: string;
  assigned_at: string;
  unassigned_at: string | null;
  driver?: { full_name: string };
}

export default function VehicleDriverHistory() {
  const { profile } = useAuth();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [history, setHistory] = useState<DriverHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    async function fetchVehicles() {
      if (!profile?.company_id) return;
      
      const { data } = await supabase
        .from('vehicles')
        .select('id, registration, make, model, assigned_driver_id')
        .eq('company_id', profile.company_id)
        .order('registration');
      
      setVehicles(data || []);
      setLoading(false);
    }
    
    fetchVehicles();
  }, [profile?.company_id]);

  useEffect(() => {
    async function fetchHistory() {
      if (!selectedVehicle) return;
      
      setLoadingHistory(true);
      
      const { data } = await supabase
        .from('vehicle_driver_history')
        .select('*, driver:profiles!vehicle_driver_history_driver_id_fkey(full_name)')
        .eq('vehicle_id', selectedVehicle)
        .order('assigned_at', { ascending: false });
      
      setHistory(data || []);
      setLoadingHistory(false);
    }
    
    fetchHistory();
  }, [selectedVehicle]);

  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);

  const calculateDuration = (start: string, end: string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  };

  return (
    <MobileLayout title="Driver Assignment History">
      <div className="space-y-4 animate-fade-in">
        <div className="space-y-2">
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.registration} {v.make && v.model && `- ${v.make} ${v.model}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedVehicleData && (
          <div className="touch-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-primary text-xl tracking-wider">{selectedVehicleData.registration}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedVehicleData.make} {selectedVehicleData.model}
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : !selectedVehicle ? (
          <p className="text-center text-muted-foreground py-8">Select a vehicle to view driver history</p>
        ) : loadingHistory ? (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : history.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No driver history recorded for this vehicle</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry, idx) => (
              <div key={entry.id} className="touch-card">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!entry.unassigned_at ? 'bg-success/10' : 'bg-muted'}`}>
                    <User className={`w-5 h-5 ${!entry.unassigned_at ? 'text-success' : 'text-muted-foreground'}`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-foreground">{entry.driver?.full_name}</p>
                      {!entry.unassigned_at && (
                        <Badge className="bg-success/10 text-success">Current</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(entry.assigned_at), 'dd MMM yyyy')}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>
                        {entry.unassigned_at 
                          ? format(new Date(entry.unassigned_at), 'dd MMM yyyy')
                          : 'Present'
                        }
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      Duration: {calculateDuration(entry.assigned_at, entry.unassigned_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
