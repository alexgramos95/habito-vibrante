import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isFuture, getDay } from "date-fns";
import { pt } from "date-fns/locale";
import { translations } from "@/i18n/translations.pt";
import { AppState } from "@/data/types";
import { loadState } from "@/data/storage";
import { getCompletedHabitsOnDate, getActiveHabits } from "@/logic/computations";
import { Navigation } from "@/components/Layout/Navigation";
import { MonthSelector } from "@/components/Dashboard/MonthSelector";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const Calendario = () => {
  const [state, setState] = useState<AppState>(() => loadState());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Re-sync state from localStorage on mount and storage events
  useEffect(() => {
    const handleStorageChange = () => {
      setState(loadState());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(new Date(currentYear, currentMonth));
    const monthEnd = endOfMonth(new Date(currentYear, currentMonth));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const firstDayOfMonth = getDay(monthStart);
    const startPadding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    const paddingDays = Array.from({ length: startPadding }, (_, i) => ({
      date: null,
      key: `padding-${i}`,
    }));
    
    const monthDays = daysInMonth.map((date) => ({
      date,
      key: format(date, "yyyy-MM-dd"),
    }));
    
    return [...paddingDays, ...monthDays];
  }, [currentYear, currentMonth]);

  const activeHabitsCount = getActiveHabits(state).length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        <h1 className="text-2xl font-bold">Calendário / Histórico</h1>

        <div className="rounded-xl border border-border/50 bg-card p-6">
          <div className="mb-6">
            <MonthSelector
              year={currentYear}
              month={currentMonth}
              onPrevious={handlePreviousMonth}
              onNext={handleNextMonth}
              onToday={handleToday}
            />
          </div>

          {/* Weekday headers */}
          <div className="mb-2 grid grid-cols-7 gap-2">
            {translations.calendar.weekdays.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-sm font-medium uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(({ date, key }) => {
              if (!date) {
                return <div key={key} className="aspect-square" />;
              }

              const completedCount = getCompletedHabitsOnDate(state, date);
              const isTodayDate = isToday(date);
              const isFutureDate = isFuture(date);
              const isComplete = completedCount === activeHabitsCount && activeHabitsCount > 0;
              const isPartial = completedCount > 0 && completedCount < activeHabitsCount;

              return (
                <Popover key={key}>
                  <PopoverTrigger asChild>
                    <button
                      disabled={isFutureDate}
                      className={cn(
                        "relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all duration-200",
                        "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50",
                        isFutureDate && "cursor-not-allowed opacity-30",
                        !isFutureDate && !isComplete && !isPartial && "bg-secondary/50 text-muted-foreground hover:bg-secondary",
                        isPartial && "bg-primary/20 text-primary",
                        isComplete && "bg-primary text-primary-foreground shadow-lg",
                        isTodayDate && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      )}
                    >
                      <span className="text-lg">{format(date, "d")}</span>
                      {!isFutureDate && completedCount > 0 && (
                        <span className="text-xs opacity-80">{completedCount}/{activeHabitsCount}</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  {!isFutureDate && (
                    <PopoverContent className="w-auto p-3">
                      <div className="text-center">
                        <p className="font-medium">
                          {format(date, "d 'de' MMMM", { locale: pt })}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {completedCount} de {activeHabitsCount} hábitos concluídos
                        </p>
                      </div>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Calendario;
