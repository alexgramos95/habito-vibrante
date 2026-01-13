import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  subscriptionStatus: {
    subscribed: boolean;
    plan: 'free' | 'trial' | 'pro';
    purchasePlan: 'monthly' | 'yearly' | 'lifetime' | null;
    subscriptionEnd: string | null;
    trialEnd: string | null;
  };
}

const defaultSubscriptionStatus = {
  subscribed: false,
  plan: 'free' as const,
  purchasePlan: null,
  subscriptionEnd: null,
  trialEnd: null,
};

// Minimum time between subscription checks (30 seconds)
const SUBSCRIPTION_CHECK_COOLDOWN = 30000;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(defaultSubscriptionStatus);
  
  // Track last check time to prevent rate limiting
  const lastCheckRef = useRef<number>(0);
  const isCheckingRef = useRef<boolean>(false);
  const sessionRef = useRef<Session | null>(null);

  // Keep session ref in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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
          purchasePlan: data.purchase_plan || null,
          subscriptionEnd: data.subscription_end || null,
          trialEnd: data.trial_end || null,
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
    const redirectUrl = `${window.location.origin}/`;
    
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setSubscriptionStatus(defaultSubscriptionStatus);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: !!user,
        signUp,
        signIn,
        signOut,
        refreshSubscription: () => refreshSubscription(true),
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
