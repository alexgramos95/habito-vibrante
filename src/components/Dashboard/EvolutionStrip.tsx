import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format, getDay, parseISO, subDays } from "date-fns";
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

const phaseFor = (level: number, isPT: boolean) => {
  const arr = isPT ? IDENTITY_PHASES_PT : IDENTITY_PHASES_EN;
  return arr[Math.min(level - 1, arr.length - 1)] || arr[arr.length - 1];
};

export const EvolutionStrip = ({ state, isPT, className }: EvolutionStripProps) => {
  const lp = getLevelProgress(state.gamification?.pontos || 0);
  const phase = phaseFor(lp.current, isPT);

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
        "group block rounded-2xl border border-foreground/[0.06] bg-card/40",
        "px-4 py-3.5 transition-colors hover:border-foreground/15 hover:bg-card/60",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left — identity phase */}
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/80">
            LV.{lp.current}
          </span>
          <span className="text-sm text-foreground/85 truncate">
            {phase}
          </span>
        </div>

        {/* Right — rhythm dots */}
        <div className="flex items-center gap-1.5 shrink-0" aria-hidden>
          {rhythm.map((d, i) => {
            const empty = d.ratio < 0;
            const intensity =
              empty ? 0.06 :
              d.ratio === 0 ? 0.10 :
              0.30 + d.ratio * 0.70;
            return (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-all",
                  d.isToday && "ring-1 ring-primary/40 ring-offset-1 ring-offset-background h-2 w-2",
                )}
                style={{
                  backgroundColor: `hsl(var(--primary) / ${intensity})`,
                  boxShadow: d.ratio >= 0.999 ? "0 0 6px hsl(var(--primary) / 0.45)" : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Quiet milestone hint */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground/85">
        <span>
          {isPT
            ? `${lp.pointsToNext} pontos até à próxima evolução`
            : `${lp.pointsToNext} points until your next evolution`}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
};
