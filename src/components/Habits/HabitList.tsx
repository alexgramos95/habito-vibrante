import { Plus, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { AppState, Habit } from "@/data/types";
import { HabitCard } from "./HabitCard";
import { isHabitDoneOnDate } from "@/data/storage";
import { format, getDay } from "date-fns";
import { getHabitsSortedForDay } from "@/logic/habitSorting";

interface HabitListProps {
  state: AppState;
  selectedDate: Date;
  onToggleHabit: (habitId: string) => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onAddHabit: () => void;
}

// Filter habits to only show those scheduled for the selected day, sorted by time
const getHabitsForDay = (habits: Habit[], date: Date): Habit[] => {
  const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, etc.
  return getHabitsSortedForDay(habits, dayOfWeek);
};

export const HabitList = ({
  state,
  selectedDate,
  onToggleHabit,
  onEditHabit,
  onDeleteHabit,
  onAddHabit,
}: HabitListProps) => {
  const { t } = useI18n();
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  
  // Get habits for this specific day
  const habitsForDay = getHabitsForDay(state.habits, selectedDate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link 
          to="/app" 
          className="text-lg font-semibold hover:text-primary transition-colors cursor-pointer"
        >
          {t.habits.title}
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/app">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t.habits.management}</span>
            </Button>
          </Link>
          <Button
            onClick={onAddHabit}
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {habitsForDay.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-secondary/20 py-12 text-center">
          <p className="text-muted-foreground">{t.habits.noHabits}</p>
          <Button
            onClick={onAddHabit}
            variant="link"
            className="mt-2 text-primary"
          >
            {t.habits.add}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {habitsForDay.map((habit) => (
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
