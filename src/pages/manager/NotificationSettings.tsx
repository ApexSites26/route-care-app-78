import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Bell, Loader2, Mail, Clock, Send, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NotificationSettings {
  id: string;
  company_id: string;
  reminder_enabled: boolean;
  reminder_time: string;
  manager_email: string;
}

export default function NotificationSettings() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('14:00');
  const [managerEmail, setManagerEmail] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      if (!profile?.company_id) return;
      
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching notification settings:', error);
      } else if (data) {
        setSettings(data as NotificationSettings);
        setReminderEnabled(data.reminder_enabled);
        setReminderTime(data.reminder_time?.slice(0, 5) || '14:00');
        setManagerEmail(data.manager_email);
      } else {
        // No settings yet, use user's email as default
        setManagerEmail(user?.email || '');
      }
      
      setLoading(false);
    }

    fetchSettings();
  }, [profile?.company_id, user?.email]);

  const handleSave = async () => {
    if (!profile?.company_id) {
      toast({ title: 'Error', description: 'Company not found', variant: 'destructive' });
      return;
    }

    if (!managerEmail.trim()) {
      toast({ title: 'Email required', description: 'Please enter an email address for notifications', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const settingsData = {
      company_id: profile.company_id,
      reminder_enabled: reminderEnabled,
      reminder_time: reminderTime + ':00',
      manager_email: managerEmail.trim(),
    };

    let error;

    if (settings) {
      // Update existing
      const result = await supabase
        .from('notification_settings')
        .update(settingsData)
        .eq('id', settings.id);
      error = result.error;
    } else {
      // Insert new
      const result = await supabase
        .from('notification_settings')
        .insert(settingsData);
      error = result.error;
    }

    if (error) {
      console.error('Error saving notification settings:', error);
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved', description: 'Notification preferences updated' });
      // Refetch to get the new settings
      const { data } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .maybeSingle();
      if (data) setSettings(data as NotificationSettings);
    }

    setSaving(false);
  };

  const handleTestNotification = async () => {
    setTesting(true);

    try {
      const { data, error } = await supabase.functions.invoke('check-submissions');
      
      if (error) {
        console.error('Error testing notification:', error);
        toast({ title: 'Test failed', description: error.message, variant: 'destructive' });
      } else {
        console.log('Test result:', data);
        toast({ 
          title: 'Test complete', 
          description: data?.results?.[0]?.emailsSent > 0 
            ? `Email sent to ${managerEmail}` 
            : 'No missing submissions to report'
        });
      }
    } catch (err: any) {
      console.error('Error:', err);
      toast({ title: 'Test failed', description: err.message, variant: 'destructive' });
    }

    setTesting(false);
  };

  if (loading) {
    return (
      <MobileLayout title="Notifications">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Notifications">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-foreground md:text-2xl">Email Notifications</h2>
          <p className="text-muted-foreground">Get notified when staff haven't submitted their daily form</p>
        </div>

        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <strong>Scheduling:</strong> To automate daily checks, you'll need to set up an external cron job 
            (e.g., using cron-job.org) to call this function at your preferred time.
          </AlertDescription>
        </Alert>

        <div className="touch-card space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Daily Reminders</p>
                <p className="text-sm text-muted-foreground">Email when staff miss submissions</p>
              </div>
            </div>
            <Switch
              checked={reminderEnabled}
              onCheckedChange={setReminderEnabled}
            />
          </div>

          {reminderEnabled && (
            <>
              {/* Reminder Time */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Check Time
                </Label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Staff who haven't submitted by this time will trigger a notification
                </p>
              </div>

              {/* Manager Email */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Notification Email
                </Label>
                <Input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="manager@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Reminder emails will be sent to this address
                </p>
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          <Button onClick={handleSave} disabled={saving} className="w-full h-12">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>

          {reminderEnabled && settings && (
            <Button 
              variant="outline" 
              onClick={handleTestNotification} 
              disabled={testing} 
              className="w-full h-12"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test Notification
            </Button>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
