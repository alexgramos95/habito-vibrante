import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { translations } from "@/i18n/translations.pt";
import { AppState, Habit } from "@/data/types";
import { HabitCard } from "./HabitCard";
import { isHabitDoneOnDate } from "@/data/storage";
import { format } from "date-fns";

interface HabitListProps {
  state: AppState;
  selectedDate: Date;
  onToggleHabit: (habitId: string) => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onAddHabit: () => void;
}

export const HabitList = ({
  state,
  selectedDate,
  onToggleHabit,
  onEditHabit,
  onDeleteHabit,
  onAddHabit,
}: HabitListProps) => {
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{translations.habits.title}</h2>
        <Button
          onClick={onAddHabit}
          size="sm"
          className="gap-2 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          {translations.habits.add}
        </Button>
      </div>

      {state.habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-secondary/20 py-12 text-center">
          <p className="text-muted-foreground">{translations.habits.noHabits}</p>
          <Button
            onClick={onAddHabit}
            variant="link"
            className="mt-2 text-primary"
          >
            {translations.habits.add}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {state.habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              isDone={isHabitDoneOnDate(state, habit.id, dateStr)}
              onToggle={() => onToggleHabit(habit.id)}
              onEdit={() => onEditHabit(habit)}
              onDelete={() => onDeleteHabit(habit.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
