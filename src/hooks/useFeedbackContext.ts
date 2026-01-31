/**
 * Hook to gather rich context for Slack feedback
 * 
 * Collects: tier, route, trigger, habits count, device/browser, app version
 */

import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { computeTierStatus, type TierStatus } from "@/lib/entitlements";

// App version - update this on releases
export const APP_VERSION = "1.0.0";

export interface FeedbackContext {
  // User info
  userId: string | null;
  email: string | null;
  tier: "free" | "trial" | "pro";
  trialDaysRemaining: number;
  
  // App state
  route: string;
  habitCount: number;
  trackerCount: number;
  
  // Device info
  device: string;
  browser: string;
  platform: string;
  screenSize: string;
  
  // App info
  appVersion: string;
  locale: string;
}

export interface FeedbackPayload {
  // Required fields
  feedback_type: string;
  
  // Optional feedback fields
  willingness_to_pay?: string;
  what_would_make_pay?: string;
  what_prevents_pay?: string;
  how_become_helped?: string;
  additional_notes?: string;
  
  // Rich context
  context: FeedbackContext;
}

/**
 * Detect device type
 */
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
};

/**
 * Detect browser
 */
const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Opera/") || ua.includes("OPR/")) return "Opera";
  return "Unknown";
};

/**
 * Detect platform/OS
 */
const getPlatform = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Linux")) return "Linux";
  return "Unknown";
};

/**
 * Get screen size category
 */
const getScreenSize = (): string => {
  const width = window.innerWidth;
  if (width < 640) return "xs";
  if (width < 768) return "sm";
  if (width < 1024) return "md";
  if (width < 1280) return "lg";
  return "xl";
};

/**
 * Hook to gather feedback context
 */
export const useFeedbackContext = (): FeedbackContext => {
  const location = useLocation();
  const { user, subscriptionStatus } = useAuth();
  const { state } = useData();
  
  // Compute tier status
  const tierStatus: TierStatus = computeTierStatus({
    plan: subscriptionStatus.plan,
    planStatus: subscriptionStatus.planStatus,
    purchasePlan: subscriptionStatus.purchasePlan,
    trialEnd: subscriptionStatus.trialEnd,
    trialStart: subscriptionStatus.trialStart,
    subscribed: subscriptionStatus.subscribed,
  });
  
  // Get locale from document
  const locale = document.documentElement.lang || "en";
  
  const habitCount = state.habits?.length || 0;
  const trackerCount = state.trackers?.length || 0;
  
  return {
    userId: user?.id || null,
    email: user?.email || null,
    tier: tierStatus.tier,
    trialDaysRemaining: tierStatus.trialDaysRemaining,
    
    route: location.pathname,
    habitCount,
    trackerCount,
    
    device: getDeviceType(),
    browser: getBrowser(),
    platform: getPlatform(),
    screenSize: getScreenSize(),
    
    appVersion: APP_VERSION,
    locale,
  };
};

/**
 * Format context for Slack message
 */
export const formatContextForSlack = (context: FeedbackContext): string => {
  const lines = [
    `*Tier:* ${context.tier.toUpperCase()}${context.trialDaysRemaining > 0 ? ` (${context.trialDaysRemaining}d left)` : ""}`,
    `*Route:* ${context.route}`,
    `*Habits/Trackers:* ${context.habitCount}/${context.trackerCount}`,
    `*Device:* ${context.device} • ${context.browser} • ${context.platform} • ${context.screenSize}`,
    `*Version:* v${context.appVersion}`,
  ];
  return lines.join("\n");
};

/**
 * Get feedback tag based on trigger/type
 */
export const getFeedbackTag = (type: string): string => {
  const typeMap: Record<string, string> = {
    bug: "[BUG]",
    idea: "[IDEIA]",
    friction: "[FRICÇÃO]",
    trial_expiry: "[TRIAL]",
    trial_ended: "[TRIAL]",
    gating: "[GATING]",
    paywall: "[PAYWALL]",
    general: "[FEEDBACK]",
  };
  return typeMap[type] || "[FEEDBACK]";
};
