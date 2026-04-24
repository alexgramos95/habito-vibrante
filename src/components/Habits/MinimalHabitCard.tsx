import { Check, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Habit } from "@/data/types";
import { useNavigate } from "react-router-dom";

interface MinimalHabitCardProps {
  habit: Habit;
  isDone: boolean;
  isLate?: boolean;
  onToggle: () => void;
  index?: number;
}

/**
 * Habit card — Arcade Overdrive
 * Sharp surface, hairline border, neon accent on completion.
 * On completion: subtle pop + flash overlay + strikethrough.
 * Late completion: shows ⏰ indicator and "tardio" label (counts 50%).
 */
export const MinimalHabitCard = ({
  habit,
  isDone,
  isLate = false,
  onToggle,
  index,
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

  return (
    <div
      onClick={() => navigate(`/app/habit/${habit.id}`)}
      className={cn(
        "relative w-full flex items-center gap-4 p-4 transition-all duration-200 cursor-pointer group min-h-[72px] touch-target border overflow-hidden",
        isDone && !isLate
          ? "bg-primary/8 border-primary/60 shadow-[0_0_20px_hsl(var(--neon-toxic)/0.15)]"
          : isDone && isLate
          ? "bg-warning/8 border-warning/50"
          : "bg-card border-foreground/10 hover:border-accent/50 hover:bg-card/60",
        justCompleted && "scale-[1.015]",
        !habit.active && "opacity-40 cursor-not-allowed",
      )}
    >
      {/* Flash overlay on completion */}
      {justCompleted && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 animate-fade-out",
            isLate ? "bg-warning/20" : "bg-primary/20",
          )}
        />
      )}

      {/* Color bar */}
      <div
        className={cn(
          "w-1 h-10 shrink-0 transition-all duration-200",
          isDone && "h-12",
        )}
        style={{
          backgroundColor: habit.cor || "hsl(var(--primary))",
          opacity: isDone ? (isLate ? 0.7 : 1) : 0.6,
          boxShadow: isDone && !isLate ? `0 0 10px ${habit.cor || "hsl(var(--neon-toxic))"}` : undefined,
        }}
      />

      {/* Check tile — sharp square */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        disabled={!habit.active}
        className={cn(
          "flex items-center justify-center w-11 h-11 border-2 shrink-0 transition-all duration-200",
          isDone && !isLate
            ? "bg-primary border-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--neon-toxic)/0.6)]"
            : isDone && isLate
            ? "bg-warning border-warning text-warning-foreground"
            : "border-foreground/20 bg-transparent group-hover:border-primary",
          justCompleted && "animate-scale-in",
          !habit.active && "cursor-not-allowed",
        )}
      >
        <Check className={cn(
          "h-5 w-5 stroke-[3] transition-all duration-200",
          isDone ? "opacity-100 scale-100" : "opacity-0 scale-75",
        )} />
      </button>

      {/* Habit name + late badge */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span
          className={cn(
            "text-left font-bold uppercase tracking-tight text-[14px] leading-tight transition-colors duration-200",
            isDone && !isLate ? "text-primary line-through decoration-primary/40" :
            isDone && isLate ? "text-warning line-through decoration-warning/40" :
            "text-foreground",
          )}
        >
          {habit.nome}
        </span>
        {isDone && isLate && (
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-warning">
            <Clock className="h-3 w-3" />
            Tardio · 50%
          </span>
        )}
      </div>
    </div>
  );
};
