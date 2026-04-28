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
            </div>
          </CardContent>
        </Card>

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



export default Insights;
