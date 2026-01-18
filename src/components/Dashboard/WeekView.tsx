import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nContext";
import { AppState, Habit } from "@/data/types";
import { isHabitDoneOnDate } from "@/data/storage";
import { GatedOverlay } from "@/components/Premium/GatedOverlay";
import { useSubscription } from "@/hooks/useSubscription";

interface WeekViewProps {
  state: AppState;
  selectedDate: Date;
}

/**
 * Week View - Rhythm
 * Semana = ritmo
 * Dots por hábito
 * Linha de dias
 * Sem comparação, sem percentagens, sem scores
 */
export const WeekView = ({ state, selectedDate }: WeekViewProps) => {
  const { locale } = useI18n();
  const { isPro } = useSubscription();
  
  const dateLocale = locale === 'pt-PT' ? pt : enUS;
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  
  // Get 7 days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Get active habits
  const activeHabits = state.habits.filter(h => h.active);

  const content = (
    <div className="space-y-6">
      {/* Week header */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {format(weekStart, "d MMM", { locale: dateLocale })} — {format(addDays(weekStart, 6), "d MMM", { locale: dateLocale })}
        </p>
      </div>

      {/* Days row */}
      <div className="flex justify-between gap-1 px-4">
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {format(day, "EEE", { locale: dateLocale }).slice(0, 3)}
            </span>
            <span className={cn(
              "text-sm font-medium w-8 h-8 flex items-center justify-center rounded-full",
              isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
            )}>
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>

      {/* Habits rhythm */}
      <div className="space-y-4 px-1">
        {activeHabits.map((habit) => (
          <HabitWeekRhythm
            key={habit.id}
            habit={habit}
            weekDays={weekDays}
            state={state}
          />
        ))}
      </div>

      {activeHabits.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {locale === 'pt-PT' ? 'Adiciona hábitos para ver o ritmo semanal' : 'Add habits to see weekly rhythm'}
        </div>
      )}
    </div>
  );

  // Gated for FREE users
  if (!isPro) {
    return (
      <GatedOverlay feature={locale === 'pt-PT' ? 'Vista Semanal' : 'Weekly View'}>
        {content}
      </GatedOverlay>
    );
  }

  return content;
};

// Habit week rhythm component
const HabitWeekRhythm = ({
  habit,
  weekDays,
  state,
}: {
  habit: Habit;
  weekDays: Date[];
  state: AppState;
}) => {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-card/30 border border-border/20">
      {/* Habit name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: habit.cor || "hsl(var(--primary))" }}
          />
          <span className="font-medium text-sm truncate">{habit.nome}</span>
        </div>
      </div>

      {/* Dots */}
      <div className="flex gap-2">
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isDone = isHabitDoneOnDate(state, habit.id, dateStr);
          const isFuture = day > new Date();
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                isFuture
                  ? "bg-border/30"
                  : isDone
                    ? "bg-primary"
                    : "bg-muted-foreground/20"
              )}
              style={isDone && habit.cor ? { backgroundColor: habit.cor } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};
