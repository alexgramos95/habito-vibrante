import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, BarChart3, Flame, Target, MousePointerClick, Trash2, Download,
  AlertTriangle, AlertOctagon, CheckCircle2, Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getRetentionMetrics,
  getEventLog,
  clearAnalyticsLog,
  type RetentionMetrics,
} from "@/hooks/useAnalytics";
import {
  computeVariantStats,
  REFERRAL_HEADLINE_TEST, REFERRAL_HEADLINE_NAME, REFERRAL_HEADLINE_VARIANTS,
  SHARE_HEADLINE_TEST, SHARE_HEADLINE_NAME, SHARE_HEADLINE_VARIANTS,
  CONFIDENCE_LABEL, getHistory, maybeAutoPromote, getPromotedVariant,
  SUGGESTED_TESTS,
  type VariantStats, type Confidence, type HistoryEntry,
} from "@/lib/abTest";
import { Trophy, History, FlaskConical, Zap } from "lucide-react";
import {
  getAcquisitionMeta, SOURCE_LABEL, type AcquisitionSource,
} from "@/lib/acquisition";

/* =============================================================
   RETENTION INSIGHTS — local-first analytics dashboard
   D1 / D3 / D7 retention, first-week behaviour, CTA CTR.
   No backend required — reads from the persistent event log.
   ============================================================= */

const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");

// Day-bucket helper for trends
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

interface DayPoint { day: string; label: string; value: number }

/** Buckets events into the last 7 days. `reducer` defines what to count. */
const trend7 = (
  log: { event: string; timestamp: string; properties?: any }[],
  predicate: (e: { event: string; properties?: any }) => boolean,
): DayPoint[] => {
  const today = new Date();
  const buckets: DayPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.push({
      day: dayKey(d),
      label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
      value: 0,
    });
  }
  const idx = new Map(buckets.map((b, i) => [b.day, i]));
  for (const e of log) {
    if (!predicate(e)) continue;
    const k = dayKey(new Date(e.timestamp));
    const i = idx.get(k);
    if (i !== undefined) buckets[i].value += 1;
  }
  return buckets;
};

// Alert engine
type AlertLevel = "critical" | "warning" | "success";
interface Alert { level: AlertLevel; title: string; detail: string }

const computeAlerts = (m: RetentionMetrics): Alert[] => {
  const alerts: Alert[] = [];
  const days = m.daysSinceStart ?? 0;

  // D1 retention
  if (days >= 1 && m.d1Rate < 0.30) {
    alerts.push({
      level: "critical",
      title: "Day 1 retention weak",
      detail: `Only ${fmtPct(m.d1Rate)} returned on day 1. Strengthen the day-0 → day-1 hook.`,
    });
  }

  // First-win conversion: completed / created
  const firstWinRate = m.firstHabitCreatedAt
    ? (m.firstHabitCompletedAt ? 1 : 0)
    : 0;
  // Use proxy: if a habit was created but no first completion logged, that's friction.
  if (m.firstHabitCreatedAt && !m.firstHabitCompletedAt) {
    alerts.push({
      level: "warning",
      title: "First win friction too high",
      detail: "User created a habit but hasn't completed one yet. Reduce taps to first check-in.",
    });
  } else if (firstWinRate < 0.5 && m.firstHabitCreatedAt) {
    alerts.push({
      level: "warning",
      title: "First win friction too high",
      detail: `First-completion rate looks low.`,
    });
  }

  // CTA CTR
  if (m.ctaImpressions >= 3 && m.ctaCTR < 0.40) {
    alerts.push({
      level: "warning",
      title: "Dashboard CTA weak",
      detail: `Journey hero CTR is ${fmtPct(m.ctaCTR)}. Test sharper copy or a clearer single action.`,
    });
  }

  // D7 success
  if (days >= 7 && m.d7Rate > 0.20) {
    alerts.push({
      level: "success",
      title: "Strong habit signals",
      detail: `${fmtPct(m.d7Rate)} D7 retention — early product-market fit signal.`,
    });
  }

  return alerts;
};

interface Recommendation { title: string; rationale: string }

const computeRecommendations = (m: RetentionMetrics, completionsTrend: DayPoint[]): Recommendation[] => {
  const recs: Recommendation[] = [];
  const days = m.daysSinceStart ?? 0;

  if (m.ctaImpressions >= 3 && m.ctaCTR < 0.40) {
    recs.push({
      title: "Sharpen the Journey CTA",
      rationale: `CTR is ${fmtPct(m.ctaCTR)} across ${m.ctaImpressions} impressions. Test outcome-led copy ("Start your first action") and remove competing buttons above the fold.`,
    });
  }
  if (days >= 1 && m.d1Rate < 0.30) {
    recs.push({
      title: "Strengthen the day-1 return loop",
      rationale: "Send a single, specific push at the user's chosen time. Lead with their habit name, not the brand.",
    });
  }
  if (m.firstHabitCreatedAt && !m.firstHabitCompletedAt) {
    recs.push({
      title: "Reduce friction to first completion",
      rationale: "Auto-scroll to the first habit immediately after onboarding and pre-expand its check-in affordance.",
    });
  }
  if (m.avgHabitsPerDayFirstWeek > 0 && m.avgHabitsPerDayFirstWeek < 1) {
    recs.push({
      title: "Lower the daily completion bar",
      rationale: `Average is ${m.avgHabitsPerDayFirstWeek}/day. Suggest a single keystone habit instead of multiple during week 1.`,
    });
  }
  const last3 = completionsTrend.slice(-3).reduce((s, d) => s + d.value, 0);
  const prev3 = completionsTrend.slice(-6, -3).reduce((s, d) => s + d.value, 0);
  if (prev3 > 0 && last3 < prev3 * 0.6) {
    recs.push({
      title: "Completion velocity is dropping",
      rationale: `Last 3 days dropped ${Math.round((1 - last3 / prev3) * 100)}% vs the prior 3. Trigger a re-engagement nudge or surface the weekly recap early.`,
    });
  }
  if (days >= 7 && m.d7Rate > 0.20 && m.recapCTR < 0.5) {
    recs.push({
      title: "Capitalize on D7 success",
      rationale: "Users are sticking but the weekly recap CTA is under-clicked. Make the recap actionable (set next week's target) instead of summary-only.",
    });
  }
  if (recs.length === 0) {
    recs.push({
      title: "No clear signal yet",
      rationale: "Wait for more events. Revisit once D1 has at least 5 cohort members.",
    });
  }
  return recs;
};

interface SourceRow {
  source: AcquisitionSource;
  users: number;          // distinct sessions/cohorts seen with this source
  appOpens: number;
  habitsCompleted: number;
  d1Returned: number;
  d7Returned: number;
  referralInvites: number;
  referralPromptsShown: number;
  avgHabits: number;      // habits completed per cohort user
  d1Rate: number;
  d7Rate: number;
  referralCTR: number;
  qualityScore: number;   // composite 0..1
}

const SOURCE_KEYS: AcquisitionSource[] = [
  "direct", "instagram", "tiktok", "twitter", "reddit",
  "facebook", "youtube", "linkedin", "referral",
  "organic_search", "paid_ads", "email", "other",
];

// ---------- Cohort analysis (by signup week) ----------
type LogEvent = { event: string; timestamp: string; properties?: any };

interface CohortRow {
  weekKey: string;        // e.g. "2026-W17"
  weekStart: Date;
  weekLabel: string;      // "Apr 20"
  users: number;
  d1Rate: number;
  d7Rate: number;
  avgHabitsFirstWeek: number;
  avgStreak: number;
  referralRate: number;   // invites sent / users
  qualityScore: number;
}

// Stable per-browser id (we only have one local "user" but still bucket properly).
const localUserId = (): string => {
  try {
    let id = localStorage.getItem("become-local-user-id");
    if (!id) {
      id = `u_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("become-local-user-id", id);
    }
    return id;
  } catch { return "u_anon"; }
};

// ISO week start (Monday) for a given date
const isoWeekStart = (d: Date): Date => {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7; // Sun=0 → 7
  if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1));
  return x;
};
const isoWeekKey = (d: Date): string => {
  const start = isoWeekStart(d);
  // ISO week number
  const tmp = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};
const weekLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const dayKeyLocal = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Compute weekly cohorts from the event log.
 * Each user is assigned to the ISO week of their first event (or
 * acquisition_captured if present). Source filter restricts the population.
 */
const computeCohorts = (
  log: LogEvent[],
  sourceFilter: AcquisitionSource | "all",
): CohortRow[] => {
  if (log.length === 0) return [];

  // Group events per user. We currently only have one local user, but we
  // also synthesize per-source pseudo-users so historical sources still
  // show as separate cohort members when filter = "all".
  const me = localUserId();

  // Build a per-user event map. Key strategy:
  //  - one bucket for the current local user (events without user_id)
  //  - extra buckets keyed by `properties.user_id` if ever stamped
  type UserBundle = { events: LogEvent[]; source: AcquisitionSource };
  const users = new Map<string, UserBundle>();
  const ensure = (id: string, source: AcquisitionSource): UserBundle => {
    if (!users.has(id)) users.set(id, { events: [], source });
    return users.get(id)!;
  };
  // Default source for the local user comes from acquisition meta
  let mySource: AcquisitionSource = "direct";
  try { mySource = (localStorage.getItem("become-acquisition-source") as AcquisitionSource) || "direct"; } catch { /* ignore */ }
  ensure(me, mySource);

  for (const e of log) {
    const uid = (e.properties?.user_id as string) || me;
    const src = (e.properties?.source as AcquisitionSource) || (uid === me ? mySource : "direct");
    ensure(uid, src).events.push(e);
  }

  // Filter users by source
  const filtered = Array.from(users.entries()).filter(([, b]) =>
    sourceFilter === "all" ? true : b.source === sourceFilter,
  );

  // Bucket users by signup week (week of first event)
  const cohorts = new Map<string, {
    weekStart: Date;
    userIds: string[];
    d1: number;
    d7: number;
    habitsFirstWeek: number[];
    streaks: number[];
    invites: number;
  }>();

  for (const [uid, bundle] of filtered) {
    if (bundle.events.length === 0) continue;
    const sorted = [...bundle.events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const acq = sorted.find(e => e.event === "acquisition_captured");
    const firstTs = new Date((acq || sorted[0]).timestamp);
    if (isNaN(firstTs.getTime())) continue;

    const wk = isoWeekKey(firstTs);
    const wkStart = isoWeekStart(firstTs);
    if (!cohorts.has(wk)) {
      cohorts.set(wk, {
        weekStart: wkStart,
        userIds: [],
        d1: 0, d7: 0,
        habitsFirstWeek: [],
        streaks: [],
        invites: 0,
      });
    }
    const c = cohorts.get(wk)!;
    c.userIds.push(uid);

    // D1 / D7 returns
    if (sorted.some(e => e.event === "day1_return")) c.d1 += 1;
    if (sorted.some(e => e.event === "day7_return")) c.d7 += 1;

    // First-week habit completions
    const weekCompletions = sorted.filter(e => {
      if (e.event !== "habit_completed" && e.event !== "first_habit_completed") return false;
      const t = new Date(e.timestamp).getTime();
      return t >= firstTs.getTime() && t < firstTs.getTime() + 7 * 86_400_000;
    });
    c.habitsFirstWeek.push(weekCompletions.length);

    // Longest consecutive-day streak in first week
    const days = new Set(weekCompletions.map(e => dayKeyLocal(e.timestamp)));
    let longest = 0, cur = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(firstTs);
      d.setDate(d.getDate() + i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (days.has(k)) { cur += 1; longest = Math.max(longest, cur); } else cur = 0;
    }
    c.streaks.push(longest);

    c.invites += sorted.filter(e => e.event === "referral_invite_sent").length;
  }

  const rows: CohortRow[] = [];
  for (const [weekKey, c] of cohorts) {
    const users = c.userIds.length;
    if (users === 0) continue;
    const avgHabits = +(c.habitsFirstWeek.reduce((s, n) => s + n, 0) / users).toFixed(2);
    const avgStreak = +(c.streaks.reduce((s, n) => s + n, 0) / users).toFixed(2);
    const d1Rate = c.d1 / users;
    const d7Rate = c.d7 / users;
    const referralRate = c.invites / users;
    const qualityScore = +(
      0.45 * d7Rate +
      0.25 * d1Rate +
      0.20 * Math.min(1, avgHabits / 5) +
      0.10 * Math.min(1, referralRate)
    ).toFixed(3);
    rows.push({
      weekKey,
      weekStart: c.weekStart,
      weekLabel: weekLabel(c.weekStart),
      users, d1Rate, d7Rate,
      avgHabitsFirstWeek: avgHabits,
      avgStreak, referralRate, qualityScore,
    });
  }
  return rows.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
};

type CohortTrend = "improving" | "declining" | "stable" | "first";
const cohortTrend = (curr: CohortRow, prev?: CohortRow): CohortTrend => {
  if (!prev) return "first";
  const delta = curr.qualityScore - prev.qualityScore;
  if (delta > 0.05) return "improving";
  if (delta < -0.05) return "declining";
  return "stable";
};

const computeSourceStats = (
  log: { event: string; timestamp: string; properties?: any }[],
): SourceRow[] => {
  // Bucket by source. "users" is approximated by counting distinct
  // acquisition_captured events per source (one per browser/cohort).
  const buckets = new Map<AcquisitionSource, {
    users: number; appOpens: number; habitsCompleted: number;
    d1: number; d7: number; invites: number; prompts: number;
  }>();
  const ensure = (s: AcquisitionSource) => {
    if (!buckets.has(s)) buckets.set(s, {
      users: 0, appOpens: 0, habitsCompleted: 0, d1: 0, d7: 0, invites: 0, prompts: 0,
    });
    return buckets.get(s)!;
  };

  for (const e of log) {
    const s = (e.properties?.source as AcquisitionSource) || "direct";
    const b = ensure(s);
    if (e.event === "acquisition_captured") b.users += 1;
    else if (e.event === "app_open") b.appOpens += 1;
    else if (e.event === "habit_completed" || e.event === "first_habit_completed") b.habitsCompleted += 1;
    else if (e.event === "day1_return") b.d1 += 1;
    else if (e.event === "day7_return") b.d7 += 1;
    else if (e.event === "referral_invite_sent") b.invites += 1;
    else if (e.event === "referral_prompt_shown") b.prompts += 1;
  }

  const rows: SourceRow[] = [];
  for (const source of SOURCE_KEYS) {
    const b = buckets.get(source);
    if (!b) continue;
    // If no acquisition_captured event yet, infer 1 user from any activity.
    const users = Math.max(b.users, b.appOpens > 0 || b.habitsCompleted > 0 ? 1 : 0);
    if (users === 0) continue;
    const avgHabits = +(b.habitsCompleted / users).toFixed(2);
    const d1Rate = users > 0 ? b.d1 / users : 0;
    const d7Rate = users > 0 ? b.d7 / users : 0;
    const referralCTR = b.prompts > 0 ? b.invites / b.prompts : 0;
    // Composite quality: weighted blend (D7 is the strongest retention signal)
    const qualityScore = +(
      0.45 * d7Rate +
      0.25 * d1Rate +
      0.20 * Math.min(1, avgHabits / 5) +
      0.10 * referralCTR
    ).toFixed(3);
    rows.push({
      source, users,
      appOpens: b.appOpens,
      habitsCompleted: b.habitsCompleted,
      d1Returned: b.d1, d7Returned: b.d7,
      referralInvites: b.invites, referralPromptsShown: b.prompts,
      avgHabits, d1Rate, d7Rate, referralCTR, qualityScore,
    });
  }
  return rows.sort((a, b) => b.qualityScore - a.qualityScore);
};


const Insights = () => {
  const [metrics, setMetrics] = useState<RetentionMetrics>(() => getRetentionMetrics());
  const [showRaw, setShowRaw] = useState(false);
  const log = useMemo(() => getEventLog(), [metrics]);

  // Trends — last 7 days
  const trendCompletions = useMemo(() => trend7(log, e => e.event === "habit_completed" || e.event === "first_habit_completed"), [log]);
  const trendCreations = useMemo(() => trend7(log, e => e.event === "habit_created" || e.event === "first_habit_created"), [log]);
  const trendAppOpens = useMemo(() => trend7(log, e => e.event === "app_open"), [log]);
  const trendCtaClicks = useMemo(() => trend7(log, e => e.event === "journeyhero_cta_clicked"), [log]);

  const alerts = useMemo(() => computeAlerts(metrics), [metrics]);
  const recommendations = useMemo(() => computeRecommendations(metrics, trendCompletions), [metrics, trendCompletions]);

  // A/B test results — recompute alongside metrics tick
  const referralVariants = useMemo(
    () => computeVariantStats(REFERRAL_HEADLINE_TEST, REFERRAL_HEADLINE_VARIANTS, "referral_prompt_shown", "referral_invite_sent"),
    [log],
  );
  const shareVariants = useMemo(
    () => computeVariantStats(SHARE_HEADLINE_TEST, SHARE_HEADLINE_VARIANTS, "share_card_opened", "share_card_shared"),
    [log],
  );

  // Auto-promote strong winners and refresh history
  const [history, setHistory] = useState<HistoryEntry[]>(() => getHistory());
  useEffect(() => {
    const a = maybeAutoPromote(REFERRAL_HEADLINE_TEST, REFERRAL_HEADLINE_NAME, referralVariants);
    const b = maybeAutoPromote(SHARE_HEADLINE_TEST, SHARE_HEADLINE_NAME, shareVariants);
    if (a || b) setHistory(getHistory());
  }, [referralVariants, shareVariants]);

  // ----- Source intelligence (per-source aggregation from event log) -----
  const acquisitionMeta = useMemo(() => getAcquisitionMeta(), []);
  const sourceStats = useMemo(() => computeSourceStats(log), [log]);

  // ----- Cohort analysis (by signup week, optional source filter) -----
  const [cohortSource, setCohortSource] = useState<AcquisitionSource | "all">("all");
  const cohorts = useMemo(() => computeCohorts(log, cohortSource), [log, cohortSource]);

  useEffect(() => {
    const id = setInterval(() => setMetrics(getRetentionMetrics()), 5000);
    return () => clearInterval(id);
  }, []);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ metrics, log }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `become-analytics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (confirm("Clear local analytics log? This cannot be undone.")) {
      clearAnalyticsLog();
      setMetrics(getRetentionMetrics());
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link to="/app" className="h-9 w-9 -ml-1.5 flex items-center justify-center rounded-full hover:bg-foreground/5">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">// INSIGHTS</p>
            <h1 className="text-lg font-bold tracking-tight">Retention dashboard</h1>
          </div>
          <Button size="sm" variant="ghost" onClick={handleExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 space-y-6">
        {/* Cohort context */}
        <Card>
          <CardContent className="p-4 space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Cohort</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span><span className="text-muted-foreground">Journey start:</span> <strong className="tabular-nums">{fmtDate(metrics.journeyStart)}</strong></span>
              <span><span className="text-muted-foreground">Days in:</span> <strong className="tabular-nums">{metrics.daysSinceStart ?? "—"}</strong></span>
              <span><span className="text-muted-foreground">Total events:</span> <strong className="tabular-nums">{metrics.totalEvents}</strong></span>
              {acquisitionMeta && (
                <span><span className="text-muted-foreground">Source:</span> <strong>{SOURCE_LABEL[acquisitionMeta.source]}</strong></span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Source intelligence */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Source intelligence</h2>
          <SourceIntelligenceTable rows={sourceStats} />
        </section>

        {/* Cohort analysis (by signup week) */}
        <section>
          <div className="flex items-center justify-between mb-2 gap-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Cohort analysis · weekly</h2>
            <select
              value={cohortSource}
              onChange={e => setCohortSource(e.target.value as AcquisitionSource | "all")}
              className="text-[10px] font-mono uppercase tracking-wider bg-background border border-foreground/15 rounded px-2 py-1 text-foreground"
            >
              <option value="all">All sources</option>
              {SOURCE_KEYS.map(s => (
                <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <CohortAnalysisTable rows={cohorts} />
        </section>

        {/* Alerts — automatic insight engine */}
        {alerts.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Signals</h2>
            {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
          </section>
        )}

        {/* Retention */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Retention</h2>
          <div className="grid grid-cols-3 gap-3">
            <RetentionTile label="D1" rate={metrics.d1Rate} eligible={(metrics.daysSinceStart ?? 0) >= 1} returned={metrics.d1Returned} />
            <RetentionTile label="D3" rate={metrics.d3Rate} eligible={(metrics.daysSinceStart ?? 0) >= 3} returned={metrics.d3Returned} />
            <RetentionTile label="D7" rate={metrics.d7Rate} eligible={(metrics.daysSinceStart ?? 0) >= 7} returned={metrics.d7Returned} />
          </div>
        </section>

        {/* First-week behaviour */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">First 7 days</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KPI icon={<Target className="h-3.5 w-3.5" />} label="Habits completed" value={`${metrics.habitsCompletedFirstWeek}`} />
            <KPI icon={<BarChart3 className="h-3.5 w-3.5" />} label="Avg / day" value={`${metrics.avgHabitsPerDayFirstWeek}`} />
            <KPI icon={<Flame className="h-3.5 w-3.5" />} label="Longest streak" value={`${metrics.longestStreakFirstWeek}d`} />
          </div>
        </section>

        {/* 7-day trends */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">7-day trends</h2>
          <div className="grid grid-cols-2 gap-3">
            <TrendCard title="Habits completed" data={trendCompletions} />
            <TrendCard title="Habits created" data={trendCreations} />
            <TrendCard title="App opens" data={trendAppOpens} />
            <TrendCard title="Hero CTA clicks" data={trendCtaClicks} />
          </div>
        </section>

        {/* CTA CTR */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">CTA performance</h2>
          <div className="grid grid-cols-2 gap-3">
            <CTRCard
              title="Journey hero CTA"
              impressions={metrics.ctaImpressions}
              clicks={metrics.ctaClicks}
              ctr={metrics.ctaCTR}
            />
            <CTRCard
              title="Weekly recap"
              impressions={metrics.recapSeen}
              clicks={metrics.recapClicks}
              ctr={metrics.recapCTR}
            />
          </div>
        </section>

        {/* Recommendations — generated from data */}
        {/* A/B test winners */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">A/B test results</h2>
          <div className="space-y-3">
            <ABTestCard
              testKey={REFERRAL_HEADLINE_TEST}
              title="Referral modal headline"
              metric="CTR (invite sent / shown)"
              variants={referralVariants}
            />
            <ABTestCard
              testKey={SHARE_HEADLINE_TEST}
              title="Share card headline"
              metric="Share rate (shared / opened)"
              variants={shareVariants}
            />
          </div>
        </section>

        {/* Experiment history */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Experiment history</h2>
            <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{history.length} winner{history.length === 1 ? "" : "s"}</span>
          </div>
          <HistoryList history={history} />
        </section>

        {/* Suggested next experiments */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Suggested next tests</h2>
          <div className="space-y-2">
            {SUGGESTED_TESTS.map(t => <SuggestedTestCard key={t.id} test={t} />)}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Top recommendations</h2>
          <div className="space-y-2">
            {recommendations.map((r, i) => <RecommendationCard key={i} index={i + 1} rec={r} />)}
          </div>
        </section>

        {/* Funnel timestamps */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">Activation funnel</h2>
          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <FunnelRow label="Onboarding completed" at={metrics.onboardingCompletedAt} />
              <FunnelRow label="First habit created" at={metrics.firstHabitCreatedAt} />
              <FunnelRow label="First habit completed" at={metrics.firstHabitCompletedAt} />
            </CardContent>
          </Card>
        </section>

        {/* Raw log */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Event log ({log.length})</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowRaw(s => !s)}>
                {showRaw ? "Hide" : "Show"}
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleReset}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {showRaw && (
            <Card>
              <CardContent className="p-3 max-h-96 overflow-auto">
                <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-all text-muted-foreground">
                  {log.slice(-100).reverse().map((e, i) => (
                    `${e.timestamp.slice(11, 19)}  ${e.event}${e.properties ? "  " + JSON.stringify(e.properties) : ""}\n`
                  )).join("")}
                </pre>
              </CardContent>
            </Card>
          )}
        </section>

        <p className="text-[10px] text-muted-foreground text-center pt-2">
          Local-first analytics · stored in this browser only · {metrics.totalEvents} events tracked
        </p>
      </main>
    </div>
  );
};

const RetentionTile = ({ label, rate, eligible, returned }: { label: string; rate: number; eligible: boolean; returned: boolean }) => (
  <Card className={!eligible ? "opacity-50" : ""}>
    <CardContent className="p-4 text-center">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold tabular-nums mt-1">
        {eligible ? fmtPct(rate) : "—"}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">
        {!eligible ? "Not yet" : returned ? "Returned" : "No return"}
      </p>
    </CardContent>
  </Card>
);

const KPI = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <Card>
    <CardContent className="p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums mt-1">{value}</p>
    </CardContent>
  </Card>
);

const CTRCard = ({ title, impressions, clicks, ctr }: { title: string; impressions: number; clicks: number; ctr: number }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <MousePointerClick className="h-3.5 w-3.5" />
        <span className="text-[10px] font-mono uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums mt-1">{fmtPct(ctr)}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
        {clicks} clicks · {impressions} impr.
      </p>
    </CardContent>
  </Card>
);

const FunnelRow = ({ label, at }: { label: string; at: string | null }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-mono text-xs tabular-nums ${at ? "text-foreground" : "text-muted-foreground/60"}`}>
      {fmtDate(at)}
    </span>
  </div>
);

const ALERT_STYLES: Record<AlertLevel, { bg: string; border: string; icon: React.ReactNode; label: string }> = {
  critical: {
    bg: "bg-destructive/10",
    border: "border-destructive/40",
    icon: <AlertOctagon className="h-4 w-4 text-destructive" />,
    label: "text-destructive",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    label: "text-amber-600 dark:text-amber-400",
  },
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    label: "text-emerald-600 dark:text-emerald-400",
  },
};

const AlertCard = ({ alert }: { alert: Alert }) => {
  const s = ALERT_STYLES[alert.level];
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-3 flex gap-3 items-start`}>
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${s.label}`}>{alert.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.detail}</p>
      </div>
    </div>
  );
};

const TrendCard = ({ title, data }: { title: string; data: DayPoint[] }) => {
  const max = Math.max(1, ...data.map(d => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const last3 = data.slice(-3).reduce((s, d) => s + d.value, 0);
  const prev3 = data.slice(-6, -3).reduce((s, d) => s + d.value, 0);
  const delta = prev3 === 0 ? 0 : ((last3 - prev3) / prev3) * 100;
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">{title}</span>
          <span className="text-[10px] font-mono tabular-nums text-muted-foreground">Σ {total}</span>
        </div>
        <div className="mt-2 flex items-end gap-1 h-12">
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-sm bg-primary/70 transition-all"
                style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 1 }}
                title={`${d.day}: ${d.value}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex gap-1">
            {data.map((d, i) => (
              <span key={i} className="text-[8px] font-mono text-muted-foreground/60 flex-1 text-center">{d.label[0]}</span>
            ))}
          </div>
          {prev3 > 0 && (
            <span className={`text-[10px] font-mono tabular-nums ${delta >= 0 ? "text-emerald-500" : "text-destructive"}`}>
              {delta >= 0 ? "+" : ""}{Math.round(delta)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const RecommendationCard = ({ index, rec }: { index: number; rec: Recommendation }) => (
  <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3 flex gap-3 items-start">
    <div className="mt-0.5 shrink-0 h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center">
      <Lightbulb className="h-3.5 w-3.5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold leading-snug">
        <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{String(index).padStart(2, "0")}</span>
        {rec.title}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec.rationale}</p>
    </div>
  </div>
);


const CONFIDENCE_STYLE: Record<Confidence, string> = {
  low_sample: "border-foreground/15 bg-foreground/[0.04] text-muted-foreground",
  emerging_leader: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  likely_winner: "border-primary/40 bg-primary/10 text-primary",
  strong_winner: "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  trailing: "border-foreground/10 bg-foreground/[0.02] text-muted-foreground",
  tied: "border-foreground/10 bg-foreground/[0.02] text-muted-foreground",
};

const ConfidenceBadge = ({ c }: { c: Confidence }) => (
  <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${CONFIDENCE_STYLE[c]}`}>
    {CONFIDENCE_LABEL[c]}
  </span>
);

const ABTestCard = ({
  testKey, title, metric, variants,
}: { testKey: string; title: string; metric: string; variants: VariantStats[] }) => {
  const totalImpressions = variants.reduce((s, v) => s + v.impressions, 0);
  const sorted = [...variants].sort((a, b) => b.rate - a.rate);
  const promotedId = getPromotedVariant(testKey);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <p className="text-sm font-bold">{title}</p>
          <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{totalImpressions} impr.</span>
        </div>
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{metric}</p>
        {promotedId && (
          <p className="text-[10px] font-mono text-primary mb-2 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Auto-promoted: Variant {promotedId} · 80/20 split
          </p>
        )}

        {totalImpressions === 0 ? (
          <p className="text-xs text-muted-foreground italic mt-2">No data yet — variants assigned on next exposure.</p>
        ) : (
          <div className="space-y-2 mt-2">
            {sorted.map(v => {
              const isLeader = v.isLeader;
              const isPromoted = promotedId === v.id;
              return (
                <div
                  key={v.id}
                  className={`rounded-lg border p-2.5 ${isLeader ? "border-primary/50 bg-primary/5" : "border-foreground/10 bg-foreground/[0.02]"}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      {isLeader && <Trophy className="h-3 w-3 text-primary shrink-0" />}
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Variant {v.id}
                      </span>
                      <ConfidenceBadge c={v.confidence} />
                      {isPromoted && (
                        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
                          Promoted
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${isLeader ? "text-primary" : ""}`}>
                      {fmtPct(v.rate)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-snug">{v.copy}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] font-mono tabular-nums text-muted-foreground">
                      {v.conversions} / {v.impressions}
                    </p>
                    {isLeader && v.liftVsRunnerUp > 0 && (
                      <p className="text-[10px] font-mono tabular-nums text-emerald-500">
                        +{Math.round(v.liftVsRunnerUp * 100)}% vs runner-up
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const HistoryList = ({ history }: { history: HistoryEntry[] }) => {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <History className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            No winners promoted yet. A variant must reach <strong>Strong winner</strong> to be auto-promoted.
          </p>
        </CardContent>
      </Card>
    );
  }
  const sorted = [...history].sort((a, b) => b.promotedAt.localeCompare(a.promotedAt));
  return (
    <div className="space-y-2">
      {sorted.map((h, i) => (
        <Card key={i}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Trophy className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-sm font-bold truncate">{h.testName} Winner</p>
              </div>
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
                {new Date(h.promotedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-foreground/80 mt-1 leading-snug">
              <span className="font-mono text-[10px] text-muted-foreground mr-1.5">Variant {h.variantId}</span>
              {h.copy}
            </p>
            <p className="text-[10px] font-mono tabular-nums text-muted-foreground mt-1">
              {fmtPct(h.rate)} · {h.conversions}/{h.impressions} · +{Math.round(h.liftVsRunnerUp * 100)}% lift
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const EFFORT_STYLE: Record<"low" | "medium" | "high", string> = {
  low: "text-emerald-500",
  medium: "text-amber-500",
  high: "text-destructive",
};

const SuggestedTestCard = ({ test }: { test: { id: string; area: string; hypothesis: string; variants: string[]; effort: "low" | "medium" | "high" } }) => (
  <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3 flex gap-3 items-start">
    <div className="mt-0.5 shrink-0 h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center">
      <FlaskConical className="h-3.5 w-3.5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold leading-snug">
          <span className="font-mono text-[10px] text-muted-foreground mr-1.5 uppercase">{test.area}</span>
          {test.variants.join("  vs  ")}
        </p>
        <span className={`text-[9px] font-mono uppercase tracking-wider ${EFFORT_STYLE[test.effort]}`}>
          {test.effort}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{test.hypothesis}</p>
    </div>
  </div>
);


const SourceIntelligenceTable = ({ rows }: { rows: SourceRow[] }) => {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground italic">
            No traffic attributed yet. Sources are captured on first visit and stamped on every event.
          </p>
        </CardContent>
      </Card>
    );
  }
  const best = rows[0]; // already sorted by qualityScore
  return (
    <Card>
      <CardContent className="p-0">
        {/* Best source highlight */}
        <div className="p-4 border-b border-foreground/10 bg-primary/5 flex items-center gap-3">
          <Trophy className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-primary">Best quality source</p>
            <p className="text-sm font-bold">
              {SOURCE_LABEL[best.source]}{" "}
              <span className="text-muted-foreground font-normal">· quality {Math.round(best.qualityScore * 100)}</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-foreground/10">
                <th className="text-left font-mono font-normal uppercase tracking-wider px-3 py-2 text-[10px]">Source</th>
                <th className="text-right font-mono font-normal uppercase tracking-wider px-2 py-2 text-[10px]">Users</th>
                <th className="text-right font-mono font-normal uppercase tracking-wider px-2 py-2 text-[10px]">D1</th>
                <th className="text-right font-mono font-normal uppercase tracking-wider px-2 py-2 text-[10px]">D7</th>
                <th className="text-right font-mono font-normal uppercase tracking-wider px-2 py-2 text-[10px]">Avg habits</th>
                <th className="text-right font-mono font-normal uppercase tracking-wider px-2 py-2 text-[10px]">Ref. CTR</th>
                <th className="text-right font-mono font-normal uppercase tracking-wider px-3 py-2 text-[10px]">Quality</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isBest = r.source === best.source;
                return (
                  <tr key={r.source} className={`border-b border-foreground/5 last:border-0 ${isBest ? "bg-primary/5" : ""}`}>
                    <td className="px-3 py-2.5">
                      <span className={`flex items-center gap-1.5 ${isBest ? "text-primary font-bold" : "font-medium"}`}>
                        {isBest && <Trophy className="h-3 w-3 shrink-0" />}
                        {SOURCE_LABEL[r.source]}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{r.users}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{fmtPct(r.d1Rate)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{fmtPct(r.d7Rate)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{r.avgHabits}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{r.referralPromptsShown > 0 ? fmtPct(r.referralCTR) : "—"}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${isBest ? "text-primary" : ""}`}>
                      {Math.round(r.qualityScore * 100)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="px-3 py-2 text-[10px] font-mono text-muted-foreground border-t border-foreground/10">
          Quality = 0.45·D7 + 0.25·D1 + 0.20·avg-habits + 0.10·referral-CTR
        </p>
      </CardContent>
    </Card>
  );
};

export default Insights;
