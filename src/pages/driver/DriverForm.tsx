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
  XCircle,
  Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vehicle {
  id: string;
  registration: string;
}

interface ExistingEntry {
  id: string;
  morning_start_time: string | null;
  morning_finish_time: string | null;
  afternoon_start_time: string | null;
  afternoon_finish_time: string | null;
  no_issues: boolean;
  issues_text: string | null;
  vehicle_id: string | null;
  start_mileage: number | null;
  end_mileage: number | null;
  check_leaks: boolean | null;
  check_tyres_wheels: boolean | null;
  check_mirrors: boolean | null;
  check_lights: boolean | null;
  check_indicators: boolean | null;
  check_wipers_washers: boolean | null;
  check_windows: boolean | null;
  check_horn: boolean | null;
  check_no_excess_smoke: boolean | null;
  check_brakes: boolean | null;
  check_body_damage: boolean | null;
  check_fluids: boolean | null;
  check_first_aid_kit: boolean | null;
  check_cleanliness: boolean | null;
  check_hackney_plate: boolean | null;
  check_defects_reported: boolean | null;
  additional_comments: string | null;
}

type CheckStatus = boolean | null;

const vehicleCheckItems = [
  { key: 'check_leaks', label: 'Fuel/Oil/Water Leaks' },
  { key: 'check_tyres_wheels', label: 'Tyres + Wheel Fixings' },
  { key: 'check_mirrors', label: 'Mirrors' },
  { key: 'check_lights', label: 'Lights' },
  { key: 'check_indicators', label: 'Indicators' },
  { key: 'check_wipers_washers', label: 'Wipers + Washers' },
  { key: 'check_windows', label: 'Windows' },
  { key: 'check_horn', label: 'Horn' },
  { key: 'check_no_excess_smoke', label: 'No Excess Smoke' },
  { key: 'check_brakes', label: 'Brakes' },
  { key: 'check_body_damage', label: 'Body Damage' },
  { key: 'check_fluids', label: 'Fluids Checked' },
  { key: 'check_first_aid_kit', label: 'First Aid Kit' },
  { key: 'check_cleanliness', label: 'Internal + External Cleanliness' },
  { key: 'check_hackney_plate', label: 'In Date Displayed Hackney Plate' },
  { key: 'check_defects_reported', label: 'Any Defects Have Been Reported' },
] as const;

type CheckKey = typeof vehicleCheckItems[number]['key'];

export default function DriverForm() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingEntry, setExistingEntry] = useState<ExistingEntry | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  // Form state
  const [morningStart, setMorningStart] = useState('');
  const [morningFinish, setMorningFinish] = useState('');
  const [afternoonStart, setAfternoonStart] = useState('13:00');
  const [afternoonFinish, setAfternoonFinish] = useState('16:00');
  const [noIssues, setNoIssues] = useState(true);
  const [issuesText, setIssuesText] = useState('');

  // Mileage
  const [startMileage, setStartMileage] = useState('');
  const [endMileage, setEndMileage] = useState('');

  // Vehicle checks as object
  const [checks, setChecks] = useState<Record<CheckKey, CheckStatus>>({
    check_leaks: null,
    check_tyres_wheels: null,
    check_mirrors: null,
    check_lights: null,
    check_indicators: null,
    check_wipers_washers: null,
    check_windows: null,
    check_horn: null,
    check_no_excess_smoke: null,
    check_brakes: null,
    check_body_damage: null,
    check_fluids: null,
    check_first_aid_kit: null,
    check_cleanliness: null,
    check_hackney_plate: null,
    check_defects_reported: null,
  });

  // Additional comments
  const [additionalComments, setAdditionalComments] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');
  const displayDate = format(new Date(), 'EEEE, d MMMM yyyy');

  const morningComplete = !!(existingEntry?.morning_start_time && existingEntry?.morning_finish_time);
  const afternoonComplete = !!(existingEntry?.afternoon_start_time && existingEntry?.afternoon_finish_time);
  const fullyComplete = morningComplete && afternoonComplete;

  useEffect(() => {
    async function fetchData() {
      if (!profile || !user) return;

      const { data: entry } = await supabase
        .from('driver_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();

      if (entry) {
        setExistingEntry(entry as ExistingEntry);
        setMorningStart(entry.morning_start_time || '');
        setMorningFinish(entry.morning_finish_time || '');
        setAfternoonStart(entry.afternoon_start_time || '');
        setAfternoonFinish(entry.afternoon_finish_time || '');
        setNoIssues(entry.no_issues);
        setIssuesText(entry.issues_text || '');
        setStartMileage(entry.start_mileage?.toString() || '');
        setEndMileage(entry.end_mileage?.toString() || '');
        setAdditionalComments(entry.additional_comments || '');
        
        setChecks({
          check_leaks: entry.check_leaks,
          check_tyres_wheels: entry.check_tyres_wheels,
          check_mirrors: entry.check_mirrors,
          check_lights: entry.check_lights,
          check_indicators: entry.check_indicators,
          check_wipers_washers: entry.check_wipers_washers,
          check_windows: entry.check_windows,
          check_horn: entry.check_horn,
          check_no_excess_smoke: entry.check_no_excess_smoke,
          check_brakes: entry.check_brakes,
          check_body_damage: entry.check_body_damage,
          check_fluids: entry.check_fluids,
          check_first_aid_kit: entry.check_first_aid_kit,
          check_cleanliness: entry.check_cleanliness,
          check_hackney_plate: entry.check_hackney_plate,
          check_defects_reported: entry.check_defects_reported,
        });
      }

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

  const validateTimes = (isMorning: boolean) => {
    if (isMorning) {
      if (!morningStart || !morningFinish) {
        toast({ title: 'Times required', description: 'Please enter both morning start and finish times.', variant: 'destructive' });
        return false;
      }
      if (morningStart >= morningFinish) {
        toast({ title: 'Invalid times', description: 'Morning finish time must be after start time.', variant: 'destructive' });
        return false;
      }
    } else {
      if (!afternoonStart || !afternoonFinish) {
        toast({ title: 'Times required', description: 'Please enter both afternoon start and finish times.', variant: 'destructive' });
        return false;
      }
      if (afternoonStart >= afternoonFinish) {
        toast({ title: 'Invalid times', description: 'Afternoon finish time must be after start time.', variant: 'destructive' });
        return false;
      }
    }
    return true;
  };

  const handleSubmitMorning = async () => {
    if (!validateTimes(true)) return;
    
    if (!startMileage) {
      toast({ title: 'Mileage required', description: 'Please enter the start mileage.', variant: 'destructive' });
      return;
    }

    const incompleteChecks = vehicleCheckItems.filter(item => checks[item.key] === null);
    if (incompleteChecks.length > 0) {
      toast({ title: 'Incomplete checklist', description: 'Please complete all vehicle checks.', variant: 'destructive' });
      return;
    }

    if (!noIssues && !issuesText.trim()) {
      toast({ title: 'Issues required', description: 'Please describe the issues or select "No issues today".', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('driver_entries').insert({
      user_id: user!.id,
      company_id: profile?.company_id,
      entry_date: today,
      vehicle_id: vehicle?.id || null,
      morning_start_time: morningStart,
      morning_finish_time: morningFinish,
      afternoon_start_time: null,
      afternoon_finish_time: null,
      no_issues: noIssues,
      issues_text: noIssues ? null : issuesText.trim(),
      start_mileage: parseInt(startMileage),
      end_mileage: null,
      additional_comments: additionalComments.trim() || null,
      ...checks,
    });

    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
      setSubmitting(false);
    } else {
      toast({ title: 'Morning run submitted', description: 'Come back later to add your afternoon times.' });
      navigate('/driver');
    }
  };

  const handleSubmitAfternoon = async () => {
    if (!validateTimes(false)) return;
    if (!existingEntry) return;

    if (!endMileage) {
      toast({ title: 'Mileage required', description: 'Please enter the end mileage.', variant: 'destructive' });
      return;
    }

    if (parseInt(endMileage) <= (existingEntry.start_mileage || 0)) {
      toast({ title: 'Invalid mileage', description: 'End mileage must be greater than start mileage.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('driver_entries')
      .update({
        afternoon_start_time: afternoonStart,
        afternoon_finish_time: afternoonFinish,
        end_mileage: parseInt(endMileage),
      })
      .eq('id', existingEntry.id);

    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
      setSubmitting(false);
    } else {
      toast({ title: 'Afternoon run submitted', description: 'Your daily form is now complete.' });
      navigate('/driver');
    }
  };

  const updateCheck = (key: CheckKey, value: boolean) => {
    setChecks(prev => ({ ...prev, [key]: value }));
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
          <p className="text-muted-foreground">You've completed both morning and afternoon runs for today.</p>
          <Button onClick={() => navigate('/driver')} variant="outline">Back to Dashboard</Button>
        </div>
      </MobileLayout>
    );
  }

  const CheckItem = ({ 
    label, 
    value, 
    onChange,
    disabled
  }: { 
    label: string; 
    value: CheckStatus; 
    onChange: (v: boolean) => void;
    disabled?: boolean;
  }) => (
    <div className={cn(
      "check-item",
      value === true && "check-item-pass",
      value === false && "check-item-fail",
      disabled && "opacity-60"
    )}>
      <span className="font-medium text-foreground text-sm">{label}</span>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) onChange(true);
          }}
          disabled={disabled}
          className={cn(
            "p-2 rounded-lg border transition-all",
            value === true 
              ? "bg-success text-success-foreground border-success" 
              : "bg-background border-border text-muted-foreground hover:border-success hover:text-success",
            disabled && "cursor-not-allowed"
          )}
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) onChange(false);
          }}
          disabled={disabled}
          className={cn(
            "p-2 rounded-lg border transition-all",
            value === false 
              ? "bg-destructive text-destructive-foreground border-destructive" 
              : "bg-background border-border text-muted-foreground hover:border-destructive hover:text-destructive",
            disabled && "cursor-not-allowed"
          )}
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  return (
    <MobileLayout title="Daily Form">
      <div className="space-y-6 animate-fade-in pb-8">
        <div className="text-center py-2">
          <p className="text-lg font-semibold text-foreground">{displayDate}</p>
        </div>

        {vehicle && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-1">Vehicle</p>
            <p className="text-xl font-bold text-primary tracking-wider">{vehicle.registration}</p>
          </div>
        )}

{/* Morning Route */}
        <div className={cn("form-section", morningComplete && "opacity-60")}>
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-5 h-5 text-warning" />
            <h3 className="font-semibold text-foreground">Morning Route</h3>
            {morningComplete ? (
              <CheckCircle2 className="w-5 h-5 text-success ml-auto" />
            ) : (!morningStart || !morningFinish) && (
              <span className="ml-auto text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Required
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="morningStart">Start Time</Label>
              <Input id="morningStart" type="time" value={morningStart} onChange={(e) => setMorningStart(e.target.value)} className="h-12" disabled={morningComplete} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="morningFinish">Finish Time</Label>
              <Input id="morningFinish" type="time" value={morningFinish} onChange={(e) => setMorningFinish(e.target.value)} className="h-12" disabled={morningComplete} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Mileage</h3>
            {!morningComplete && !startMileage && (
              <span className="ml-auto text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Required
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startMileage">Start Mileage</Label>
              <Input
                id="startMileage"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 45230"
                value={startMileage}
                onChange={(e) => setStartMileage(e.target.value)}
                className="h-12"
                disabled={morningComplete}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endMileage">End Mileage</Label>
              <Input
                id="endMileage"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 45280"
                value={endMileage}
                onChange={(e) => setEndMileage(e.target.value)}
                className="h-12"
                disabled={!morningComplete || afternoonComplete}
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
              <Checkbox id="noIssues" checked={noIssues} onCheckedChange={(checked) => setNoIssues(checked === true)} />
              <Label htmlFor="noIssues" className="cursor-pointer">No issues today</Label>
            </div>

            {!noIssues && (
              <Textarea placeholder="Describe any issues..." value={issuesText} onChange={(e) => setIssuesText(e.target.value)} className="min-h-[100px]" />
            )}
          </div>
        )}

{/* Vehicle Checklist - only show when submitting morning */}
        {!morningComplete && (
          <div className="form-section">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Vehicle Checklist</h3>
              {vehicleCheckItems.some(item => checks[item.key] === null) && (
                <span className="ml-auto text-xs text-amber-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Incomplete
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">Tap ✓ for pass or ✗ for fail</p>
            <div className="space-y-3">
              {vehicleCheckItems.map(item => (
                <CheckItem 
                  key={item.key} 
                  label={item.label} 
                  value={checks[item.key]} 
                  onChange={(v) => updateCheck(item.key, v)} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Additional Comments - only show when submitting morning */}
        {!morningComplete && (
          <div className="form-section">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground">Additional Comments</h3>
            </div>
            <Textarea
              placeholder="Any additional comments..."
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        )}

        {/* Submit Morning */}
        {!morningComplete && (
          <Button type="button" onClick={handleSubmitMorning} className="w-full h-14 text-lg font-semibold shadow-primary" disabled={submitting}>
            {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit Morning Run'}
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
                  <Input id="afternoonStart" type="time" value={afternoonStart} onChange={(e) => setAfternoonStart(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="afternoonFinish">Finish Time</Label>
                  <Input id="afternoonFinish" type="time" value={afternoonFinish} onChange={(e) => setAfternoonFinish(e.target.value)} className="h-12" />
                </div>
              </div>
            </div>

            <Button type="button" onClick={handleSubmitAfternoon} className="w-full h-14 text-lg font-semibold shadow-primary" disabled={submitting}>
              {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit Afternoon Run'}
            </Button>
          </>
        )}
      </div>
    </MobileLayout>
  );
}