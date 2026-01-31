import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Habit } from "@/data/types";

interface MinimalHabitCardProps {
  habit: Habit;
  isDone: boolean;
  onToggle: () => void;
}

/**
 * Minimal habit card for Day view.
 * 1 hábito = 1 card
 * tap = ação
 * Sem números, sem métricas
 */
export const MinimalHabitCard = ({
  habit,
  isDone,
  onToggle,
}: MinimalHabitCardProps) => {
  return (
    <button
      onClick={onToggle}
      disabled={!habit.active}
      className={cn(
        "w-full flex items-center gap-4 p-5 rounded-2xl transition-all duration-300",
        "min-h-[72px] touch-target group",
        "border",
        "active:scale-[0.98]",
        isDone
          ? "bg-primary/8 border-primary/25 shadow-sm shadow-primary/5"
          : "bg-card/40 border-border/30 hover:bg-card/70 hover:border-border/50",
        !habit.active && "opacity-40 cursor-not-allowed"
      )}
    >
      {/* Color bar - more elegant */}
      <div
        className={cn(
          "w-1 h-10 rounded-full shrink-0 transition-all duration-300",
          isDone && "h-12"
        )}
        style={{ 
          backgroundColor: habit.cor || "hsl(var(--primary))",
          opacity: isDone ? 1 : 0.7
        }}
      />

      {/* Check circle - refined animation */}
      <div
        className={cn(
          "flex items-center justify-center w-11 h-11 rounded-full border-2 shrink-0 transition-all duration-300",
          isDone
            ? "bg-primary border-primary text-primary-foreground scale-105 shadow-lg shadow-primary/20"
            : "border-border/50 bg-transparent group-hover:border-border/80"
        )}
      >
        <Check className={cn(
          "h-5 w-5 stroke-[2.5] transition-all duration-300",
          isDone ? "opacity-100 scale-100" : "opacity-0 scale-75"
        )} />
      </div>

      {/* Habit name - better typography */}
      <span
        className={cn(
          "text-left font-medium flex-1 transition-all duration-300 text-[15px]",
          isDone ? "text-primary" : "text-foreground/90"
        )}
      >
        {habit.nome}
      </span>

      {/* Time indicator if scheduled */}
      {habit.scheduledTime && (
        <span className={cn(
          "text-xs tabular-nums transition-colors shrink-0",
          isDone ? "text-primary/60" : "text-muted-foreground/60"
        )}>
          {habit.scheduledTime}
        </span>
      )}
    </button>
  );
};
