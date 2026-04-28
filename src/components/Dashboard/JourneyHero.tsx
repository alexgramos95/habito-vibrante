import { useEffect, useMemo, useState } from "react";
import { format, differenceInCalendarDays, subDays, getDay, parseISO } from "date-fns";
import { Flame, Sparkles, Target, TrendingUp, Trophy, ChevronRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppState, Habit } from "@/data/types";
import { track } from "@/hooks/useAnalytics";
import { ShareCard } from "@/components/Referral/ShareCard";
import { useAuth } from "@/contexts/AuthContext";
import { deriveLifecycle, type LifecycleState } from "@/lib/lifecycleState";

const RECAP_KEY = "become-week1-recap-seen";

const IDENTITY_LABELS: Record<string, { pt: string; en: string }> = {
  disciplined: { pt: "disciplinado", en: "disciplined self" },
  healthier: { pt: "mais saudável", en: "healthier self" },
  stronger: { pt: "mais forte mentalmente", en: "stronger self" },
  organized: { pt: "financeiramente organizado", en: "organized self" },
  productive: { pt: "mais produtivo", en: "productive self" },
  calm: { pt: "calmo e consistente", en: "calmer self" },
};

interface OnboardingPayload {
  identityChoice?: string;
  identityVectors?: string[];
}

const readOnboarding = (): OnboardingPayload => {
  try {
    const raw = localStorage.getItem("become-onboarding-data");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

/* Lifecycle is now derived from real account activity (see deriveLifecycle).
   The previous local-only "journey day" counter was misleading for returning
   users on new devices/browsers. */

interface JourneyHeroProps {
  state: AppState;
  streak: number;
  totalDone: number;
  totalTracked: number;
  brokeYesterday: boolean;
  locale?: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

export const JourneyHero = ({
  state,
  streak,
  totalDone,
  totalTracked,
  brokeYesterday,
  locale = "pt-PT",
  onPrimaryAction,
  primaryActionLabel,
}: JourneyHeroProps) => {
  const { user } = useAuth();
  const isPT = locale === "pt-PT";
  const onboarding = useMemo(readOnboarding, []);
  const identityKey = onboarding.identityChoice || "disciplined";
  const identityLabel = (IDENTITY_LABELS[identityKey] || IDENTITY_LABELS.disciplined)[isPT ? "pt" : "en"];

  // === Real-account lifecycle state (truthful across devices) ===
  const lifecycle = useMemo(
    () => deriveLifecycle(state, user?.created_at),
    [state, user?.created_at],
  );
  const day = lifecycle.daysSinceAccount; // for stats window + recap trigger
  const lifecycleState: LifecycleState = lifecycle.state;

  // === Yesterday completion ===
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const yesterdayDow = getDay(subDays(new Date(), 1));
  const yesterdayHabits = state.habits.filter(h => {
    if (!h.active || h.mode === "metric") return false;
    if (!h.scheduledDays || h.scheduledDays.length === 0) return true;
    return h.scheduledDays.includes(yesterdayDow);
  });
  const yesterdayDone = yesterdayHabits.filter(h =>
    state.dailyLogs.some(l => l.habitId === h.id && l.date === yesterdayStr && l.done)
  ).length;
  const yesterdayWin = yesterdayHabits.length > 0 && yesterdayDone === yesterdayHabits.length;

  // === Headline copy — driven by lifecycle, NOT just local day counter ===
  const headline = (() => {
    if (lifecycleState === "new")
      return isPT
        ? "A tua primeira vitória começa hoje."
        : "Your first win starts today.";
    if (lifecycleState === "early")
      return yesterdayWin
        ? (isPT ? "Ontem contou. Hoje prova-o." : "Yesterday counted. Today proves it.")
        : (isPT ? "O sistema começa a formar-se." : "The system is forming.");
    if (lifecycleState === "reengaged")
      return isPT
        ? "Bom ver-te de volta. Recomeça forte hoje."
        : "Good to see you again. Restart strong today.";
    // active
    return isPT
      ? "Bem-vindo de volta. O momentum espera-te."
      : "Welcome back. Momentum is waiting.";
  })();

  const subline = (() => {
    if (lifecycleState === "new")
      return isPT
        ? "A tua primeira vitória está pronta abaixo."
        : "Your first win is ready below.";
    if (lifecycleState === "early")
      return isPT ? "Momentum a formar-se. Continua." : "Momentum is forming. Keep going.";
    if (lifecycleState === "reengaged")
      return isPT
        ? `${lifecycle.totalCompletions} vitórias no histórico. Retoma o ritmo.`
        : `${lifecycle.totalCompletions} wins in your history. Pick the rhythm back up.`;
    return isPT
      ? `És cada vez mais ${identityLabel}.`
      : `You are becoming more ${identityLabel}.`;
  })();

  // === Stats: show as soon as there's any history (not tied to local day) ===
  const showStats = lifecycle.hasMeaningfulActivity || day >= 2;
  const last7Stats = useMemo(() => {
    const windowSize = Math.max(1, Math.min(day + 1, 7));
    const days = Array.from({ length: windowSize }, (_, i) => format(subDays(new Date(), i), "yyyy-MM-dd"));
    let scheduled = 0;
    let done = 0;
    let perDay: Array<{ date: string; done: number; total: number }> = [];
    days.forEach(ds => {
      const dow = getDay(parseISO(ds));
      const sched = state.habits.filter(h => {
        if (!h.active || h.mode === "metric") return false;
        if (!h.scheduledDays || h.scheduledDays.length === 0) return true;
        return h.scheduledDays.includes(dow);
      });
      const d = sched.filter(h => state.dailyLogs.some(l => l.habitId === h.id && l.date === ds && l.done)).length;
      scheduled += sched.length;
      done += d;
      perDay.push({ date: ds, done: d, total: sched.length });
    });
    const consistency = scheduled > 0 ? Math.round((done / scheduled) * 100) : 0;
    const strongest = perDay.reduce((best, cur) => {
      const ratio = cur.total > 0 ? cur.done / cur.total : 0;
      const bestRatio = best.total > 0 ? best.done / best.total : 0;
      return ratio > bestRatio ? cur : best;
    }, perDay[0] || { date: "", done: 0, total: 0 });
    const momentum = Math.min(100, consistency + Math.min(streak * 5, 25));
    return { consistency, wins: done, momentum, strongest, scheduled };
  }, [state.habits, state.dailyLogs, day, streak]);

  // === Weekly recap modal: trigger after a real account-week, only once ===
  const [showRecap, setShowRecap] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  useEffect(() => {
    if (day >= 6 && lifecycle.hasMeaningfulActivity) {
      try {
        if (!localStorage.getItem(RECAP_KEY)) {
          setShowRecap(true);
          track("weekly_recap_seen", { day, lifecycle: lifecycleState });
        }
      } catch { /* ignore */ }
    }
  }, [day, lifecycle.hasMeaningfulActivity, lifecycleState]);
  const dismissRecap = () => {
    try { localStorage.setItem(RECAP_KEY, "1"); } catch { /* ignore */ }
    track("weekly_recap_cta_clicked", { day, lifecycle: lifecycleState });
    setShowRecap(false);
  };

  // Badge: hide misleading "DIA 1" for active/re-engaged users
  const dayLabel = (() => {
    if (lifecycleState === "active") return isPT ? "ATIVO" : "ACTIVE";
    if (lifecycleState === "reengaged") return isPT ? "REGRESSO" : "RETURNING";
    if (lifecycleState === "early") return isPT ? `DIA ${day + 1}` : `DAY ${day + 1}`;
    return isPT ? "COMEÇO" : "START";
  })();
  const allDoneToday = totalTracked > 0 && totalDone >= totalTracked;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-primary/[0.03] to-transparent p-5 animate-in fade-in slide-in-from-top-2 duration-500">
        {/* Day badge + streak */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
            {dayLabel}
          </span>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
              <Flame className="h-3.5 w-3.5" />
              {streak}{isPT ? "d" : "d"}
            </span>
          )}
        </div>

        {/* Headline */}
        <h2 className="text-xl font-bold tracking-tight text-foreground leading-tight">
          {headline}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {subline}
        </p>

        {/* Yesterday celebration (Day 1+) */}
        {bucket === "day1" && yesterdayWin && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <Sparkles className="h-3.5 w-3.5" />
            {isPT ? `Ontem: ${yesterdayDone}/${yesterdayHabits.length} completo` : `Yesterday: ${yesterdayDone}/${yesterdayHabits.length} complete`}
          </div>
        )}

        {/* Day 3+ Stats row */}
        {showStats && last7Stats.scheduled > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatPill icon={<Target className="h-3 w-3" />} label={isPT ? "Consistência" : "Consistency"} value={`${last7Stats.consistency}%`} />
            <StatPill icon={<Trophy className="h-3 w-3" />} label={isPT ? "Vitórias" : "Wins"} value={`${last7Stats.wins}`} />
            <StatPill icon={<TrendingUp className="h-3 w-3" />} label={isPT ? "Momentum" : "Momentum"} value={`${last7Stats.momentum}`} />
          </div>
        )}

        {/* Primary CTA — one main action */}
        {onPrimaryAction && !allDoneToday && (
          <Button
            onClick={onPrimaryAction}
            size="sm"
            className="mt-4 w-full gap-1.5 rounded-xl shadow-[0_0_24px_hsl(var(--neon-toxic)/0.35)]"
          >
            {primaryActionLabel || (isPT ? "Começar agora" : "Start now")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {allDoneToday && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 py-2.5 text-sm font-bold text-success">
            <Sparkles className="h-4 w-4" />
            {isPT ? "Dia completo. Bem feito." : "Day complete. Well done."}
          </div>
        )}
      </div>

      {/* === Day 7 Recap modal === */}
      {showRecap && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={dismissRecap}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border-2 border-primary/40 bg-card p-6 shadow-[0_0_60px_hsl(var(--neon-toxic)/0.4)] animate-in zoom-in-95 duration-400"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
              {isPT ? "// RECAP SEMANAL" : "// WEEKLY RECAP"}
            </p>
            <h3 className="text-2xl font-bold tracking-tight">
              {isPT ? "Uma semana. Outra pessoa." : "One week. Different person."}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isPT
                ? `Estás cada vez mais ${identityLabel}.`
                : `You are becoming more ${identityLabel}.`}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <RecapStat label={isPT ? "Vitórias" : "Wins"} value={`${last7Stats.wins}`} icon={<Trophy className="h-4 w-4" />} />
              <RecapStat label={isPT ? "Streak" : "Streak"} value={`${streak}${isPT ? "d" : "d"}`} icon={<Flame className="h-4 w-4" />} />
              <RecapStat label={isPT ? "Consistência" : "Consistency"} value={`${last7Stats.consistency}%`} icon={<Target className="h-4 w-4" />} />
              <RecapStat label={isPT ? "Momentum" : "Momentum"} value={`${last7Stats.momentum}`} icon={<TrendingUp className="h-4 w-4" />} />
            </div>

            {last7Stats.strongest?.date && (
              <div className="mt-4 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {isPT ? "DIA MAIS FORTE" : "STRONGEST DAY"}
                </p>
                <p className="text-sm font-bold mt-0.5">
                  {format(parseISO(last7Stats.strongest.date), "EEEE")} · {last7Stats.strongest.done}/{last7Stats.strongest.total}
                </p>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-primary">
                {isPT ? "PRÓXIMO ALVO" : "NEXT TARGET"}
              </p>
              <p className="text-sm font-bold mt-0.5">
                {isPT ? "Semana 2: 80% de consistência" : "Week 2: 80% consistency"}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                onClick={() => setShowShareCard(true)}
                variant="outline"
                className="w-full rounded-xl gap-1.5"
                size="lg"
              >
                <Share2 className="h-4 w-4" />
                {isPT ? "Partilhar" : "Share progress"}
              </Button>
              <Button onClick={dismissRecap} className="w-full rounded-xl" size="lg">
                {isPT ? "Continuar" : "Continue"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* === Weekly share card === */}
      <ShareCard
        open={showShareCard}
        onClose={() => setShowShareCard(false)}
        stats={{
          streak,
          wins: last7Stats.wins,
          consistency: last7Stats.consistency,
          level: Math.max(1, Math.floor((state.gamification?.pontos || 0) / 100) + 1),
        }}
        identityLabel={identityLabel}
        isPT={isPT}
      />
    </>
  );
};

const StatPill = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-foreground/10 bg-background/40 p-2.5">
    <div className="flex items-center gap-1 text-muted-foreground">
      {icon}
      <span className="text-[9px] font-mono uppercase tracking-wider truncate">{label}</span>
    </div>
    <p className="text-base font-bold tabular-nums mt-0.5">{value}</p>
  </div>
);

const RecapStat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl font-bold tabular-nums mt-1 text-foreground">{value}</p>
  </div>
);
