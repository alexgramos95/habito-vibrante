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
        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300",
        "min-h-[64px] touch-target",
        "border border-border/30",
        "active:scale-[0.98]",
        isDone
          ? "bg-primary/10 border-primary/30"
          : "bg-card/50 hover:bg-card/80",
        !habit.active && "opacity-40 cursor-not-allowed"
      )}
    >
      {/* Color bar */}
      <div
        className="w-1 h-10 rounded-full shrink-0"
        style={{ backgroundColor: habit.cor || "hsl(var(--primary))" }}
      />

      {/* Check circle */}
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 transition-all duration-300",
          isDone
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border/50 bg-transparent"
        )}
      >
        {isDone && <Check className="h-5 w-5 stroke-[3]" />}
      </div>

      {/* Habit name */}
      <span
        className={cn(
          "text-left font-medium flex-1 transition-colors",
          isDone ? "text-primary" : "text-foreground"
        )}
      >
        {habit.nome}
      </span>
    </button>
  );
};
