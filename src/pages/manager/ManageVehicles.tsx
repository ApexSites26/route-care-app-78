import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Car } from 'lucide-react';

interface Vehicle { id: string; registration: string; make: string | null; model: string | null; assigned_driver_id: string | null; }
interface Profile { id: string; full_name: string; role: string; }

export default function ManageVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reg, setReg] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [driverId, setDriverId] = useState('');
  const { toast } = useToast();

  const fetchData = async () => {
    const [{ data: v }, { data: d }] = await Promise.all([
      supabase.from('vehicles').select('*').order('registration'),
      supabase.from('profiles').select('*').eq('role', 'driver'),
    ]);
    setVehicles((v as Vehicle[]) || []);
    setDrivers((d as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!reg.trim()) { toast({ title: 'Registration required', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('vehicles').insert({
      registration: reg.trim().toUpperCase(),
      make: make.trim() || null,
      model: model.trim() || null,
      assigned_driver_id: driverId || null,
    });
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Vehicle added' }); setDialogOpen(false); setReg(''); setMake(''); setModel(''); setDriverId(''); fetchData(); }
    setSaving(false);
  };

  const getDriverName = (id: string | null) => drivers.find(d => d.id === id)?.full_name || 'Unassigned';

  return (
    <MobileLayout title="Manage Vehicles">
      <div className="space-y-4 animate-fade-in">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="w-full h-12"><Plus className="w-5 h-5 mr-2" />Add Vehicle</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Registration *</Label><Input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="AB12 CDE" /></div>
              <div className="space-y-2"><Label>Make</Label><Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Ford" /></div>
              <div className="space-y-2"><Label>Model</Label><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Transit" /></div>
              <div className="space-y-2">
                <Label>Assign Driver</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Vehicle'}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        : vehicles.length === 0 ? <p className="text-center text-muted-foreground py-8">No vehicles yet</p>
        : <div className="space-y-2">{vehicles.map(v => (
          <div key={v.id} className="touch-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Car className="w-5 h-5 text-primary" /></div>
            <div className="flex-1">
              <p className="font-bold text-foreground tracking-wider">{v.registration}</p>
              <p className="text-sm text-muted-foreground">{v.make} {v.model} • {getDriverName(v.assigned_driver_id)}</p>
            </div>
          </div>
        ))}</div>}
      </div>
    </MobileLayout>
  );
}
