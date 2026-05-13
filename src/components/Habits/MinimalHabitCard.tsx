import { Check, Clock, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Habit } from "@/data/types";
import { useNavigate } from "react-router-dom";
import { Surface } from "@/components/ui/surface";

interface MinimalHabitCardProps {
  habit: Habit;
  isDone: boolean;
  isLate?: boolean;
  onToggle: () => void;
  index?: number;
  /** For habits with mode="metric" — current accumulated quantity for the day */
  metricCount?: number;
}

/**
 * Habit card — Arcade Overdrive
 * Sharp surface, hairline border, neon accent on completion.
 * - Simple habits: checkbox toggle.
 * - Metric habits: shows progress bar (count/goal). For "reduce" type, when count > goal,
 *   the card switches to a "danger/exceeded" visual state (full warning fill + alert icon).
 */
export const MinimalHabitCard = ({
  habit,
  isDone,
  isLate = false,
  onToggle,
  index,
  metricCount = 0,
}: MinimalHabitCardProps) => {
  const navigate = useNavigate();
  const prevDone = useRef(isDone);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (!prevDone.current && isDone) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 700);
      prevDone.current = isDone;
      return () => clearTimeout(timer);
    }
    prevDone.current = isDone;
  }, [isDone]);

  // ─── Metric habit logic ───────────────────────────────────────────────
  const isMetric = habit.mode === "metric";
  const goal = habit.dailyGoal ?? habit.baseline ?? 0;
  const isReduce = habit.type === "reduce";
  const isIncrease = habit.type === "increase";

  // For reduce habits: exceeded = current count is above the daily limit (bad).
  const isExceeded = isMetric && isReduce && goal > 0 && metricCount > goal;
  // For increase habits: goalReached = count met or surpassed (good).
  const goalReached = isMetric && isIncrease && goal > 0 && metricCount >= goal;

  // Fill % of background bar inside the card.
  const fillPct = (() => {
    if (!isMetric || goal <= 0) return 0;
    if (isReduce) {
      // Show how much of the limit has been consumed; clamp 0–100, but allow
      // exceeded state to render full bar.
      return Math.min(100, (metricCount / goal) * 100);
    }
    return Math.min(100, (metricCount / goal) * 100);
  })();

  // Map state → Surface tone (single source of truth for card visuals)
  const tone =
    isExceeded ? "exceeded" :
    isDone && !isLate ? "active" :
    isDone && isLate ? "warning" :
    goalReached ? "accent" :
    "default";

  return (
    <Surface
      tone={tone}
      size="default"
      interactive
      onClick={() => navigate(`/app/habit/${habit.id}`)}
      className={cn(
        "w-full flex items-center gap-4 group min-h-[76px] py-4 touch-target",
        !habit.active && "opacity-40 cursor-not-allowed",
      )}
    >
      {/* Metric progress fill — sits behind content */}
      {isMetric && goal > 0 && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 transition-[width,background-color] duration-500 ease-out",
            isExceeded
              ? "bg-destructive/15"
              : isReduce
              ? "bg-warning/10"
              : "bg-primary/10",
          )}
          style={{ width: `${fillPct}%` }}
        />
      )}

      {/* Flash overlay on completion */}
      {justCompleted && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 animate-fade-out",
            isLate ? "bg-warning/20" : "bg-primary/15",
          )}
        />
      )}

      {/* Color bar */}
      <div
        className={cn(
          "relative w-[3px] h-10 shrink-0 transition-all duration-300",
          isDone && "h-12",
        )}
        style={{
          backgroundColor: isExceeded
            ? "hsl(var(--destructive))"
            : habit.cor || "hsl(var(--primary))",
          opacity: isDone ? (isLate ? 0.7 : 1) : 0.55,
          boxShadow: isExceeded
            ? `0 0 10px hsl(var(--destructive))`
            : isDone && !isLate
            ? `0 0 10px ${habit.cor || "hsl(var(--neon-toxic))"}`
            : undefined,
        }}
      />

      {/* Check tile / metric indicator */}
      {isMetric ? (
        <div
          className={cn(
            "relative flex items-center justify-center w-11 h-11 border-2 shrink-0 transition-all duration-200",
            isExceeded
              ? "bg-destructive/15 border-destructive text-destructive"
              : goalReached
              ? "bg-primary border-primary text-primary-foreground"
              : isReduce
              ? "border-warning/40 bg-warning/5 text-warning"
              : "border-foreground/20 bg-transparent text-foreground/60",
          )}
        >
          {isExceeded ? (
            <AlertTriangle className="h-5 w-5 stroke-[2.5]" />
          ) : isReduce ? (
            <TrendingDown className="h-5 w-5 stroke-[2.5]" />
          ) : (
            <TrendingUp className="h-5 w-5 stroke-[2.5]" />
          )}
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          disabled={!habit.active}
          className={cn(
            "relative flex items-center justify-center w-11 h-11 border-2 shrink-0 transition-all duration-200",
            isDone && !isLate
              ? "bg-primary border-primary text-primary-foreground shadow-[0_0_14px_hsl(var(--neon-toxic)/0.55)]"
              : isDone && isLate
              ? "bg-warning border-warning text-warning-foreground"
              : "border-foreground/20 bg-transparent group-hover:border-primary group-hover:bg-primary/5",
            !habit.active && "cursor-not-allowed",
          )}
        >
          <Check className={cn(
            "h-5 w-5 stroke-[3]",
            isDone ? "opacity-100" : "opacity-0",
            justCompleted && "animate-completion-pop",
          )} />
        </button>
      )}

      {/* Habit name + state line */}
      <div className="relative flex-1 min-w-0 flex flex-col gap-0.5">
        <span
          className={cn(
            "text-left font-bold uppercase tracking-tight text-[14px] leading-tight transition-colors duration-200",
            isExceeded ? "text-destructive" :
            isDone && !isLate ? "text-primary line-through decoration-primary/40" :
            isDone && isLate ? "text-warning line-through decoration-warning/40" :
            goalReached ? "text-primary" :
            "text-foreground",
          )}
        >
          {habit.nome}
        </span>

        {/* Metric counter line */}
        {isMetric && goal > 0 && (
          <span
            className={cn(
              "text-[11px] font-mono tabular-nums tracking-tight",
              isExceeded ? "text-destructive font-semibold" :
              goalReached ? "text-primary" :
              isReduce ? "text-warning/80" :
              "text-muted-foreground",
            )}
          >
            {metricCount}<span className="opacity-50">/{goal}</span>
            {habit.unitPlural ? ` ${habit.unitPlural}` : ""}
            {isExceeded && (
              <span className="ml-2 uppercase tracking-wider text-[10px]">
                · Limite ultrapassado (+{metricCount - goal})
              </span>
            )}
          </span>
        )}

        {isDone && isLate && !isMetric && (
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-warning">
            <Clock className="h-3 w-3" />
            Tardio · 50%
          </span>
        )}
      </div>
    </Surface>
  );
};
