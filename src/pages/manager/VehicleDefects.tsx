import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Plus, Loader2, AlertTriangle, CheckCircle2, Clock, User, Calendar, Car } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Vehicle {
  id: string;
  registration: string;
}

interface Profile {
  id: string;
  full_name: string;
}

interface Defect {
  id: string;
  vehicle_id: string;
  defect_description: string;
  date_identified: string;
  reported_by: string;
  is_resolved: boolean;
  date_corrected: string | null;
  action_taken: string | null;
  resolved_by: string | null;
  created_at: string;
  vehicle?: { registration: string };
  reporter?: { full_name: string };
  resolver?: { full_name: string };
}

export default function VehicleDefects() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  
  const [vehicleId, setVehicleId] = useState('');
  const [reporterId, setReporterId] = useState('');
  const [dateIdentified, setDateIdentified] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [defectDescription, setDefectDescription] = useState('');
  
  const [dateCorrected, setDateCorrected] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [actionTaken, setActionTaken] = useState('');

  const fetchData = async () => {
    if (!profile?.company_id) return;
    
    const [{ data: v }, { data: p }, { data: d }] = await Promise.all([
      supabase.from('vehicles').select('id, registration').eq('company_id', profile.company_id).eq('is_active', true).order('registration'),
      supabase.from('profiles').select('id, full_name').eq('company_id', profile.company_id).eq('is_active', true).order('full_name'),
      supabase.from('vehicle_defects').select('*, vehicle:vehicles(registration), reporter:profiles!vehicle_defects_reported_by_fkey(full_name), resolver:profiles!vehicle_defects_resolved_by_fkey(full_name)').eq('company_id', profile.company_id).order('created_at', { ascending: false }),
    ]);
    
    setVehicles(v || []);
    setProfiles(p || []);
    setDefects(d || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.company_id]);

  const resetForm = () => {
    setVehicleId('');
    setReporterId('');
    setDateIdentified(format(new Date(), 'yyyy-MM-dd'));
    setDefectDescription('');
  };

  const handleSubmit = async () => {
    if (!vehicleId || !reporterId || !defectDescription.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    
    const { error } = await supabase.from('vehicle_defects').insert({
      vehicle_id: vehicleId,
      company_id: profile!.company_id,
      defect_description: defectDescription.trim(),
      date_identified: dateIdentified,
      reported_by: reporterId,
    });

    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Defect reported' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleResolve = async () => {
    if (!selectedDefect || !actionTaken.trim()) {
      toast({ title: 'Action required', description: 'Please describe the corrective action taken.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    
    const { error } = await supabase.from('vehicle_defects').update({
      is_resolved: true,
      date_corrected: dateCorrected,
      action_taken: actionTaken.trim(),
      resolved_by: profile!.id,
    }).eq('id', selectedDefect.id);

    if (error) {
      toast({ title: 'Failed to resolve', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Defect marked as resolved' });
      setResolveDialogOpen(false);
      setSelectedDefect(null);
      setActionTaken('');
      fetchData();
    }
    setSaving(false);
  };

  const openResolveDialog = (defect: Defect) => {
    setSelectedDefect(defect);
    setDateCorrected(format(new Date(), 'yyyy-MM-dd'));
    setActionTaken('');
    setResolveDialogOpen(true);
  };

  const pendingDefects = defects.filter(d => !d.is_resolved);
  const resolvedDefects = defects.filter(d => d.is_resolved);

  const DefectCard = ({ defect, showResolve }: { defect: Defect; showResolve?: boolean }) => (
    <div className={`touch-card ${!defect.is_resolved ? 'border-destructive/30' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          <span className="font-bold text-primary tracking-wider">{defect.vehicle?.registration}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${defect.is_resolved ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
          {defect.is_resolved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {defect.is_resolved ? 'Resolved' : 'Open'}
        </span>
      </div>
      
      <p className="text-foreground mb-2">{defect.defect_description}</p>
      
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>Identified: {format(new Date(defect.date_identified), 'dd/MM/yy')}</span>
        </div>
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span>{defect.reporter?.full_name}</span>
        </div>
      </div>
      
      {defect.is_resolved && (
        <div className="mt-2 pt-2 border-t border-border space-y-1">
          <p className="text-sm text-success font-medium">Corrected: {defect.date_corrected && format(new Date(defect.date_corrected), 'dd/MM/yy')}</p>
          <p className="text-sm text-muted-foreground">{defect.action_taken}</p>
          <p className="text-xs text-muted-foreground">Resolved by: {defect.resolver?.full_name}</p>
        </div>
      )}
      
      {showResolve && !defect.is_resolved && (
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => openResolveDialog(defect)}>
          Mark as Resolved
        </Button>
      )}
    </div>
  );

  return (
    <MobileLayout title="Vehicle Defects">
      <div className="space-y-4 animate-fade-in">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-12"><Plus className="w-5 h-5 mr-2" />Report Defect</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Vehicle Defect</DialogTitle>
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
                <Label>Reported By *</Label>
                <Select value={reporterId} onValueChange={setReporterId}>
                  <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Date Identified *</Label>
                <Input type="date" value={dateIdentified} onChange={(e) => setDateIdentified(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              
              <div className="space-y-2">
                <Label>Defect Description *</Label>
                <Textarea 
                  placeholder="Describe the defect..."
                  value={defectDescription}
                  onChange={(e) => setDefectDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              
              <Button onClick={handleSubmit} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Defect Report'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Defect</DialogTitle>
            </DialogHeader>
            {selectedDefect && (
              <div className="space-y-4 pt-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="font-medium">{selectedDefect.vehicle?.registration}</p>
                  <p className="text-sm text-muted-foreground">{selectedDefect.defect_description}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Date Corrected *</Label>
                  <Input type="date" value={dateCorrected} onChange={(e) => setDateCorrected(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} />
                </div>
                
                <div className="space-y-2">
                  <Label>Action Taken *</Label>
                  <Textarea 
                    placeholder="Describe the corrective action..."
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                
                <Button onClick={handleResolve} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark as Resolved'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Open ({pendingDefects.length})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Resolved ({resolvedDefects.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-4 space-y-3">
              {pendingDefects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No open defects</p>
              ) : (
                pendingDefects.map(d => <DefectCard key={d.id} defect={d} showResolve />)
              )}
            </TabsContent>
            
            <TabsContent value="resolved" className="mt-4 space-y-3">
              {resolvedDefects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No resolved defects</p>
              ) : (
                resolvedDefects.map(d => <DefectCard key={d.id} defect={d} />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MobileLayout>
  );
}
