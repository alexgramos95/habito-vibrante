import { useEffect, useMemo, useState } from "react";
import { format, subDays, getDay, parseISO } from "date-fns";
import { Flame, ArrowRight, Sparkles, Share2, Target, Trophy, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppState } from "@/data/types";
import { track } from "@/hooks/useAnalytics";
import { ShareCard } from "@/components/Referral/ShareCard";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileName } from "@/hooks/useProfileName";
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

interface JourneyHeroProps {
  state: AppState;
  streak: number;
  totalDone: number;
  totalTracked: number;
  brokeYesterday: boolean;
  /** Name of the next pending action (habit) — drives clarity */
  nextActionName?: string;
  locale?: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

/**
 * JourneyHero — Unified Clarity Hero
 *
 * One panel. Four answers in 2 seconds:
 *   1. Where am I? (greeting + identity)
 *   2. What's next? (next action)
 *   3. How am I doing today? (progress bar + streak)
 *   4. What do I press? (single primary CTA)
 *
 * No double headers, no scattered stat pills, no decorative borders.
 */
export const JourneyHero = ({
  state,
  streak,
  totalDone,
  totalTracked,
  brokeYesterday,
  nextActionName,
  locale = "pt-PT",
  onPrimaryAction,
  primaryActionLabel,
}: JourneyHeroProps) => {
  const { user } = useAuth();
  const isPT = locale === "pt-PT";
  const onboarding = useMemo(readOnboarding, []);
  const identityKey = onboarding.identityChoice || "disciplined";
  const identityLabel = (IDENTITY_LABELS[identityKey] || IDENTITY_LABELS.disciplined)[isPT ? "pt" : "en"];

  const lifecycle = useMemo(
    () => deriveLifecycle(state, user?.created_at),
    [state, user?.created_at],
  );
  const day = lifecycle.daysSinceAccount;
  const lifecycleState: LifecycleState = lifecycle.state;

  // === Greeting based on time of day ===
  // Reads firstName from the unified profile-name source (profiles.display_name
  // → user_metadata.full_name → empty). We deliberately do NOT fall back to the
  // email handle here — handles like "alexgramos95" read as a username and
  // break the editorial tone of the greeting.
  const { firstName } = useProfileName();
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const name = firstName ? `, ${firstName}` : "";
    if (isPT) {
      if (h < 12) return `Bom dia${name}.`;
      if (h < 19) return `Boa tarde${name}.`;
      return `Boa noite${name}.`;
    }
    if (h < 12) return `Good morning${name}.`;
    if (h < 19) return `Good afternoon${name}.`;
    return `Good evening${name}.`;
  }, [firstName, isPT]);

  // === Sub-headline: identity + state — calm, reflective, never motivational ===
  const subline = (() => {
    if (lifecycleState === "new")
      return isPT
        ? "O começo é silencioso. Acontece à primeira escolha."
        : "Beginnings are quiet. They happen at the first choice.";
    if (brokeYesterday)
      return isPT
        ? "Ontem ficou em aberto. Identidade não é perfeição — é regresso."
        : "Yesterday stayed open. Identity isn't perfection — it's return.";
    if (lifecycleState === "reengaged")
      return isPT
        ? "Voltaste. Esta é a parte que conta."
        : "You came back. This is the part that counts.";
    if (streak >= 14)
      return isPT
        ? `Já não tens de te lembrar. Estás a tornar-te ${identityLabel}.`
        : `You no longer have to remember. You are becoming ${identityLabel}.`;
    if (streak >= 5)
      return isPT
        ? `O sistema está a moldar-te. Continua devagar.`
        : `The system is shaping you. Keep moving slowly.`;
    if (totalTracked > 0 && totalDone === 0)
      return isPT
        ? "O dia está intacto. Começa por um."
        : "The day is intact. Begin with one.";
    return isPT
      ? `A construir o teu eu ${identityLabel}.`
      : `Building your ${identityLabel}.`;
  })();

  const allDoneToday = totalTracked > 0 && totalDone >= totalTracked;
  const progressPercent = totalTracked > 0 ? Math.round((totalDone / totalTracked) * 100) : 0;

  // === 7-day stats — for recap modal only ===
  const last7Stats = useMemo(() => {
    const windowSize = Math.max(1, Math.min(day + 1, 7));
    const days = Array.from({ length: windowSize }, (_, i) => format(subDays(new Date(), i), "yyyy-MM-dd"));
    let scheduled = 0;
    let done = 0;
    const perDay: Array<{ date: string; done: number; total: number }> = [];
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

  return (
    <>
      <section
        className="relative animate-in fade-in slide-in-from-top-2 duration-500"
        aria-label={isPT ? "Resumo de hoje" : "Today's summary"}
      >
        {/* GREETING — calm, no competing pills */}
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-[40ch]">
            {subline}
          </p>
        </div>

        {/* PROGRESS — atmospheric line only, no hard counters */}
        {totalTracked > 0 && (
          <div className="mt-6">
            <div
              className="h-[3px] w-full bg-foreground/8 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-label={isPT ? "Progresso de hoje" : "Today's progress"}
            >
              <div
                className={cn(
                  "h-full transition-all duration-1000 ease-out rounded-full",
                  allDoneToday
                    ? "bg-success/80 shadow-[0_0_10px_hsl(var(--success)/0.4)]"
                    : "bg-primary/70",
                )}
                style={{ width: `${Math.max(progressPercent, 4)}%` }}
              />
            </div>
            {allDoneToday && (
              <p className="mt-3 text-[12px] text-success/90 tracking-wide">
                {isPT ? "Hoje está completo." : "Today is complete."}
              </p>
            )}
          </div>
        )}
      </section>

      {/* === Day 7 Recap modal === */}
      {showRecap && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={dismissRecap}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-foreground/10 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
              {isPT ? "Recap semanal" : "Weekly recap"}
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
              <RecapStat label={isPT ? "Streak" : "Streak"} value={`${streak}d`} icon={<Flame className="h-4 w-4" />} />
              <RecapStat label={isPT ? "Consistência" : "Consistency"} value={`${last7Stats.consistency}%`} icon={<Target className="h-4 w-4" />} />
              <RecapStat label={isPT ? "Momentum" : "Momentum"} value={`${last7Stats.momentum}`} icon={<TrendingUp className="h-4 w-4" />} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button onClick={() => setShowShareCard(true)} variant="outline" className="w-full gap-1.5" size="lg">
                <Share2 className="h-4 w-4" />
                {isPT ? "Partilhar" : "Share"}
              </Button>
              <Button onClick={dismissRecap} className="w-full" size="lg">
                {isPT ? "Continuar" : "Continue"}
              </Button>
            </div>
          </div>
        </div>
      )}

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

const RecapStat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl font-bold tabular-nums mt-1 text-foreground">{value}</p>
  </div>
);
