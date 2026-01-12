import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Plus, Loader2, Wrench, Calendar, Building2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Vehicle {
  id: string;
  registration: string;
}

interface WorkshopRecord {
  id: string;
  vehicle_id: string;
  date_left: string;
  date_returned: string | null;
  work_carried_out: string;
  garage_name: string;
  created_at: string;
  vehicle?: { registration: string };
}

export default function WorkshopRecords() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<WorkshopRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [vehicleId, setVehicleId] = useState('');
  const [dateLeft, setDateLeft] = useState('');
  const [dateReturned, setDateReturned] = useState('');
  const [workCarriedOut, setWorkCarriedOut] = useState('');
  const [garageName, setGarageName] = useState('');

  const fetchData = async () => {
    if (!profile?.company_id) return;
    
    const [{ data: v }, { data: r }] = await Promise.all([
      supabase.from('vehicles').select('id, registration').eq('company_id', profile.company_id).eq('is_active', true).order('registration'),
      supabase.from('workshop_records').select('*, vehicle:vehicles(registration)').eq('company_id', profile.company_id).order('created_at', { ascending: false }).limit(50),
    ]);
    
    setVehicles(v || []);
    setRecords(r || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.company_id]);

  const resetForm = () => {
    setVehicleId('');
    setDateLeft('');
    setDateReturned('');
    setWorkCarriedOut('');
    setGarageName('');
  };

  const handleSubmit = async () => {
    if (!vehicleId || !dateLeft || !workCarriedOut.trim() || !garageName.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    
    const { error } = await supabase.from('workshop_records').insert({
      vehicle_id: vehicleId,
      company_id: profile!.company_id,
      date_left: new Date(dateLeft).toISOString(),
      date_returned: dateReturned ? new Date(dateReturned).toISOString() : null,
      work_carried_out: workCarriedOut.trim(),
      garage_name: garageName.trim(),
      submitted_by: user!.id,
    });

    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Workshop record saved' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  return (
    <MobileLayout title="Workshop Records">
      <div className="space-y-4 animate-fade-in">
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Records are time-stamped and locked after submission. May be inspected by authorities.
          </AlertDescription>
        </Alert>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-12"><Plus className="w-5 h-5 mr-2" />Add Workshop Record</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Workshop Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Vehicle *</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.registration}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Date Left Workshop *</Label>
                <Input type="datetime-local" value={dateLeft} onChange={(e) => setDateLeft(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <Label>Date Returned</Label>
                <Input type="datetime-local" value={dateReturned} onChange={(e) => setDateReturned(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <Label>Work Carried Out *</Label>
                <Textarea 
                  placeholder="Describe the work performed..."
                  value={workCarriedOut}
                  onChange={(e) => setWorkCarriedOut(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Garage / Workshop Name *</Label>
                <Input 
                  placeholder="e.g. ABC Motors"
                  value={garageName}
                  onChange={(e) => setGarageName(e.target.value)}
                />
              </div>
              
              <Button onClick={handleSubmit} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Record'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : records.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No workshop records yet</p>
        ) : (
          <div className="space-y-3">
            {records.map(r => (
              <div key={r.id} className="touch-card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-primary" />
                    <span className="font-bold text-primary tracking-wider">{r.vehicle?.registration}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${r.date_returned ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {r.date_returned ? 'Returned' : 'In Workshop'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Left: {format(new Date(r.date_left), 'dd/MM/yy HH:mm')}</span>
                  </div>
                  {r.date_returned && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Back: {format(new Date(r.date_returned), 'dd/MM/yy HH:mm')}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <Building2 className="w-3 h-3" />
                  <span>{r.garage_name}</span>
                </div>
                
                <p className="text-sm text-foreground">{r.work_carried_out}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
