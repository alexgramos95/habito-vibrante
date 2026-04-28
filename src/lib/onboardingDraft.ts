/**
 * Onboarding draft persistence.
 *
 * The original implementation stored onboarding selections in a single
 * localStorage key (`become-onboarding-data`) that was wiped by the account
 * leak-prevention purge that runs on signup / login / account-switch. Result:
 * brand-new users completed onboarding, signed up, and landed on an empty
 * dashboard because their selections were purged before materialization could
 * read them.
 *
 * This module introduces a *purge-immune* draft mirror plus a "pending"
 * marker so materialization is:
 *   - safe to retry (idempotent — see name-based dedupe in materializer),
 *   - able to survive auth transitions (mirror lives outside ACCOUNT_SCOPED_KEYS),
 *   - able to track time_to_first_dashboard_ready.
 *
 * The keys used here are deliberately NOT listed in `sessionCleanup.ts`'s
 * ACCOUNT_SCOPED_KEYS / prefixes — they are pre-account state that belongs
 * to the device until materialized into an authenticated user account.
 */

export const ONBOARDING_DATA_KEY = "become-onboarding-data";
export const ONBOARDING_DRAFT_MIRROR_KEY = "become-onboarding-draft"; // purge-immune
export const ONBOARDING_DRAFT_TS_KEY = "become-onboarding-draft-ts"; // time-to-ready
export const ONBOARDING_MATERIALIZED_PREFIX = "become-onboarding-materialized-";
export const ONBOARDING_MATERIALIZING_PREFIX = "become-onboarding-materializing-";

export interface OnboardingDraft {
  improvementAreas?: string[];
  identityVectors?: string[];
  selectedPresets?: string[];
  identityChoice?: string;
  obstacle?: string;
  tagline?: string;
  habitsToCreate?: Array<Record<string, unknown>>;
  trackersToCreate?: Array<Record<string, unknown>>;
}

/**
 * Persist the onboarding selections in BOTH the legacy key (consumers like
 * JourneyHero still read it) and the purge-immune mirror. Also stamps the
 * completion time used for `time_to_first_dashboard_ready`.
 */
export const writeOnboardingDraft = (payload: OnboardingDraft): void => {
  try {
    const json = JSON.stringify(payload);
    localStorage.setItem(ONBOARDING_DATA_KEY, json);
    localStorage.setItem(ONBOARDING_DRAFT_MIRROR_KEY, json);
    if (!localStorage.getItem(ONBOARDING_DRAFT_TS_KEY)) {
      localStorage.setItem(ONBOARDING_DRAFT_TS_KEY, String(Date.now()));
    }
  } catch (err) {
    console.error("[ONBOARDING-DRAFT] Failed to write draft:", err);
  }
};

/**
 * Read the onboarding draft, preferring the legacy key when present and
 * falling back to the purge-immune mirror. The mirror lets us recover from
 * the session-cleanup purge that fires on signup.
 */
export const readOnboardingDraft = (): OnboardingDraft | null => {
  try {
    const primary = localStorage.getItem(ONBOARDING_DATA_KEY);
    if (primary) return JSON.parse(primary) as OnboardingDraft;
    const mirror = localStorage.getItem(ONBOARDING_DRAFT_MIRROR_KEY);
    if (mirror) {
      // Restore the legacy key so consumers (JourneyHero, Dashboard copy)
      // continue to work without further changes.
      localStorage.setItem(ONBOARDING_DATA_KEY, mirror);
      return JSON.parse(mirror) as OnboardingDraft;
    }
    return null;
  } catch (err) {
    console.error("[ONBOARDING-DRAFT] Failed to read draft:", err);
    return null;
  }
};

/**
 * Clear the draft AFTER successful materialization (and ideally cloud upload).
 * Both the legacy key and the purge-immune mirror are removed so the next
 * fresh signup on this device is not contaminated.
 */
export const clearOnboardingDraft = (): void => {
  try {
    localStorage.removeItem(ONBOARDING_DATA_KEY);
    localStorage.removeItem(ONBOARDING_DRAFT_MIRROR_KEY);
    localStorage.removeItem(ONBOARDING_DRAFT_TS_KEY);
  } catch {
    /* ignore */
  }
};

/**
 * Number of milliseconds between onboarding completion and "now". Used to
 * report `time_to_first_dashboard_ready`. Returns null if no timestamp.
 */
export const consumeOnboardingDraftAgeMs = (): number | null => {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_TS_KEY);
    if (!raw) return null;
    const ts = Number.parseInt(raw, 10);
    if (!Number.isFinite(ts)) return null;
    return Math.max(0, Date.now() - ts);
  } catch {
    return null;
  }
};

export const getMaterializedKey = (userId: string): string =>
  `${ONBOARDING_MATERIALIZED_PREFIX}${userId}`;

export const isMaterialized = (userId: string): boolean => {
  try {
    return localStorage.getItem(getMaterializedKey(userId)) === "true";
  } catch {
    return false;
  }
};

export const markMaterialized = (userId: string): void => {
  try {
    localStorage.setItem(getMaterializedKey(userId), "true");
  } catch {
    /* ignore */
  }
};

export const getMaterializingKey = (userId: string): string =>
  `${ONBOARDING_MATERIALIZING_PREFIX}${userId}`;

export const isMaterializing = (userId: string): boolean => {
  try {
    return localStorage.getItem(getMaterializingKey(userId)) === "true";
  } catch {
    return false;
  }
};

export const markMaterializing = (userId: string): void => {
  try {
    localStorage.setItem(getMaterializingKey(userId), "true");
  } catch {
    /* ignore */
  }
};

export const clearMaterializing = (userId: string): void => {
  try {
    localStorage.removeItem(getMaterializingKey(userId));
  } catch {
    /* ignore */
  }
};
