import { useState, useEffect, useCallback, useContext } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import { AuthContext } from '@/contexts/AuthContext';

export type PlanType = 'free' | 'trial' | 'pro';

export interface SubscriptionState {
  plan: PlanType;
  trialStartDate: string | null;
  trialEndDate: string | null;
  purchaseDate: string | null;
  purchasePlan: 'monthly' | 'yearly' | 'lifetime' | null;
}

export interface OnboardingState {
  completed: boolean;
  completedAt: string | null;
  improvementAreas: string[];
  identityVectors: string[];
  selectedPresets: string[];
}

const ONBOARDING_KEY = 'become-onboarding-state';

// Feature limits
export const FREE_LIMITS = {
  maxHabits: 3,
  maxTrackers: 3,
  calendarDaysBack: 7,
  financesAccess: false,
  exportAccess: false,
  fullReminders: false,
};

export const PRO_FEATURES = {
  maxHabits: Infinity,
  maxTrackers: Infinity,
  calendarDaysBack: Infinity,
  financesAccess: true,
  exportAccess: true,
  fullReminders: true,
};

const defaultOnboarding: OnboardingState = {
  completed: false,
  completedAt: null,
  improvementAreas: [],
  identityVectors: [],
  selectedPresets: [],
};

const defaultSubscriptionStatus = {
  subscribed: false,
  plan: 'free' as const,
  planStatus: null as string | null,
  purchasePlan: null as 'monthly' | 'yearly' | 'lifetime' | null,
  subscriptionEnd: null as string | null,
  trialEnd: null as string | null,
  trialStart: null as string | null,
};

export const useSubscription = () => {
  // Use context directly without throwing - allows use before auth is ready
  const authContext = useContext(AuthContext);
  
  // Safely extract values with defaults
  const subscriptionStatus = authContext?.subscriptionStatus ?? defaultSubscriptionStatus;
  const authStartTrial = authContext?.startTrial ?? (async () => {});
  
  const [onboarding, setOnboarding] = useState<OnboardingState>(() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_KEY);
      if (stored) return JSON.parse(stored);
      return defaultOnboarding;
    } catch {
      return defaultOnboarding;
    }
  });

  // Persist onboarding changes
  useEffect(() => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboarding));
  }, [onboarding]);

  // Derive subscription state from auth context
  const subscription: SubscriptionState = {
    plan: subscriptionStatus.plan,
    trialStartDate: subscriptionStatus.trialStart,
    trialEndDate: subscriptionStatus.trialEnd,
    purchaseDate: subscriptionStatus.subscriptionEnd,
    purchasePlan: subscriptionStatus.purchasePlan,
  };

  // Calculate trial status from context
  const getTrialStatus = useCallback(() => {
    if (subscriptionStatus.plan === 'pro') {
      return { isActive: false, daysRemaining: 0, hoursRemaining: 0, minutesRemaining: 0, isExpired: false };
    }

    // Check if planStatus indicates expired trial
    if (subscriptionStatus.planStatus === 'trial_expired') {
      return { isActive: false, daysRemaining: 0, hoursRemaining: 0, minutesRemaining: 0, isExpired: true };
    }

    if (subscriptionStatus.plan === 'trial' && subscriptionStatus.trialEnd) {
      const endDate = parseISO(subscriptionStatus.trialEnd);
      const today = new Date();
      
      const totalMinutesRemaining = differenceInMinutes(endDate, today);
      
      if (totalMinutesRemaining < 0) {
        return { isActive: false, daysRemaining: 0, hoursRemaining: 0, minutesRemaining: 0, isExpired: true };
      }
      
      const daysRemaining = Math.floor(totalMinutesRemaining / (60 * 24));
      const hoursRemaining = Math.floor((totalMinutesRemaining % (60 * 24)) / 60);
      const minutesRemaining = totalMinutesRemaining % 60;
      
      return { 
        isActive: true, 
        daysRemaining,
        hoursRemaining,
        minutesRemaining,
        isExpired: false 
      };
    }

    // Also check trialEnd even if plan is 'free' (trial may have expired)
    if (subscriptionStatus.trialEnd) {
      const endDate = parseISO(subscriptionStatus.trialEnd);
      if (endDate <= new Date()) {
        return { isActive: false, daysRemaining: 0, hoursRemaining: 0, minutesRemaining: 0, isExpired: true };
      }
    }

    return { isActive: false, daysRemaining: 0, hoursRemaining: 0, minutesRemaining: 0, isExpired: false };
  }, [subscriptionStatus]);

  // Start trial - delegate to auth context
  const startTrial = useCallback(async () => {
    await authStartTrial();
  }, [authStartTrial]);

  // Upgrade to Pro (stub - triggers Stripe flow in reality)
  const upgradeToPro = useCallback((planType: 'monthly' | 'yearly' | 'lifetime') => {
    // This will be replaced with actual Stripe checkout flow
    console.log('[SUBSCRIPTION] Upgrade to pro requested:', planType);
  }, []);

  // Complete onboarding
  const completeOnboarding = useCallback((data: Partial<OnboardingState>) => {
    setOnboarding(prev => ({
      ...prev,
      ...data,
      completed: true,
      completedAt: new Date().toISOString(),
    }));
  }, []);

  // Check feature access
  const hasAccess = useCallback((feature: keyof typeof FREE_LIMITS): boolean => {
    const status = getTrialStatus();
    const isPro = subscriptionStatus.plan === 'pro' || status.isActive;
    
    if (isPro) return true;
    
    if (feature === 'financesAccess' || feature === 'exportAccess' || feature === 'fullReminders') {
      return FREE_LIMITS[feature];
    }
    
    return true;
  }, [subscriptionStatus.plan, getTrialStatus]);

  // Get current limits
  const getLimits = useCallback(() => {
    const status = getTrialStatus();
    const isPro = subscriptionStatus.plan === 'pro' || status.isActive;
    
    return isPro ? PRO_FEATURES : FREE_LIMITS;
  }, [subscriptionStatus.plan, getTrialStatus]);

  // Check if should show paywall
  const shouldShowPaywall = useCallback((trigger: 'habits' | 'calendar' | 'finances' | 'export'): boolean => {
    const status = getTrialStatus();
    const isPro = subscriptionStatus.plan === 'pro' || status.isActive;
    
    if (isPro) return false;
    
    switch (trigger) {
      case 'finances':
      case 'export':
        return true;
      case 'calendar':
        return true;
      case 'habits':
        return false;
      default:
        return false;
    }
  }, [subscriptionStatus.plan, getTrialStatus]);

  // Check if needs onboarding
  const needsOnboarding = !onboarding.completed;

  // Check legacy onboarding flag
  useEffect(() => {
    const legacyComplete = localStorage.getItem('itero-onboarding-complete');
    if (legacyComplete === 'true' && !onboarding.completed) {
      // Legacy migration placeholder
    }
  }, [onboarding.completed]);

  const trialStatus = getTrialStatus();

  return {
    subscription,
    onboarding,
    trialStatus,
    startTrial,
    upgradeToPro,
    completeOnboarding,
    hasAccess,
    getLimits,
    shouldShowPaywall,
    needsOnboarding,
    isPro: subscriptionStatus.plan === 'pro' || trialStatus.isActive,
  };
};
