import { format, getDay, isToday } from "date-fns";
import { Plus, Settings2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { AppState, Habit, Tracker, TrackerEntry } from "@/data/types";
import { isHabitDoneOnDate } from "@/data/storage";
import { MinimalHabitCard } from "@/components/Habits/MinimalHabitCard";
import { GatedOverlay } from "@/components/Premium/GatedOverlay";
import { useSubscription } from "@/hooks/useSubscription";

interface DayViewProps {
  state: AppState;
  selectedDate: Date;
  onToggleHabit: (habitId: string) => void;
  onAddHabit: () => void;
}

// Filter habits to only show those scheduled for the selected day, sorted by time
const getHabitsForDay = (habits: Habit[], date: Date): Habit[] => {
  const dayOfWeek = getDay(date);
  
  const filtered = habits.filter(habit => {
    if (!habit.scheduledDays || habit.scheduledDays.length === 0) {
      return true;
    }
    return habit.scheduledDays.includes(dayOfWeek);
  });
  
  return filtered.sort((a, b) => {
    if (!a.scheduledTime && !b.scheduledTime) return 0;
    if (!a.scheduledTime) return 1;
    if (!b.scheduledTime) return -1;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
};

/**
 * Day View - Main screen
 * Dia = ação
 * 1 hábito = 1 card
 * tap = marcar
 * Sem números, sem métricas
 */
export const DayView = ({
  state,
  selectedDate,
  onToggleHabit,
  onAddHabit,
}: DayViewProps) => {
  const { t, locale, formatDate } = useI18n();
  const navigate = useNavigate();
  const { isPro, getLimits, subscription, trialStatus } = useSubscription();
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  
  const habitsForDay = getHabitsForDay(state.habits, selectedDate);
  const activeTrackers = (state.trackers || []).filter(t => t.active);
  const limits = getLimits();

  // Check if can add more habits
  const canAddHabit = isPro || habitsForDay.filter(h => h.active).length < (limits.maxHabits as number);

  // Date display
  const dateLabel = isToday(selectedDate)
    ? (locale === 'pt-PT' ? 'Hoje' : 'Today')
    : formatDate(selectedDate, locale === 'pt-PT' ? "d 'de' MMMM" : "MMMM d");

  return (
    <div className="space-y-6">
      {/* Date label */}
      <div className="text-center">
        <h2 className="text-lg font-medium text-muted-foreground">{dateLabel}</h2>
      </div>

      {/* Habits section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-medium text-muted-foreground">
            {locale === 'pt-PT' ? 'Hábitos' : 'Habits'}
          </h3>
          <div className="flex items-center gap-1">
            <Link to="/app/habitos">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </Link>
            {canAddHabit && (
              <Button
                onClick={onAddHabit}
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg hover:bg-primary/10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {habitsForDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-secondary/20 py-12 text-center">
            <p className="text-muted-foreground text-sm">
              {locale === 'pt-PT' ? 'Sem hábitos para hoje' : 'No habits for today'}
            </p>
            <Button
              onClick={onAddHabit}
              variant="link"
              className="mt-2 text-primary text-sm"
            >
              {t.habits.add}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {habitsForDay.map((habit) => (
              <MinimalHabitCard
                key={habit.id}
                habit={habit}
                isDone={isHabitDoneOnDate(state, habit.id, dateStr)}
                onToggle={() => onToggleHabit(habit.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Trackers section - Gated for FREE */}
      {activeTrackers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              {locale === 'pt-PT' ? 'Trackers' : 'Trackers'}
            </h3>
            <Link to="/app/trackers">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isPro ? (
            <div className="grid gap-3">
              {activeTrackers.slice(0, 4).map((tracker) => (
                <TrackerMiniCard
                  key={tracker.id}
                  tracker={tracker}
                  entries={state.trackerEntries || []}
                  onClick={() => navigate('/app/trackers')}
                />
              ))}
            </div>
          ) : (
            <GatedOverlay feature={locale === 'pt-PT' ? 'Trackers' : 'Trackers'}>
              <div className="grid gap-3">
                {activeTrackers.slice(0, 2).map((tracker) => (
                  <TrackerMiniCard
                    key={tracker.id}
                    tracker={tracker}
                    entries={state.trackerEntries || []}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </GatedOverlay>
          )}
        </div>
      )}
    </div>
  );
};

// Mini tracker card for day view
const TrackerMiniCard = ({
  tracker,
  entries,
  onClick,
}: {
  tracker: Tracker;
  entries: TrackerEntry[];
  onClick: () => void;
}) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayEntries = entries.filter(e => e.trackerId === tracker.id && e.date === today);
  const todayCount = todayEntries.reduce((sum, e) => sum + e.quantity, 0);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/30 hover:bg-card/80 transition-all touch-target text-left w-full"
    >
      <div className="text-2xl">{tracker.icon || '📊'}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{tracker.name}</p>
        <p className="text-sm text-muted-foreground">
          {todayCount} {todayCount === 1 ? tracker.unitSingular : tracker.unitPlural}
        </p>
      </div>
    </button>
  );
};
