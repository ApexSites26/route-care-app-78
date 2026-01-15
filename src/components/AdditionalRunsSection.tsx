import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface AdditionalRun {
  id: string;
  run_name: string;
  start_time: string;
  finish_time: string;
  notes: string | null;
}

interface AdditionalRunsSectionProps {
  userId: string;
  companyId: string | undefined;
  entryType: 'driver' | 'escort';
  date?: string;
}

export function AdditionalRunsSection({ 
  userId, 
  companyId, 
  entryType,
  date = format(new Date(), 'yyyy-MM-dd')
}: AdditionalRunsSectionProps) {
  const { toast } = useToast();
  const [runs, setRuns] = useState<AdditionalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // New run form
  const [showForm, setShowForm] = useState(false);
  const [runName, setRunName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [finishTime, setFinishTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchRuns();
  }, [userId, date]);

  const fetchRuns = async () => {
    const { data, error } = await supabase
      .from('additional_runs')
      .select('*')
      .eq('user_id', userId)
      .eq('entry_date', date)
      .eq('entry_type', entryType)
      .order('start_time', { ascending: true });

    if (!error && data) {
      setRuns(data as AdditionalRun[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setRunName('');
    setStartTime('');
    setFinishTime('');
    setNotes('');
    setShowForm(false);
  };

  const handleAddRun = async () => {
    if (!runName.trim()) {
      toast({ title: 'Run name required', description: 'Please enter a name for this run.', variant: 'destructive' });
      return;
    }
    if (!startTime || !finishTime) {
      toast({ title: 'Times required', description: 'Please enter both start and finish times.', variant: 'destructive' });
      return;
    }
    if (startTime >= finishTime) {
      toast({ title: 'Invalid times', description: 'Finish time must be after start time.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from('additional_runs')
      .insert({
        user_id: userId,
        company_id: companyId,
        entry_type: entryType,
        entry_date: date,
        run_name: runName.trim(),
        start_time: startTime,
        finish_time: finishTime,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Failed to add run', description: error.message, variant: 'destructive' });
    } else {
      setRuns([...runs, data as AdditionalRun]);
      toast({ title: 'Run added', description: `${runName} has been added.` });
      resetForm();
    }
    setSaving(false);
  };

  const handleDeleteRun = async (id: string) => {
    const { error } = await supabase
      .from('additional_runs')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    } else {
      setRuns(runs.filter(r => r.id !== id));
      toast({ title: 'Run deleted' });
    }
  };

  if (loading) {
    return (
      <div className="form-section">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Additional Runs</h3>
        </div>
        <div className="py-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="form-section">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Additional Runs</h3>
        </div>
        {!showForm && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Run
          </Button>
        )}
      </div>

      {/* Existing runs */}
      {runs.length > 0 && (
        <div className="space-y-2 mb-4">
          {runs.map(run => (
            <div 
              key={run.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{run.run_name}</p>
                <p className="text-xs text-muted-foreground">
                  {run.start_time.slice(0, 5)} - {run.finish_time.slice(0, 5)}
                  {run.notes && <span className="ml-2">• {run.notes}</span>}
                </p>
              </div>
              <Button 
                type="button"
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleDeleteRun(run.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {runs.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No additional runs today. Tap "Add Run" to log extra work.
        </p>
      )}

      {/* Add run form */}
      {showForm && (
        <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="space-y-2">
            <Label htmlFor="runName">Run Name</Label>
            <Input
              id="runName"
              placeholder="e.g. Extra pickup, School trip..."
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="addStartTime">Start Time</Label>
              <Input
                id="addStartTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addFinishTime">Finish Time</Label>
              <Input
                id="addFinishTime"
                type="time"
                value={finishTime}
                onChange={(e) => setFinishTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addNotes">Notes (optional)</Label>
            <Input
              id="addNotes"
              placeholder="Any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              type="button"
              variant="outline" 
              className="flex-1"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              className="flex-1"
              onClick={handleAddRun}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Run'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
