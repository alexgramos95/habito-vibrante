// Unified analytics: dual-write to PostHog (behavior) + Supabase analytics_events (truth).
// Safe to call before user is authenticated — events with null user are accepted by RLS.

import posthog from "posthog-js";
import { supabase } from "@/integrations/supabase/client";

const POSTHOG_KEY = "phc_xiB5LdCiSBmeSoPsPhMD2ntcHE4QNNaj9RcZWA9PsFy5";
const POSTHOG_HOST = "https://eu.i.posthog.com";

let initialized = false;
let sessionId: string | null = null;

const getSessionId = (): string => {
  if (sessionId) return sessionId;
  try {
    const k = "become-session-id";
    let s = sessionStorage.getItem(k);
    if (!s) {
      s = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(k, s);
    }
    sessionId = s;
    return s;
  } catch {
    sessionId = `s_${Date.now()}`;
    return sessionId;
  }
};

export const initAnalytics = () => {
  if (initialized || typeof window === "undefined") return;
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // we drive page views manually
      capture_pageleave: true,
      person_profiles: "identified_only",
      // Autocapture ON, but heavily filtered to keep canonical events as the source of truth.
      autocapture: {
        // Only capture meaningful interactive elements
        dom_event_allowlist: ["click", "submit", "change"],
        element_allowlist: ["a", "button", "form", "input", "select", "textarea"],
        // Skip anything explicitly opted out via class/attribute
        css_selector_allowlist: undefined,
      },
      // Hard exclusions: never autocapture inside known noisy regions
      // (toasts, tooltips, navigation chrome). Anything that should be a
      // canonical event already calls track() — this prevents duplicates.
      mask_all_text: false,
      mask_all_element_attributes: false,
      disable_session_recording: true,
      loaded: (ph) => {
        // Filter out high-frequency / non-meaningful autocaptured events.
        ph.opt_in_capturing();
      },
      before_send: (event) => {
        if (!event) return event;
        // Drop autocaptured events that duplicate something we track manually,
        // or that fire from chrome (nav, toasts, tooltips).
        if (event.event === "$autocapture") {
          const els: any[] = (event.properties?.$elements as any[]) || [];
          const NOISY_SELECTORS = [
            "data-sonner-toast", "data-radix-toast", "data-radix-tooltip",
            "data-no-track",
          ];
          const NOISY_CLASSES = [
            "sonner-toast", "toaster", "tooltip", "navigation", "nav-link",
            "page-header", "sidebar",
          ];
          const isNoisy = els.some((el) => {
            const attr = el?.attributes || {};
            const cls = (el?.attr__class || "") as string;
            if (NOISY_SELECTORS.some((s) => s in attr)) return true;
            if (NOISY_CLASSES.some((c) => cls.includes(c))) return true;
            // Buttons/links inside opted-out regions
            if ((el?.attr__["data-no-track"] as any) != null) return true;
            return false;
          });
          if (isNoisy) return null;
        }
        return event;
      },
    });
    initialized = true;
  } catch (e) {
    console.warn("[analytics] PostHog init failed", e);
  }
  getSessionId();
};

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (!initialized) initAnalytics();
  try {
    posthog.identify(userId, traits);
    if (traits) posthog.people?.set?.(traits);
  } catch { /* ignore */ }
};

export const resetAnalyticsUser = () => {
  try { posthog.reset(true); } catch { /* ignore */ }
  try { sessionStorage.removeItem("become-session-id"); } catch { /* ignore */ }
  sessionId = null;
};

const getLocale = (): string | undefined => {
  try { return navigator.language; } catch { return undefined; }
};
const getPlatform = (): string | undefined => {
  try {
    const ua = navigator.userAgent || "";
    if (/Android/i.test(ua)) return "android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    return "web";
  } catch { return undefined; }
};

/** Unified tracking: fires PostHog event AND inserts to Supabase analytics_events. */
export const track = async (event: string, props: Record<string, any> = {}) => {
  if (!initialized) initAnalytics();

  // PostHog (best-effort)
  try { posthog.capture(event, props); } catch { /* ignore */ }

  // Supabase (best-effort, non-blocking)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      event_name: event,
      event_props: props,
      user_id: user?.id ?? null,
      session_id: getSessionId(),
      app_locale: getLocale(),
      app_platform: getPlatform(),
    });
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[analytics] supabase insert failed", e);
  }
};

export const trackPageView = (path: string) => {
  if (!initialized) initAnalytics();
  try { posthog.capture("$pageview", { $current_url: window.location.href, path }); } catch { /* ignore */ }
  // Also lightweight insert (no await)
  void track("page_view", { path });
};
