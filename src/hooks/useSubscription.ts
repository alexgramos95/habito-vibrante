import { useState, useEffect, useCallback } from 'react';
import { differenceInDays, parseISO, addDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

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
const TRIAL_DURATION_DAYS = 2;

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

export const useSubscription = () => {
  const { subscriptionStatus, startTrial: authStartTrial, isAuthenticated } = useAuth();
  
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
      return { isActive: false, daysRemaining: 0, isExpired: false };
    }

    if (subscriptionStatus.plan === 'trial' && subscriptionStatus.trialEnd) {
      const endDate = parseISO(subscriptionStatus.trialEnd);
      const today = new Date();
      const daysRemaining = differenceInDays(endDate, today);
      
      if (daysRemaining < 0) {
        return { isActive: false, daysRemaining: 0, isExpired: true };
      }
      
      return { 
        isActive: true, 
        daysRemaining: Math.max(0, daysRemaining + 1), 
        isExpired: false 
      };
    }

    return { isActive: false, daysRemaining: 0, isExpired: false };
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
