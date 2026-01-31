/**
 * ENTITLEMENTS ENGINE for becoMe
 * 
 * Single source of truth for tier-based access control.
 * All gating logic should use this module.
 */

import { FREE_LIMITS, TRIAL_CONFIG } from "@/config/billing";

// ============================================
// TIER TYPES
// ============================================
export type TierType = "free" | "trial" | "pro";

export interface TierStatus {
  tier: TierType;
  isActive: boolean; // Has full access (trial or pro)
  trialDaysRemaining: number;
  trialHoursRemaining: number;
  trialMinutesRemaining: number;
  isTrialExpired: boolean;
  purchasePlan: "monthly" | "yearly" | "lifetime" | null;
}

// ============================================
// SUBSCRIPTION STATUS (from AuthContext)
// ============================================
export interface SubscriptionStatus {
  plan: "free" | "trial" | "pro";
  planStatus: string | null;
  purchasePlan: "monthly" | "yearly" | "lifetime" | null;
  trialEnd: string | null;
  trialStart: string | null;
  subscribed: boolean;
}

// ============================================
// COMPUTE TIER STATUS
// ============================================
export const computeTierStatus = (subscription: SubscriptionStatus): TierStatus => {
  const { plan, planStatus, purchasePlan, trialEnd } = subscription;

  // PRO users have full access
  if (plan === "pro") {
    return {
      tier: "pro",
      isActive: true,
      trialDaysRemaining: 0,
      trialHoursRemaining: 0,
      trialMinutesRemaining: 0,
      isTrialExpired: false,
      purchasePlan,
    };
  }

  // FREE users (post-trial decision made)
  if (plan === "free") {
    return {
      tier: "free",
      isActive: false,
      trialDaysRemaining: 0,
      trialHoursRemaining: 0,
      trialMinutesRemaining: 0,
      isTrialExpired: planStatus === "trial_expired",
      purchasePlan: null,
    };
  }

  // TRIAL users - calculate remaining time
  if (plan === "trial" && trialEnd) {
    try {
      const endDate = new Date(trialEnd);
      const now = new Date();
      const totalMinutes = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / 60000));

      if (totalMinutes <= 0) {
        return {
          tier: "trial",
          isActive: false,
          trialDaysRemaining: 0,
          trialHoursRemaining: 0,
          trialMinutesRemaining: 0,
          isTrialExpired: true,
          purchasePlan: null,
        };
      }

      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      return {
        tier: "trial",
        isActive: true,
        trialDaysRemaining: days,
        trialHoursRemaining: hours,
        trialMinutesRemaining: minutes,
        isTrialExpired: false,
        purchasePlan: null,
      };
    } catch {
      // Invalid date
    }
  }

  // Default: free with no trial
  return {
    tier: "free",
    isActive: false,
    trialDaysRemaining: 0,
    trialHoursRemaining: 0,
    trialMinutesRemaining: 0,
    isTrialExpired: false,
    purchasePlan: null,
  };
};

// ============================================
// ACCESS CONTROL FUNCTIONS
// ============================================

/**
 * Check if user can access a given route
 */
export const canAccessRoute = (route: string, tierStatus: TierStatus): boolean => {
  if (tierStatus.isActive) return true;
  
  // Normalize route (remove trailing slashes, etc.)
  const normalizedRoute = route.replace(/\/$/, "") || "/app";
  
  return FREE_LIMITS.allowedRoutes.some((allowed) => 
    normalizedRoute === allowed || normalizedRoute.startsWith(allowed + "/")
  );
};

/**
 * Check if user can create more habits
 */
export const canCreateHabit = (currentCount: number, tierStatus: TierStatus): boolean => {
  if (tierStatus.isActive) return true;
  return currentCount < FREE_LIMITS.maxHabits;
};

/**
 * Check if user can create trackers
 */
export const canCreateTracker = (currentCount: number, tierStatus: TierStatus): boolean => {
  if (tierStatus.isActive) return true;
  return currentCount < FREE_LIMITS.maxTrackers;
};

/**
 * Get remaining habit slots
 */
export const getRemainingHabitSlots = (currentCount: number, tierStatus: TierStatus): number => {
  if (tierStatus.isActive) return Infinity;
  return Math.max(0, FREE_LIMITS.maxHabits - currentCount);
};

/**
 * Get remaining tracker slots
 */
export const getRemainingTrackerSlots = (currentCount: number, tierStatus: TierStatus): number => {
  if (tierStatus.isActive) return Infinity;
  return Math.max(0, FREE_LIMITS.maxTrackers - currentCount);
};

// ============================================
// UPSELL TRIGGERS
// ============================================
export type UpsellTrigger = 
  | "habit_limit"
  | "tracker_limit"
  | "route_blocked"
  | "trial_expiring"
  | "trial_expired"
  | "feature_locked";

export interface UpsellReason {
  trigger: UpsellTrigger;
  message: { en: string; pt: string };
  urgency: "low" | "medium" | "high";
}

export const getUpsellReason = (
  trigger: UpsellTrigger,
  tierStatus: TierStatus
): UpsellReason => {
  switch (trigger) {
    case "habit_limit":
      return {
        trigger,
        message: {
          en: `You've reached the ${FREE_LIMITS.maxHabits} habit limit on FREE. Upgrade to unlock unlimited habits.`,
          pt: `Atingiste o limite de ${FREE_LIMITS.maxHabits} hábitos no FREE. Atualiza para desbloquear hábitos ilimitados.`,
        },
        urgency: "medium",
      };

    case "tracker_limit":
      return {
        trigger,
        message: {
          en: "Trackers are a PRO feature. Upgrade to track any metric that matters.",
          pt: "Trackers são uma funcionalidade PRO. Atualiza para acompanhar qualquer métrica.",
        },
        urgency: "medium",
      };

    case "route_blocked":
      return {
        trigger,
        message: {
          en: "This feature is part of becoMe PRO. Upgrade to unlock full access.",
          pt: "Esta funcionalidade faz parte do becoMe PRO. Atualiza para desbloquear.",
        },
        urgency: "medium",
      };

    case "trial_expiring":
      return {
        trigger,
        message: {
          en: `Only ${tierStatus.trialDaysRemaining} day${tierStatus.trialDaysRemaining === 1 ? "" : "s"} left in your trial. Don't lose your progress.`,
          pt: `Faltam ${tierStatus.trialDaysRemaining} dia${tierStatus.trialDaysRemaining === 1 ? "" : "s"} no trial. Não percas o teu progresso.`,
        },
        urgency: tierStatus.trialDaysRemaining <= 1 ? "high" : "medium",
      };

    case "trial_expired":
      return {
        trigger,
        message: {
          en: "Your trial has ended. Upgrade to continue with full access, or use FREE with limits.",
          pt: "O teu trial terminou. Atualiza para continuar com acesso total, ou usa o FREE com limites.",
        },
        urgency: "high",
      };

    case "feature_locked":
    default:
      return {
        trigger,
        message: {
          en: "Unlock this feature with becoMe PRO.",
          pt: "Desbloqueia esta funcionalidade com o becoMe PRO.",
        },
        urgency: "low",
      };
  }
};

// ============================================
// TRIAL DISPLAY HELPERS
// ============================================
export const formatTrialRemaining = (tierStatus: TierStatus, locale: "en" | "pt" = "en"): string => {
  if (!tierStatus.isActive || tierStatus.tier !== "trial") return "";

  const { trialDaysRemaining, trialHoursRemaining } = tierStatus;

  if (trialDaysRemaining > 1) {
    return locale === "pt" 
      ? `${trialDaysRemaining} dias restantes`
      : `${trialDaysRemaining} days left`;
  }

  if (trialDaysRemaining === 1) {
    return locale === "pt" ? "1 dia restante" : "1 day left";
  }

  if (trialHoursRemaining > 0) {
    return locale === "pt" 
      ? `${trialHoursRemaining}h restantes`
      : `${trialHoursRemaining}h left`;
  }

  return locale === "pt" ? "Último dia" : "Last day";
};

/**
 * Should show trial warning (1-2 days left)
 */
export const shouldShowTrialWarning = (tierStatus: TierStatus): boolean => {
  return tierStatus.tier === "trial" && 
         tierStatus.isActive && 
         tierStatus.trialDaysRemaining <= 2;
};
