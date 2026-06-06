/**
 * LoginPage — RACE-X
 * Uses Supabase Auth for persistent sessions.
 * Phone-based login: email derived as {phone}@racex.internal
 * After login, role is read from users table.
 * Admins → /admin/omniverse, users → /gateway
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { supabase } from '@/db/supabase';
import { useRxStore, isAdminRole, type UserRole } from '@/store/rxStore';
import { Phone, Loader2 } from 'lucide-react';

/** Derive a stable Supabase email from a phone number */
function phoneToEmail(phone: string) {
  return `${phone.replace(/\D/g, '')}@racex.internal`;
}

/** Derive a stable password from a phone number (auth handled server-side via RLS) */
function phoneToPassword(phone: string) {
  return `rxp_${phone.replace(/\D/g, '')}_rx`;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useRxStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect immediately
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await redirectByRole(session.user.id);
      }
    });
  }, []);

  const redirectByRole = async (authUserId: string) => {
    const { data } = await supabase
      .from('users')
      .select('id, phone_number, username, avatar_url, diamonds, rx_points, user_level, is_admin, role')
      .eq('id', authUserId)
      .maybeSingle();

    if (data) {
      const role = (data.role ?? 'user') as UserRole;
      setUser({
        id: data.id,
        phone_number: data.phone_number ?? '',
        username: data.username ?? '',
        avatar_url: data.avatar_url ?? null,
        diamonds: data.diamonds ?? 0,
        rx_points: data.rx_points ?? 0,
        level: data.user_level ?? 1,
        is_admin: data.is_admin ?? false,
        role,
      });
      // Role-based redirect
      navigate(isAdminRole(role) ? '/admin/omniverse' : '/gateway', { replace: true });
    } else {
      navigate('/gateway', { replace: true });
    }
  };

  const handleAuth = async () => {
    if (!termsAccepted) { toast.error('Please accept Terms & Conditions'); return; }
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) { toast.error('Please enter a valid phone number'); return; }

    setIsLoading(true);
    const email = phoneToEmail(digits);
    const password = phoneToPassword(digits);

    try {
      // 1. Try signing in
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

      if (signInErr) {
        // 2. First time — sign up + create users row
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: undefined },
        });

        if (signUpErr) throw signUpErr;

        const authId = signUpData.user?.id;
        if (!authId) throw new Error('Sign-up did not return a user ID');

        // 3. Count existing users to set welcome bonus
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        const isFirst10 = (count ?? 0) < 10;

        // 4. Create profile row linked to Supabase Auth user
        const { error: insertErr } = await supabase
          .from('users')
          .insert({
            id: authId,
            phone_number: digits,
            user_level: isFirst10 ? 99 : 1,
            rx_points: isFirst10 ? 9999 : 50,
            diamonds: isFirst10 ? 9999 : 10,
            role: 'user',
            is_admin: false,
          });

        if (insertErr && insertErr.code !== '23505') throw insertErr;
        toast.success('Welcome to RACE-X! 🎉 You received diamonds and RX Points!');
      } else {
        toast.success('Welcome back!');
      }

      // 5. Fetch session and redirect by role
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await redirectByRole(session.user.id);
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const msg = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center carbon-fiber p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-strong rounded-2xl p-8 border-2 border-primary/30 glow-blue">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold gradient-text mb-2">RX</h1>
            <p className="text-muted-foreground">The Future of Creation</p>
          </div>

          <div className="space-y-4">
            {/* Phone Input */}
            <div>
              <Label htmlFor="phone" className="text-foreground text-sm font-normal">
                Phone Number
              </Label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className="pl-10 bg-input border-border text-foreground"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(v) => setTermsAccepted(v as boolean)}
                disabled={isLoading}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                I accept the Terms &amp; Conditions and Privacy Policy
              </Label>
            </div>

            {/* Action */}
            <div className="pt-2">
              <Button
                onClick={handleAuth}
                disabled={!termsAccepted || isLoading}
                className="w-full pill-button"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting…</>
                ) : (
                  'Sign In / Register'
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Secure session via Supabase Auth · No OTP required
          </p>
        </div>
      </motion.div>
    </div>
  );
}

