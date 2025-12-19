import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, User } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'driver' | 'escort' | 'manager';
  is_active: boolean;
}

export default function ManageUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'driver' | 'escort'>('driver');
  const { toast } = useToast();

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const handleAddUser = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    setSaving(true);

    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newEmail,
      password: 'TempPass123!', // Temporary password - user should reset
      options: { emailRedirectTo: window.location.origin }
    });

    if (authError || !authData.user) {
      toast({ title: 'Failed to create user', description: authError?.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: authData.user.id,
      full_name: newName.trim(),
      role: newRole,
    });

    if (profileError) {
      toast({ title: 'Failed to create profile', description: profileError.message, variant: 'destructive' });
    } else {
      toast({ title: 'User created', description: 'They can log in with temporary password: TempPass123!' });
      setDialogOpen(false);
      setNewName('');
      setNewEmail('');
      fetchProfiles();
    }
    setSaving(false);
  };

  return (
    <MobileLayout title="Manage Users">
      <div className="space-y-4 animate-fade-in">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-12"><Plus className="w-5 h-5 mr-2" />Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Smith" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="john@example.com" />
              </div>
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
              <Button onClick={handleAddUser} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : profiles.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No users yet</p>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
