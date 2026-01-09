import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus, Wrench, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vehicle {
  id: string;
  registration: string;
}

interface MaintenanceItem {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description: string | null;
  is_urgent: boolean;
  is_completed: boolean;
  created_at: string;
  vehicle?: { registration: string };
}

const MAINTENANCE_TYPES = [
  'MOT',
  'Service',
  'Brakes',
  'Tyres',
  'Oil Change',
  'Battery',
  'Exhaust',
  'Suspension',
  'Lights',
  'Other',
];

export default function ManageGarage() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('');
  const [description, setDescription] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    const [{ data: vehiclesData }, { data: maintenanceData }] = await Promise.all([
      supabase.from('vehicles').select('id, registration').eq('is_active', true).order('registration'),
      supabase.from('vehicle_maintenance').select('*').order('created_at', { ascending: false }),
    ]);

    // Get vehicle registrations for maintenance items
    const vehicleMap = new Map((vehiclesData || []).map(v => [v.id, v.registration]));
    const enrichedMaintenance = (maintenanceData || []).map(m => ({
      ...m,
      vehicle: { registration: vehicleMap.get(m.vehicle_id) || 'Unknown' },
    }));

    setVehicles(vehiclesData || []);
    setMaintenanceItems(enrichedMaintenance);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setSelectedVehicle('');
    setMaintenanceType('');
    setDescription('');
    setIsUrgent(false);
  };

  const handleAddMaintenance = async () => {
    if (!selectedVehicle || !maintenanceType) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('vehicle_maintenance').insert({
      vehicle_id: selectedVehicle,
      maintenance_type: maintenanceType,
      description: description.trim() || null,
      is_urgent: isUrgent,
      company_id: profile?.company_id,
    });

    if (error) {
      toast({ title: 'Failed to add', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Maintenance added' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    }

    setSubmitting(false);
  };

  const handleToggleComplete = async (item: MaintenanceItem) => {
    const { error } = await supabase.from('vehicle_maintenance')
      .update({ 
        is_completed: !item.is_completed,
        completed_at: !item.is_completed ? new Date().toISOString() : null,
      })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    } else {
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('vehicle_maintenance').delete().eq('id', id);
    if (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted' });
      fetchData();
    }
  };

  const pendingItems = maintenanceItems.filter(m => !m.is_completed);
  const completedItems = maintenanceItems.filter(m => m.is_completed);

  if (loading) {
    return (
      <MobileLayout title="Garage Work">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Garage Work">
      <div className="space-y-4 animate-fade-in">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Maintenance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Maintenance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.registration}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea 
                  placeholder="Additional details..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <Checkbox 
                  id="urgent" 
                  checked={isUrgent} 
                  onCheckedChange={checked => setIsUrgent(checked === true)} 
                />
                <Label htmlFor="urgent" className="cursor-pointer text-destructive">
                  Mark as URGENT
                </Label>
              </div>
              <Button onClick={handleAddMaintenance} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Pending */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Wrench className="w-5 h-5 text-warning" />
            Pending ({pendingItems.length})
          </h3>
          {pendingItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No pending maintenance</p>
          ) : (
            pendingItems.map(item => (
              <div 
                key={item.id} 
                className={cn(
                  "touch-card flex justify-between items-start",
                  item.is_urgent && "border-destructive bg-destructive/5"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-primary">{item.vehicle?.registration}</p>
                    {item.is_urgent && (
                      <span className="px-2 py-0.5 rounded bg-destructive text-destructive-foreground text-xs font-bold">
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="font-medium">{item.maintenance_type}</p>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleToggleComplete(item)}
                    className="p-2 text-success hover:bg-success/10 rounded"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-muted-foreground hover:text-destructive rounded"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Completed */}
        {completedItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Completed ({completedItems.length})
            </h3>
            {completedItems.slice(0, 5).map(item => (
              <div key={item.id} className="touch-card opacity-60">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{item.vehicle?.registration}</p>
                    <p className="text-sm">{item.maintenance_type}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-muted-foreground hover:text-destructive rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}