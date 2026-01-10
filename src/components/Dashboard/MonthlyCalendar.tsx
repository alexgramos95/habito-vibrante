import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isFuture, getDay, startOfWeek, addDays } from "date-fns";
import { pt } from "date-fns/locale";
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

export const MonthlyCalendar = ({ state, year, month, onDayClick }: MonthlyCalendarProps) => {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month));
    const monthEnd = endOfMonth(new Date(year, month));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Get the first day of the week for the calendar (Monday = 1 in PT)
    const firstDayOfMonth = getDay(monthStart);
    // Convert to Monday-first (0 = Monday, 6 = Sunday)
    const startPadding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    // Create padding for days before the month starts
    const paddingDays = Array.from({ length: startPadding }, (_, i) => ({
      date: null,
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
            className="py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
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
                "relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all duration-200",
                "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50",
                isFutureDate && "cursor-not-allowed opacity-30",
                !isFutureDate && !isComplete && !isPartial && "bg-secondary/50 text-muted-foreground hover:bg-secondary",
                isPartial && "bg-primary/20 text-primary",
                isComplete && "bg-primary text-primary-foreground shadow-lg",
                isTodayDate && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              <span>{format(date, "d")}</span>
              {!isFutureDate && activeHabitsCount > 0 && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {Array.from({ length: Math.min(activeHabitsCount, 4) }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 w-1 rounded-full transition-colors",
                        i < completedCount ? "bg-current opacity-100" : "bg-current opacity-30"
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
