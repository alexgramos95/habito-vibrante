import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { initAnalytics, identifyUser, resetAnalyticsUser, trackPageView } from "@/lib/analytics";
import { trackEvent } from "@/lib/canonicalEvents";

/**
 * Auto-tracks page views, binds PostHog identity to the auth user, and emits
 * canonical subscription/trial transitions exactly once per change.
 */
export const AnalyticsBridge = () => {
  const location = useLocation();
  const { user, subscriptionStatus } = useAuth();

  // Track previous subscription state to detect transitions
  const prevPlanRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => { initAnalytics(); }, []);

  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, { email: user.email });
    } else {
      resetAnalyticsUser();
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  // Subscription / trial transitions → canonical events
  useEffect(() => {
    if (!user?.id) {
      prevPlanRef.current = null;
      prevStatusRef.current = null;
      return;
    }
    const { plan, planStatus, purchasePlan, subscriptionEnd } = subscriptionStatus;
    const prevPlan = prevPlanRef.current;
    const prevStatus = prevStatusRef.current;

    // free/null → trial
    if (plan === "trial" && prevPlan !== "trial") {
      trackEvent("trial_started", { plan: purchasePlan ?? "trial" });
    }
    // any → pro (active subscription)
    if (plan === "pro" && prevPlan !== "pro") {
      trackEvent("subscription_active", {
        plan: purchasePlan ?? "pro",
        renewsAt: subscriptionEnd ?? null,
      });
      // First time we observe a pro plan after a non-pro state we treat as
      // checkout completion (client-side mirror; server-side truth lives in
      // revenue_events via the Stripe webhook).
      if (prevPlan && prevPlan !== "pro") {
        trackEvent("checkout_completed", { plan: purchasePlan ?? "pro" });
      }
    }
    // pro → free/trial = cancellation
    if (prevPlan === "pro" && plan !== "pro") {
      trackEvent("subscription_cancelled", {
        plan: purchasePlan ?? undefined,
        endsAt: subscriptionEnd ?? null,
        reason: planStatus,
      });
    }

    prevPlanRef.current = plan;
    prevStatusRef.current = planStatus;
  }, [user?.id, subscriptionStatus]);

  return null;
};
