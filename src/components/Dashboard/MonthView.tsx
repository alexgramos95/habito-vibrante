import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { AppState } from "@/data/types";
import { isHabitDoneOnDate } from "@/data/storage";
import { GatedOverlay } from "@/components/Premium/GatedOverlay";
import { useSubscription } from "@/hooks/useSubscription";

interface MonthViewProps {
  state: AppState;
  currentMonth: number;
  currentYear: number;
}

/**
 * Month View - Narrative
 * Mês = narrativa
 * Sparkline + texto observacional
 * Sem números crus, sem "performance", sem progresso
 */
export const MonthView = ({ state, currentMonth, currentYear }: MonthViewProps) => {
  const { locale } = useI18n();
  const { isPro } = useSubscription();
  const [monthOffset, setMonthOffset] = useState(0);

  const dateLocale = locale === 'pt-PT' ? pt : enUS;
  const baseMonth = new Date(currentYear, currentMonth);
  const viewMonth = addMonths(baseMonth, monthOffset);
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);

  // Generate narrative insights
  const insights = generateNarrativeInsights(state, viewMonth.getFullYear(), viewMonth.getMonth(), locale);

  const content = (
    <div className="space-y-8">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => setMonthOffset(prev => prev - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-lg font-medium capitalize">
          {format(monthStart, "MMMM yyyy", { locale: dateLocale })}
        </h2>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={() => setMonthOffset(prev => prev + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Micro sparkline area chart */}
      <MonthSparkline
        state={state}
        monthStart={monthStart}
        monthEnd={monthEnd}
      />

      {/* Narrative insights */}
      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-card/30 border border-border/20"
          >
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              {insight}
            </p>
          </div>
        ))}
      </div>

      {/* Subtle month grid */}
      <MonthGrid
        state={state}
        monthStart={monthStart}
        monthEnd={monthEnd}
        locale={locale}
      />
    </div>
  );

  // Gated for FREE users
  if (!isPro) {
    return (
      <GatedOverlay feature={locale === 'pt-PT' ? 'Vista Mensal' : 'Monthly View'}>
        {content}
      </GatedOverlay>
    );
  }

  return content;
};

// Micro sparkline visualization
const MonthSparkline = ({
  state,
  monthStart,
  monthEnd,
}: {
  state: AppState;
  monthStart: Date;
  monthEnd: Date;
}) => {
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const activeHabits = state.habits.filter(h => h.active);
  const today = new Date();

  if (activeHabits.length === 0) return null;

  // Calculate daily completion ratios
  const dailyData = days.map(day => {
    const dateStr = format(day, "yyyy-MM-dd");
    const isFuture = day > today;
    
    if (isFuture) return { ratio: 0, isFuture: true };
    
    let completed = 0;
    activeHabits.forEach(habit => {
      if (isHabitDoneOnDate(state, habit.id, dateStr)) {
        completed++;
      }
    });
    
    return {
      ratio: activeHabits.length > 0 ? completed / activeHabits.length : 0,
      isFuture: false
    };
  });

  const maxHeight = 40;
  const barWidth = 100 / days.length;

  return (
    <div className="p-4 rounded-2xl bg-card/20 border border-border/10">
      <div className="flex items-end justify-between h-12 gap-0.5">
        {dailyData.map((data, idx) => (
          <div
            key={idx}
            className={cn(
              "flex-1 rounded-t-sm transition-all",
              data.isFuture 
                ? "bg-border/20" 
                : data.ratio === 0 
                  ? "bg-muted-foreground/10"
                  : "bg-primary/60"
            )}
            style={{
              height: data.isFuture ? 4 : Math.max(4, data.ratio * maxHeight),
              opacity: data.isFuture ? 0.3 : 0.4 + (data.ratio * 0.6)
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Generate observational narrative insights
const generateNarrativeInsights = (
  state: AppState,
  year: number,
  month: number,
  locale: string
): string[] => {
  const insights: string[] = [];
  const activeHabits = state.habits.filter(h => h.active);
  
  if (activeHabits.length === 0) {
    return [
      locale === 'pt-PT' 
        ? 'Ainda não tens hábitos definidos. Começa com um pequeno compromisso diário.'
        : 'You haven\'t defined any habits yet. Start with a small daily commitment.'
    ];
  }

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const today = new Date();
  
  let morningCompletions = 0;
  let eveningCompletions = 0;
  let weekendCompletions = 0;
  let weekdayCompletions = 0;
  let daysWithActivity = 0;
  let totalDays = 0;

  for (let d = new Date(monthStart); d <= monthEnd && d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = format(d, "yyyy-MM-dd");
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    let dayHasActivity = false;

    totalDays++;

    activeHabits.forEach(habit => {
      if (isHabitDoneOnDate(state, habit.id, dateStr)) {
        dayHasActivity = true;
        
        if (habit.scheduledTime) {
          const hour = parseInt(habit.scheduledTime.split(':')[0], 10);
          if (hour < 12) morningCompletions++;
          else eveningCompletions++;
        }
        
        if (isWeekend) weekendCompletions++;
        else weekdayCompletions++;
      }
    });

    if (dayHasActivity) daysWithActivity++;
  }

  // Generate narrative based on patterns
  if (morningCompletions > eveningCompletions && morningCompletions > 3) {
    insights.push(
      locale === 'pt-PT'
        ? 'Manhãs com mais intenção — os teus primeiros momentos do dia têm sido consistentes.'
        : 'Mornings with more intention — your first moments of the day have been consistent.'
    );
  } else if (eveningCompletions > morningCompletions && eveningCompletions > 3) {
    insights.push(
      locale === 'pt-PT'
        ? 'Mais foco ao final da tarde — encontraste o teu ritmo nos momentos de descompressão.'
        : 'More focus in the evening — you\'ve found your rhythm in winding-down moments.'
    );
  }

  if (weekendCompletions > 0 && weekdayCompletions > 0) {
    const weekendRatio = weekendCompletions / (weekendCompletions + weekdayCompletions);
    if (weekendRatio < 0.15) {
      insights.push(
        locale === 'pt-PT'
          ? 'Fins de semana com desaceleração — permites-te pausar quando o ritmo muda.'
          : 'Weekends with slowdown — you allow yourself to pause when the pace changes.'
      );
    } else if (weekendRatio > 0.30) {
      insights.push(
        locale === 'pt-PT'
          ? 'Consistência mesmo nos fins de semana — o ritmo mantém-se independente do dia.'
          : 'Consistency even on weekends — the rhythm stays regardless of the day.'
      );
    }
  }

  // Continuity insight
  if (daysWithActivity > 0 && totalDays > 0) {
    const continuityRatio = daysWithActivity / totalDays;
    if (continuityRatio > 0.7) {
      insights.push(
        locale === 'pt-PT'
          ? 'Este mês revela continuidade — cada dia tem contribuído para a tua transformação.'
          : 'This month reveals continuity — each day has contributed to your transformation.'
      );
    } else if (continuityRatio > 0.4) {
      insights.push(
        locale === 'pt-PT'
          ? 'Um padrão está a emergir — a narrativa ganha forma com cada ação.'
          : 'A pattern is emerging — the narrative takes shape with each action.'
      );
    }
  }

  return insights.length > 0 ? insights : [
    locale === 'pt-PT'
      ? 'Continua a construir o teu ritmo. A narrativa ganha forma com o tempo.'
      : 'Keep building your rhythm. The narrative takes shape over time.'
  ];
};

// Subtle month grid visualization
const MonthGrid = ({
  state,
  monthStart,
  monthEnd,
  locale,
}: {
  state: AppState;
  monthStart: Date;
  monthEnd: Date;
  locale: string;
}) => {
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const activeHabits = state.habits.filter(h => h.active);
  const today = new Date();
  
  // Get starting day offset (Monday = 0)
  const startDayOfWeek = getDay(monthStart);
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  // Day labels
  const dayLabels = locale === 'pt-PT' 
    ? ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="space-y-3">
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {dayLabels.map((day, i) => (
          <span key={i} className="text-[10px] text-muted-foreground/40 font-medium">{day}</span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Empty cells for offset */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {/* Actual days */}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isFuture = day > today;
          
          // Calculate completion ratio
          let completed = 0;
          activeHabits.forEach(habit => {
            if (isHabitDoneOnDate(state, habit.id, dateStr)) {
              completed++;
            }
          });
          const ratio = activeHabits.length > 0 ? completed / activeHabits.length : 0;

          return (
            <div
              key={dateStr}
              className={cn(
                "aspect-square rounded-md transition-all",
                isFuture
                  ? "bg-border/15"
                  : ratio === 0
                    ? "bg-muted-foreground/8"
                    : ratio < 0.5
                      ? "bg-primary/25"
                      : ratio < 1
                        ? "bg-primary/50"
                        : "bg-primary/75"
              )}
            />
          );
        })}
      </div>
    </div>
  );
};
