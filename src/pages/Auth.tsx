import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Flame, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useI18n } from '@/i18n/I18nContext';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// Key to track if session should persist
const SESSION_PERSIST_KEY = 'become-persist-session';

type AuthMode = 'signin' | 'signup' | 'forgot-password' | 'reset-password' | 'verify-email';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    // Default to checked if previously set, otherwise false
    return localStorage.getItem(SESSION_PERSIST_KEY) === 'true';
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { locale } = useI18n();
  const { 
    signIn, 
    signUp, 
    signInWithGoogle, 
    resetPassword, 
    updatePassword, 
    resendVerificationEmail,
    isAuthenticated, 
    isEmailVerified,
    user,
    startTrial,
    signOut
  } = useAuth();
  const { trialStatus } = useSubscription();
  
  // Check for params
  const nextAction = searchParams.get('next');
  const verifiedParam = searchParams.get('verified');
  const modeParam = searchParams.get('mode');
  const verifyBanner = searchParams.get('verify');

  // Handle session persistence based on "remember me" checkbox
  useEffect(() => {
    // Save the preference when it changes
    localStorage.setItem(SESSION_PERSIST_KEY, String(rememberMe));
  }, [rememberMe]);

  // Clear session on browser close if "remember me" is not checked
  useEffect(() => {
    const handleBeforeUnload = () => {
      const shouldPersist = localStorage.getItem(SESSION_PERSIST_KEY) === 'true';
      if (!shouldPersist && isAuthenticated) {
        // Clear session data so user has to login again
        // We can't await signOut here, so we just clear localStorage tokens
        // Supabase will detect invalid session on next load
        const keys = Object.keys(localStorage).filter(k => 
          k.startsWith('sb-') || k.includes('supabase')
        );
        keys.forEach(k => localStorage.removeItem(k));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAuthenticated]);
  // Handle mode from URL param
  useEffect(() => {
    if (modeParam === 'reset-password') {
      setMode('reset-password');
    }
  }, [modeParam]);

  // Handle verified redirect - user clicked email link
  useEffect(() => {
    if (verifiedParam === 'true' && isAuthenticated && isEmailVerified) {
      // User just verified email - start trial and redirect to app
      if (!trialStatus.isActive && trialStatus.daysRemaining === 0) {
        startTrial();
      }
      navigate('/app?showTrial=true', { replace: true });
    }
  }, [verifiedParam, isAuthenticated, isEmailVerified, navigate, startTrial, trialStatus]);

  // Handle authenticated but unverified user
  useEffect(() => {
    if (isAuthenticated && !isEmailVerified && mode !== 'verify-email') {
      setMode('verify-email');
    }
  }, [isAuthenticated, isEmailVerified, mode]);

  // Handle authenticated AND verified user - redirect to app
  useEffect(() => {
    if (isAuthenticated && isEmailVerified && mode !== 'reset-password') {
      // Start trial if not already started
      if (!trialStatus.isActive && trialStatus.daysRemaining === 0) {
        startTrial();
      }
      if (nextAction === 'trial') {
        navigate('/app?showTrial=true', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [isAuthenticated, isEmailVerified, navigate, nextAction, mode, startTrial, trialStatus]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};
    
    if (mode !== 'verify-email') {
      try {
        emailSchema.parse(email);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.email = e.errors[0].message;
        }
      }
    }
    
    if (mode === 'signin' || mode === 'signup' || mode === 'reset-password') {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.password = e.errors[0].message;
        }
      }
    }

    if (mode === 'reset-password' && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Check your email!',
            description: 'We sent you a verification link. Please verify your email to continue.',
          });
          setMode('verify-email');
        }
      } else if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast({
              title: 'Invalid credentials',
              description: 'Please check your email and password.',
              variant: 'destructive',
            });
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: 'Email not verified',
              description: 'Please check your email and click the verification link.',
              variant: 'destructive',
            });
            setMode('verify-email');
          } else {
            toast({
              title: 'Sign in failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        }
        // Navigation handled by useEffect when auth state changes
      } else if (mode === 'forgot-password') {
        const { error } = await resetPassword(email);
        if (error) {
          toast({
            title: 'Reset failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Check your email',
            description: 'We sent you a password reset link.',
          });
          setMode('signin');
        }
      } else if (mode === 'reset-password') {
        const { error } = await updatePassword(password);
        if (error) {
          toast({
            title: 'Update failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Password updated',
            description: 'You can now sign in with your new password.',
          });
          navigate('/app', { replace: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: 'Google sign in failed',
          description: error.message,
          variant: 'destructive',
        });
      }
      // OAuth will redirect, so we don't need to handle success here
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const { error } = await resendVerificationEmail();
      if (error) {
        toast({
          title: 'Failed to resend',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Email sent!',
          description: 'Please check your inbox for the verification link.',
        });
      }
    } finally {
      setResending(false);
    }
  };

  // Render verification pending screen
  if (mode === 'verify-email') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Verify Your Email</h1>
            <p className="text-muted-foreground">Check your inbox to continue</p>
          </div>

          <Card className="glass border-border/30">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl">Almost there!</CardTitle>
              <CardDescription>
                We sent a verification link to <strong>{user?.email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Click the link in your email to verify your account and start your 2-day trial.
                </p>
                <p className="text-xs text-muted-foreground">
                  Don't see it? Check your spam folder.
                </p>
              </div>

              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleResendVerification}
                disabled={resending}
              >
                {resending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend verification email
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Use a different account
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Back button */}
      <div className="w-full max-w-md mb-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
      
      <div className="w-full max-w-md space-y-6">
        {/* Verify email banner */}
        {verifyBanner === 'required' && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Mail className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              Please verify your email to access the app.
            </AlertDescription>
          </Alert>
        )}

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Flame className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">becoMe</h1>
          <p className="text-muted-foreground">Identity → Intensity → Consistency</p>
        </div>

        <Card className="glass border-border/30">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot-password' && 'Reset password'}
              {mode === 'reset-password' && 'Set new password'}
            </CardTitle>
            <CardDescription>
              {mode === 'signin' && 'Sign in to continue your journey'}
              {mode === 'signup' && 'Start your 2-day free trial'}
              {mode === 'forgot-password' && 'Enter your email to receive a reset link'}
              {mode === 'reset-password' && 'Choose a new secure password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Name (optional)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {mode !== 'reset-password' && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoComplete="email"
                      required
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
              )}

              {(mode === 'signin' || mode === 'signup' || mode === 'reset-password') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">
                      {mode === 'reset-password' ? 'New password' : 'Password'}
                    </Label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      required
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
              )}

              {mode === 'reset-password' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              {/* Remember me checkbox - only for signin */}
              {mode === 'signin' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label 
                    htmlFor="rememberMe" 
                    className="text-sm font-normal cursor-pointer select-none"
                  >
                    {locale === 'pt-PT' ? 'Manter sessão neste dispositivo' : 'Keep me signed in on this device'}
                  </Label>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Please wait...' : (
                  <>
                    {mode === 'signin' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot-password' && 'Send Reset Link'}
                    {mode === 'reset-password' && 'Update Password'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Google OAuth - only for signin/signup */}
            {/* Google OAuth - DISABLED until provider is configured in Lovable Cloud 
            {(mode === 'signin' || mode === 'signup') && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
              </>
            )}
            */}

            <div className="mt-6 text-center text-sm">
              {mode === 'signin' && (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </p>
              )}
              {mode === 'signup' && (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              )}
              {mode === 'forgot-password' && (
                <p>
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default Auth;
