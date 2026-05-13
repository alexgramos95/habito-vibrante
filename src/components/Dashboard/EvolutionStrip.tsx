import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, getDay, subDays } from "date-fns";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppState } from "@/data/types";
import { getLevelProgress } from "@/logic/computations";

/**
 * EvolutionStrip — Daily Evolution
 *
 * Subtle, ambient progression strip placed on the Day view.
 * Communicates: identity phase, weekly rhythm and a quiet next milestone.
 * Intentionally NOT a dashboard — no XP shouting, no charts, no badges.
 */
interface EvolutionStripProps {
  state: AppState;
  isPT: boolean;
  className?: string;
}

const IDENTITY_PHASES_EN = [
  "Becoming consistent",   // LV1
  "Building structure",    // LV2
  "Finding rhythm",        // LV3
  "Identity emerging",     // LV4
  "Becoming who you are",  // LV5
  "Living it",             // LV6+
];

const IDENTITY_PHASES_PT = [
  "A tornares-te consistente",
  "A construir estrutura",
  "A encontrar o teu ritmo",
  "A identidade a emergir",
  "A tornares-te quem és",
  "A viver isso",
];

// Rotating philosophical reinforcements — replaces explicit XP/points pressure.
const REFLECTIONS_EN = [
  "Your system is taking shape.",
  "Consistency is built in silence.",
  "Every repetition strengthens identity.",
  "Small systems. Quiet change.",
  "Presence compounds quietly.",
  "You return — that is the practice.",
  "Identity forms in the repetition.",
  "The rhythm is starting to show.",
  "Discipline is a way of caring for yourself.",
  "Slow is also a direction.",
];

const REFLECTIONS_PT = [
  "O teu sistema está a ganhar forma.",
  "Consistência constrói-se em silêncio.",
  "Cada repetição reforça a identidade.",
  "Pequenos sistemas. Grandes mudanças.",
  "Presença acumula em silêncio.",
  "Voltas — é essa a prática.",
  "A identidade forma-se na repetição.",
  "O ritmo está a aparecer.",
  "Disciplina é uma forma de cuidar de ti.",
  "Devagar é também direção.",
];

const phaseFor = (level: number, isPT: boolean) => {
  const arr = isPT ? IDENTITY_PHASES_PT : IDENTITY_PHASES_EN;
  return arr[Math.min(level - 1, arr.length - 1)] || arr[arr.length - 1];
};

const reflectionFor = (date: Date, isPT: boolean) => {
  const arr = isPT ? REFLECTIONS_PT : REFLECTIONS_EN;
  // Day-of-year index → stable for the whole day, gently rotates daily.
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return arr[dayOfYear % arr.length];
};

export const EvolutionStrip = ({ state, isPT, className }: EvolutionStripProps) => {
  const lp = getLevelProgress(state.gamification?.pontos || 0);
  const phase = phaseFor(lp.current, isPT);
  const reflection = useMemo(() => reflectionFor(new Date(), isPT), [isPT]);

  // 7-day rhythm: completion ratio per day for scheduled simple habits
  const rhythm = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      const ds = format(d, "yyyy-MM-dd");
      const dow = getDay(d);
      const scheduled = state.habits.filter(h => {
        if (!h.active || h.mode === "metric") return false;
        if (!h.scheduledDays || h.scheduledDays.length === 0) return true;
        return h.scheduledDays.includes(dow);
      });
      if (scheduled.length === 0) return { ratio: -1, isToday: i === 6 };
      const done = scheduled.reduce((s, h) => {
        const log = state.dailyLogs.find(l => l.habitId === h.id && l.date === ds && l.done);
        if (!log) return s;
        return s + (log.isLate ? 0.5 : 1);
      }, 0);
      return { ratio: Math.min(1, done / scheduled.length), isToday: i === 6 };
    });
  }, [state.habits, state.dailyLogs]);

  return (
    <Link
      to="/app/level"
      aria-label={isPT ? "Ver evolução" : "View evolution"}
      className={cn(
        "group relative block overflow-hidden rounded-2xl",
        "bg-foreground/[0.015] border border-foreground/[0.04]",
        "px-4 py-3.5 transition-all duration-700",
        "hover:bg-foreground/[0.03] hover:border-foreground/[0.08]",
        className,
      )}
    >
      {/* Ambient atmospheric glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-50"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, hsl(var(--primary) / 0.05), transparent 55%)",
        }}
      />

      <div className="relative flex items-center justify-between gap-3">
        {/* Left — identity phase, no LV.x prefix */}
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-primary/70 living-pulse"
          />
          <span className="text-[14px] text-foreground/85 truncate">
            {phase}
          </span>
        </div>

        {/* Right — rhythm dots */}
        <div className="flex items-center gap-1.5 shrink-0" aria-hidden>
          {rhythm.map((d, i) => {
            const empty = d.ratio < 0;
            const intensity =
              empty ? 0.04 :
              d.ratio === 0 ? 0.07 :
              0.22 + d.ratio * 0.65;
            const full = d.ratio >= 0.999;
            return (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-all duration-700",
                  d.isToday && "ring-1 ring-primary/30 ring-offset-2 ring-offset-background h-2 w-2",
                )}
                style={{
                  backgroundColor: `hsl(var(--primary) / ${intensity})`,
                  boxShadow: full
                    ? "0 0 6px hsl(var(--primary) / 0.45)"
                    : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Quiet philosophical reinforcement */}
      <div className="relative mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground/70">
        <span className="italic tracking-wide truncate">
          {reflection}
        </span>
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
};
