// Canonical business events — single source of truth for funnel + retention.
//
// Naming: snake_case, past-tense verbs (e.g. "checkout_completed").
// Each event has a stable, documented schema. Add new fields as optional only.
// Never rename a fired event; deprecate + create a new one instead.
//
// Routing: every canonical event dual-writes to:
//   1) PostHog + Supabase analytics_events (via lib/analytics.track)
//   2) Local retention log (via hooks/useAnalytics.track) so the in-app
//      retention dashboard keeps computing D1/D7 cohorts offline.

import { track as remoteTrack } from "@/lib/analytics";
import { track as localTrack, trackOnce as localTrackOnce, type AnalyticsEvent as LocalEvent } from "@/hooks/useAnalytics";

// -----------------------------------------------------------------------------
// Event catalog — keep alphabetised within sections.
// -----------------------------------------------------------------------------
export const CanonicalEvents = {
  // Auth funnel
  SignupStarted:        "signup_started",
  SignupCompleted:      "signup_completed",
  LoginCompleted:       "login_completed",
  // Onboarding
  OnboardingStarted:    "onboarding_started",
  OnboardingCompleted:  "onboarding_completed",
  // Activation
  HabitCreated:         "habit_created",
  HabitCompleted:       "habit_completed",
  MetricCreated:        "metric_created",
  // Monetisation
  TrialStarted:         "trial_started",
  PaywallViewed:        "paywall_viewed",
  CheckoutStarted:      "checkout_started",
  CheckoutCompleted:    "checkout_completed",
  SubscriptionActive:   "subscription_active",
  SubscriptionCancelled:"subscription_cancelled",
  // Retention
  Day1Return:           "day1_return",
  Day7Return:           "day7_return",
} as const;

export type CanonicalEventName = typeof CanonicalEvents[keyof typeof CanonicalEvents];

// -----------------------------------------------------------------------------
// Stable schemas — every payload is typed. Add fields only as optional.
// -----------------------------------------------------------------------------
export type AuthMethod = "email" | "google" | "apple";
export type HabitMode = "simple" | "metric";
export type BillingPlan = "monthly" | "annual" | "lifetime" | string;
export type CreationSource = "onboarding" | "manual" | "import" | "preset";

export interface EventSchemas {
  signup_started:         { method: AuthMethod };
  signup_completed:       { method: AuthMethod; userId?: string };
  login_completed:        { method: AuthMethod; userId?: string };

  onboarding_started:     { source?: string };
  onboarding_completed:   {
    identity?: string | null;
    obstacle?: string | null;
    focusCount?: number;
    habitsSeeded?: number;
    metricsSeeded?: number;
    locale?: string;
  };

  habit_created:          { habitId?: string; mode: HabitMode; source: CreationSource };
  habit_completed:        { habitId: string; isLate?: boolean };
  metric_created:         { habitId?: string; source: CreationSource; unit?: string };

  trial_started:          { plan?: BillingPlan; daysGranted?: number };
  paywall_viewed:         { trigger?: string | null; trialDaysLeft?: number | null };
  checkout_started:       { plan: BillingPlan; trigger?: string | null };
  checkout_completed:     { plan: BillingPlan; amountCents?: number; currency?: string };
  subscription_active:    { plan: BillingPlan; renewsAt?: string | null };
  subscription_cancelled: { plan?: BillingPlan; reason?: string | null; endsAt?: string | null };

  day1_return:            { dayOffset?: number };
  day7_return:            { dayOffset?: number };
}

// Some canonical names overlap with the local-only retention catalog. Map
// here so we don't fire a typed-name string the local logger doesn't know.
const LOCAL_EVENT_MIRROR: Partial<Record<CanonicalEventName, LocalEvent>> = {
  habit_created:        "habit_created",
  habit_completed:      "habit_completed",
  onboarding_completed: "onboarding_completed",
  paywall_viewed:       "paywall_view",
  trial_started:        "trial_start",
  day1_return:          "day1_return",
  day7_return:          "day7_return",
};

const LOCAL_ONCE_KEYS: Partial<Record<CanonicalEventName, string>> = {
  signup_completed:      "signup_completed",
  onboarding_completed:  "onboarding_completed_once",
  trial_started:         "trial_started_once",
  subscription_active:   "subscription_active_once",
};

/**
 * Fire a canonical event. Type-safe in payload via EventSchemas.
 * Dual-writes to remote analytics and the local retention log when a mirror
 * mapping exists.
 */
export function trackEvent<E extends CanonicalEventName>(
  event: E,
  props: EventSchemas[E] extends Record<string, never> ? void : EventSchemas[E],
): void {
  const payload = (props ?? {}) as Record<string, any>;
  // 1) Remote: PostHog + Supabase analytics_events
  void remoteTrack(event, payload);
  // 2) Local mirror for retention dashboard
  const local = LOCAL_EVENT_MIRROR[event];
  if (local) {
    const onceKey = LOCAL_ONCE_KEYS[event];
    if (onceKey) localTrackOnce(onceKey, local, payload);
    else localTrack(local, payload);
  }
}
