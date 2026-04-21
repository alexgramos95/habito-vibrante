import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isFuture, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import { translations } from "@/i18n/translations.pt";
import { AppState } from "@/data/types";
import { isDayComplete, isDayPartial, getCompletedHabitsOnDate, getActiveHabits } from "@/logic/computations";

interface MonthlyCalendarProps {
  state: AppState;
  year: number;
  month: number;
  onDayClick?: (date: Date) => void;
}

/**
 * MonthlyCalendar — Arcade Overdrive
 * Sharp grid, mono labels, neon completion fills.
 */
export const MonthlyCalendar = ({ state, year, month, onDayClick }: MonthlyCalendarProps) => {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month));
    const monthEnd = endOfMonth(new Date(year, month));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const firstDayOfMonth = getDay(monthStart);
    const startPadding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const paddingDays = Array.from({ length: startPadding }, (_, i) => ({
      date: null as Date | null,
      key: `padding-${i}`,
    }));

    const monthDays = daysInMonth.map((date) => ({
      date,
      key: format(date, "yyyy-MM-dd"),
    }));

    return [...paddingDays, ...monthDays];
  }, [year, month]);

  const activeHabitsCount = getActiveHabits(state).length;

  return (
    <div className="animate-fade-in">
      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {translations.calendar.weekdays.map((day) => (
          <div
            key={day}
            className="py-2 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(({ date, key }) => {
          if (!date) {
            return <div key={key} className="aspect-square" />;
          }

          const isComplete = isDayComplete(state, date);
          const isPartial = isDayPartial(state, date);
          const isTodayDate = isToday(date);
          const isFutureDate = isFuture(date);
          const completedCount = getCompletedHabitsOnDate(state, date);

          return (
            <button
              key={key}
              onClick={() => onDayClick?.(date)}
              disabled={isFutureDate}
              className={cn(
                "relative aspect-square flex flex-col items-center justify-center font-mono text-sm font-bold tabular-nums transition-all border",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                isFutureDate && "cursor-not-allowed opacity-30 border-foreground/5",
                !isFutureDate && !isComplete && !isPartial && "border-foreground/10 bg-card/30 text-muted-foreground hover:border-primary/40",
                isPartial && "border-primary/40 bg-primary/15 text-primary",
                isComplete && "border-primary bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--neon-toxic)/0.5)]",
                isTodayDate && "ring-2 ring-accent ring-offset-1 ring-offset-background",
              )}
            >
              <span>{format(date, "d")}</span>
              {!isFutureDate && activeHabitsCount > 0 && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {Array.from({ length: Math.min(activeHabitsCount, 4) }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 w-1 transition-colors",
                        i < completedCount ? "bg-current opacity-100" : "bg-current opacity-25",
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
