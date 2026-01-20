import { format, startOfWeek, addDays, isSameDay, subWeeks } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
 * Dots por hábito, linha de dias
 * Foco em continuidade, leveza
 * Sem comparação, sem percentagens, sem scores
 */
export const WeekView = ({ state, selectedDate }: WeekViewProps) => {
  const { locale } = useI18n();
  const { isPro } = useSubscription();
  const [weekOffset, setWeekOffset] = useState(0);
  
  const dateLocale = locale === 'pt-PT' ? pt : enUS;
  const baseWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekStart = subWeeks(baseWeekStart, -weekOffset);
  const weekEnd = addDays(weekStart, 6);
  
  // Get 7 days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Get active habits
  const activeHabits = state.habits.filter(h => h.active);
  
  // Editorial copy based on rhythm
  const getEditorialCopy = (): string => {
    const today = new Date();
    let completedDays = 0;
    
    weekDays.forEach(day => {
      if (day <= today) {
        const dateStr = format(day, "yyyy-MM-dd");
        const anyCompleted = activeHabits.some(h => isHabitDoneOnDate(state, h.id, dateStr));
        if (anyCompleted) completedDays++;
      }
    });
    
    if (completedDays === 0) {
      return locale === 'pt-PT' ? 'A semana começa aqui' : 'The week starts here';
    }
    if (completedDays <= 2) {
      return locale === 'pt-PT' ? 'Os primeiros passos contam' : 'First steps matter';
    }
    if (completedDays <= 4) {
      return locale === 'pt-PT' ? 'O ritmo vai ganhando forma' : 'The rhythm is taking shape';
    }
    return locale === 'pt-PT' ? 'Continuidade silenciosa' : 'Quiet continuity';
  };

  const content = (
    <div className="space-y-8">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => setWeekOffset(prev => prev - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <p className="text-sm font-medium">
            {format(weekStart, "d MMM", { locale: dateLocale })} — {format(weekEnd, "d MMM", { locale: dateLocale })}
          </p>
          <p className="text-xs text-muted-foreground mt-1 italic">
            {getEditorialCopy()}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => setWeekOffset(prev => prev + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Days header row */}
      <div className="flex justify-between px-2">
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="flex flex-col items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60 uppercase font-medium">
              {format(day, "EEE", { locale: dateLocale }).slice(0, 3)}
            </span>
            <span className={cn(
              "text-sm font-medium w-8 h-8 flex items-center justify-center rounded-full transition-colors",
              isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
            )}>
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>

      {/* Habits rhythm */}
      <div className="space-y-3">
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
        <div className="text-center py-12 text-muted-foreground text-sm">
          <p>{locale === 'pt-PT' ? 'Adiciona hábitos para ver o ritmo' : 'Add habits to see rhythm'}</p>
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
  const today = new Date();
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/30 border border-border/20">
      {/* Habit info */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div
          className="w-2 h-8 rounded-full shrink-0"
          style={{ backgroundColor: habit.cor || "hsl(var(--primary))" }}
        />
        <span className="font-medium text-sm truncate">{habit.nome}</span>
      </div>

      {/* Dots */}
      <div className="flex gap-2.5">
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isDone = isHabitDoneOnDate(state, habit.id, dateStr);
          const isFuture = day > today;
          const isToday = isSameDay(day, today);
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "w-3.5 h-3.5 rounded-full transition-all",
                isFuture
                  ? "bg-border/30"
                  : isDone
                    ? "scale-110"
                    : "bg-muted-foreground/15",
                isToday && !isDone && "ring-1 ring-primary/30"
              )}
              style={isDone ? { 
                backgroundColor: habit.cor || "hsl(var(--primary))",
                opacity: 0.9
              } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};
