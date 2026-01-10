import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, User, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

export default function RegisterCompany() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { branding } = useBranding();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  
  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!companyName.trim()) {
      toast({ title: 'Company name required', variant: 'destructive' });
      return;
    }
    if (!fullName.trim()) {
      toast({ title: 'Your name is required', variant: 'destructive' });
      return;
    }
    if (!email.trim()) {
      toast({ title: 'Email is required', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName.trim() }
        }
      });

      if (authError) {
        toast({ title: 'Registration failed', description: authError.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast({ title: 'Registration failed', description: 'No user returned', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Wait for profile to be created by trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Create the company and set up manager role
      const { error: companyError } = await supabase.rpc('register_company', {
        company_name: companyName.trim(),
        user_id: authData.user.id
      });

      if (companyError) {
        toast({ title: 'Company setup failed', description: companyError.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      setStep('success');
      
    } catch (error: any) {
      toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
    }
    
    setLoading(false);
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <div className="w-full max-w-md space-y-6 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to {branding?.company_name || 'the platform'}!</h1>
          <p className="text-muted-foreground">
            Your company <span className="font-semibold text-foreground">{companyName}</span> has been registered successfully.
          </p>
          <p className="text-sm text-muted-foreground">
            You can now log in and start adding your staff members.
          </p>
          <Button onClick={() => navigate('/auth')} className="w-full h-12">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt={branding.company_name || 'Logo'} className="h-16 mx-auto mb-4" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground">Register Your Company</h1>
          <p className="text-muted-foreground">Set up your company and manager account</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Company Details */}
          <div className="p-4 rounded-lg border bg-card space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Company Details
            </h2>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Transport Ltd"
                className="h-12"
              />
            </div>
          </div>

          {/* Manager Account */}
          <div className="p-4 rounded-lg border bg-card space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Your Account (Manager)
            </h2>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@company.com"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 text-lg font-semibold">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Setting up...
              </>
            ) : (
              'Register Company'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/auth" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}