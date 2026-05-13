import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Flame, RefreshCw, CheckCircle, Eye, EyeOff } from 'lucide-react';
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
import { lovable } from '@/integrations/lovable/index';
import { track } from '@/lib/analytics';
import { trackEvent } from '@/lib/canonicalEvents';
import { BecomeLogo } from '@/components/Brand/BecomeLogo';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// Key to track if session should persist
const SESSION_PERSIST_KEY = 'become-persist-session';

type AuthMode = 'signin' | 'signup' | 'forgot-password' | 'reset-password' | 'verify-email';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    if (modeParam === 'reset-password' || modeParam === 'signup' || modeParam === 'signin' || modeParam === 'forgot-password') {
      setMode(modeParam as AuthMode);
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
      const isPT = locale === 'pt-PT';
      if (mode === 'signup') {
        trackEvent('signup_started', { method: 'email' });
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: isPT ? 'Conta já existe' : 'Account exists',
              description: isPT
                ? 'Este email já está registado. Inicia sessão.'
                : 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: isPT ? 'Falha no registo' : 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          void track('signup', { method: 'email' });
          trackEvent('signup_completed', { method: 'email' });
          toast({
            title: isPT ? 'Verifica o teu email' : 'Check your email!',
            description: isPT
              ? 'Enviámos um link de verificação. Confirma o email para continuar.'
              : 'We sent you a verification link. Please verify your email to continue.',
          });
          setMode('verify-email');
        }
      } else if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (!error) {
          trackEvent('login_completed', { method: 'email' });
        }
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast({
              title: isPT ? 'Credenciais inválidas' : 'Invalid credentials',
              description: isPT
                ? 'Verifica o email e a palavra-passe.'
                : 'Please check your email and password.',
              variant: 'destructive',
            });
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: isPT ? 'Email por verificar' : 'Email not verified',
              description: isPT
                ? 'Abre o teu email e clica no link de verificação.'
                : 'Please check your email and click the verification link.',
              variant: 'destructive',
            });
            setMode('verify-email');
          } else {
            toast({
              title: isPT ? 'Falha ao iniciar sessão' : 'Sign in failed',
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
            title: isPT ? 'Falha ao recuperar' : 'Reset failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: isPT ? 'Verifica o teu email' : 'Check your email',
            description: isPT
              ? 'Enviámos um link para redefinir a palavra-passe.'
              : 'We sent you a password reset link.',
          });
          setMode('signin');
        }
      } else if (mode === 'reset-password') {
        const { error } = await updatePassword(password);
        if (error) {
          toast({
            title: isPT ? 'Falha na atualização' : 'Update failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: isPT ? 'Palavra-passe atualizada' : 'Password updated',
            description: isPT
              ? 'Já podes iniciar sessão com a nova palavra-passe.'
              : 'You can now sign in with your new password.',
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
      void track('signup_attempt', { method: 'google' });
      trackEvent('signup_started', { method: 'google' });
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: locale === 'pt-PT' ? 'Falha no login com Google' : 'Google sign in failed',
          description: error.message,
          variant: 'destructive',
        });
      }
      // OAuth will redirect, so we don't need to handle success here
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      trackEvent('signup_started', { method: 'apple' });
      const { error } = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({
          title: locale === 'pt-PT' ? 'Falha no login com Apple' : 'Apple sign in failed',
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
    const isPT = locale === 'pt-PT';
    try {
      const { error } = await resendVerificationEmail();
      if (error) {
        toast({
          title: isPT ? 'Não foi possível reenviar' : 'Failed to resend',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: isPT ? 'Email enviado' : 'Email sent!',
          description: isPT
            ? 'Vê na tua caixa de entrada o link de verificação.'
            : 'Please check your inbox for the verification link.',
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
              <div className="h-14 w-14 bg-card border-2 border-primary flex items-center justify-center shadow-[3px_3px_0_0_hsl(var(--neon-ultra))]">
                <Mail className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">// VERIFY ACCESS</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Confirm the link we sent to your email
            </p>
          </div>

          <Card className="border-2 border-primary/40 bg-card shadow-[8px_8px_0_0_hsl(var(--neon-ultra)/0.6)]">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl font-black italic uppercase tracking-tighter">PENDING CONFIRMATION</CardTitle>
              <CardDescription className="font-mono text-xs">
                Link sent to <strong className="text-primary not-italic">{user?.email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-foreground/15 bg-background/40 p-4 text-center">
                <p className="text-sm text-foreground/80 mb-2">
                  Click the link in the email to confirm your access and start your free trial.
                </p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  // NOTHING THERE? CHECK SPAM
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
                    SENDING...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    RESEND LINK
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                  }}
                  className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                >
                  // USE ANOTHER ACCOUNT
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
        <Link to="/onboarding?restart=1" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          // BACK
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
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center mb-2">
            <BecomeLogo size="md" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            // IDENTITY · INTENSITY · CONSISTENCY
          </p>
        </div>

        <Card className="border-2 border-primary/40 bg-card shadow-[8px_8px_0_0_hsl(var(--neon-ultra)/0.6)]">
          <CardHeader className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary/70">
              {mode === 'signin' && (locale === 'pt-PT' ? '// ENTRAR' : '// SIGN IN')}
              {mode === 'signup' && (locale === 'pt-PT' ? '// CRIAR CONTA' : '// SIGN UP')}
              {mode === 'forgot-password' && (locale === 'pt-PT' ? '// RECUPERAR ACESSO' : '// RECOVER ACCESS')}
              {mode === 'reset-password' && (locale === 'pt-PT' ? '// NOVA PALAVRA-PASSE' : '// NEW PASSWORD')}
            </p>
            <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">
              {mode === 'signin' && (locale === 'pt-PT' ? 'Bem-vindo de volta' : 'Welcome back')}
              {mode === 'signup' && (locale === 'pt-PT' ? 'Cria a tua conta' : 'Create your account')}
              {mode === 'forgot-password' && (locale === 'pt-PT' ? 'Recuperar palavra-passe' : 'Reset password')}
              {mode === 'reset-password' && (locale === 'pt-PT' ? 'Definir nova palavra-passe' : 'Set new password')}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {mode === 'signin' && (locale === 'pt-PT' ? 'Entra para continuar' : 'Sign in to continue')}
              {mode === 'signup' && (locale === 'pt-PT' ? 'Começa o teu período grátis' : 'Start your free trial')}
              {mode === 'forgot-password' && (locale === 'pt-PT' ? 'Indica o teu email para receberes um link' : 'Enter your email to receive a link')}
              {mode === 'reset-password' && (locale === 'pt-PT' ? 'Escolhe uma palavra-passe segura' : 'Choose a secure password')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">{locale === 'pt-PT' ? 'Nome (opcional)' : 'Name (optional)'}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder={locale === 'pt-PT' ? 'O teu nome' : 'Your name'}
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
                      {mode === 'reset-password'
                        ? (locale === 'pt-PT' ? 'Nova palavra-passe' : 'New password')
                        : (locale === 'pt-PT' ? 'Palavra-passe' : 'Password')}
                    </Label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="text-xs text-primary hover:underline"
                      >
                        {locale === 'pt-PT' ? 'Esqueceste-te?' : 'Forgot password?'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
              )}

              {mode === 'reset-password' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{locale === 'pt-PT' ? 'Confirmar palavra-passe' : 'Confirm password'}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
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
                    {locale === 'pt-PT' ? 'Manter sessão iniciada neste dispositivo' : 'Keep me signed in on this device'}
                  </Label>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (locale === 'pt-PT' ? 'A PROCESSAR...' : 'PROCESSING...') : (
                  <>
                    {mode === 'signin' && (locale === 'pt-PT' ? 'ENTRAR' : 'SIGN IN')}
                    {mode === 'signup' && (locale === 'pt-PT' ? 'CRIAR CONTA' : 'CREATE ACCOUNT')}
                    {mode === 'forgot-password' && (locale === 'pt-PT' ? 'ENVIAR LINK' : 'SEND LINK')}
                    {mode === 'reset-password' && (locale === 'pt-PT' ? 'ATUALIZAR PALAVRA-PASSE' : 'UPDATE PASSWORD')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* OAuth - for signin/signup */}
            {(mode === 'signin' || mode === 'signup') && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t-2 border-foreground/15" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      // OR
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {locale === 'pt-PT' ? 'CONTINUAR COM GOOGLE' : 'CONTINUE WITH GOOGLE'}
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleAppleSignIn}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    {locale === 'pt-PT' ? 'CONTINUAR COM APPLE' : 'CONTINUE WITH APPLE'}
                  </Button>
                </div>
              </>
            )}

            <div className="mt-6 text-center font-mono text-[11px] uppercase tracking-widest">
              {mode === 'signin' && (
                <p className="text-muted-foreground">
                  No account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-primary hover:underline font-bold"
                  >
                    SIGN UP
                  </button>
                </p>
              )}
              {mode === 'signup' && (
                <p className="text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-primary hover:underline font-bold"
                  >
                    SIGN IN
                  </button>
                </p>
              )}
              {mode === 'forgot-password' && (
                <p className="text-muted-foreground">
                  Remembered it?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-primary hover:underline font-bold"
                  >
                    SIGN IN
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          // BY CONTINUING YOU ACCEPT{' '}
          <a href="/terms" className="underline hover:text-primary">TERMS</a>
          {' '}AND{' '}
          <a href="/privacy" className="underline hover:text-primary">PRIVACY</a>
        </p>
      </div>
    </div>
  );
};

export default Auth;
