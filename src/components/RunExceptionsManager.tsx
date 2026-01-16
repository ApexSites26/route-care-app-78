import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Plus, Pencil, Trash2, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface RunException {
  id: string;
  run_id: string;
  exception_date: string;
  affected_leg: string;
  override_pickup_time: string;
  note: string | null;
  created_at: string;
}

interface RunExceptionsManagerProps {
  runId: string;
  runCode: string;
  defaultPickupHome: string | null;
  defaultPickupSchool: string | null;
  onExceptionChange?: () => void;
}

export function RunExceptionsManager({ 
  runId, 
  runCode, 
  defaultPickupHome, 
  defaultPickupSchool,
  onExceptionChange 
}: RunExceptionsManagerProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [exceptions, setExceptions] = useState<RunException[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingException, setEditingException] = useState<RunException | null>(null);

  // Form state
  const [exceptionDate, setExceptionDate] = useState('');
  const [affectedLeg, setAffectedLeg] = useState<string>('school_to_home');
  const [overrideTime, setOverrideTime] = useState('');
  const [note, setNote] = useState('');

  const fetchExceptions = async () => {
    const { data, error } = await supabase
      .from('run_exceptions')
      .select('*')
      .eq('run_id', runId)
      .order('exception_date', { ascending: true });

    if (error) {
      console.error('Error fetching exceptions:', error);
    } else {
      setExceptions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExceptions();
  }, [runId]);

  const resetForm = () => {
    setExceptionDate('');
    setAffectedLeg('school_to_home');
    setOverrideTime('');
    setNote('');
    setEditingException(null);
  };

  const handleOpenDialog = (exception?: RunException) => {
    if (exception) {
      setEditingException(exception);
      setExceptionDate(exception.exception_date);
      setAffectedLeg(exception.affected_leg);
      setOverrideTime(exception.override_pickup_time.slice(0, 5));
      setNote(exception.note || '');
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!exceptionDate || !overrideTime) {
      toast({ title: 'Date and time required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const exceptionData = {
      run_id: runId,
      exception_date: exceptionDate,
      affected_leg: affectedLeg,
      override_pickup_time: overrideTime,
      note: note.trim() || null,
      company_id: profile?.company_id,
      created_by: profile?.id,
    };

    if (editingException) {
      const { error } = await supabase
        .from('run_exceptions')
        .update({
          exception_date: exceptionDate,
          affected_leg: affectedLeg,
          override_pickup_time: overrideTime,
          note: note.trim() || null,
        })
        .eq('id', editingException.id);

      if (error) {
        toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Exception updated' });
        setDialogOpen(false);
        resetForm();
        fetchExceptions();
        onExceptionChange?.();
      }
    } else {
      const { error } = await supabase
        .from('run_exceptions')
        .insert(exceptionData);

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Exception already exists', description: 'An exception for this date and leg already exists', variant: 'destructive' });
        } else {
          toast({ title: 'Failed to create', description: error.message, variant: 'destructive' });
        }
      } else {
        toast({ title: 'Exception created' });
        setDialogOpen(false);
        resetForm();
        fetchExceptions();
        onExceptionChange?.();
      }
    }

    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('run_exceptions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Exception deleted' });
      fetchExceptions();
      onExceptionChange?.();
    }
  };

  const getLegLabel = (leg: string) => {
    return leg === 'home_to_school' ? 'Home → School (AM)' : 'School → Home (PM)';
  };

  const getDefaultTime = (leg: string) => {
    return leg === 'home_to_school' ? defaultPickupHome : defaultPickupSchool;
  };

  // Filter to show only future exceptions
  const futureExceptions = exceptions.filter(e => new Date(e.exception_date) >= new Date(new Date().toDateString()));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <span>Time Exceptions ({futureExceptions.length})</span>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-1" /> Add Exception
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingException ? 'Edit Exception' : 'Add Time Exception'} - {runCode}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={exceptionDate} 
                  onChange={e => setExceptionDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              <div className="space-y-2">
                <Label>Affected Leg</Label>
                <Select value={affectedLeg} onValueChange={setAffectedLeg}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home_to_school">Home → School (AM)</SelectItem>
                    <SelectItem value="school_to_home">School → Home (PM)</SelectItem>
                  </SelectContent>
                </Select>
                {getDefaultTime(affectedLeg) && (
                  <p className="text-xs text-muted-foreground">
                    Default time: {getDefaultTime(affectedLeg)?.slice(0, 5)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Override Pickup Time</Label>
                <Input 
                  type="time" 
                  value={overrideTime} 
                  onChange={e => setOverrideTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Textarea 
                  placeholder="e.g. Inset day – early finish"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                />
              </div>

              <Button onClick={handleSave} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Exception'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-2">
          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
        </div>
      ) : futureExceptions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No upcoming exceptions</p>
      ) : (
        <div className="space-y-2">
          {futureExceptions.map(exc => (
            <div key={exc.id} className="flex items-center justify-between p-2 rounded-md bg-warning/10 border border-warning/20 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-warning" />
                <div>
                  <span className="font-medium">{format(new Date(exc.exception_date), 'EEE, d MMM')}</span>
                  <span className="mx-1">·</span>
                  <span className="text-muted-foreground">{getLegLabel(exc.affected_leg)}</span>
                  <span className="mx-1">→</span>
                  <span className="font-bold text-warning">{exc.override_pickup_time.slice(0, 5)}</span>
                  {exc.note && (
                    <span className="text-xs text-muted-foreground ml-2">({exc.note})</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenDialog(exc)} className="p-1 hover:text-foreground text-muted-foreground">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => handleDelete(exc.id)} className="p-1 hover:text-destructive text-muted-foreground">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
