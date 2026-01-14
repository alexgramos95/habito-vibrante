import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session, Provider } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { addDays } from 'date-fns';

interface SubscriptionStatus {
  subscribed: boolean;
  plan: 'free' | 'trial' | 'pro';
  planStatus: 'free_initial' | 'trial_active' | 'trial_expired' | 'pro_active' | 'lifetime' | null;
  purchasePlan: 'monthly' | 'yearly' | 'lifetime' | null;
  subscriptionEnd: string | null;
  trialEnd: string | null;
  trialStart: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
  refreshSubscription: () => Promise<void>;
  startTrial: () => Promise<void>;
  subscriptionStatus: SubscriptionStatus;
}

const defaultSubscriptionStatus: SubscriptionStatus = {
  subscribed: false,
  plan: 'free',
  planStatus: null,
  purchasePlan: null,
  subscriptionEnd: null,
  trialEnd: null,
  trialStart: null,
};

// Minimum time between subscription checks (30 seconds)
const SUBSCRIPTION_CHECK_COOLDOWN = 30000;
const TRIAL_DURATION_DAYS = 2;

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(defaultSubscriptionStatus);
  
  // Track last check time to prevent rate limiting
  const lastCheckRef = useRef<number>(0);
  const isCheckingRef = useRef<boolean>(false);
  const sessionRef = useRef<Session | null>(null);

  // Keep session ref in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Check if email is verified
  const isEmailVerified = Boolean(user?.email_confirmed_at);

  // Start trial - creates/updates subscription in database
  const startTrial = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession?.user) return;

    const now = new Date();
    const trialEndDate = addDays(now, TRIAL_DURATION_DAYS);

    try {
      // Check if subscription row exists
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .single();

      if (existingSub) {
        // Update existing row only if not already pro
        if (existingSub.plan !== 'pro') {
          await supabase
            .from('subscriptions')
            .update({
              plan: 'trial',
              trial_start_date: now.toISOString(),
              trial_end_date: trialEndDate.toISOString(),
              status: 'active',
            })
            .eq('user_id', currentSession.user.id);
        }
      } else {
        // Create new subscription row with trial
        await supabase
          .from('subscriptions')
          .insert({
            user_id: currentSession.user.id,
            plan: 'trial',
            trial_start_date: now.toISOString(),
            trial_end_date: trialEndDate.toISOString(),
            status: 'active',
          });
      }

      // Update local state
      setSubscriptionStatus(prev => ({
        ...prev,
        plan: 'trial',
        planStatus: 'trial_active',
        trialStart: now.toISOString(),
        trialEnd: trialEndDate.toISOString(),
      }));

      console.log('[AUTH] Trial started successfully');
    } catch (err) {
      console.error('[AUTH] Failed to start trial:', err);
    }
  }, []);

  const refreshSubscription = useCallback(async (force = false) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    
    const now = Date.now();
    
    // Prevent concurrent checks and respect cooldown (unless forced)
    if (isCheckingRef.current) return;
    if (!force && (now - lastCheckRef.current) < SUBSCRIPTION_CHECK_COOLDOWN) {
      return;
    }
    
    isCheckingRef.current = true;
    lastCheckRef.current = now;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      if (data) {
        setSubscriptionStatus({
          subscribed: data.subscribed || false,
          plan: data.plan || 'free',
          planStatus: data.plan === 'trial' ? 'trial_active' : data.plan === 'pro' ? 'pro_active' : 'free_initial',
          purchasePlan: data.purchase_plan || null,
          subscriptionEnd: data.subscription_end || null,
          trialEnd: data.trial_end || null,
          trialStart: null,
        });
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        
        // Only check subscription on sign in events, not every state change
        if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          setTimeout(() => {
            refreshSubscription(true); // Force check on sign in
          }, 100);
        } else if (!newSession) {
          setSubscriptionStatus(defaultSubscriptionStatus);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!isMounted) return;
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
      
      if (existingSession?.user) {
        // Initial check with slight delay
        setTimeout(() => {
          refreshSubscription(true);
        }, 500);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  // Periodic subscription check every 2 minutes (reduced frequency)
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(() => {
      refreshSubscription();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [session, refreshSubscription]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/auth?verified=true`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google' as Provider,
      options: {
        redirectTo: `${window.location.origin}/auth?verified=true`,
      },
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSubscriptionStatus(defaultSubscriptionStatus);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset-password`,
    });

    return { error: error ? new Error(error.message) : null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error: error ? new Error(error.message) : null };
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) {
      return { error: new Error('No email address found') };
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth?verified=true`,
      },
    });

    return { error: error ? new Error(error.message) : null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: !!user,
        isEmailVerified,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        resendVerificationEmail,
        refreshSubscription: () => refreshSubscription(true),
        startTrial,
        subscriptionStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
