import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, User, Pencil, Trash2 } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'driver' | 'escort' | 'manager';
  is_active: boolean;
}

export default function ManageUsers() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<Profile | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'driver' | 'escort'>('driver');
  const { toast } = useToast();

  const fetchProfiles = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase.from('profiles').select('*').eq('company_id', profile.company_id).order('full_name');
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, [profile?.company_id]);

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewRole('driver');
    setEditingProfile(null);
  };

  const handleOpenDialog = (p?: Profile) => {
    if (p) {
      setEditingProfile(p);
      setNewName(p.full_name);
      setNewRole(p.role === 'manager' ? 'driver' : p.role);
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
    if (!newName.trim() || !newEmail.trim() || !profile?.company_id) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newEmail,
      password: 'TempPass123!',
      options: { 
        emailRedirectTo: window.location.origin,
        data: { full_name: newName.trim() }
      }
    });

    if (authError || !authData.user) {
      toast({ title: 'Failed to create user', description: authError?.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { error: profileError } = await supabase.from('profiles')
      .update({ full_name: newName.trim(), role: newRole, company_id: profile.company_id })
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
      .update({ full_name: newName.trim(), role: newRole })
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

  return (
    <MobileLayout title="Manage Staff">
      <div className="space-y-4 animate-fade-in">
        <Dialog open={dialogOpen} onOpenChange={(open) => open ? handleOpenDialog() : handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button className="w-full h-12"><Plus className="w-5 h-5 mr-2" />Add Staff Member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingProfile ? 'Edit Staff' : 'Add Staff Member'}</DialogTitle></DialogHeader>
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
            {profiles.map((p) => (
              <div key={p.id} className="touch-card flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{p.full_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{p.role}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteProfile(p)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
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
      </div>
    </MobileLayout>
  );
}
