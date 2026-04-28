// Analytics tracking — local-first event log with retention helpers.
// Events are persisted to localStorage so the in-app retention dashboard
// can compute D1/D3/D7 cohorts without any backend dependency.

export type AnalyticsEvent =
  // Legacy / existing
  | 'onboarding_complete'
  | 'habit_created'
  | 'tracker_used'
  | 'calendar_open'
  | 'paywall_view'
  | 'upgrade_click'
  | 'trial_start'
  | 'trial_end'
  | 'screenshots_mode'
  | 'export_attempt'
  | 'page_view'
  | 'habit_completed'
  | 'tracker_entry'
  | 'shopping_item_added'
  | 'reflection_saved'
  | 'future_self_saved'
  // Retention / activation funnel (new)
  | 'onboarding_completed'
  | 'first_habit_created'
  | 'first_habit_completed'
  | 'day1_return'
  | 'day3_return'
  | 'day7_return'
  | 'journeyhero_cta_clicked'
  | 'weekly_recap_seen'
  | 'weekly_recap_cta_clicked'
  | 'app_open'
  // Referral / viral loops
  | 'referral_prompt_shown'
  | 'referral_prompt_dismissed'
  | 'referral_invite_sent'
  | 'referral_link_copied'
  | 'referral_link_visited'
  | 'referral_redeemed'
  | 'share_card_opened'
  | 'share_card_shared'
  | 'share_card_downloaded'
  // Onboarding materialization
  | 'onboarding_materialized_success'
  | 'onboarding_materialized_failed'
  | 'time_to_first_dashboard_ready';

interface AnalyticsPayload {
  event: AnalyticsEvent;
  properties?: Record<string, any>;
  timestamp: string; // ISO
}

const DEBUG = import.meta.env.DEV;
const LOG_KEY = 'become-analytics-log';
const FIRED_KEY = 'become-analytics-fired'; // one-shot dedupe (e.g. first_habit_created)
const MAX_EVENTS = 2000;

// ---------- persistence ----------
const readLog = (): AnalyticsPayload[] => {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLog = (events: AnalyticsPayload[]) => {
  try {
    const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
    localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota */
  }
};

const readFired = (): Record<string, true> => {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeFired = (m: Record<string, true>) => {
  try { localStorage.setItem(FIRED_KEY, JSON.stringify(m)); } catch { /* ignore */ }
};

// ---------- core API ----------
const readSource = (): string | undefined => {
  try { return localStorage.getItem('become-acquisition-source') || undefined; } catch { return undefined; }
};

export const track = (event: AnalyticsEvent, properties?: Record<string, any>) => {
  const source = readSource();
  const enriched = source ? { source, ...(properties || {}) } : properties;
  const payload: AnalyticsPayload = {
    event,
    properties: enriched,
    timestamp: new Date().toISOString(),
  };
  const log = readLog();
  log.push(payload);
  writeLog(log);

  if (DEBUG) console.log('[Analytics]', event, enriched || '');

  // Optional GTM passthrough if dataLayer exists
  try {
    const w = window as any;
    if (w.dataLayer && Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event, ...(enriched || {}), ts: payload.timestamp });
    }
  } catch { /* ignore */ }
};

/** Fires `event` only the first time (per browser). Returns true if it actually fired. */
export const trackOnce = (key: string, event: AnalyticsEvent, properties?: Record<string, any>): boolean => {
  const fired = readFired();
  if (fired[key]) return false;
  fired[key] = true;
  writeFired(fired);
  track(event, properties);
  return true;
};

export const identify = (userId: string, traits?: Record<string, any>) => {
  if (DEBUG) console.log('[Analytics] Identify:', userId, traits);
};

export const page = (name: string, properties?: Record<string, any>) => {
  track('page_view', { page: name, ...properties });
};

// ---------- retention helpers ----------
const JOURNEY_KEY = 'become-journey-start';

const dayDiff = (a: Date, b: Date) => {
  const d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((d1 - d2) / 86_400_000);
};

/** Call on every app open: emits day1_return / day3_return / day7_return once each. */
export const checkReturnEvents = () => {
  try {
    const start = localStorage.getItem(JOURNEY_KEY);
    if (!start) return;
    const startDate = new Date(start);
    if (isNaN(startDate.getTime())) return;
    const diff = dayDiff(new Date(), startDate);
    if (diff >= 1) trackOnce('ret_d1', 'day1_return', { dayOffset: diff });
    if (diff >= 3) trackOnce('ret_d3', 'day3_return', { dayOffset: diff });
    if (diff >= 7) trackOnce('ret_d7', 'day7_return', { dayOffset: diff });
  } catch { /* ignore */ }
};

// ---------- dashboard data ----------
export interface RetentionMetrics {
  totalEvents: number;
  journeyStart: string | null;
  daysSinceStart: number | null;
  d1Returned: boolean;
  d3Returned: boolean;
  d7Returned: boolean;
  d1Rate: number; // 0..1 (single user → 0 or 1; aggregated locally still useful)
  d3Rate: number;
  d7Rate: number;
  habitsCompletedFirstWeek: number;
  avgHabitsPerDayFirstWeek: number;
  longestStreakFirstWeek: number;
  ctaImpressions: number;
  ctaClicks: number;
  ctaCTR: number;
  recapSeen: number;
  recapClicks: number;
  recapCTR: number;
  firstHabitCreatedAt: string | null;
  firstHabitCompletedAt: string | null;
  onboardingCompletedAt: string | null;
}

export const getRetentionMetrics = (): RetentionMetrics => {
  const log = readLog();
  const journeyStart = (() => {
    try { return localStorage.getItem(JOURNEY_KEY); } catch { return null; }
  })();
  const startDate = journeyStart ? new Date(journeyStart) : null;
  const daysSinceStart = startDate && !isNaN(startDate.getTime())
    ? dayDiff(new Date(), startDate)
    : null;

  const has = (e: AnalyticsEvent) => log.some(l => l.event === e);
  const firstOf = (e: AnalyticsEvent) => log.find(l => l.event === e)?.timestamp || null;
  const countOf = (e: AnalyticsEvent) => log.filter(l => l.event === e).length;

  // Habit completions in first 7 calendar days
  const firstWeekCompletions = startDate
    ? log.filter(l => {
        if (l.event !== 'habit_completed' && l.event !== 'first_habit_completed') return false;
        const t = new Date(l.timestamp);
        const d = dayDiff(t, startDate);
        return d >= 0 && d < 7;
      })
    : [];
  const habitsCompletedFirstWeek = firstWeekCompletions.length;
  const avgHabitsPerDayFirstWeek = startDate
    ? +(habitsCompletedFirstWeek / Math.min(7, Math.max(1, (daysSinceStart ?? 0) + 1))).toFixed(2)
    : 0;

  // Longest streak in first week (consecutive days with ≥1 completion)
  let longestStreakFirstWeek = 0;
  if (startDate) {
    const daysWithCompletion = new Set(
      firstWeekCompletions.map(l => {
        const d = new Date(l.timestamp);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      })
    );
    let cur = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      if (daysWithCompletion.has(key)) {
        cur += 1;
        if (cur > longestStreakFirstWeek) longestStreakFirstWeek = cur;
      } else cur = 0;
    }
  }

  const ctaImpressions = countOf('app_open'); // proxy: hero shown on every dashboard open
  const ctaClicks = countOf('journeyhero_cta_clicked');
  const recapSeen = countOf('weekly_recap_seen');
  const recapClicks = countOf('weekly_recap_cta_clicked');

  const d1 = has('day1_return');
  const d3 = has('day3_return');
  const d7 = has('day7_return');

  return {
    totalEvents: log.length,
    journeyStart,
    daysSinceStart,
    d1Returned: d1,
    d3Returned: d3,
    d7Returned: d7,
    d1Rate: daysSinceStart !== null && daysSinceStart >= 1 ? (d1 ? 1 : 0) : 0,
    d3Rate: daysSinceStart !== null && daysSinceStart >= 3 ? (d3 ? 1 : 0) : 0,
    d7Rate: daysSinceStart !== null && daysSinceStart >= 7 ? (d7 ? 1 : 0) : 0,
    habitsCompletedFirstWeek,
    avgHabitsPerDayFirstWeek,
    longestStreakFirstWeek,
    ctaImpressions,
    ctaClicks,
    ctaCTR: ctaImpressions > 0 ? +(ctaClicks / ctaImpressions).toFixed(3) : 0,
    recapSeen,
    recapClicks,
    recapCTR: recapSeen > 0 ? +(recapClicks / recapSeen).toFixed(3) : 0,
    firstHabitCreatedAt: firstOf('first_habit_created'),
    firstHabitCompletedAt: firstOf('first_habit_completed'),
    onboardingCompletedAt: firstOf('onboarding_completed'),
  };
};

export const getEventLog = (): AnalyticsPayload[] => readLog();
export const clearAnalyticsLog = () => {
  try {
    localStorage.removeItem(LOG_KEY);
    localStorage.removeItem(FIRED_KEY);
  } catch { /* ignore */ }
};

// ---------- legacy stubs kept for back-compat ----------
export const trialEvents = {
  start: () => track('trial_start'),
  day2: () => track('trial_end', { day: 2, type: 'reminder' }),
  day4: () => track('trial_end', { day: 4, type: 'reminder' }),
  day6: () => track('trial_end', { day: 6, type: 'urgency' }),
  end: () => track('trial_end'),
  upgradeNudge: () => track('upgrade_click', { source: 'nudge' }),
  bounceback: () => track('upgrade_click', { source: 'bounceback' }),
};

export const funnelCopy = {
  trial_start: { subject: "Your 2-day trial starts now", body: "Track habits. See savings. Become who you're aiming to be." },
  day2: { subject: "Day 2: Consistency builds momentum", body: "Check in today. Your streak depends on it." },
  day4: { subject: "Day 4: You're building something", body: "Halfway through. Don't stop now." },
  day6: { subject: "Day 6: One day left", body: "Your trial ends tomorrow. Lock in your progress." },
  trial_end: { subject: "Trial ended. Stay consistent.", body: "Upgrade now to keep your data and continue tracking." },
  upgrade_nudge: { subject: "Don't break your streak", body: "Consistency compounds. Upgrade to Pro." },
  bounceback: { subject: "Come back stronger", body: "Your habits are waiting. Resume your journey." },
};

export const useAnalytics = () => ({
  track,
  trackOnce,
  identify,
  page,
  trialEvents,
  checkReturnEvents,
  getRetentionMetrics,
});
