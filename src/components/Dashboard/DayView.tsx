import { format, getDay, isToday, startOfWeek, addDays } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { Plus, Settings2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

// Editorial copy based on day context
const getEditorialCopy = (date: Date, locale: string): string => {
  const dayOfWeek = getDay(date);
  const hour = new Date().getHours();
  
  // Morning
  if (hour < 12) {
    const morningPhrases = locale === 'pt-PT' 
      ? ['Um dia com intenção', 'Começa devagar', 'Hoje, um passo de cada vez', 'A manhã convida ao movimento']
      : ['A day with intention', 'Start slowly', 'Today, one step at a time', 'The morning invites movement'];
    return morningPhrases[dayOfWeek % morningPhrases.length];
  }
  
  // Afternoon
  if (hour < 18) {
    const afternoonPhrases = locale === 'pt-PT'
      ? ['O ritmo está em ti', 'Continua presente', 'Cada gesto conta', 'O essencial primeiro']
      : ['The rhythm is within', 'Stay present', 'Every gesture counts', 'Essentials first'];
    return afternoonPhrases[dayOfWeek % afternoonPhrases.length];
  }
  
  // Evening
  const eveningPhrases = locale === 'pt-PT'
    ? ['Encerra com gentileza', 'Um dia de cada vez', 'Reconhece o que fizeste', 'Descansa com leveza']
    : ['Close gently', 'One day at a time', 'Acknowledge what you did', 'Rest with lightness'];
  return eveningPhrases[dayOfWeek % eveningPhrases.length];
};

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
 * Header editorial + micro-gráfico semanal
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
  const dateLocale = locale === 'pt-PT' ? pt : enUS;
  
  const habitsForDay = getHabitsForDay(state.habits, selectedDate);
  const activeHabits = state.habits.filter(h => h.active);
  const activeTrackers = (state.trackers || []).filter(t => t.active);
  const limits = getLimits();

  // Check if can add more habits
  const canAddHabit = isPro || habitsForDay.filter(h => h.active).length < (limits.maxHabits as number);

  // Date display - editorial format
  const dateLabel = isToday(selectedDate)
    ? format(selectedDate, locale === 'pt-PT' ? "EEEE, d 'de' MMMM" : "EEEE, MMMM d", { locale: dateLocale })
    : format(selectedDate, locale === 'pt-PT' ? "EEEE, d 'de' MMMM" : "EEEE, MMMM d", { locale: dateLocale });

  // Capitalize first letter
  const formattedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
  
  // Editorial copy
  const editorialCopy = getEditorialCopy(selectedDate, locale);

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <header className="text-center space-y-2 py-2">
        <h1 className="text-xl font-medium text-foreground">{formattedDate}</h1>
        <p className="text-sm text-muted-foreground italic">{editorialCopy}</p>
      </header>

      {/* Habits section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {locale === 'pt-PT' ? 'Hábitos' : 'Habits'}
          </h2>
          <div className="flex items-center gap-1">
            <Link to="/app">
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground rounded-xl"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </Link>
            {canAddHabit && (
              <Button
                onClick={onAddHabit}
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 text-primary"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {habitsForDay.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 bg-card/20 py-16 text-center">
            <p className="text-muted-foreground text-sm mb-3">
              {locale === 'pt-PT' ? 'Sem hábitos para hoje' : 'No habits for today'}
            </p>
            <Button
              onClick={onAddHabit}
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 gap-1.5"
            >
              <Plus className="h-4 w-4" />
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
      </section>

      {/* Micro Weekly Rhythm Preview - Premium */}
      {activeHabits.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide px-1">
            {locale === 'pt-PT' ? 'Ritmo da semana' : 'Week rhythm'}
          </h2>
          
          {isPro ? (
            <WeekRhythmPreview state={state} selectedDate={selectedDate} locale={locale} />
          ) : (
            <GatedOverlay feature={locale === 'pt-PT' ? 'Ritmo semanal' : 'Weekly rhythm'}>
              <WeekRhythmPreview state={state} selectedDate={selectedDate} locale={locale} />
            </GatedOverlay>
          )}
        </section>
      )}

      {/* Trackers section - Gated for FREE */}
      {activeTrackers.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Trackers
            </h2>
            <Link to="/app/trackers">
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground rounded-xl"
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
            <GatedOverlay feature="Trackers">
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
        </section>
      )}
    </div>
  );
};

// Micro weekly rhythm preview - dots sparkline
const WeekRhythmPreview = ({
  state,
  selectedDate,
  locale,
}: {
  state: AppState;
  selectedDate: Date;
  locale: string;
}) => {
  const dateLocale = locale === 'pt-PT' ? pt : enUS;
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const activeHabits = state.habits.filter(h => h.active);
  const today = new Date();

  return (
    <div className="p-4 rounded-2xl bg-card/30 border border-border/20">
      {/* Days header */}
      <div className="flex justify-between mb-4">
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground/60 uppercase">
              {format(day, "EEE", { locale: dateLocale }).slice(0, 1)}
            </span>
            <span className={cn(
              "text-xs font-medium mt-0.5 w-6 h-6 flex items-center justify-center rounded-full",
              isToday(day) && "bg-primary/10 text-primary"
            )}>
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>

      {/* Compact dots grid */}
      <div className="space-y-2">
        {activeHabits.slice(0, 4).map((habit) => (
          <div key={habit.id} className="flex items-center gap-3">
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: habit.cor || "hsl(var(--primary))" }}
            />
            <div className="flex-1 flex justify-between">
              {weekDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const isDone = isHabitDoneOnDate(state, habit.id, dateStr);
                const isFuture = day > today;

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      isFuture
                        ? "bg-border/20"
                        : isDone
                          ? "bg-primary/80"
                          : "bg-muted-foreground/15"
                    )}
                    style={isDone && habit.cor ? { backgroundColor: habit.cor, opacity: 0.8 } : undefined}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {activeHabits.length > 4 && (
        <p className="text-[10px] text-muted-foreground/50 text-center mt-3">
          +{activeHabits.length - 4} {locale === 'pt-PT' ? 'mais' : 'more'}
        </p>
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
      className="flex items-center gap-4 p-4 rounded-2xl bg-card/30 border border-border/20 hover:bg-card/50 transition-all touch-target text-left w-full active:scale-[0.98]"
    >
      <div className="text-2xl">{tracker.icon || '📊'}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{tracker.name}</p>
        <p className="text-sm text-muted-foreground">
          {todayCount > 0 
            ? `${todayCount} ${todayCount === 1 ? tracker.unitSingular : tracker.unitPlural}`
            : '—'
          }
        </p>
      </div>
    </button>
  );
};
