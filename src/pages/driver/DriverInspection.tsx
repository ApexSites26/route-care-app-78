import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBranding';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';
import { ArrowLeft, Car, User, Wrench, AlertTriangle, CheckCircle, Clock, WifiOff, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Vehicle {
  id: string;
  registration: string;
  make: string | null;
  model: string | null;
}

interface DriverHistory {
  id: string;
  assigned_at: string;
  unassigned_at: string | null;
  driver: { full_name: string } | null;
}

interface GarageVisit {
  id: string;
  visit_date: string;
  reason_type: string;
  notes: string | null;
  mileage: number | null;
  driver: { full_name: string } | null;
}

interface VehicleDefect {
  id: string;
  date_identified: string;
  defect_description: string;
  is_resolved: boolean;
  date_corrected: string | null;
  action_taken: string | null;
  reported_by_profile: { full_name: string } | null;
  resolved_by_profile: { full_name: string } | null;
}

interface WorkshopRecord {
  id: string;
  date_left: string;
  date_returned: string | null;
  garage_name: string;
  work_carried_out: string;
}

interface CachedData {
  vehicle: Vehicle;
  driverHistory: DriverHistory[];
  garageVisits: GarageVisit[];
  defects: VehicleDefect[];
  workshopRecords: WorkshopRecord[];
  cachedAt: string;
}

export default function DriverInspection() {
  const { profile } = useAuth();
  const { branding } = useBranding();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driverHistory, setDriverHistory] = useState<DriverHistory[]>([]);
  const [garageVisits, setGarageVisits] = useState<GarageVisit[]>([]);
  const [defects, setDefects] = useState<VehicleDefect[]>([]);
  const [workshopRecords, setWorkshopRecords] = useState<WorkshopRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastCached, setLastCached] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const getCacheKey = () => `driver_inspection_${profile?.id}`;

  const loadFromCache = (): CachedData | null => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Failed to load from cache:', e);
    }
    return null;
  };

  const saveToCache = (data: CachedData) => {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to cache:', e);
    }
  };

  async function fetchData() {
    if (!profile) return;

    // Try to load from cache first
    const cachedData = loadFromCache();
    if (cachedData) {
      setVehicle(cachedData.vehicle);
      setDriverHistory(cachedData.driverHistory);
      setGarageVisits(cachedData.garageVisits);
      setDefects(cachedData.defects);
      setWorkshopRecords(cachedData.workshopRecords);
      setLastCached(cachedData.cachedAt);
      setLoading(false);
    }

    // If offline, don't try to fetch
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    try {
      // Fetch assigned vehicle
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('assigned_driver_id', profile.id)
        .maybeSingle();

      if (!vehicleData) {
        setLoading(false);
        return;
      }

      setVehicle(vehicleData);

      const twelveMonthsAgo = format(subMonths(new Date(), 12), 'yyyy-MM-dd');

      // Fetch all data in parallel
      const [historyRes, visitsRes, defectsRes, workshopRes] = await Promise.all([
        supabase
          .from('vehicle_driver_history')
          .select('id, assigned_at, unassigned_at, driver:profiles!vehicle_driver_history_driver_id_fkey(full_name)')
          .eq('vehicle_id', vehicleData.id)
          .gte('assigned_at', twelveMonthsAgo)
          .order('assigned_at', { ascending: false }),
        supabase
          .from('garage_visits')
          .select('id, visit_date, reason_type, notes, mileage, driver:profiles!garage_visits_driver_id_fkey(full_name)')
          .eq('vehicle_id', vehicleData.id)
          .gte('visit_date', twelveMonthsAgo)
          .order('visit_date', { ascending: false }),
        supabase
          .from('vehicle_defects')
          .select(`
            id, date_identified, defect_description, is_resolved, date_corrected, action_taken,
            reported_by_profile:profiles!vehicle_defects_reported_by_fkey(full_name),
            resolved_by_profile:profiles!vehicle_defects_resolved_by_fkey(full_name)
          `)
          .eq('vehicle_id', vehicleData.id)
          .gte('date_identified', twelveMonthsAgo)
          .order('date_identified', { ascending: false }),
        supabase
          .from('workshop_records')
          .select('id, date_left, date_returned, garage_name, work_carried_out')
          .eq('vehicle_id', vehicleData.id)
          .gte('date_left', twelveMonthsAgo)
          .order('date_left', { ascending: false })
      ]);

      const history = (historyRes.data || []) as DriverHistory[];
      const visits = (visitsRes.data || []) as GarageVisit[];
      const defectsList = (defectsRes.data || []) as VehicleDefect[];
      const workshop = (workshopRes.data || []) as WorkshopRecord[];

      setDriverHistory(history);
      setGarageVisits(visits);
      setDefects(defectsList);
      setWorkshopRecords(workshop);

      // Cache the data
      const cacheData: CachedData = {
        vehicle: vehicleData,
        driverHistory: history,
        garageVisits: visits,
        defects: defectsList,
        workshopRecords: workshop,
        cachedAt: new Date().toISOString()
      };
      saveToCache(cacheData);
      setLastCached(cacheData.cachedAt);
    } catch (error) {
      console.error('Failed to fetch inspection data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading inspection data...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto">
          <Link to="/driver">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="touch-card text-center py-8">
            <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No vehicle assigned</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 safe-top sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            {branding.logo_url && (
              <img src={branding.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white p-0.5" />
            )}
            <div>
              <h1 className="text-lg font-semibold text-foreground">Inspection Mode</h1>
              <p className="text-xs text-muted-foreground">Read-only vehicle history</p>
            </div>
          </div>
          <Link to="/driver">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Exit
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Offline/Cache Indicator */}
        {isOffline && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <WifiOff className="w-5 h-5 text-warning" />
            <div>
              <p className="text-sm font-medium text-warning">Offline Mode</p>
              {lastCached && (
                <p className="text-xs text-muted-foreground">
                  Cached: {format(new Date(lastCached), 'dd/MM/yyyy HH:mm')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Vehicle Info */}
        <div className="touch-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary tracking-wider">{vehicle.registration}</p>
              {(vehicle.make || vehicle.model) && (
                <p className="text-sm text-muted-foreground">
                  {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="drivers" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="drivers" className="text-xs py-2">Drivers</TabsTrigger>
            <TabsTrigger value="garage" className="text-xs py-2">Garage</TabsTrigger>
            <TabsTrigger value="defects" className="text-xs py-2">Defects</TabsTrigger>
            <TabsTrigger value="workshop" className="text-xs py-2">Workshop</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">Last 12 months</p>
            {driverHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No driver history</p>
            ) : (
              driverHistory.map((entry) => (
                <div key={entry.id} className="touch-card">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{entry.driver?.full_name || 'Unknown Driver'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.assigned_at), 'dd/MM/yyyy HH:mm')}
                        {entry.unassigned_at && ` - ${format(new Date(entry.unassigned_at), 'dd/MM/yyyy HH:mm')}`}
                      </p>
                    </div>
                    {!entry.unassigned_at && (
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="garage" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">Last 12 months</p>
            {garageVisits.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No garage visits</p>
            ) : (
              garageVisits.map((visit) => (
                <div key={visit.id} className="touch-card">
                  <div className="flex items-start gap-3">
                    <Wrench className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {visit.reason_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(visit.visit_date), 'dd/MM/yyyy')} • {visit.driver?.full_name}
                      </p>
                      {visit.notes && <p className="text-sm mt-2">{visit.notes}</p>}
                      {visit.mileage && (
                        <p className="text-xs text-muted-foreground mt-1">Mileage: {visit.mileage.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="defects" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">Last 12 months</p>
            {defects.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No defects reported</p>
            ) : (
              defects.map((defect) => (
                <div key={defect.id} className="touch-card">
                  <div className="flex items-start gap-3">
                    {defect.is_resolved ? (
                      <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={defect.is_resolved ? 'secondary' : 'destructive'} className="text-xs">
                          {defect.is_resolved ? 'Resolved' : 'Open'}
                        </Badge>
                      </div>
                      <p className="text-sm mt-2">{defect.defect_description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reported: {format(new Date(defect.date_identified), 'dd/MM/yyyy')} by {defect.reported_by_profile?.full_name}
                      </p>
                      {defect.is_resolved && defect.date_corrected && (
                        <p className="text-xs text-muted-foreground">
                          Fixed: {format(new Date(defect.date_corrected), 'dd/MM/yyyy')} by {defect.resolved_by_profile?.full_name}
                        </p>
                      )}
                      {defect.action_taken && (
                        <p className="text-xs text-success mt-1">Action: {defect.action_taken}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="workshop" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">Last 12 months</p>
            {workshopRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No workshop records</p>
            ) : (
              workshopRecords.map((record) => (
                <div key={record.id} className="touch-card">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{record.garage_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Left: {format(new Date(record.date_left), 'dd/MM/yyyy')}
                        {record.date_returned && ` • Returned: ${format(new Date(record.date_returned), 'dd/MM/yyyy')}`}
                      </p>
                      <p className="text-sm mt-2">{record.work_carried_out}</p>
                      {!record.date_returned && (
                        <Badge variant="outline" className="mt-2 text-xs">Still at garage</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Refresh Button */}
        {!isOffline && (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={fetchData}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        )}
      </main>
    </div>
  );
}
