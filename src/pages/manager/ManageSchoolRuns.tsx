import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus, Clock, Users, Pencil, Trash2, Sun, Moon } from 'lucide-react';

interface SchoolRun {
  id: string;
  run_code: string;
  description: string | null;
  pickup_time_home: string | null;
  pickup_time_school: string | null;
  duration_minutes: number | null;
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
  shift_type: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WORK_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

export default function ManageSchoolRuns() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<SchoolRun[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [escorts, setEscorts] = useState<Profile[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  
  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocDialogOpen, setAllocDialogOpen] = useState(false);
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<SchoolRun | null>(null);
  const [selectedRun, setSelectedRun] = useState<SchoolRun | null>(null);
  
  const [runCode, setRunCode] = useState('');
  const [description, setDescription] = useState('');
  const [pickupHome, setPickupHome] = useState('');
  const [pickupSchool, setPickupSchool] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!profile?.company_id) return;
    
    setLoading(true);
    
    const [{ data: runsData, error: runsError }, { data: profilesData }, { data: allocData }] = await Promise.all([
      supabase.from('school_runs').select('*').eq('company_id', profile.company_id).order('run_code'),
      supabase.from('profiles').select('id, full_name, role').eq('company_id', profile.company_id).eq('is_active', true),
      supabase.from('run_allocations').select('*').eq('company_id', profile.company_id),
    ]);

    if (runsError) {
      console.error('Error fetching school runs:', runsError);
    }

    setRuns(runsData || []);
    setDrivers((profilesData || []).filter(p => p.role === 'driver'));
    setEscorts((profilesData || []).filter(p => p.role === 'escort'));
    setAllocations(allocData || []);
    setLoading(false);
  };

  useEffect(() => { if (profile?.company_id) fetchData(); }, [profile?.company_id]);

  const resetForm = () => {
    setRunCode('');
    setDescription('');
    setPickupHome('');
    setPickupSchool('');
    setDurationMinutes('60');
    setEditingRun(null);
  };

  const handleOpenDialog = (run?: SchoolRun) => {
    if (run) {
      setEditingRun(run);
      setRunCode(run.run_code);
      setDescription(run.description || '');
      setPickupHome(run.pickup_time_home || '');
      setPickupSchool(run.pickup_time_school || '');
      setDurationMinutes(String(run.duration_minutes || 60));
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
      duration_minutes: parseInt(durationMinutes) || 60,
    };

    if (editingRun) {
      const { error } = await supabase.from('school_runs').update(runData).eq('id', editingRun.id);
      if (error) {
        console.error('Failed to update school run:', error);
        toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Run updated' });
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    } else {
      if (!profile?.company_id) {
        toast({ title: 'Error', description: 'Company not found. Please log out and back in.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      
      const { error } = await supabase.from('school_runs').insert({
        ...runData,
        company_id: profile.company_id,
      });
      if (error) {
        console.error('Failed to create school run:', error);
        toast({ title: 'Failed to create', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Run created' });
        setDialogOpen(false);
        resetForm();
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

  const handleSaveAllocation = async (
    dayOfWeek: number, 
    shiftType: 'am' | 'pm',
    driverId: string | null, 
    escortId: string | null
  ) => {
    if (!selectedRun) return;

    const existing = allocations.find(
      a => a.run_id === selectedRun.id && a.day_of_week === dayOfWeek && a.shift_type === shiftType
    );

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
        shift_type: shiftType,
        driver_id: driverId || null,
        escort_id: escortId || null,
        company_id: profile?.company_id,
      });
      if (error) {
        toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      }
    }

    fetchData();
  };

  const getAllocationForDayShift = (runId: string, day: number, shiftType: string) => {
    return allocations.find(a => a.run_id === runId && a.day_of_week === day && a.shift_type === shiftType);
  };

  // Calculate hours for a person (driver or escort)
  const calculateHours = (personId: string, personType: 'driver' | 'escort') => {
    const personAllocations = allocations.filter(a => 
      personType === 'driver' ? a.driver_id === personId : a.escort_id === personId
    );

    const dailyMinutes: Record<number, number> = {};
    let totalMinutes = 0;

    WORK_DAYS.forEach(day => {
      dailyMinutes[day] = 0;
    });

    personAllocations.forEach(alloc => {
      const run = runs.find(r => r.id === alloc.run_id);
      if (run && WORK_DAYS.includes(alloc.day_of_week)) {
        const mins = run.duration_minutes || 60;
        dailyMinutes[alloc.day_of_week] += mins;
        totalMinutes += mins;
      }
    });

    return { dailyMinutes, totalMinutes };
  };

  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getPersonName = (id: string) => {
    const driver = drivers.find(d => d.id === id);
    if (driver) return driver.full_name;
    const escort = escorts.find(e => e.id === id);
    return escort?.full_name || 'Unknown';
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
        <div className="flex gap-2 md:justify-start">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="flex-1 md:flex-none md:px-6">
                <Plus className="w-4 h-4 mr-2" /> Add Run
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
                <div className="space-y-2">
                  <Label>Duration (minutes per run)</Label>
                  <Input type="number" min="15" step="15" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} />
                </div>
                <Button onClick={handleSaveRun} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => setHoursDialogOpen(true)}>
            <Clock className="w-4 h-4 mr-2" /> Hours
          </Button>
        </div>

        {runs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No school runs yet</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
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

                <div className="flex gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-1">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Home: {run.pickup_time_home?.slice(0, 5) || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span>School: {run.pickup_time_school?.slice(0, 5) || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{run.duration_minutes || 60} mins</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => handleOpenAllocDialog(run)} className="w-full">
                  <Users className="w-4 h-4 mr-2" /> Allocate Staff
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Allocation Dialog with AM/PM separation */}
        <Dialog open={allocDialogOpen} onOpenChange={setAllocDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
            <DialogHeader>
              <DialogTitle>Allocate Staff - {selectedRun?.run_code}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {WORK_DAYS.map(day => {
                const amAlloc = selectedRun ? getAllocationForDayShift(selectedRun.id, day, 'am') : null;
                const pmAlloc = selectedRun ? getAllocationForDayShift(selectedRun.id, day, 'pm') : null;
                
                return (
                  <div key={day} className="p-3 border rounded-lg space-y-3">
                    <p className="font-semibold text-center">{DAYS[day]}</p>
                    
                    {/* Morning Shift */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                        <Sun className="w-4 h-4" /> Morning (AM)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Driver</Label>
                          <Select
                            value={amAlloc?.driver_id || 'none'}
                            onValueChange={v => handleSaveAllocation(day, 'am', v === 'none' ? null : v, amAlloc?.escort_id || null)}
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
                            value={amAlloc?.escort_id || 'none'}
                            onValueChange={v => handleSaveAllocation(day, 'am', amAlloc?.driver_id || null, v === 'none' ? null : v)}
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

                    {/* Afternoon Shift */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
                        <Moon className="w-4 h-4" /> Afternoon (PM)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Driver</Label>
                          <Select
                            value={pmAlloc?.driver_id || 'none'}
                            onValueChange={v => handleSaveAllocation(day, 'pm', v === 'none' ? null : v, pmAlloc?.escort_id || null)}
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
                            value={pmAlloc?.escort_id || 'none'}
                            onValueChange={v => handleSaveAllocation(day, 'pm', pmAlloc?.driver_id || null, v === 'none' ? null : v)}
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
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Hours Summary Dialog */}
        <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
            <DialogHeader>
              <DialogTitle>Weekly Hours Summary</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Drivers Section */}
              <div>
                <h3 className="font-semibold mb-3 text-primary">Drivers</h3>
                {drivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No drivers</p>
                ) : (
                  <div className="space-y-3">
                    {drivers.map(driver => {
                      const { dailyMinutes, totalMinutes } = calculateHours(driver.id, 'driver');
                      if (totalMinutes === 0) return null;
                      return (
                        <div key={driver.id} className="p-3 border rounded-lg">
                          <p className="font-medium mb-2">{driver.full_name}</p>
                          <div className="grid grid-cols-5 gap-1 text-xs mb-2">
                            {WORK_DAYS.map(day => (
                              <div key={day} className="text-center">
                                <div className="text-muted-foreground">{DAYS[day].slice(0, 3)}</div>
                                <div className="font-medium">{formatMinutes(dailyMinutes[day])}</div>
                              </div>
                            ))}
                          </div>
                          <div className="text-right font-semibold text-primary">
                            Week Total: {formatMinutes(totalMinutes)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Escorts Section */}
              <div>
                <h3 className="font-semibold mb-3 text-primary">Escorts</h3>
                {escorts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No escorts</p>
                ) : (
                  <div className="space-y-3">
                    {escorts.map(escort => {
                      const { dailyMinutes, totalMinutes } = calculateHours(escort.id, 'escort');
                      if (totalMinutes === 0) return null;
                      return (
                        <div key={escort.id} className="p-3 border rounded-lg">
                          <p className="font-medium mb-2">{escort.full_name}</p>
                          <div className="grid grid-cols-5 gap-1 text-xs mb-2">
                            {WORK_DAYS.map(day => (
                              <div key={day} className="text-center">
                                <div className="text-muted-foreground">{DAYS[day].slice(0, 3)}</div>
                                <div className="font-medium">{formatMinutes(dailyMinutes[day])}</div>
                              </div>
                            ))}
                          </div>
                          <div className="text-right font-semibold text-primary">
                            Week Total: {formatMinutes(totalMinutes)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
