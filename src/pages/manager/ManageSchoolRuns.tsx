import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Route, Clock, Users, Pencil, Trash2 } from 'lucide-react';

interface SchoolRun {
  id: string;
  run_code: string;
  description: string | null;
  pickup_time_home: string | null;
  pickup_time_school: string | null;
  is_active: boolean;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface Allocation {
  id: string;
  run_id: string;
  driver_id: string | null;
  escort_id: string | null;
  day_of_week: number;
  driver?: { full_name: string } | null;
  escort?: { full_name: string } | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ManageSchoolRuns() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<SchoolRun[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [escorts, setEscorts] = useState<Profile[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  
  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocDialogOpen, setAllocDialogOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<SchoolRun | null>(null);
  const [selectedRun, setSelectedRun] = useState<SchoolRun | null>(null);
  
  const [runCode, setRunCode] = useState('');
  const [description, setDescription] = useState('');
  const [pickupHome, setPickupHome] = useState('');
  const [pickupSchool, setPickupSchool] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    const [{ data: runsData }, { data: profilesData }, { data: allocData }] = await Promise.all([
      supabase.from('school_runs').select('*').order('run_code'),
      supabase.from('profiles').select('id, full_name, role').eq('is_active', true),
      supabase.from('run_allocations').select('*'),
    ]);

    setRuns(runsData || []);
    setDrivers((profilesData || []).filter(p => p.role === 'driver'));
    setEscorts((profilesData || []).filter(p => p.role === 'escort'));
    setAllocations(allocData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setRunCode('');
    setDescription('');
    setPickupHome('');
    setPickupSchool('');
    setEditingRun(null);
  };

  const handleOpenDialog = (run?: SchoolRun) => {
    if (run) {
      setEditingRun(run);
      setRunCode(run.run_code);
      setDescription(run.description || '');
      setPickupHome(run.pickup_time_home || '');
      setPickupSchool(run.pickup_time_school || '');
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSaveRun = async () => {
    if (!runCode.trim()) {
      toast({ title: 'Run code required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const runData = {
      run_code: runCode.trim().toUpperCase(),
      description: description.trim() || null,
      pickup_time_home: pickupHome || null,
      pickup_time_school: pickupSchool || null,
    };

    if (editingRun) {
      const { error } = await supabase.from('school_runs').update(runData).eq('id', editingRun.id);
      if (error) {
        toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Run updated' });
        setDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('school_runs').insert(runData);
      if (error) {
        toast({ title: 'Failed to create', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Run created' });
        setDialogOpen(false);
        fetchData();
      }
    }

    setSubmitting(false);
  };

  const handleDeleteRun = async (id: string) => {
    const { error } = await supabase.from('school_runs').delete().eq('id', id);
    if (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Run deleted' });
      fetchData();
    }
  };

  const handleOpenAllocDialog = (run: SchoolRun) => {
    setSelectedRun(run);
    setAllocDialogOpen(true);
  };

  const handleSaveAllocation = async (dayOfWeek: number, driverId: string | null, escortId: string | null) => {
    if (!selectedRun) return;

    const existing = allocations.find(a => a.run_id === selectedRun.id && a.day_of_week === dayOfWeek);

    if (existing) {
      const { error } = await supabase.from('run_allocations')
        .update({ driver_id: driverId || null, escort_id: escortId || null })
        .eq('id', existing.id);
      if (error) {
        toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
      }
    } else {
      const { error } = await supabase.from('run_allocations').insert({
        run_id: selectedRun.id,
        day_of_week: dayOfWeek,
        driver_id: driverId || null,
        escort_id: escortId || null,
      });
      if (error) {
        toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      }
    }

    fetchData();
  };

  const getAllocationForDay = (runId: string, day: number) => {
    return allocations.find(a => a.run_id === runId && a.day_of_week === day);
  };

  if (loading) {
    return (
      <MobileLayout title="School Runs">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="School Runs">
      <div className="space-y-4 animate-fade-in">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add School Run
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRun ? 'Edit Run' : 'Add School Run'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Run Code</Label>
                <Input placeholder="e.g. LIB003" value={runCode} onChange={e => setRunCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="e.g. Library School Route" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pickup from Home</Label>
                  <Input type="time" value={pickupHome} onChange={e => setPickupHome(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Pickup from School</Label>
                  <Input type="time" value={pickupSchool} onChange={e => setPickupSchool(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleSaveRun} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {runs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No school runs yet</p>
        ) : (
          <div className="space-y-3">
            {runs.map(run => (
              <div key={run.id} className="touch-card space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg text-primary">{run.run_code}</p>
                    {run.description && <p className="text-sm text-muted-foreground">{run.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenDialog(run)} className="p-2 text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteRun(run.id)} className="p-2 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>Home: {run.pickup_time_home?.slice(0, 5) || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>School: {run.pickup_time_school?.slice(0, 5) || '-'}</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => handleOpenAllocDialog(run)} className="w-full">
                  <Users className="w-4 h-4 mr-2" /> Allocate Staff
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Allocation Dialog */}
        <Dialog open={allocDialogOpen} onOpenChange={setAllocDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Allocate Staff - {selectedRun?.run_code}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(day => {
                const alloc = selectedRun ? getAllocationForDay(selectedRun.id, day) : null;
                return (
                  <div key={day} className="p-3 border rounded-lg space-y-3">
                    <p className="font-semibold">{DAYS[day]}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Driver</Label>
                        <Select
                          value={alloc?.driver_id || 'none'}
                          onValueChange={v => handleSaveAllocation(day, v === 'none' ? null : v, alloc?.escort_id || null)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {drivers.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Escort</Label>
                        <Select
                          value={alloc?.escort_id || 'none'}
                          onValueChange={v => handleSaveAllocation(day, alloc?.driver_id || null, v === 'none' ? null : v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {escorts.map(e => (
                              <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}