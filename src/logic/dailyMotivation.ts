import { MOTIVATION_CARDS, type MotivationCard, type MotivationCategory } from "@/data/motivationCards";

interface MotivationContext {
  /** Number of habits scheduled for today (simple + metric). */
  totalTracked: number;
  /** Number of habits completed/on-track today. */
  totalDone: number;
  /** Current consecutive-days streak. */
  streak: number;
  /** Whether yesterday's scheduled habits were ALL skipped (true → comeback context). */
  brokeYesterday?: boolean;
  /** Date string YYYY-MM-DD used as a stable seed. */
  dateKey: string;
  /** Current hour 0-23 for time-of-day context. */
  hour: number;
}

/**
 * Picks the highest-priority category for the current context.
 * Order matters: more specific contexts win.
 */
const pickCategory = (ctx: MotivationContext): MotivationCategory => {
  const { totalTracked, totalDone, streak, brokeYesterday, hour } = ctx;
  const progress = totalTracked > 0 ? totalDone / totalTracked : 0;

  // No habits scheduled today → rest day
  if (totalTracked === 0) return "rest";

  // Comeback after a broken day takes priority early in the day
  if (brokeYesterday && progress < 0.5 && hour < 18) return "comeback";

  // Day complete
  if (progress >= 1) return "complete";

  // Late evening with progress under 100%
  if (hour >= 21) return "evening";

  // Near finish
  if (progress >= 0.75) return "near_finish";

  // Streak signals during normal day
  if (progress < 0.25) {
    if (streak >= 14) return "streak_high";
    if (streak >= 3) return "streak_mid";
    if (streak <= 1) return hour < 11 ? "start" : "early";
    return "streak_low";
  }

  // Mid-day momentum
  return "momentum";
};

/**
 * Deterministic hash from date (so the same card persists for the day).
 */
const hashDate = (key: string): number => {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

/**
 * Returns the motivation card to show today, given the current context.
 * The card is deterministic per (date + category) so it stays stable
 * unless the user crosses a state boundary (e.g. completes all habits).
 */
export const getDailyMotivation = (ctx: MotivationContext): MotivationCard => {
  const category = pickCategory(ctx);
  const pool = MOTIVATION_CARDS.filter(c => c.category === category);
  const fallback = MOTIVATION_CARDS.filter(c => c.category === "general");
  const list = pool.length > 0 ? pool : fallback;
  const idx = hashDate(`${ctx.dateKey}-${category}`) % list.length;
  return list[idx];
};
