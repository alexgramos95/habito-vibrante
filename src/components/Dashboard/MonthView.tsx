import { format, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, addDays } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
 * Texto observacional + tons suaves
 * Sem números, sem julgamento
 */
export const MonthView = ({ state, currentMonth, currentYear }: MonthViewProps) => {
  const { locale } = useI18n();
  const { isPro } = useSubscription();

  const dateLocale = locale === 'pt-PT' ? pt : enUS;
  const monthStart = startOfMonth(new Date(currentYear, currentMonth));
  const monthEnd = endOfMonth(monthStart);

  // Generate narrative insights
  const insights = generateNarrativeInsights(state, currentYear, currentMonth, locale);

  const content = (
    <div className="space-y-6">
      {/* Month header */}
      <div className="text-center">
        <h2 className="text-lg font-medium">
          {format(monthStart, "MMMM yyyy", { locale: dateLocale })}
        </h2>
      </div>

      {/* Narrative insights */}
      <div className="space-y-4">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-card/30 border border-border/20"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
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

  // Analyze patterns
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const today = new Date();
  
  let morningCompletions = 0;
  let eveningCompletions = 0;
  let weekendCompletions = 0;
  let weekdayCompletions = 0;
  let totalCompletions = 0;
  let totalPossible = 0;

  for (let d = new Date(monthStart); d <= monthEnd && d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = format(d, "yyyy-MM-dd");
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    activeHabits.forEach(habit => {
      totalPossible++;
      if (isHabitDoneOnDate(state, habit.id, dateStr)) {
        totalCompletions++;
        
        // Infer time patterns from scheduled time
        if (habit.scheduledTime) {
          const hour = parseInt(habit.scheduledTime.split(':')[0], 10);
          if (hour < 12) morningCompletions++;
          else eveningCompletions++;
        }
        
        if (isWeekend) weekendCompletions++;
        else weekdayCompletions++;
      }
    });
  }

  // Generate narrative based on patterns
  if (morningCompletions > eveningCompletions && morningCompletions > 5) {
    insights.push(
      locale === 'pt-PT'
        ? 'Manhãs com mais intenção — os teus primeiros momentos do dia têm sido consistentes.'
        : 'Mornings with more intention — your first moments of the day have been consistent.'
    );
  } else if (eveningCompletions > morningCompletions && eveningCompletions > 5) {
    insights.push(
      locale === 'pt-PT'
        ? 'Mais foco ao final da tarde — encontraste o teu ritmo nos momentos de descompressão.'
        : 'More focus in the evening — you\'ve found your rhythm in winding-down moments.'
    );
  }

  if (weekendCompletions > 0 && weekdayCompletions > 0) {
    const weekendRatio = weekendCompletions / (weekendCompletions + weekdayCompletions);
    if (weekendRatio < 0.2) {
      insights.push(
        locale === 'pt-PT'
          ? 'Fins de semana com desaceleração — permites-te pausar quando o ritmo muda.'
          : 'Weekends with slowdown — you allow yourself to pause when the pace changes.'
      );
    } else if (weekendRatio > 0.35) {
      insights.push(
        locale === 'pt-PT'
          ? 'Consistência mesmo nos fins de semana — o ritmo mantém-se independente do dia.'
          : 'Consistency even on weekends — the rhythm stays regardless of the day.'
      );
    }
  }

  // General continuity insight
  if (totalCompletions > 0 && totalPossible > 0) {
    insights.push(
      locale === 'pt-PT'
        ? 'O mês revela um padrão — cada dia contribui para a tua transformação.'
        : 'The month reveals a pattern — each day contributes to your transformation.'
    );
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
  const dateLocale = locale === 'pt-PT' ? pt : enUS;
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 }
  );
  
  const activeHabits = state.habits.filter(h => h.active);
  const today = new Date();

  return (
    <div className="space-y-2">
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => (
          <span key={i} className="text-xs text-muted-foreground/50">{day}</span>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((weekStart) => (
        <div key={weekStart.toISOString()} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => {
            const day = addDays(weekStart, i);
            const dateStr = format(day, "yyyy-MM-dd");
            const isInMonth = day >= monthStart && day <= monthEnd;
            const isFuture = day > today;
            
            if (!isInMonth) {
              return <div key={i} className="h-6" />;
            }

            // Calculate completion for this day
            let completed = 0;
            let total = 0;
            activeHabits.forEach(habit => {
              total++;
              if (isHabitDoneOnDate(state, habit.id, dateStr)) {
                completed++;
              }
            });

            const completionRatio = total > 0 ? completed / total : 0;

            return (
              <div
                key={i}
                className={cn(
                  "h-6 w-6 rounded-sm mx-auto transition-all",
                  isFuture
                    ? "bg-border/20"
                    : completionRatio === 0
                      ? "bg-muted-foreground/10"
                      : completionRatio < 0.5
                        ? "bg-primary/20"
                        : completionRatio < 1
                          ? "bg-primary/50"
                          : "bg-primary/80"
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
