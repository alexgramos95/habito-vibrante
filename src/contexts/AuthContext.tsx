/**
 * CORE FILE — DO NOT EDIT VIA LOVABLE.
 * Changes must be reviewed and tested locally.
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session, Provider } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useDataSync } from '@/hooks/useDataSync';
import { AUTH_RECOVERY_EVENT, isRecoverableAuthError, recoverInvalidSession } from '@/lib/authSessionRecovery';
import { purgeAccountData, detectAccountSwitchAndPurge } from '@/lib/sessionCleanup';
import { useQueryClient } from '@tanstack/react-query';

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

// Note: onboarding materialization is now handled by DataContext via
// `runOnboardingMaterialization` (see src/lib/onboardingMaterialization.ts).
// The legacy materializer that lived here was removed to avoid double-runs
// that could create duplicate habits or wipe selected metrics.

/**
 * Materialize onboarding habits and trackers after successful authentication.
 *
 * Returns true when the call resulted in a fully materialized state for this
 * user (either nothing to do, or habits/trackers were created), false when
 * materialization should be retried later (e.g. draft missing right now but
 * the mirror may be restored on a subsequent mount, or a recoverable error).
 *
 * Idempotent: name-based dedupe prevents duplicate creates if called twice.
 *
 * IMPORTANT: This is now called from DataContext AFTER checking subscription
 * and cloud data. For PRO users with existing cloud data, this is skipped —
 * cloud is the source of truth.
 */
export const materializeOnboardingData = (
  userId: string,
  skipIfProWithCloudData: { isPro: boolean; hasCloudData: boolean } | null = null,
): boolean => {
  const materializationKey = getMaterializedKey(userId);

  try {
    // Already done for THIS user → nothing to do.
    if (isMaterialized(userId)) {
      console.log('[ONBOARDING] Already materialized for user:', userId);
      return true;
    }

    // PRO users with cloud data should NOT materialize from onboarding —
    // their data comes from the cloud. Mark as done so we don't retry.
    if (skipIfProWithCloudData?.isPro && skipIfProWithCloudData?.hasCloudData) {
      console.log('[ONBOARDING] PRO user with cloud data - skipping materialization, marking as done');
      markMaterialized(userId);
      try { localStorage.removeItem(ONBOARDING_DATA_KEY); } catch { /* ignore */ }
      return true;
    }

    const parsed = readOnboardingDraft();
    if (!parsed) {
      // No draft and no mirror — user signed in without completing onboarding
      // on this device. Mark done so we stop retrying every render.
      console.log('[ONBOARDING] No onboarding draft to materialize');
      markMaterialized(userId);
      return true;
    }

    if (!parsed.habitsToCreate && !parsed.trackersToCreate) {
      console.log('[ONBOARDING] Draft contained no habits/trackers to create');
      markMaterialized(userId);
      return true;
    }

    let state = loadState();
    let habitsCreated = 0;
    let trackersCreated = 0;

    // Create habits (idempotent via case-insensitive name match)
    if (Array.isArray(parsed.habitsToCreate)) {
      console.log(`[ONBOARDING] Creating ${parsed.habitsToCreate.length} habits for user ${userId}...`);
      for (const habit of parsed.habitsToCreate as Array<Record<string, unknown>>) {
        const name = String(habit.nome ?? '');
        if (!name) continue;
        const exists = state.habits.some((h: { nome: string }) =>
          h.nome.toLowerCase() === name.toLowerCase(),
        );
        if (!exists) {
          state = addHabit(state, {
            nome: name,
            categoria: habit.categoria as string,
            cor: habit.cor as string,
            active: (habit.active as boolean | undefined) ?? true,
            scheduledDays: habit.scheduledDays as number[] | undefined,
            scheduledTime: habit.scheduledTime as string | undefined,
            mode: (habit.mode as "simple" | "metric" | undefined) ?? "simple",
            type: habit.type as any,
            inputMode: habit.inputMode as any,
            icon: habit.icon as string | undefined,
            unitSingular: habit.unitSingular as string | undefined,
            unitPlural: habit.unitPlural as string | undefined,
            baseline: habit.baseline as number | undefined,
            valuePerUnit: habit.valuePerUnit as number | undefined,
            frequency: habit.frequency as any,
          });
          habitsCreated++;
          console.log(`[ONBOARDING] Created habit: ${name} (mode=${habit.mode ?? 'simple'})`);
        }
      }
    }

    // Create trackers
    if (Array.isArray(parsed.trackersToCreate)) {
      console.log(`[ONBOARDING] Creating ${parsed.trackersToCreate.length} trackers for user ${userId}...`);
      for (const tracker of parsed.trackersToCreate as Array<Record<string, unknown>>) {
        const name = String(tracker.name ?? '');
        if (!name) continue;
        const exists = state.trackers.some((t: Tracker) =>
          t.name.toLowerCase() === name.toLowerCase(),
        );
        if (!exists) {
          state = addTracker(state, {
            name,
            type: tracker.type as Tracker['type'],
            inputMode: tracker.inputMode as Tracker['inputMode'],
            unitSingular: tracker.unitSingular as string,
            unitPlural: tracker.unitPlural as string,
            valuePerUnit: tracker.valuePerUnit as number,
            baseline: tracker.baseline as number,
            dailyGoal: tracker.dailyGoal as number | undefined,
            includeInFinances: tracker.includeInFinances as boolean | undefined,
            active: (tracker.active as boolean | undefined) ?? true,
            icon: tracker.icon as string | undefined,
            frequency: tracker.frequency as Tracker['frequency'],
          });
          trackersCreated++;
          console.log(`[ONBOARDING] Created tracker: ${name}`);
        }
      }
    }

    if (habitsCreated > 0 || trackersCreated > 0) {
      saveState(state);
      console.log(`[ONBOARDING] Saved state with ${habitsCreated} habits and ${trackersCreated} trackers`);
    }

    // Mark as materialized so we don't repeat creation. Note: we deliberately
    // do NOT clear the draft here — DataContext clears it after the cloud
    // upload completes so a network failure mid-flight can be safely retried.
    markMaterialized(userId);
    console.log('[ONBOARDING] Marked as materialized for user:', userId);

    track('onboarding_materialized_success', {
      userId: userId.slice(0, 8),
      habitsCreated,
      trackersCreated,
    });

    return true;
  } catch (error) {
    console.error('[ONBOARDING] Error materializing onboarding data:', error);
    track('onboarding_materialized_failed', {
      userId: userId.slice(0, 8),
      error: (error as Error)?.message ?? 'unknown',
    });
    // Do NOT mark as materialized on error — allow retry on next mount.
    return false;
  }
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(defaultSubscriptionStatus);
  
  // Data sync hook
  const { downloadFromCloud } = useDataSync();
  const queryClient = useQueryClient();
  
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

        // Handle invalid/expired/revoked token by signing out locally.
        // Use scope:'local' because the server-side session no longer exists
        // (a global signOut would 403 and leave the bad token in localStorage).
        const errorBody = await error.context?.json?.().catch(() => null);
        const errorMessage = errorBody?.error || error.message || '';

        if (isRecoverableAuthError(errorMessage)) {
          console.log('[AUTH] Token invalid/expired/revoked, signing out locally...');
          await recoverInvalidSession('subscription-refresh');
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
    const handleAuthRecovery = () => {
      setUser(null);
      setSession(null);
      setSubscriptionStatus(defaultSubscriptionStatus);
      sessionRef.current = null;
      lastCheckRef.current = 0;
      isCheckingRef.current = false;
      // ACCOUNT-LEAK GUARD: purge local data on forced sign-out so a
      // recovered/expired session can't leave another user's data behind.
      purgeAccountData('auth-recovery');
      try { queryClient.clear(); } catch { /* ignore */ }
      setLoading(false);
    };

    window.addEventListener(AUTH_RECOVERY_EVENT, handleAuthRecovery);

    return () => {
      window.removeEventListener(AUTH_RECOVERY_EVENT, handleAuthRecovery);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        
        console.log('[AUTH] Auth state changed:', event);
        
        // Handle PASSWORD_RECOVERY - redirect to dedicated reset page
        if (event === 'PASSWORD_RECOVERY') {
          console.log('[AUTH] Password recovery detected - redirecting to reset page');
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
          // Redirect to dedicated reset password page
          window.location.href = '/reset-password';
          return;
        }
        
        // ACCOUNT-LEAK GUARD: detect account switch on the same browser and
        // wipe all account-scoped local data BEFORE the new user's data loads.
        // Also wipe React Query cache so no stale queries leak across accounts.
        const newUserId = newSession?.user?.id ?? null;
        const switched = detectAccountSwitchAndPurge(newUserId);
        if (switched) {
          try { queryClient.clear(); } catch { /* ignore */ }
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // Check subscription on sign in events
        if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          if (event === 'SIGNED_IN') {
            // On a fresh SIGNED_IN, force-refetch ALL queries so no cached
            // data from a previous account leaks through.
            try { queryClient.invalidateQueries(); } catch { /* ignore */ }
            // NOTE: Cloud download + onboarding materialization are handled by
            // DataContext after subscription/PRO status is known. Calling
            // downloadFromCloud here would race with the materializer and could
            // overwrite the freshly-created onboarding habits with an empty
            // cloud snapshot. See: "Onboarding habits/metrics lost on signup".
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
        // NOTE: Cloud download + onboarding materialization are handled by
        // DataContext, which knows the PRO/trial status. Doing it here would
        // race with materialization and risk overwriting freshly-created
        // onboarding habits with an empty cloud snapshot.
        console.log('[AUTH] User has existing session');

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
    // Dynamic import to avoid circular dependency
    const { lovable } = await import('@/integrations/lovable/index');
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: `${window.location.origin}/auth?verified=true`,
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

    // ACCOUNT-LEAK GUARD: purge ALL account-scoped local state and any
    // cached React Query data so the next user on this browser cannot
    // see anything from this account.
    purgeAccountData('signOut');
    try { queryClient.clear(); } catch { /* ignore */ }

    try {
      // Sign out with global scope to ensure server-side session is cleared
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        console.error('[AUTH] Error during sign out:', error);
        if (isRecoverableAuthError(error.message)) {
          await recoverInvalidSession('manual-signout');
          return;
        }
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
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error && isRecoverableAuthError(error.message)) {
        await recoverInvalidSession('manual-signout-verify');
      }
    } else {
      console.log('[AUTH] Session verified as null after signOut');
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
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
