import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Loader2, Wrench, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Vehicle {
  id: string;
  registration: string;
}

const REASON_OPTIONS = [
  { value: 'bulb_replacement', label: 'Bulb Replacement' },
  { value: 'fluid_topup', label: 'Fluid Top-up' },
  { value: 'tyre_check', label: 'Tyre Check' },
  { value: 'other', label: 'Other' },
];

export default function GarageVisitForm() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  
  const [visitDate, setVisitDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reasonType, setReasonType] = useState('');
  const [notes, setNotes] = useState('');
  const [mileage, setMileage] = useState('');

  useEffect(() => {
    async function fetchVehicle() {
      if (!profile) return;
      
      const { data } = await supabase
        .from('vehicles')
        .select('id, registration')
        .eq('assigned_driver_id', profile.id)
        .maybeSingle();
      
      setVehicle(data);
      setLoading(false);
    }
    
    fetchVehicle();
  }, [profile]);

  const handleSubmit = async () => {
    if (!vehicle) {
      toast({ title: 'No vehicle assigned', description: 'Contact your manager.', variant: 'destructive' });
      return;
    }
    
    if (!reasonType) {
      toast({ title: 'Reason required', description: 'Please select a reason for the visit.', variant: 'destructive' });
      return;
    }
    
    if (reasonType === 'other' && !notes.trim()) {
      toast({ title: 'Details required', description: 'Please provide details for "Other" visits.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('garage_visits').insert({
      vehicle_id: vehicle.id,
      driver_id: profile!.id,
      company_id: profile!.company_id,
      visit_date: visitDate,
      reason_type: reasonType,
      notes: notes.trim() || null,
      mileage: mileage ? parseInt(mileage) : null,
      submitted_by: user!.id,
    });

    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
      setSubmitting(false);
    } else {
      toast({ title: 'Garage visit logged', description: 'Record saved successfully.' });
      navigate('/driver');
    }
  };

  if (loading) {
    return (
      <MobileLayout title="Log Garage Visit">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Log Garage Visit">
      <div className="space-y-6 animate-fade-in pb-8">
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Records may be inspected by Licensing Officers or Police. All entries are time-stamped and cannot be edited.
          </AlertDescription>
        </Alert>

        {vehicle && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-1">Vehicle</p>
            <p className="text-xl font-bold text-primary tracking-wider">{vehicle.registration}</p>
          </div>
        )}

        <div className="form-section space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Visit Details</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitDate">Date of Visit *</Label>
            <Input 
              id="visitDate" 
              type="date" 
              value={visitDate} 
              onChange={(e) => setVisitDate(e.target.value)} 
              className="h-12"
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reasonType">Reason for Visit *</Label>
            <Select value={reasonType} onValueChange={setReasonType}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes {reasonType === 'other' && '*'}</Label>
            <Textarea 
              id="notes"
              placeholder="Add any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mileage">Mileage (recommended)</Label>
            <Input 
              id="mileage" 
              type="number" 
              inputMode="numeric"
              placeholder="e.g. 45230"
              value={mileage} 
              onChange={(e) => setMileage(e.target.value)} 
              className="h-12"
            />
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={submitting || !vehicle} 
          className="w-full h-12"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Garage Visit'}
        </Button>
      </div>
    </MobileLayout>
  );
}
