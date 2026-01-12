import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';
import { 
  Car, User, Wrench, AlertTriangle, Building2, Calendar, 
  Download, CheckCircle2, Clock, ShieldCheck, WifiOff, RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface VehicleInfo {
  vehicle_id: string;
  registration: string;
  make: string | null;
  model: string | null;
  company_id: string;
  company_name: string;
}

interface DiaryEntry {
  type: 'driver_usage' | 'garage_visit' | 'workshop' | 'defect';
  id: string;
  date: Date;
  title: string;
  subtitle?: string;
  details?: string;
  status?: 'resolved' | 'pending' | 'in_workshop' | 'returned';
  metadata?: Record<string, any>;
}

const CACHE_KEY_PREFIX = 'vehicle_inspection_';

export default function VehicleInspection() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();
  
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 12), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Monitor online/offline status
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

  // Load cached data
  const loadCachedData = () => {
    if (!token) return null;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY_PREFIX + token);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Error loading cached data:', e);
    }
    return null;
  };

  // Save data to cache
  const saveToCacheData = (vehicleData: VehicleInfo, entries: DiaryEntry[]) => {
    if (!token) return;
    
    try {
      localStorage.setItem(CACHE_KEY_PREFIX + token, JSON.stringify({
        vehicle: vehicleData,
        entries: entries,
        cachedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Error saving to cache:', e);
    }
  };

  // Fetch data from server
  const fetchData = async () => {
    if (!token) {
      setError('No inspection token provided');
      setLoading(false);
      return;
    }

    // Try to load cached data first
    const cached = loadCachedData();
    if (cached) {
      setVehicle(cached.vehicle);
      const parsedEntries = cached.entries.map((e: any) => ({
        ...e,
        date: new Date(e.date)
      }));
      setDiaryEntries(parsedEntries);
      setLastUpdated(new Date(cached.cachedAt));
    }

    // If offline, use cached data only
    if (isOffline) {
      if (!cached) {
        setError('No cached data available offline');
      }
      setLoading(false);
      return;
    }

    try {
      // Fetch vehicle info
      const { data: vehicleData, error: vehicleError } = await supabase
        .rpc('get_vehicle_for_inspection', { p_token: token });

      if (vehicleError) throw vehicleError;
      if (!vehicleData || vehicleData.length === 0) {
        setError('Invalid or expired inspection link');
        setLoading(false);
        return;
      }

      const vehicleInfo = vehicleData[0] as VehicleInfo;
      setVehicle(vehicleInfo);

      // Fetch diary entries
      const { data: diaryData, error: diaryError } = await supabase
        .rpc('get_vehicle_diary_for_inspection', {
          p_token: token,
          p_date_from: dateFrom,
          p_date_to: dateTo
        });

      if (diaryError) throw diaryError;

      const entries: DiaryEntry[] = [];
      const diary = diaryData as any;

      // Process driver history
      (diary?.driver_history || []).forEach((h: any) => {
        entries.push({
          type: 'driver_usage',
          id: h.id,
          date: new Date(h.assigned_at),
          title: `Driver: ${h.driver_name}`,
          subtitle: h.unassigned_at 
            ? `${format(new Date(h.assigned_at), 'dd/MM/yy')} - ${format(new Date(h.unassigned_at), 'dd/MM/yy')}`
            : `From ${format(new Date(h.assigned_at), 'dd/MM/yy')} (Current)`,
          status: h.unassigned_at ? undefined : 'pending',
        });
      });

      // Process garage visits
      const reasonLabels: Record<string, string> = {
        bulb_replacement: 'Bulb Replacement',
        fluid_topup: 'Fluid Top-up',
        tyre_check: 'Tyre Check',
        other: 'Other',
      };

      (diary?.garage_visits || []).forEach((v: any) => {
        entries.push({
          type: 'garage_visit',
          id: v.id,
          date: new Date(v.visit_date),
          title: `Garage Visit: ${reasonLabels[v.reason_type] || v.reason_type}`,
          subtitle: `By ${v.driver_name}`,
          details: v.notes,
          metadata: { mileage: v.mileage, created_at: v.created_at },
        });
      });

      // Process workshop records
      (diary?.workshop_records || []).forEach((w: any) => {
        entries.push({
          type: 'workshop',
          id: w.id,
          date: new Date(w.date_left),
          title: `Workshop: ${w.garage_name}`,
          subtitle: w.date_returned 
            ? `${format(new Date(w.date_left), 'dd/MM/yy')} - ${format(new Date(w.date_returned), 'dd/MM/yy')}`
            : `From ${format(new Date(w.date_left), 'dd/MM/yy')}`,
          details: w.work_carried_out,
          status: w.date_returned ? 'returned' : 'in_workshop',
          metadata: { created_at: w.created_at },
        });
      });

      // Process defects
      (diary?.defects || []).forEach((d: any) => {
        entries.push({
          type: 'defect',
          id: d.id,
          date: new Date(d.date_identified),
          title: 'Defect Reported',
          subtitle: `By ${d.reporter_name}`,
          details: d.defect_description,
          status: d.is_resolved ? 'resolved' : 'pending',
          metadata: { 
            action_taken: d.action_taken, 
            date_corrected: d.date_corrected,
            created_at: d.created_at
          },
        });
      });

      // Sort by date
      entries.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setDiaryEntries(entries);
      setLastUpdated(new Date());
      
      // Cache the data
      saveToCacheData(vehicleInfo, entries);

    } catch (err: any) {
      console.error('Error fetching inspection data:', err);
      if (!cached) {
        setError(err.message || 'Failed to load inspection data');
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [token, dateFrom, dateTo, isOffline]);

  const filteredEntries = activeFilter === 'all' 
    ? diaryEntries 
    : diaryEntries.filter(e => e.type === activeFilter);

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'driver_usage': return <User className="w-4 h-4" />;
      case 'garage_visit': return <Wrench className="w-4 h-4" />;
      case 'workshop': return <Building2 className="w-4 h-4" />;
      case 'defect': return <AlertTriangle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getEntryColor = (type: string) => {
    switch (type) {
      case 'driver_usage': return 'bg-blue-500';
      case 'garage_visit': return 'bg-amber-500';
      case 'workshop': return 'bg-purple-500';
      case 'defect': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const variants: Record<string, { class: string; label: string }> = {
      resolved: { class: 'bg-green-100 text-green-700', label: 'Resolved' },
      pending: { class: 'bg-yellow-100 text-yellow-700', label: 'Open' },
      in_workshop: { class: 'bg-amber-100 text-amber-700', label: 'In Workshop' },
      returned: { class: 'bg-green-100 text-green-700', label: 'Returned' },
    };
    const v = variants[status];
    return v ? <Badge className={v.class}>{v.label}</Badge> : null;
  };

  const hasOpenDefects = diaryEntries.some(e => e.type === 'defect' && e.status === 'pending');
  const hasVehicleInWorkshop = diaryEntries.some(e => e.type === 'workshop' && e.status === 'in_workshop');

  const handleExport = () => {
    if (!vehicle) return;
    
    const headers = ['Date', 'Time', 'Type', 'Title', 'Subtitle', 'Details', 'Status'];
    const rows = filteredEntries.map(e => [
      format(e.date, 'yyyy-MM-dd'),
      format(e.date, 'HH:mm:ss'),
      e.type,
      e.title,
      e.subtitle || '',
      e.details || '',
      e.status || '',
    ]);
    
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-${vehicle.registration}-${dateFrom}-${dateTo}.csv`;
    a.click();
    
    toast({ title: 'Export complete', description: 'CSV file downloaded.' });
  };

  if (loading && !vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading inspection data...</p>
        </div>
      </div>
    );
  }

  if (error && !vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ShieldCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Vehicle Inspection</h1>
          <p className="text-red-500 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please contact the vehicle operator for a valid inspection link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Vehicle Inspection</h1>
                <p className="text-xs text-gray-500">Read-Only Mode</p>
              </div>
            </div>
            
            {isOffline && (
              <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                Offline
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Legal Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <p className="font-medium">📋 Official Vehicle Record</p>
          <p className="text-xs mt-1">
            Records may be inspected by Licensing Officers or Police. 
            All entries are timestamped and locked after submission.
          </p>
        </div>

        {/* Vehicle Info Card */}
        {vehicle && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <Car className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-xl tracking-wider">{vehicle.registration}</p>
                <p className="text-sm text-gray-500">
                  {vehicle.make} {vehicle.model}
                </p>
                <p className="text-xs text-gray-400">{vehicle.company_name}</p>
              </div>
              
              <div>
                {!hasOpenDefects && !hasVehicleInWorkshop ? (
                  <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Compliant
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {hasOpenDefects ? 'Defects' : 'Workshop'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">From</label>
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)} 
              className="h-10 bg-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">To</label>
            <Input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)} 
              className="h-10 bg-white"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData}
            disabled={isOffline}
            className="flex-1"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <p className="text-xs text-center text-gray-400">
            Last updated: {format(lastUpdated, 'dd MMM yyyy HH:mm')}
          </p>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'driver_usage', label: 'Drivers' },
            { key: 'garage_visit', label: 'Garage' },
            { key: 'workshop', label: 'Workshop' },
            { key: 'defect', label: 'Defects' },
          ].map(f => (
            <Button 
              key={f.key}
              variant={activeFilter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(f.key)}
              className="shrink-0"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Entries List */}
        {filteredEntries.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No entries found for selected period</p>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <div 
                key={entry.id} 
                className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full ${getEntryColor(entry.type)} text-white flex items-center justify-center shrink-0`}>
                    {getEntryIcon(entry.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-gray-900">{entry.title}</p>
                      {getStatusBadge(entry.status)}
                    </div>
                    
                    {entry.subtitle && (
                      <p className="text-sm text-gray-500">{entry.subtitle}</p>
                    )}
                    
                    {entry.details && (
                      <p className="text-sm text-gray-700 mt-1">{entry.details}</p>
                    )}
                    
                    {entry.metadata?.mileage && (
                      <p className="text-xs text-gray-400 mt-1">Mileage: {entry.metadata.mileage}</p>
                    )}
                    
                    {entry.metadata?.action_taken && (
                      <p className="text-xs text-green-600 mt-1">✓ {entry.metadata.action_taken}</p>
                    )}
                    
                    <p className="text-xs text-gray-400 mt-2">
                      {format(entry.date, 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Notice */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-gray-400">
            This is a read-only inspection view.<br />
            All entries are immutable and timestamped.
          </p>
        </div>
      </main>
    </div>
  );
}