/**
 * Account-data leak prevention.
 *
 * The app historically used a single global `localStorage` key (`become-app-data`)
 * shared across ALL users on the same browser. When user A signed out and user B
 * signed up / signed in on the same device, B inherited A's habits, logs,
 * gamification, onboarding state, etc.
 *
 * This module is the single source of truth for purging *every* piece of
 * account-scoped local state on auth transitions (signup, login, logout,
 * account switch). Locale / currency / theme / "remember me" preferences
 * are intentionally preserved — they are device preferences, not account data.
 */

import { clearAllData } from "@/data/storage";

/** Keys that belong to the *device*, not the *account*. Never wipe these. */
const DEVICE_PREFERENCE_KEYS = new Set<string>([
  "become-locale",
  "become-currency",
  "become-theme",
  "become-session-persist",
  "become-pwa-reset",
  "become-chronotype", // user device-level chronotype hint, kept across login on same device
  // Onboarding draft mirror + timestamp: pre-account state captured BEFORE
  // signup. Must survive auth transitions so materialization can read it on
  // the first SIGNED_IN. Cleared explicitly by clearOnboardingDraft() after
  // successful materialization + cloud upload.
  "become-onboarding-draft",
  "become-onboarding-draft-ts",
]);

/** Explicit account-scoped keys we know about. Wiped on every auth transition. */
const ACCOUNT_SCOPED_KEYS: string[] = [
  // Onboarding
  "become-onboarding-data",
  "become-onboarding-complete",
  "itero-onboarding-complete",
  "become-onboarding-state",
  "become-first-session",
  "become-journey-start",
  "become-login-triggered",
  // Referral / acquisition / AB testing — these describe *this user*'s funnel
  "become-referral-code",
  "become-referral-pending",
  "become-referral-redeemed",
  "become-referral-sent",
  "become-referral-claimed",
  "become-referral-prompt-seen",
  "become-acquisition-source",
  "become-acquisition-meta",
  "become-acquisition-captured",
  // Analytics local log + dedupe map
  "become-analytics-log",
  "become-analytics-fired",
  // Local "anonymous" id used by Insights — must rotate per account
  "become-local-user-id",
  // Demo mode
  "become-demo-mode",
  "itero-state",
  "itero-state-backup",
  // Habit feedback toggle (account-flavoured)
  "become-habit-feedback-enabled",
];

/** Prefix patterns for account-scoped keys we may not know the exact name of. */
const ACCOUNT_SCOPED_PREFIXES: string[] = [
  "become-onboarding-materialized-", // per-user materialization flag
  "become-ab-",                       // any A/B test assignment / promoted variant
  "become:ab:",
];

const isAccountScoped = (key: string): boolean => {
  if (DEVICE_PREFERENCE_KEYS.has(key)) return false;
  if (ACCOUNT_SCOPED_KEYS.includes(key)) return true;
  return ACCOUNT_SCOPED_PREFIXES.some((p) => key.startsWith(p));
};

/**
 * Purge every account-scoped piece of local state. Safe to call on logout,
 * login, signup, or detected account switch.
 *
 * Preserves Supabase auth tokens (caller decides whether to also sign out)
 * and device preferences (locale, currency, theme).
 */
export const purgeAccountData = (reason: string): void => {
  try {
    console.log(`[SESSION-CLEANUP] Purging account data (reason: ${reason})`);

    // 1. Wipe the main app blob + nutrition keys via the existing helper.
    clearAllData();

    // 2. Wipe known explicit account keys.
    ACCOUNT_SCOPED_KEYS.forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    });

    // 3. Wipe any prefix-matched account keys.
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && isAccountScoped(k)) toRemove.push(k);
    }
    toRemove.forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    });

    // 4. Always wipe sessionStorage entirely — it should never survive an
    //    auth transition; nothing in there is a device preference.
    try { sessionStorage.clear(); } catch { /* ignore */ }

    // 5. Notify any module holding in-memory copies (Nutrition page, etc.)
    //    so they drop state before re-saving.
    try {
      window.dispatchEvent(new CustomEvent("become:app-reset"));
    } catch { /* ignore */ }
  } catch (err) {
    console.error("[SESSION-CLEANUP] Failed to purge account data:", err);
  }
};

/**
 * Track the last authenticated user id seen by the app. If the id changes
 * (account switch on the same browser), purge all account-scoped data BEFORE
 * the new user's data loads. Returns true if a switch was detected.
 */
const LAST_UID_KEY = "become-last-auth-uid";

export const detectAccountSwitchAndPurge = (currentUserId: string | null): boolean => {
  let previous: string | null = null;
  try { previous = localStorage.getItem(LAST_UID_KEY); } catch { /* ignore */ }

  // No user → just remember and exit. Logout flow handles its own purge.
  if (!currentUserId) {
    try { localStorage.removeItem(LAST_UID_KEY); } catch { /* ignore */ }
    return false;
  }

  // Different non-null id than before → purge.
  if (previous && previous !== currentUserId) {
    purgeAccountData(`account-switch:${previous.slice(0, 6)}->${currentUserId.slice(0, 6)}`);
    try { localStorage.setItem(LAST_UID_KEY, currentUserId); } catch { /* ignore */ }
    return true;
  }

  // First time seeing this id on this browser → no purge needed (fresh login),
  // but record it so future switches are detected.
  if (!previous) {
    try { localStorage.setItem(LAST_UID_KEY, currentUserId); } catch { /* ignore */ }
  }
  return false;
};
