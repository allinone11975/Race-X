import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getUserByPhone, createUser } from '@/db/api';
import { motion } from 'motion/react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!termsAccepted) {
      toast.error('Please accept Terms & Conditions');
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);

    try {
      // Check if user exists
      let user = await getUserByPhone(phoneNumber);

      if (!user) {
        // Register new user
        user = await createUser(phoneNumber);
        if (user) {
          toast.success('Welcome to RACE-X! You received 10 Diamonds and 50 RX Points!');
        }
      } else {
        toast.success('Welcome back!');
      }

      if (user) {
        // Store user in localStorage
        localStorage.setItem('race-x-user', JSON.stringify(user));
        navigate('/gateway');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    // Same logic as login for this implementation
    await handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center carbon-fiber p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />

      {/* Login Card */}
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

          {/* Phone Input */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone" className="text-foreground">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-2 bg-input border-border text-foreground"
                disabled={isLoading}
              />
            </div>

            {/* Terms & Conditions */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                disabled={isLoading}
                className="mt-1"
              />
              <Label
                htmlFor="terms"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                I accept the Terms & Conditions and Privacy Policy
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={handleLogin}
                disabled={!termsAccepted || isLoading}
                className="w-full pill-button"
              >
                {isLoading ? 'Connecting...' : 'Login'}
              </Button>

              <Button
                onClick={handleRegister}
                disabled={!termsAccepted || isLoading}
                variant="outline"
                className="w-full pill-button-purple"
              >
                {isLoading ? 'Connecting...' : 'Register'}
              </Button>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-xs text-center text-muted-foreground mt-6">
            No OTP or password required. Single login, persistent session.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
