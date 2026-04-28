/**
 * Lifecycle state derivation based on REAL account activity,
 * not browser-local "day counters".
 *
 * Inputs (all optional/best-effort):
 *  - accountCreatedAt: from auth.users (Supabase) — survives device changes
 *  - dailyLogs:        historical habit completions (cloud-synced for PRO)
 *  - habits:           created habits with createdAt timestamps
 *
 * Output: a discrete lifecycle state used for dashboard messaging.
 */
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { AppState } from "@/data/types";

export type LifecycleState =
  | "new"           // 0–1 days since onboarding AND no meaningful activity
  | "early"         // 2–7 days, low history
  | "active"        // 7+ days OR repeated usage OR historical completions
  | "reengaged";    // inactive >7 days then returned

export interface LifecycleSignals {
  state: LifecycleState;
  daysSinceAccount: number;     // days since account_created_at
  daysSinceLastActivity: number; // days since last completed log (Infinity if never)
  totalCompletions: number;
  hasMeaningfulActivity: boolean;
}

const safeParse = (iso?: string | null): Date | null => {
  if (!iso) return null;
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

export const deriveLifecycle = (
  state: Pick<AppState, "habits" | "dailyLogs">,
  accountCreatedAt?: string | null,
): LifecycleSignals => {
  const now = new Date();

  // --- Account age (truthful: from auth, falls back to first habit/log) ---
  const accountDate =
    safeParse(accountCreatedAt) ||
    safeParse((state.habits[0] as any)?.createdAt) ||
    safeParse(state.dailyLogs[0]?.date) ||
    now;
  const daysSinceAccount = Math.max(0, differenceInCalendarDays(now, accountDate));

  // --- Historical completions (real activity) ---
  const completedLogs = state.dailyLogs.filter(l => l.done);
  const totalCompletions = completedLogs.length;

  // --- Last activity ---
  let lastActivityDate: Date | null = null;
  for (const l of completedLogs) {
    const d = safeParse(l.date);
    if (d && (!lastActivityDate || d > lastActivityDate)) lastActivityDate = d;
  }
  const daysSinceLastActivity = lastActivityDate
    ? Math.max(0, differenceInCalendarDays(now, lastActivityDate))
    : Number.POSITIVE_INFINITY;

  // --- Meaningful activity threshold ---
  // At least 1 completed habit ever = meaningful (avoids Day-1 copy on returners)
  const hasMeaningfulActivity = totalCompletions >= 1;

  // --- State machine ---
  let lifecycle: LifecycleState;
  if (
    daysSinceAccount >= 7 &&
    daysSinceLastActivity > 7 &&
    hasMeaningfulActivity
  ) {
    lifecycle = "reengaged";
  } else if (
    hasMeaningfulActivity ||
    daysSinceAccount >= 7 ||
    totalCompletions >= 3
  ) {
    lifecycle = "active";
  } else if (daysSinceAccount >= 2) {
    lifecycle = "early";
  } else {
    lifecycle = "new";
  }

  return {
    state: lifecycle,
    daysSinceAccount,
    daysSinceLastActivity: Number.isFinite(daysSinceLastActivity)
      ? (daysSinceLastActivity as number)
      : -1,
    totalCompletions,
    hasMeaningfulActivity,
  };
};
