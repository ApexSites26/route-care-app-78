import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Loader2, Download, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const vehicleCheckLabels: Record<string, string> = {
  check_leaks: 'Leaks',
  check_tyres_wheels: 'Tyres',
  check_mirrors: 'Mirrors',
  check_lights: 'Lights',
  check_indicators: 'Indicators',
  check_wipers_washers: 'Wipers',
  check_windows: 'Windows',
  check_horn: 'Horn',
  check_no_excess_smoke: 'Smoke',
  check_brakes: 'Brakes',
  check_body_damage: 'Damage',
  check_fluids: 'Fluids',
  check_first_aid_kit: 'First Aid',
  check_cleanliness: 'Clean',
  check_hackney_plate: 'Plate',
  check_defects_reported: 'Defects',
};

export default function ViewEntries() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [driverEntries, setDriverEntries] = useState<any[]>([]);
  const [escortEntries, setEscortEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    
    // Fetch driver entries with profiles and vehicles
    const { data: driverData } = await supabase
      .from('driver_entries')
      .select('*')
      .eq('entry_date', date);

    // Fetch escort entries
    const { data: escortData } = await supabase
      .from('escort_entries')
      .select('*')
      .eq('entry_date', date);

    // Fetch profiles and vehicles separately to avoid FK issues
    const driverUserIds = driverData?.map(d => d.user_id) || [];
    const escortUserIds = escortData?.map(e => e.user_id) || [];
    const vehicleIds = driverData?.map(d => d.vehicle_id).filter(Boolean) || [];

    const [{ data: driverProfiles }, { data: escortProfiles }, { data: vehicles }] = await Promise.all([
      driverUserIds.length > 0 
        ? supabase.from('profiles').select('user_id, full_name').in('user_id', driverUserIds)
        : Promise.resolve({ data: [] }),
      escortUserIds.length > 0 
        ? supabase.from('profiles').select('user_id, full_name').in('user_id', escortUserIds)
        : Promise.resolve({ data: [] }),
      vehicleIds.length > 0 
        ? supabase.from('vehicles').select('id, registration').in('id', vehicleIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Map profiles and vehicles to entries
    const profileMap = new Map((driverProfiles || []).concat(escortProfiles || []).map(p => [p.user_id, p.full_name]));
    const vehicleMap = new Map((vehicles || []).map(v => [v.id, v.registration]));

    const enrichedDriverEntries = (driverData || []).map(e => ({
      ...e,
      driver_name: profileMap.get(e.user_id) || 'Unknown',
      vehicle_registration: vehicleMap.get(e.vehicle_id) || null,
    }));

    const enrichedEscortEntries = (escortData || []).map(e => ({
      ...e,
      escort_name: profileMap.get(e.user_id) || 'Unknown',
    }));

    setDriverEntries(enrichedDriverEntries);
    setEscortEntries(enrichedEscortEntries);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [date]);

  const exportCSV = () => {
    const checkKeys = Object.keys(vehicleCheckLabels);
    const headers = ['Type', 'Name', 'Date', 'Morning Start', 'Morning Finish', 'Afternoon Start', 'Afternoon Finish', 'Start Mileage', 'End Mileage', 'Issues', 'Vehicle', ...checkKeys.map(k => vehicleCheckLabels[k]), 'Additional Comments'];
    const rows = [
      ...driverEntries.map(e => [
        'Driver', 
        e.driver_name, 
        e.entry_date, 
        e.morning_start_time, 
        e.morning_finish_time, 
        e.afternoon_start_time, 
        e.afternoon_finish_time, 
        e.start_mileage,
        e.end_mileage,
        e.no_issues ? 'None' : e.issues_text, 
        e.vehicle_registration,
        ...checkKeys.map(k => e[k] ? 'Pass' : e[k] === false ? 'Fail' : 'N/A'),
        e.additional_comments || '',
      ]),
      ...escortEntries.map(e => [
        'Escort', 
        e.escort_name, 
        e.entry_date, 
        e.morning_start_time, 
        e.morning_finish_time, 
        e.afternoon_start_time, 
        e.afternoon_finish_time, 
        '',
        '',
        e.no_issues ? 'None' : e.issues_text, 
        '',
        ...checkKeys.map(() => ''),
        '',
      ]),
    ];
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `entries-${date}.csv`; a.click();
  };

  const Check = ({ v }: { v: boolean | null }) => v === true 
    ? <CheckCircle2 className="w-4 h-4 text-success" /> 
    : v === false 
    ? <XCircle className="w-4 h-4 text-destructive" />
    : <span className="text-muted-foreground text-xs">-</span>;

  const toggleExpand = (id: string) => {
    setExpandedEntry(expandedEntry === id ? null : id);
  };

  return (
    <MobileLayout title="View Entries">
      <div className="space-y-4 animate-fade-in">
        <div className="flex gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
          <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4" /></Button>
        </div>

        <Tabs defaultValue="drivers">
          <TabsList className="w-full">
            <TabsTrigger value="drivers" className="flex-1">Drivers</TabsTrigger>
            <TabsTrigger value="escorts" className="flex-1">Escorts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="drivers" className="mt-4">
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : driverEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No entries for this date</p>
            ) : (
              <div className="space-y-3">
                {driverEntries.map(e => (
                  <div key={e.id} className="touch-card space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{e.driver_name}</p>
                        <p className="text-sm text-muted-foreground">{e.vehicle_registration || 'No vehicle'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!e.no_issues && <AlertTriangle className="w-5 h-5 text-warning" />}
                        <button onClick={() => toggleExpand(e.id)} className="p-1">
                          {expandedEntry === e.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">AM:</span> {e.morning_start_time?.slice(0,5) || '-'} - {e.morning_finish_time?.slice(0,5) || '-'}</div>
                      <div><span className="text-muted-foreground">PM:</span> {e.afternoon_start_time?.slice(0,5) || '-'} - {e.afternoon_finish_time?.slice(0,5) || '-'}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Start:</span> {e.start_mileage || '-'} mi</div>
                      <div><span className="text-muted-foreground">End:</span> {e.end_mileage || '-'} mi</div>
                    </div>

                    {expandedEntry === e.id && (
                      <div className="space-y-3 pt-2 border-t border-border">
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          {Object.entries(vehicleCheckLabels).map(([key, label]) => (
                            <span key={key} className="flex items-center gap-1">
                              {label} <Check v={e[key]} />
                            </span>
                          ))}
                        </div>
                        
                        {e.additional_comments && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Comments:</span>
                            <p className="mt-1">{e.additional_comments}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!e.no_issues && <p className="text-sm text-warning bg-warning/10 p-2 rounded">{e.issues_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="escorts" className="mt-4">
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : escortEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No entries for this date</p>
            ) : (
              <div className="space-y-3">
                {escortEntries.map(e => (
                  <div key={e.id} className="touch-card space-y-2">
                    <div className="flex justify-between">
                      <p className="font-semibold">{e.escort_name}</p>
                      {!e.no_issues && <AlertTriangle className="w-5 h-5 text-warning" />}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">AM:</span> {e.morning_start_time?.slice(0,5) || '-'} - {e.morning_finish_time?.slice(0,5) || '-'}</div>
                      <div><span className="text-muted-foreground">PM:</span> {e.afternoon_start_time?.slice(0,5) || '-'} - {e.afternoon_finish_time?.slice(0,5) || '-'}</div>
                    </div>
                    {!e.no_issues && <p className="text-sm text-warning bg-warning/10 p-2 rounded">{e.issues_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}