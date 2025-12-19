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
  Car,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vehicle {
  id: string;
  registration: string;
}

type CheckStatus = boolean | null;

export default function DriverForm() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  // Form state
  const [morningStart, setMorningStart] = useState('');
  const [morningFinish, setMorningFinish] = useState('');
  const [afternoonStart, setAfternoonStart] = useState('');
  const [afternoonFinish, setAfternoonFinish] = useState('');
  const [noIssues, setNoIssues] = useState(true);
  const [issuesText, setIssuesText] = useState('');

  // Vehicle checks
  const [checkTyres, setCheckTyres] = useState<CheckStatus>(null);
  const [checkLights, setCheckLights] = useState<CheckStatus>(null);
  const [checkOil, setCheckOil] = useState<CheckStatus>(null);
  const [checkFuel, setCheckFuel] = useState<CheckStatus>(null);
  const [checkDamage, setCheckDamage] = useState<CheckStatus>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(), 'EEEE, d MMMM yyyy');

  useEffect(() => {
    async function fetchData() {
      if (!profile || !user) return;

      // Check for existing entry
      const { data: existingEntry } = await supabase
        .from('driver_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();

      if (existingEntry) {
        setAlreadySubmitted(true);
        setLoading(false);
        return;
      }

      // Fetch assigned vehicle
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('id, registration')
        .eq('assigned_driver_id', profile.id)
        .maybeSingle();

      setVehicle(vehicleData);
      setLoading(false);
    }

    fetchData();
  }, [profile, user, today]);

  const validateTimes = () => {
    if (morningStart && morningFinish && morningStart >= morningFinish) {
      toast({
        title: 'Invalid times',
        description: 'Morning finish time must be after start time.',
        variant: 'destructive',
      });
      return false;
    }
    if (afternoonStart && afternoonFinish && afternoonStart >= afternoonFinish) {
      toast({
        title: 'Invalid times',
        description: 'Afternoon finish time must be after start time.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateTimes()) return;
    
    // Validate all checks are completed
    if (checkTyres === null || checkLights === null || checkOil === null || 
        checkFuel === null || checkDamage === null) {
      toast({
        title: 'Incomplete checklist',
        description: 'Please complete all vehicle checks.',
        variant: 'destructive',
      });
      return;
    }

    if (!noIssues && !issuesText.trim()) {
      toast({
        title: 'Issues required',
        description: 'Please describe the issues or select "No issues today".',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('driver_entries').insert({
      user_id: user!.id,
      entry_date: today,
      vehicle_id: vehicle?.id || null,
      morning_start_time: morningStart || null,
      morning_finish_time: morningFinish || null,
      afternoon_start_time: afternoonStart || null,
      afternoon_finish_time: afternoonFinish || null,
      no_issues: noIssues,
      issues_text: noIssues ? null : issuesText.trim(),
      check_tyres: checkTyres,
      check_lights: checkLights,
      check_oil: checkOil,
      check_fuel: checkFuel,
      check_damage: checkDamage,
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
        title: 'Form submitted',
        description: 'Your daily form has been recorded.',
      });
      navigate('/driver');
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

  if (alreadySubmitted) {
    return (
      <MobileLayout title="Daily Form">
        <div className="text-center py-12 space-y-4">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Already Submitted</h2>
          <p className="text-muted-foreground">
            You've already submitted your form for today.
          </p>
          <Button onClick={() => navigate('/driver')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const CheckItem = ({ 
    label, 
    value, 
    onChange 
  }: { 
    label: string; 
    value: CheckStatus; 
    onChange: (v: boolean) => void;
  }) => (
    <div className={cn(
      "check-item",
      value === true && "check-item-pass",
      value === false && "check-item-fail"
    )}>
      <span className="font-medium text-foreground">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "p-2 rounded-lg border transition-all",
            value === true 
              ? "bg-success text-success-foreground border-success animate-check-bounce" 
              : "bg-background border-border text-muted-foreground hover:border-success hover:text-success"
          )}
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "p-2 rounded-lg border transition-all",
            value === false 
              ? "bg-destructive text-destructive-foreground border-destructive animate-check-bounce" 
              : "bg-background border-border text-muted-foreground hover:border-destructive hover:text-destructive"
          )}
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  return (
    <MobileLayout title="Daily Form">
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in pb-8">
        {/* Date */}
        <div className="text-center py-2">
          <p className="text-lg font-semibold text-foreground">{displayDate}</p>
        </div>

        {/* Vehicle Info */}
        {vehicle && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-1">Vehicle</p>
            <p className="text-xl font-bold text-primary tracking-wider">
              {vehicle.registration}
            </p>
          </div>
        )}

        {/* Morning Route */}
        <div className="form-section">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-foreground">Morning Route</h3>
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
              />
            </div>
          </div>
        </div>

        {/* Afternoon Route */}
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

        {/* Issues */}
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

        {/* Vehicle Checklist */}
        <div className="form-section">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Vehicle Checklist</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Tap ✓ for pass or ✗ for fail
          </p>
          <div className="space-y-3">
            <CheckItem label="Tyres" value={checkTyres} onChange={setCheckTyres} />
            <CheckItem label="Lights" value={checkLights} onChange={setCheckLights} />
            <CheckItem label="Oil" value={checkOil} onChange={setCheckOil} />
            <CheckItem label="Fuel" value={checkFuel} onChange={setCheckFuel} />
            <CheckItem label="Visible Damage" value={checkDamage} onChange={setCheckDamage} />
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-14 text-lg font-semibold shadow-primary"
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            'Submit Daily Form'
          )}
        </Button>
      </form>
    </MobileLayout>
  );
}
