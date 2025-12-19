import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Loader2, Download, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function ViewEntries() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [driverEntries, setDriverEntries] = useState<any[]>([]);
  const [escortEntries, setEscortEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    setLoading(true);
    const [{ data: d }, { data: e }] = await Promise.all([
      supabase.from('driver_entries').select('*, profiles!driver_entries_user_id_fkey(full_name), vehicles(registration)').eq('entry_date', date),
      supabase.from('escort_entries').select('*, profiles!escort_entries_user_id_fkey(full_name)').eq('entry_date', date),
    ]);
    setDriverEntries(d || []);
    setEscortEntries(e || []);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [date]);

  const exportCSV = () => {
    const headers = ['Type','Name','Date','Morning Start','Morning Finish','Afternoon Start','Afternoon Finish','Issues','Vehicle','Tyres','Lights','Oil','Fuel','Damage'];
    const rows = [
      ...driverEntries.map(e => ['Driver', e.profiles?.full_name, e.entry_date, e.morning_start_time, e.morning_finish_time, e.afternoon_start_time, e.afternoon_finish_time, e.no_issues ? 'None' : e.issues_text, e.vehicles?.registration, e.check_tyres?'Pass':'Fail', e.check_lights?'Pass':'Fail', e.check_oil?'Pass':'Fail', e.check_fuel?'Pass':'Fail', e.check_damage?'Pass':'Fail']),
      ...escortEntries.map(e => ['Escort', e.profiles?.full_name, e.entry_date, e.morning_start_time, e.morning_finish_time, e.afternoon_start_time, e.afternoon_finish_time, e.no_issues ? 'None' : e.issues_text, '', '', '', '', '', '']),
    ];
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `entries-${date}.csv`; a.click();
  };

  const Check = ({ v }: { v: boolean | null }) => v ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />;

  return (
    <MobileLayout title="View Entries">
      <div className="space-y-4 animate-fade-in">
        <div className="flex gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
          <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4" /></Button>
        </div>

        <Tabs defaultValue="drivers">
          <TabsList className="w-full"><TabsTrigger value="drivers" className="flex-1">Drivers</TabsTrigger><TabsTrigger value="escorts" className="flex-1">Escorts</TabsTrigger></TabsList>
          
          <TabsContent value="drivers" className="mt-4">
            {loading ? <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            : driverEntries.length === 0 ? <p className="text-center text-muted-foreground py-8">No entries</p>
            : <div className="space-y-3">{driverEntries.map(e => (
              <div key={e.id} className="touch-card space-y-3">
                <div className="flex justify-between items-start">
                  <div><p className="font-semibold">{e.profiles?.full_name}</p><p className="text-sm text-muted-foreground">{e.vehicles?.registration}</p></div>
                  {!e.no_issues && <AlertTriangle className="w-5 h-5 text-warning" />}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">AM:</span> {e.morning_start_time?.slice(0,5)} - {e.morning_finish_time?.slice(0,5)}</div>
                  <div><span className="text-muted-foreground">PM:</span> {e.afternoon_start_time?.slice(0,5)} - {e.afternoon_finish_time?.slice(0,5)}</div>
                </div>
                <div className="flex gap-4 text-xs"><span className="flex items-center gap-1">Tyres <Check v={e.check_tyres} /></span><span className="flex items-center gap-1">Lights <Check v={e.check_lights} /></span><span className="flex items-center gap-1">Oil <Check v={e.check_oil} /></span><span className="flex items-center gap-1">Fuel <Check v={e.check_fuel} /></span><span className="flex items-center gap-1">Damage <Check v={e.check_damage} /></span></div>
                {!e.no_issues && <p className="text-sm text-warning bg-warning/10 p-2 rounded">{e.issues_text}</p>}
              </div>
            ))}</div>}
          </TabsContent>

          <TabsContent value="escorts" className="mt-4">
            {loading ? <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            : escortEntries.length === 0 ? <p className="text-center text-muted-foreground py-8">No entries</p>
            : <div className="space-y-3">{escortEntries.map(e => (
              <div key={e.id} className="touch-card space-y-2">
                <div className="flex justify-between"><p className="font-semibold">{e.profiles?.full_name}</p>{!e.no_issues && <AlertTriangle className="w-5 h-5 text-warning" />}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">AM:</span> {e.morning_start_time?.slice(0,5)} - {e.morning_finish_time?.slice(0,5)}</div>
                  <div><span className="text-muted-foreground">PM:</span> {e.afternoon_start_time?.slice(0,5)} - {e.afternoon_finish_time?.slice(0,5)}</div>
                </div>
                {!e.no_issues && <p className="text-sm text-warning bg-warning/10 p-2 rounded">{e.issues_text}</p>}
              </div>
            ))}</div>}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
