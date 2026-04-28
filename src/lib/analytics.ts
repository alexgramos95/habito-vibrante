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
      capture_pageview: false, // we drive this manually
      capture_pageleave: true,
      person_profiles: "identified_only",
      autocapture: false,
      disable_session_recording: true,
    });
    initialized = true;
  } catch (e) {
    console.warn("[analytics] PostHog init failed", e);
  }
  getSessionId();
};

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (!initialized) initAnalytics();
  try { posthog.identify(userId, traits); } catch { /* ignore */ }
};

export const resetAnalyticsUser = () => {
  try { posthog.reset(); } catch { /* ignore */ }
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
