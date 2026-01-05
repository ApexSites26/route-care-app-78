import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Loader2, 
  Sun, 
  Sunset, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExistingEntry {
  id: string;
  morning_start_time: string | null;
  morning_finish_time: string | null;
  afternoon_start_time: string | null;
  afternoon_finish_time: string | null;
  no_issues: boolean;
  issues_text: string | null;
}

export default function EscortForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingEntry, setExistingEntry] = useState<ExistingEntry | null>(null);

  // Form state
  const [morningStart, setMorningStart] = useState('');
  const [morningFinish, setMorningFinish] = useState('');
  const [afternoonStart, setAfternoonStart] = useState('');
  const [afternoonFinish, setAfternoonFinish] = useState('');
  const [noIssues, setNoIssues] = useState(true);
  const [issuesText, setIssuesText] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(), 'EEEE, d MMMM yyyy');

  // Determine if morning is complete (has both times)
  const morningComplete = !!(existingEntry?.morning_start_time && existingEntry?.morning_finish_time);
  // Determine if afternoon is complete
  const afternoonComplete = !!(existingEntry?.afternoon_start_time && existingEntry?.afternoon_finish_time);
  // Full day complete
  const fullyComplete = morningComplete && afternoonComplete;

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      // Check for existing entry
      const { data: entry } = await supabase
        .from('escort_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();

      if (entry) {
        setExistingEntry(entry as ExistingEntry);
        // Pre-fill form with existing data
        setMorningStart(entry.morning_start_time || '');
        setMorningFinish(entry.morning_finish_time || '');
        setAfternoonStart(entry.afternoon_start_time || '');
        setAfternoonFinish(entry.afternoon_finish_time || '');
        setNoIssues(entry.no_issues);
        setIssuesText(entry.issues_text || '');
      }
      setLoading(false);
    }

    fetchData();
  }, [user, today]);

  const validateTimes = (isMorning: boolean) => {
    if (isMorning) {
      if (!morningStart || !morningFinish) {
        toast({
          title: 'Times required',
          description: 'Please enter both morning start and finish times.',
          variant: 'destructive',
        });
        return false;
      }
      if (morningStart >= morningFinish) {
        toast({
          title: 'Invalid times',
          description: 'Morning finish time must be after start time.',
          variant: 'destructive',
        });
        return false;
      }
    } else {
      if (!afternoonStart || !afternoonFinish) {
        toast({
          title: 'Times required',
          description: 'Please enter both afternoon start and finish times.',
          variant: 'destructive',
        });
        return false;
      }
      if (afternoonStart >= afternoonFinish) {
        toast({
          title: 'Invalid times',
          description: 'Afternoon finish time must be after start time.',
          variant: 'destructive',
        });
        return false;
      }
    }
    return true;
  };

  const handleSubmitMorning = async () => {
    if (!validateTimes(true)) return;

    if (!noIssues && !issuesText.trim()) {
      toast({
        title: 'Issues required',
        description: 'Please describe the issues or select "No issues today".',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('escort_entries').insert({
      user_id: user!.id,
      entry_date: today,
      morning_start_time: morningStart,
      morning_finish_time: morningFinish,
      afternoon_start_time: null,
      afternoon_finish_time: null,
      no_issues: noIssues,
      issues_text: noIssues ? null : issuesText.trim(),
    });

    if (error) {
      toast({
        title: 'Submission failed',
        description: error.message,
        variant: 'destructive',
      });
      setSubmitting(false);
    } else {
      toast({
        title: 'Morning run submitted',
        description: 'Come back later to add your afternoon times.',
      });
      navigate('/escort');
    }
  };

  const handleSubmitAfternoon = async () => {
    if (!validateTimes(false)) return;
    if (!existingEntry) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('escort_entries')
      .update({
        afternoon_start_time: afternoonStart,
        afternoon_finish_time: afternoonFinish,
      })
      .eq('id', existingEntry.id);

    if (error) {
      toast({
        title: 'Submission failed',
        description: error.message,
        variant: 'destructive',
      });
      setSubmitting(false);
    } else {
      toast({
        title: 'Afternoon run submitted',
        description: 'Your daily form is now complete.',
      });
      navigate('/escort');
    }
  };

  if (loading) {
    return (
      <MobileLayout title="Daily Form">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (fullyComplete) {
    return (
      <MobileLayout title="Daily Form">
        <div className="text-center py-12 space-y-4">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Fully Submitted</h2>
          <p className="text-muted-foreground">
            You've completed both morning and afternoon runs for today.
          </p>
          <Button onClick={() => navigate('/escort')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Daily Form">
      <div className="space-y-6 animate-fade-in pb-8">
        {/* Date */}
        <div className="text-center py-2">
          <p className="text-lg font-semibold text-foreground">{displayDate}</p>
        </div>

        {/* Morning Route */}
        <div className={cn("form-section", morningComplete && "opacity-60")}>
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-foreground">Morning Route</h3>
            {morningComplete && <CheckCircle2 className="w-5 h-5 text-success ml-auto" />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="morningStart">Start Time</Label>
              <Input
                id="morningStart"
                type="time"
                value={morningStart}
                onChange={(e) => setMorningStart(e.target.value)}
                className="h-12"
                disabled={morningComplete}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="morningFinish">Finish Time</Label>
              <Input
                id="morningFinish"
                type="time"
                value={morningFinish}
                onChange={(e) => setMorningFinish(e.target.value)}
                className="h-12"
                disabled={morningComplete}
              />
            </div>
          </div>
        </div>

        {/* Issues - only show when submitting morning */}
        {!morningComplete && (
          <div className="form-section">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Issues</h3>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
              <Checkbox
                id="noIssues"
                checked={noIssues}
                onCheckedChange={(checked) => setNoIssues(checked === true)}
              />
              <Label htmlFor="noIssues" className="cursor-pointer">
                No issues today
              </Label>
            </div>

            {!noIssues && (
              <Textarea
                placeholder="Describe any issues..."
                value={issuesText}
                onChange={(e) => setIssuesText(e.target.value)}
                className="min-h-[100px]"
              />
            )}
          </div>
        )}

        {/* Submit Morning */}
        {!morningComplete && (
          <Button
            type="button"
            onClick={handleSubmitMorning}
            className="w-full h-14 text-lg font-semibold shadow-primary"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              'Submit Morning Run'
            )}
          </Button>
        )}

        {/* Afternoon Route - only show after morning is submitted */}
        {morningComplete && (
          <>
            <div className="form-section">
              <div className="flex items-center gap-2 mb-2">
                <Sunset className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-foreground">Afternoon Route</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="afternoonStart">Start Time</Label>
                  <Input
                    id="afternoonStart"
                    type="time"
                    value={afternoonStart}
                    onChange={(e) => setAfternoonStart(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="afternoonFinish">Finish Time</Label>
                  <Input
                    id="afternoonFinish"
                    type="time"
                    value={afternoonFinish}
                    onChange={(e) => setAfternoonFinish(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSubmitAfternoon}
              className="w-full h-14 text-lg font-semibold shadow-primary"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                'Submit Afternoon Run'
              )}
            </Button>
          </>
        )}
      </div>
    </MobileLayout>
  );
}