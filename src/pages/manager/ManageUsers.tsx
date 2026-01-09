import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, User, Pencil, Trash2, Clock, BarChart3 } from 'lucide-react';
import { StaffHoursBreakdown } from '@/components/StaffHoursBreakdown';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'driver' | 'escort' | 'manager';
  is_active: boolean;
  contracted_hours: number | null;
}

interface WorkedHours {
  [profileId: string]: number;
}

export default function ManageUsers() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [workedHours, setWorkedHours] = useState<WorkedHours>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<Profile | null>(null);
  const [viewHoursProfile, setViewHoursProfile] = useState<Profile | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'driver' | 'escort'>('driver');
  const [newContractedHours, setNewContractedHours] = useState('40');
  const { toast } = useToast();

  const fetchProfiles = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase.from('profiles').select('*').eq('company_id', profile.company_id).order('full_name');
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  };

  const fetchWorkedHours = async () => {
    if (!profile?.company_id) return;
    
    // Get current week's Monday and Sunday
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    // Fetch driver entries for this week
    const { data: driverEntries } = await supabase
      .from('driver_entries')
      .select('user_id, morning_start_time, morning_finish_time, afternoon_start_time, afternoon_finish_time')
      .eq('company_id', profile.company_id)
      .gte('entry_date', mondayStr)
      .lte('entry_date', sundayStr);

    // Fetch escort entries for this week
    const { data: escortEntries } = await supabase
      .from('escort_entries')
      .select('user_id, morning_start_time, morning_finish_time, afternoon_start_time, afternoon_finish_time')
      .eq('company_id', profile.company_id)
      .gte('entry_date', mondayStr)
      .lte('entry_date', sundayStr);

    const hours: WorkedHours = {};

    const calculateHours = (start: string | null, finish: string | null): number => {
      if (!start || !finish) return 0;
      const [startH, startM] = start.split(':').map(Number);
      const [finishH, finishM] = finish.split(':').map(Number);
      return (finishH + finishM / 60) - (startH + startM / 60);
    };

    // Get profiles to map user_id to profile id
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('company_id', profile.company_id);

    const userToProfile: { [userId: string]: string } = {};
    allProfiles?.forEach(p => { userToProfile[p.user_id] = p.id; });

    driverEntries?.forEach(entry => {
      const profileId = userToProfile[entry.user_id];
      if (!profileId) return;
      const morningHours = calculateHours(entry.morning_start_time, entry.morning_finish_time);
      const afternoonHours = calculateHours(entry.afternoon_start_time, entry.afternoon_finish_time);
      hours[profileId] = (hours[profileId] || 0) + morningHours + afternoonHours;
    });

    escortEntries?.forEach(entry => {
      const profileId = userToProfile[entry.user_id];
      if (!profileId) return;
      const morningHours = calculateHours(entry.morning_start_time, entry.morning_finish_time);
      const afternoonHours = calculateHours(entry.afternoon_start_time, entry.afternoon_finish_time);
      hours[profileId] = (hours[profileId] || 0) + morningHours + afternoonHours;
    });

    setWorkedHours(hours);
  };

  useEffect(() => { 
    fetchProfiles(); 
    fetchWorkedHours();
  }, [profile?.company_id]);

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewRole('driver');
    setNewContractedHours('40');
    setEditingProfile(null);
  };

  const handleOpenDialog = (p?: Profile) => {
    if (p) {
      setEditingProfile(p);
      setNewName(p.full_name);
      setNewRole(p.role === 'manager' ? 'driver' : p.role);
      setNewContractedHours(String(p.contracted_hours ?? 40));
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleAddUser = async () => {
    const trimmedName = newName.trim();
    const trimmedEmail = newEmail.trim();
    
    if (!trimmedName) {
      toast({ title: 'Please enter a name', variant: 'destructive' });
      return;
    }
    if (!trimmedEmail) {
      toast({ title: 'Please enter an email', variant: 'destructive' });
      return;
    }
    if (!profile?.company_id) {
      toast({ title: 'Session error - please refresh the page', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: 'TempPass123!',
      options: { 
        emailRedirectTo: window.location.origin,
        data: { full_name: trimmedName }
      }
    });

    if (authError || !authData.user) {
      toast({ title: 'Failed to create user', description: authError?.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { error: profileError } = await supabase.from('profiles')
      .update({ 
        full_name: trimmedName, 
        role: newRole, 
        company_id: profile.company_id,
        contracted_hours: parseFloat(newContractedHours) || 40
      })
      .eq('user_id', authData.user.id);

    if (profileError) {
      toast({ title: 'Failed to update profile', description: profileError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Staff member created', description: `They should check email and log in with: TempPass123!` });
      handleCloseDialog();
      fetchProfiles();
    }
    setSaving(false);
  };

  const handleUpdateUser = async () => {
    if (!editingProfile || !newName.trim()) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const { error } = await supabase.from('profiles')
      .update({ 
        full_name: newName.trim(), 
        role: newRole,
        contracted_hours: parseFloat(newContractedHours) || 40
      })
      .eq('id', editingProfile.id);

    if (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Staff member updated' });
      handleCloseDialog();
      fetchProfiles();
    }
    setSaving(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteProfile) return;
    const { error } = await supabase.from('profiles').delete().eq('id', deleteProfile.id);
    if (error) toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Staff member removed' }); fetchProfiles(); }
    setDeleteProfile(null);
  };

  const getOvertimeHours = (p: Profile): number => {
    const worked = workedHours[p.id] || 0;
    const contracted = p.contracted_hours ?? 40;
    return Math.max(0, worked - contracted);
  };

  return (
    <MobileLayout title="Manage Staff">
      <div className="space-y-4 animate-fade-in">
        <Button className="w-full h-12" onClick={() => handleOpenDialog()}>
          <Plus className="w-5 h-5 mr-2" />Add Staff Member
        </Button>

        <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent aria-describedby="staff-dialog-description">
            <DialogHeader>
              <DialogTitle>{editingProfile ? 'Edit Staff' : 'Add Staff Member'}</DialogTitle>
              <DialogDescription id="staff-dialog-description">
                {editingProfile ? 'Update staff member details.' : 'Add a new staff member to your team.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Smith" />
              </div>
              {!editingProfile && (
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="john@example.com" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as 'driver' | 'escort')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="escort">Escort</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weekly Contracted Hours</Label>
                <Input 
                  type="number" 
                  value={newContractedHours} 
                  onChange={(e) => setNewContractedHours(e.target.value)} 
                  placeholder="40"
                  min="0"
                  max="168"
                />
              </div>
              <Button onClick={editingProfile ? handleUpdateUser : handleAddUser} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingProfile ? 'Update' : 'Create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : profiles.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No staff members yet</p>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => {
              const worked = workedHours[p.id] || 0;
              const overtime = getOvertimeHours(p);
              return (
                <div key={p.id} className="touch-card flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 cursor-pointer hover:bg-primary/20 transition-colors"
                    onClick={() => setViewHoursProfile(p)}
                  >
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewHoursProfile(p)}>
                    <p className="font-medium text-foreground truncate">{p.full_name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{p.role}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {p.contracted_hours ?? 40}h contracted
                      </span>
                      {overtime > 0 && (
                        <span className="text-amber-600 font-medium">
                          +{overtime.toFixed(1)}h overtime
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setViewHoursProfile(p)} className="shrink-0" title="View hours breakdown">
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)} className="shrink-0" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteProfile(p)} className="text-destructive hover:text-destructive shrink-0" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deleteProfile} onOpenChange={(open) => !open && setDeleteProfile(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to remove {deleteProfile?.full_name}?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <StaffHoursBreakdown 
          profile={viewHoursProfile}
          open={!!viewHoursProfile}
          onOpenChange={(open) => !open && setViewHoursProfile(null)}
        />
      </div>
    </MobileLayout>
  );
}
