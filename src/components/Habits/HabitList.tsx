import { Plus, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { AppState, Habit } from "@/data/types";
import { HabitCard } from "./HabitCard";
import { isHabitDoneOnDate } from "@/data/storage";
import { format, getDay } from "date-fns";

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
  
  const filtered = habits.filter(habit => {
    // If no scheduled days set, show every day
    if (!habit.scheduledDays || habit.scheduledDays.length === 0) {
      return true;
    }
    // Show only if this day is in the scheduled days
    return habit.scheduledDays.includes(dayOfWeek);
  });
  
  // Sort by scheduledTime (earliest first), habits without time go last
  return filtered.sort((a, b) => {
    if (!a.scheduledTime && !b.scheduledTime) return 0;
    if (!a.scheduledTime) return 1;
    if (!b.scheduledTime) return -1;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
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
          to="/app/habitos" 
          className="text-lg font-semibold hover:text-primary transition-colors cursor-pointer"
        >
          {t.habits.title}
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
