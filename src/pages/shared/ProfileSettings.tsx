import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Clock, Briefcase, Building, Loader2, Save, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ProfileData {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  contracted_hours: number | null;
  company_name: string | null;
  contract_start_date: string | null;
}

export default function ProfileSettings() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [editableEmail, setEditableEmail] = useState('');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          contracted_hours,
          contract_start_date,
          companies:company_id(name)
        `)
        .eq('id', profile.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else if (data) {
        const companyData = data.companies as { name: string } | null;
        setProfileData({
          id: data.id,
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          contracted_hours: data.contracted_hours,
          company_name: companyData?.name || null,
          contract_start_date: data.contract_start_date,
        });
        setEditableEmail(data.email || user?.email || '');
      }
      setLoading(false);
    }

    fetchProfile();
  }, [profile?.id, user?.email]);

  const handleSaveEmail = async () => {
    if (!profile?.id) return;
    
    const trimmedEmail = editableEmail.trim();
    if (!trimmedEmail) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ email: trimmedEmail })
      .eq('id', profile.id);

    if (error) {
      toast({ title: 'Failed to update email', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email updated' });
      setProfileData(prev => prev ? { ...prev, email: trimmedEmail } : null);
    }

    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Minimum 6 characters', variant: 'destructive' });
      return;
    }

    setChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({ title: 'Failed to change password', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password changed successfully' });
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }

    setChangingPassword(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <MobileLayout title="My Profile">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="My Profile">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-foreground md:text-2xl">Your Details</h2>
          <p className="text-muted-foreground">View and manage your profile information</p>
        </div>

        {/* Profile Card */}
        <div className="touch-card space-y-4">
          {/* Avatar/Name Section */}
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{profileData?.full_name}</h3>
              <p className="text-sm text-muted-foreground capitalize">{profileData?.role}</p>
            </div>
          </div>

          {/* Details List */}
          <div className="space-y-4">
            {/* Company */}
            {profileData?.company_name && (
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium text-foreground">{profileData.company_name}</p>
                </div>
              </div>
            )}

            {/* Role */}
            <div className="flex items-start gap-3">
              <Briefcase className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium text-foreground capitalize">{profileData?.role}</p>
              </div>
            </div>

            {/* Contracted Hours */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Contracted Hours (Weekly)</p>
                <p className="font-medium text-foreground">{profileData?.contracted_hours ?? 40} hours</p>
              </div>
            </div>

            {/* Contract Start Date */}
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Contract Start Date</p>
                <p className="font-medium text-foreground">{profileData?.contract_start_date ? formatDate(profileData.contract_start_date) : '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Email Section */}
        <div className="touch-card space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Contact Email</h3>
          </div>
          
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              value={editableEmail}
              onChange={(e) => setEditableEmail(e.target.value)}
              placeholder="your.email@example.com"
            />
            <p className="text-xs text-muted-foreground">
              This email is used for reminder notifications
            </p>
          </div>

          <Button 
            onClick={handleSaveEmail} 
            disabled={saving || editableEmail === profileData?.email}
            className="w-full"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Email
          </Button>
        </div>

        {/* Security Section */}
        <div className="touch-card space-y-4">
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Security</h3>
          </div>

          <Button 
            variant="outline" 
            onClick={() => setPasswordDialogOpen(true)}
            className="w-full"
          >
            Change Password
          </Button>
        </div>

        {/* Login Email Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Logged in as: {user?.email}</p>
        </div>

        {/* Password Change Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter a new password for your account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button 
                onClick={handleChangePassword} 
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
