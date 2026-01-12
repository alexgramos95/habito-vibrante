import { Check, MoreHorizontal, Pencil, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Habit } from "@/data/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/I18nContext";

interface HabitCardProps {
  habit: Habit;
  isDone: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const HabitCard = ({
  habit,
  isDone,
  onToggle,
  onEdit,
  onDelete,
}: HabitCardProps) => {
  const { t } = useI18n();
  
  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border p-4 transition-all duration-300",
        "animate-fade-in",
        isDone
          ? "border-primary/50 bg-primary/10"
          : "border-border/50 bg-card hover:border-border",
        !habit.active && "opacity-50"
      )}
    >
      {/* Color indicator */}
      <div
        className="h-10 w-1 rounded-full"
        style={{ backgroundColor: habit.cor || "hsl(var(--primary))" }}
      />

      {/* Toggle button */}
      <button
        onClick={onToggle}
        disabled={!habit.active}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
          isDone
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-transparent hover:border-primary/50 hover:bg-primary/10",
          !habit.active && "cursor-not-allowed"
        )}
      >
        {isDone && <Check className="h-5 w-5 stroke-[3]" />}
      </button>

      {/* Habit info */}
      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            "font-medium transition-colors",
            isDone && "text-primary"
          )}
        >
          {habit.nome}
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {habit.categoria && <span>{habit.categoria}</span>}
          {habit.scheduledTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {habit.scheduledTime}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium",
          habit.active
            ? "bg-success/10 text-success"
            : "bg-muted text-muted-foreground"
        )}
      >
        {habit.active ? t.habits.active : t.habits.inactive}
      </div>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onEdit} className="gap-2">
            <Pencil className="h-4 w-4" />
            {t.habits.edit}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t.habits.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
