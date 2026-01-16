import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, User, Pencil, Trash2, Clock, BarChart3, Shield, Car, Users } from 'lucide-react';
import { StaffHoursBreakdown } from '@/components/StaffHoursBreakdown';

type AppRole = 'driver' | 'escort' | 'manager';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  role: AppRole;
  is_active: boolean;
  contracted_hours: number | null;
  contract_start_date: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

interface WorkedHours {
  [profileId: string]: number;
}

export default function ManageUsers() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [workedHours, setWorkedHours] = useState<WorkedHours>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<Profile | null>(null);
  const [viewHoursProfile, setViewHoursProfile] = useState<Profile | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(['driver']);
  const [newContractedHours, setNewContractedHours] = useState('40');
  const [newContractStartDate, setNewContractStartDate] = useState('');
  const { toast } = useToast();

  const fetchProfiles = async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }
    try {
      const [{ data: profilesData, error }, { data: rolesData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('company_id', profile.company_id).order('full_name'),
        supabase.from('user_roles').select('*')
      ]);

      if (error) {
        console.error('Error fetching profiles:', error);
      }

      // Filter roles to only those belonging to our company's users
      const companyUserIds = (profilesData || []).map(p => p.user_id);
      const companyRoles = (rolesData || []).filter(r => companyUserIds.includes(r.user_id));

      setProfiles((profilesData as Profile[]) || []);
      setUserRoles(companyRoles as UserRole[]);
    } catch (error) {
      console.error('Error in fetchProfiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkedHours = async () => {
    if (!profile?.company_id) return;
    
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

    const { data: driverEntries } = await supabase
      .from('driver_entries')
      .select('user_id, morning_start_time, morning_finish_time, afternoon_start_time, afternoon_finish_time')
      .eq('company_id', profile.company_id)
      .gte('entry_date', mondayStr)
      .lte('entry_date', sundayStr);

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
    if (profile?.company_id) {
      setLoading(true);
      fetchProfiles(); 
      fetchWorkedHours();
    }
  }, [profile?.company_id]);

  const getUserRoles = (userId: string): AppRole[] => {
    return userRoles.filter(r => r.user_id === userId).map(r => r.role);
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setSelectedRoles(['driver']);
    setNewContractedHours('40');
    setNewContractStartDate(new Date().toISOString().split('T')[0]);
    setEditingProfile(null);
  };

  const handleOpenDialog = (p?: Profile) => {
    if (p) {
      setEditingProfile(p);
      setNewName(p.full_name);
      setNewEmail(p.email || '');
      const roles = getUserRoles(p.user_id);
      setSelectedRoles(roles.length > 0 ? roles : [p.role]);
      setNewContractedHours(String(p.contracted_hours ?? 40));
      setNewContractStartDate(p.contract_start_date || new Date().toISOString().split('T')[0]);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        // Don't allow removing last role
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== role);
      }
      return [...prev, role];
    });
  };

  const generateSecurePassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(x => chars[x % chars.length]).join('');
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
    if (selectedRoles.length === 0) {
      toast({ title: 'Please select at least one role', variant: 'destructive' });
      return;
    }
    if (!profile?.company_id) {
      toast({ title: 'Session error - please refresh the page', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const securePassword = generateSecurePassword();
    const primaryRole = selectedRoles.includes('manager') ? 'manager' : selectedRoles[0];

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: securePassword,
      options: { 
        emailRedirectTo: window.location.origin,
        data: { full_name: trimmedName }
      }
    });

    if (authError) {
      toast({ title: 'Failed to create user', description: authError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    if (!authData.user) {
      toast({ title: 'Failed to create user', description: 'No user returned', variant: 'destructive' });
      setSaving(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { error: assignError } = await supabase.rpc('add_staff_to_company', {
      _user_id: authData.user.id,
      _company_id: profile.company_id,
      _full_name: trimmedName,
      _role: primaryRole,
      _contracted_hours: parseFloat(newContractedHours) || 40,
      _email: trimmedEmail
    });

    if (assignError) {
      console.error('Error assigning staff:', assignError);
      toast({ title: 'Failed to assign staff to company', description: assignError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Add all selected roles to user_roles table
    for (const role of selectedRoles) {
      await supabase.from('user_roles').upsert({
        user_id: authData.user.id,
        role: role
      }, { onConflict: 'user_id,role' });
    }

    toast({ 
      title: 'Staff member created', 
      description: 'A password reset email will be sent to their email address. They should use the "Forgot Password" link to set their password.' 
    });
    handleCloseDialog();
    fetchProfiles();
    setSaving(false);
  };

  const handleUpdateUser = async () => {
    if (!editingProfile || !newName.trim()) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    if (selectedRoles.length === 0) {
      toast({ title: 'Please select at least one role', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const primaryRole = selectedRoles.includes('manager') ? 'manager' : selectedRoles[0];

    const { error } = await supabase.from('profiles')
      .update({ 
        full_name: newName.trim(), 
        role: primaryRole,
        contracted_hours: parseFloat(newContractedHours) || 40,
        email: newEmail.trim() || null,
        contract_start_date: newContractStartDate || null
      })
      .eq('id', editingProfile.id);

    if (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Update user_roles - remove all existing then add new
    await supabase.from('user_roles').delete().eq('user_id', editingProfile.user_id);
    
    for (const role of selectedRoles) {
      await supabase.from('user_roles').insert({
        user_id: editingProfile.user_id,
        role: role
      });
    }

    toast({ title: 'Staff member updated' });
    handleCloseDialog();
    fetchProfiles();
    setSaving(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteProfile) return;
    
    // Delete from user_roles first
    await supabase.from('user_roles').delete().eq('user_id', deleteProfile.user_id);
    
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

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'driver': return <Car className="w-3 h-3" />;
      case 'escort': return <Users className="w-3 h-3" />;
      case 'manager': return <Shield className="w-3 h-3" />;
    }
  };

  const getRoleBadges = (userId: string, primaryRole: AppRole) => {
    const roles = getUserRoles(userId);
    const displayRoles = roles.length > 0 ? roles : [primaryRole];
    
    return (
      <div className="flex flex-wrap gap-1">
        {displayRoles.map(role => (
          <span 
            key={role}
            className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
              role === 'manager' 
                ? 'bg-primary/20 text-primary' 
                : role === 'driver'
                ? 'bg-amber-500/20 text-amber-700'
                : 'bg-indigo-500/20 text-indigo-700'
            }`}
          >
            {getRoleIcon(role)}
            <span className="capitalize">{role}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <MobileLayout title="Manage Staff">
      <div className="space-y-4 animate-fade-in">
        <Button className="w-full h-12 md:w-auto md:h-10" onClick={() => handleOpenDialog()}>
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
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="john@example.com" />
                <p className="text-xs text-muted-foreground">
                  {editingProfile ? 'Used for reminder notifications' : 'Used for login and reminder notifications'}
                </p>
              </div>
              <div className="space-y-3">
                <Label>Roles (select all that apply)</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="role-driver" 
                      checked={selectedRoles.includes('driver')}
                      onCheckedChange={() => toggleRole('driver')}
                    />
                    <label 
                      htmlFor="role-driver" 
                      className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                    >
                      <Car className="w-4 h-4 text-amber-600" />
                      Driver
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="role-escort" 
                      checked={selectedRoles.includes('escort')}
                      onCheckedChange={() => toggleRole('escort')}
                    />
                    <label 
                      htmlFor="role-escort" 
                      className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-indigo-600" />
                      Escort
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="role-manager" 
                      checked={selectedRoles.includes('manager')}
                      onCheckedChange={() => toggleRole('manager')}
                    />
                    <label 
                      htmlFor="role-manager" 
                      className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-primary" />
                      Manager
                    </label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Staff can have multiple roles. Managers have full access to company settings.
                </p>
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
              <div className="space-y-2">
                <Label>Contract Start Date</Label>
                <Input 
                  type="date" 
                  value={newContractStartDate} 
                  onChange={(e) => setNewContractStartDate(e.target.value)} 
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                    {getRoleBadges(p.user_id, p.role)}
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
