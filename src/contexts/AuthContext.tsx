import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session, Provider } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { loadState, saveState, addHabit, addTracker } from '@/data/storage';
import type { Tracker } from '@/data/types';

interface SubscriptionStatus {
  subscribed: boolean;
  plan: 'free' | 'trial' | 'pro';
  planStatus: 'free_initial' | 'trial_active' | 'trial_expired' | 'pro_active' | 'lifetime' | null;
  purchasePlan: 'monthly' | 'yearly' | 'lifetime' | null;
  subscriptionEnd: string | null;
  trialEnd: string | null;
  trialStart: string | null;
  stripeStatus: string | null;
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
  stripeStatus: null,
};

// Minimum time between subscription checks (30 seconds)
const SUBSCRIPTION_CHECK_COOLDOWN = 30000;

// Onboarding data keys
const ONBOARDING_DATA_KEY = 'become-onboarding-data';

/**
 * Get per-user materialization key to prevent blocking other users in the same browser
 */
const getMaterializationKey = (userId: string): string => {
  return `become-onboarding-materialized-${userId}`;
};

/**
 * Materialize onboarding habits and trackers after successful authentication.
 * This creates the actual objects in localStorage from onboarding selections.
 * Uses per-user keys to support multiple users in the same browser.
 */
const materializeOnboardingData = (userId: string): void => {
  try {
    const materializationKey = getMaterializationKey(userId);
    
    // Check if already materialized FOR THIS USER
    const materialized = localStorage.getItem(materializationKey);
    if (materialized === 'true') {
      console.log('[ONBOARDING] Already materialized for user:', userId);
      return;
    }

    const data = localStorage.getItem(ONBOARDING_DATA_KEY);
    if (!data) {
      console.log('[ONBOARDING] No onboarding data to materialize');
      return;
    }

    const parsed = JSON.parse(data);
    if (!parsed.habitsToCreate && !parsed.trackersToCreate) {
      console.log('[ONBOARDING] No habits/trackers to create');
      // Mark as materialized for this user even if no data
      localStorage.setItem(materializationKey, 'true');
      return;
    }

    let state = loadState();
    let habitsCreated = 0;
    let trackersCreated = 0;

    // Create habits
    if (parsed.habitsToCreate && Array.isArray(parsed.habitsToCreate)) {
      console.log(`[ONBOARDING] Creating ${parsed.habitsToCreate.length} habits for user ${userId}...`);
      
      for (const habit of parsed.habitsToCreate) {
        // Check if habit with same name already exists
        const exists = state.habits.some((h: { nome: string }) => 
          h.nome.toLowerCase() === habit.nome.toLowerCase()
        );
        
        if (!exists) {
          state = addHabit(state, {
            nome: habit.nome,
            categoria: habit.categoria,
            cor: habit.cor,
            active: habit.active ?? true,
            scheduledDays: habit.scheduledDays,
            scheduledTime: habit.scheduledTime,
          });
          habitsCreated++;
          console.log(`[ONBOARDING] Created habit: ${habit.nome}`);
        }
      }
    }

    // Create trackers
    if (parsed.trackersToCreate && Array.isArray(parsed.trackersToCreate)) {
      console.log(`[ONBOARDING] Creating ${parsed.trackersToCreate.length} trackers for user ${userId}...`);
      
      for (const tracker of parsed.trackersToCreate) {
        // Check if tracker with same name already exists
        const exists = state.trackers.some((t: Tracker) => 
          t.name.toLowerCase() === tracker.name.toLowerCase()
        );
        
        if (!exists) {
          state = addTracker(state, {
            name: tracker.name,
            type: tracker.type,
            inputMode: tracker.inputMode,
            unitSingular: tracker.unitSingular,
            unitPlural: tracker.unitPlural,
            valuePerUnit: tracker.valuePerUnit,
            baseline: tracker.baseline,
            dailyGoal: tracker.dailyGoal,
            includeInFinances: tracker.includeInFinances,
            active: tracker.active ?? true,
            icon: tracker.icon,
            frequency: tracker.frequency,
          });
          trackersCreated++;
          console.log(`[ONBOARDING] Created tracker: ${tracker.name}`);
        }
      }
    }

    // Save updated state to localStorage
    if (habitsCreated > 0 || trackersCreated > 0) {
      saveState(state);
      console.log(`[ONBOARDING] Saved state with ${habitsCreated} habits and ${trackersCreated} trackers`);
    }

    // Mark as materialized FOR THIS USER to prevent duplicate creation
    localStorage.setItem(materializationKey, 'true');
    console.log('[ONBOARDING] Marked as materialized for user:', userId);
    
    // Clear the shared onboarding data after successful materialization
    // This prevents the next user from picking up stale data
    localStorage.removeItem(ONBOARDING_DATA_KEY);
    console.log('[ONBOARDING] Cleared onboarding data after materialization');
  } catch (error) {
    console.error('[ONBOARDING] Error materializing onboarding data:', error);
    // Do NOT mark as materialized on error - allow retry
  }
};

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

  /**
   * Refresh subscription status from backend.
   * This is the SINGLE SOURCE OF TRUTH for plan status.
   * The backend (check-subscription) handles all trial logic:
   * - Creates trial on first check if none exists
   * - Returns trial status if still active
   * - Returns free if trial expired
   * - Returns pro if Stripe subscription active
   */
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
      console.log('[AUTH] Checking subscription status...');
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error('[AUTH] Error checking subscription:', error);
        
        // Handle invalid/expired token by signing out
        const errorBody = await error.context?.json?.().catch(() => null);
        const errorMessage = errorBody?.error || error.message || '';
        
        if (errorMessage.includes('Invalid credentials') || 
            errorMessage.includes('Authentication required') ||
            errorMessage.includes('JWT expired')) {
          console.log('[AUTH] Token invalid/expired, signing out...');
          await supabase.auth.signOut();
        }
        return;
      }

      if (data) {
        console.log('[AUTH] Subscription status received:', {
          plan: data.plan,
          stripeStatus: data.stripeStatus,
          trialEndsAt: data.trialEndsAt,
        });

        // Derive planStatus from backend response
        let planStatus: SubscriptionStatus['planStatus'] = null;
        if (data.plan === 'pro') {
          planStatus = data.purchasePlan === 'lifetime' ? 'lifetime' : 'pro_active';
        } else if (data.plan === 'trial') {
          planStatus = 'trial_active';
        } else if (data.trialExpired) {
          planStatus = 'trial_expired';
        } else {
          planStatus = 'free_initial';
        }

        setSubscriptionStatus({
          subscribed: data.subscribed || data.plan === 'pro',
          plan: data.plan || 'free',
          planStatus,
          purchasePlan: data.purchasePlan || null,
          subscriptionEnd: data.subscriptionEnd || null,
          trialEnd: data.trialEndsAt || null,
          trialStart: data.trialStartedAt || null,
          stripeStatus: data.stripeStatus || null,
        });
      }
    } catch (err) {
      console.error('[AUTH] Failed to check subscription:', err);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  /**
   * Start trial - now just triggers a refresh since backend handles trial creation
   * The check-subscription endpoint automatically creates a trial if none exists
   */
  const startTrial = useCallback(async () => {
    console.log('[AUTH] startTrial called - triggering subscription refresh');
    await refreshSubscription(true);
  }, [refreshSubscription]);

  useEffect(() => {
    let isMounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        
        console.log('[AUTH] Auth state changed:', event);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        
        // Check subscription on sign in events
        if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          // Materialize onboarding data immediately on first sign in
          if (event === 'SIGNED_IN') {
            materializeOnboardingData(newSession.user.id);
          }
          setTimeout(() => {
            refreshSubscription(true);
          }, 100);
        } else if (!newSession) {
          setSubscriptionStatus(defaultSubscriptionStatus);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!isMounted) return;
      
      console.log('[AUTH] Existing session check:', !!existingSession);
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
      
      if (existingSession?.user) {
        // Materialize onboarding data if user arrives with existing session
        // This covers the email verification link flow (opens in new tab with session)
        console.log('[AUTH] User has existing session, checking for onboarding data to materialize...');
        materializeOnboardingData(existingSession.user.id);
        
        // Initial subscription check with slight delay
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

  // Periodic subscription check every 2 minutes
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(() => {
      refreshSubscription();
    }, 120000);

    return () => clearInterval(interval);
  }, [session, refreshSubscription]);

  // Handle visibility change (tab focus) - refresh on focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        console.log('[AUTH] Tab focused - refreshing subscription');
        refreshSubscription(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    console.log('[AUTH] Signing out...');
    
    // Clear all internal state FIRST
    setUser(null);
    setSession(null);
    setSubscriptionStatus(defaultSubscriptionStatus);
    
    // Reset refs to prevent any pending operations
    sessionRef.current = null;
    lastCheckRef.current = 0;
    isCheckingRef.current = false;
    
    try {
      // Sign out with global scope to ensure server-side session is cleared
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('[AUTH] Error during sign out:', error);
      }
      
      console.log('[AUTH] Sign out completed successfully');
    } catch (err) {
      console.error('[AUTH] Exception during sign out:', err);
    }
    
    // Verify session is cleared
    const { data: { session: checkSession } } = await supabase.auth.getSession();
    if (checkSession) {
      console.warn('[AUTH] Session still exists after signOut, forcing clear...');
      // Force another signOut attempt
      await supabase.auth.signOut({ scope: 'global' });
    } else {
      console.log('[AUTH] Session verified as null after signOut');
    }
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
