import { useState, useEffect, useCallback } from 'react';
import { differenceInDays, parseISO, addDays } from 'date-fns';

export type PlanType = 'free' | 'trial' | 'pro';

export interface SubscriptionState {
  plan: PlanType;
  trialStartDate: string | null; // ISO date string
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

const SUBSCRIPTION_KEY = 'become-subscription';
const ONBOARDING_KEY = 'become-onboarding-state';
const TRIAL_DURATION_DAYS = 7;

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

const defaultSubscription: SubscriptionState = {
  plan: 'free',
  trialStartDate: null,
  trialEndDate: null,
  purchaseDate: null,
  purchasePlan: null,
};

const defaultOnboarding: OnboardingState = {
  completed: false,
  completedAt: null,
  improvementAreas: [],
  identityVectors: [],
  selectedPresets: [],
};

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionState>(() => {
    try {
      const stored = localStorage.getItem(SUBSCRIPTION_KEY);
      if (stored) return JSON.parse(stored);
      return defaultSubscription;
    } catch {
      return defaultSubscription;
    }
  });

  const [onboarding, setOnboarding] = useState<OnboardingState>(() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_KEY);
      if (stored) return JSON.parse(stored);
      return defaultOnboarding;
    } catch {
      return defaultOnboarding;
    }
  });

  // Persist subscription changes
  useEffect(() => {
    localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
  }, [subscription]);

  // Persist onboarding changes
  useEffect(() => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboarding));
  }, [onboarding]);

  // Calculate trial status
  const getTrialStatus = useCallback(() => {
    if (subscription.plan === 'pro') {
      return { isActive: false, daysRemaining: 0, isExpired: false };
    }

    if (subscription.plan === 'trial' && subscription.trialEndDate) {
      const endDate = parseISO(subscription.trialEndDate);
      const today = new Date();
      const daysRemaining = differenceInDays(endDate, today);
      
      if (daysRemaining < 0) {
        // Trial expired - switch to free
        return { isActive: false, daysRemaining: 0, isExpired: true };
      }
      
      return { 
        isActive: true, 
        daysRemaining: Math.max(0, daysRemaining + 1), 
        isExpired: false 
      };
    }

    return { isActive: false, daysRemaining: 0, isExpired: false };
  }, [subscription]);

  // Check if trial has expired and update plan
  useEffect(() => {
    const status = getTrialStatus();
    if (status.isExpired && subscription.plan === 'trial') {
      setSubscription(prev => ({ ...prev, plan: 'free' }));
    }
  }, [getTrialStatus, subscription.plan]);

  // Start trial
  const startTrial = useCallback(() => {
    const now = new Date();
    const endDate = addDays(now, TRIAL_DURATION_DAYS);
    
    setSubscription({
      plan: 'trial',
      trialStartDate: now.toISOString(),
      trialEndDate: endDate.toISOString(),
      purchaseDate: null,
      purchasePlan: null,
    });
  }, []);

  // Upgrade to Pro (stub - no actual payment)
  const upgradeToPro = useCallback((planType: 'monthly' | 'yearly' | 'lifetime') => {
    setSubscription(prev => ({
      ...prev,
      plan: 'pro',
      purchaseDate: new Date().toISOString(),
      purchasePlan: planType,
    }));
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
    const isPro = subscription.plan === 'pro' || status.isActive;
    
    if (isPro) return true;
    
    // Check specific feature limits
    if (feature === 'financesAccess' || feature === 'exportAccess' || feature === 'fullReminders') {
      return FREE_LIMITS[feature];
    }
    
    return true; // For numeric limits, handled elsewhere
  }, [subscription.plan, getTrialStatus]);

  // Get current limits
  const getLimits = useCallback(() => {
    const status = getTrialStatus();
    const isPro = subscription.plan === 'pro' || status.isActive;
    
    return isPro ? PRO_FEATURES : FREE_LIMITS;
  }, [subscription.plan, getTrialStatus]);

  // Check if should show paywall
  const shouldShowPaywall = useCallback((trigger: 'habits' | 'calendar' | 'finances' | 'export'): boolean => {
    const status = getTrialStatus();
    const isPro = subscription.plan === 'pro' || status.isActive;
    
    if (isPro) return false;
    
    switch (trigger) {
      case 'finances':
      case 'export':
        return true;
      case 'calendar':
        // Show paywall for week 2+
        return true;
      case 'habits':
        return false; // Handled by limit check
      default:
        return false;
    }
  }, [subscription.plan, getTrialStatus]);

  // Check if needs onboarding
  const needsOnboarding = !onboarding.completed;

  // Check legacy onboarding flag and migrate
  useEffect(() => {
    const legacyComplete = localStorage.getItem('itero-onboarding-complete');
    if (legacyComplete === 'true' && !onboarding.completed) {
      // Don't auto-migrate - let new onboarding run for trial start
    }
  }, [onboarding.completed]);

  return {
    subscription,
    onboarding,
    trialStatus: getTrialStatus(),
    startTrial,
    upgradeToPro,
    completeOnboarding,
    hasAccess,
    getLimits,
    shouldShowPaywall,
    needsOnboarding,
    isPro: subscription.plan === 'pro' || getTrialStatus().isActive,
  };
};
