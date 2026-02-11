import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Habit } from "@/data/types";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  return (
    <div>
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
            : "bg-card/60 border-border/40 hover:bg-card/80 hover:border-border/60",
          !habit.active && "opacity-40 cursor-not-allowed"
        )}
      >
        {/* Color bar */}
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

        {/* Check circle */}
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

        {/* Habit name */}
        <span
          className={cn(
            "text-left font-medium flex-1 transition-all duration-300 text-[15px]",
            isDone ? "text-primary" : "text-foreground/90"
          )}
        >
          {habit.nome}
        </span>

        {/* Navigate to detail */}
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/app/habit/${habit.id}`); }}
          className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </button>
    </div>
  );
};
