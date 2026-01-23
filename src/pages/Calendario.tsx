import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isFuture, getDay, startOfWeek, endOfWeek, addDays, subDays, addWeeks, subWeeks, differenceInWeeks } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Flame, Check, X, Clock, PenLine, ShoppingCart, Lock, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppState, Habit, Tracker, DailyReflection, ShoppingItem } from "@/data/types";
import { loadState, saveState, toggleDailyLog, getReflectionForDate } from "@/data/storage";
import { getCompletedHabitsOnDate, getActiveHabits } from "@/logic/computations";
import { getHabitsSortedForDay } from "@/logic/habitSorting";
import { Navigation } from "@/components/Layout/Navigation";
import { PageHeader } from "@/components/Layout/PageHeader";
import { MonthSelector } from "@/components/Dashboard/MonthSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { TrialBanner } from "@/components/Paywall/TrialBanner";

type ViewMode = "daily" | "weekly" | "monthly";

const Calendario = () => {
  const navigate = useNavigate();
  const { t, locale, formatDate } = useI18n();
  const [state, setState] = useState<AppState>(() => loadState());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [detailDate, setDetailDate] = useState<Date | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPro, trialStatus, upgradeToPro, getLimits } = useSubscription();
  
  const dateLocale = locale === 'pt-PT' ? pt : enUSLocale;
  const limits = getLimits();
  
  // Check if date is within allowed history
  const isDateAccessible = (date: Date): boolean => {
    if (isPro) return true;
    const today = new Date();
    const daysBack = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return daysBack <= (limits.calendarDaysBack as number);
  };

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const handleStorageChange = () => setState(loadState());
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const weekdays = locale === 'pt-PT' 
    ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
    setSelectedDate(today);
  };

  const handlePreviousWeek = () => {
    setSelectedDate(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setSelectedDate(prev => addWeeks(prev, 1));
  };

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
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

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [selectedDate]);

  // Get active habits sorted by scheduled time
  const activeHabits = useMemo(() => {
    const habits = getActiveHabits(state);
    return habits.sort((a, b) => {
      if (!a.scheduledTime && !b.scheduledTime) return 0;
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });
  }, [state]);

  // Helper to check if a habit is scheduled for a specific weekday
  // weekday: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isHabitScheduledForDay = (habit: Habit, date: Date): boolean => {
    // If no scheduledDays or empty, habit is scheduled every day
    if (!habit.scheduledDays || habit.scheduledDays.length === 0) {
      return true;
    }
    const dayOfWeek = getDay(date); // 0 = Sunday
    return habit.scheduledDays.includes(dayOfWeek);
  };

  // Get habits for a specific date (filtered by weekday schedule and sorted by time)
  const getHabitsForDate = (date: Date) => {
    const dayOfWeek = getDay(date);
    return getHabitsSortedForDay(activeHabits, dayOfWeek);
  };
  
  const activeTrackers = (state.trackers || []).filter(t => t.active);

  // Get daily tracker reminders (trackers with frequency=daily and scheduledTime set)
  const dailyTrackerReminders = useMemo(() => {
    return activeTrackers.filter(t => 
      t.frequency === 'daily' && t.scheduledTime
    );
  }, [activeTrackers]);

  const getDayData = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Get habits scheduled for this specific day
    const habitsForDay = getHabitsForDate(date);
    
    // Count completed habits that are actually scheduled for this day
    const completedHabits = habitsForDay.filter(habit =>
      state.dailyLogs.some(
        log => log.habitId === habit.id && log.date === dateStr && log.done
      )
    ).length;
    
    const reflection = getReflectionForDate(state, dateStr);
    
    const trackerEntries = (state.trackerEntries || []).filter(e => e.date === dateStr);
    const trackerCount = trackerEntries.reduce((sum, e) => sum + e.quantity, 0);
    
    const shoppingItems = (state.shoppingItems || []).filter(item => {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      return item.weekStartDate === format(weekStart, "yyyy-MM-dd");
    });
    
    const triggers = (state.triggers || []).filter(trigger => trigger.active);

    // Get daily tracker reminders for this date
    const trackerReminders = dailyTrackerReminders.map(tracker => ({
      trackerId: tracker.id,
      name: tracker.name,
      icon: tracker.icon,
      time: tracker.scheduledTime!,
    }));

    return {
      completedHabits,
      totalHabits: habitsForDay.length,
      reflection,
      trackerEntries,
      trackerCount,
      shoppingItems,
      triggers,
      trackerReminders,
    };
  };

  const calculateStreak = () => {
    let streak = 0;
    let currentDate = new Date();
    
    while (true) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const completed = getCompletedHabitsOnDate(state, currentDate);
      
      if (completed === activeHabits.length && activeHabits.length > 0) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const handleToggleHabit = (habitId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const result = toggleDailyLog(state, habitId, dateStr);
    setState(result.newState);
  };

  const openDayDetail = (date: Date) => {
    // Check if date is accessible (within free limits) - only for past dates
    if (!isFuture(date) && !isDateAccessible(date)) {
      setShowPaywall(true);
      return;
    }
    setDetailDate(date);
    setShowDayDetail(true);
  };

  const currentStreak = calculateStreak();

  const renderDayCell = (date: Date | null, key: string) => {
    if (!date) {
      return <div key={key} className="aspect-square" />;
    }

    const data = getDayData(date);
    const isTodayDate = isToday(date);
    const isFutureDate = isFuture(date);
    const isComplete = data.completedHabits === data.totalHabits && data.totalHabits > 0;
    const isPartial = data.completedHabits > 0 && data.completedHabits < data.totalHabits;
    const hasReflection = !!data.reflection;
    const hasTrackerActivity = data.trackerCount > 0;
    const isLocked = !isFutureDate && !isDateAccessible(date);

    return (
      <button
        key={key}
        onClick={() => openDayDetail(date)}
        className={cn(
          "relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all duration-200",
          "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50",
          isFutureDate && "opacity-50",
          isLocked && "opacity-50",
          !isFutureDate && !isComplete && !isPartial && !isLocked && "bg-secondary/50 text-muted-foreground hover:bg-secondary",
          !isLocked && isPartial && "bg-primary/20 text-primary",
          !isLocked && isComplete && "bg-primary text-primary-foreground shadow-lg",
          isTodayDate && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        {isLocked ? (
          <Lock className="h-4 w-4 text-muted-foreground" />
        ) : (
          <>
            <span className="text-lg">{format(date, "d")}</span>
            {!isFutureDate && data.totalHabits > 0 && (
              <span className="text-xs opacity-80">{data.completedHabits}/{data.totalHabits}</span>
            )}
          </>
        )}
        {/* Indicators */}
        {!isLocked && (
          <div className="absolute bottom-1 flex gap-0.5">
            {hasReflection && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
            {hasTrackerActivity && <div className="w-1.5 h-1.5 rounded-full bg-warning" />}
            {data.trackerReminders.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </div>
        )}
      </button>
    );
  };

  const renderDayDetail = () => {
    if (!detailDate) return null;
    
    const data = getDayData(detailDate);
    const dateStr = format(detailDate, "yyyy-MM-dd");
    const isComplete = data.completedHabits === data.totalHabits && data.totalHabits > 0;

    // Get shopping items for this specific day (items bought on this date or with done status in this week)
    const dailyShoppingItems = (state.shoppingItems || []).filter(item => {
      if (item.purchaseDate) {
        return item.purchaseDate === dateStr;
      }
      // Fallback: show done items from the same week
      return item.done && item.weekStartDate === format(startOfWeek(detailDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
    });

    return (
      <Dialog open={showDayDetail} onOpenChange={setShowDayDetail}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {formatDate(detailDate, locale === 'pt-PT' ? "EEEE, d 'de' MMMM" : "EEEE, MMMM d")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Completion Status */}
            <div className={cn(
              "p-4 rounded-xl border",
              isComplete 
                ? "bg-success/10 border-success/30" 
                : "bg-secondary/50 border-border/30"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isComplete ? <Check className="h-5 w-5 text-success" /> : <X className="h-5 w-5 text-muted-foreground" />}
                  <span className="font-medium">
                    {data.completedHabits} / {data.totalHabits} {locale === 'pt-PT' ? 'hábitos' : 'habits'}
                  </span>
                </div>
                <Badge variant={isComplete ? "default" : "secondary"}>
                  {isComplete 
                    ? (locale === 'pt-PT' ? 'Completo' : 'Complete')
                    : (locale === 'pt-PT' ? 'Incompleto' : 'Incomplete')}
                </Badge>
              </div>
            </div>

            {/* Habits List with Toggle - Filtered by weekday schedule */}
            {(() => {
              const habitsForDay = getHabitsForDate(detailDate);
              return habitsForDay.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {locale === 'pt-PT' ? 'Hábitos' : 'Habits'}
                  </h4>
                  <div className="space-y-2">
                                    {habitsForDay.map(habit => {
                                      const isDone = state.dailyLogs.some(
                                        l => l.habitId === habit.id && l.date === dateStr && l.done
                                      );
                                      const isFutureDetail = detailDate ? isFuture(detailDate) : false;
                                      return (
                                        <button
                                          key={habit.id}
                                          onClick={() => !isFutureDetail && handleToggleHabit(habit.id, detailDate!)}
                                          disabled={isFutureDetail}
                                          className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-lg transition-all",
                                            isFutureDetail && "opacity-50 cursor-not-allowed",
                                            isDone 
                                              ? "bg-primary/10 border border-primary/30" 
                                              : "bg-secondary/50 border border-border/30 hover:bg-secondary"
                                          )}
                                        >
                                          <div className="flex items-center gap-3">
                                            <div 
                                              className="w-3 h-3 rounded-full" 
                                              style={{ backgroundColor: habit.cor || '#14b8a6' }} 
                                            />
                                            <div className="flex flex-col items-start">
                                              <span className={cn(isDone && "line-through opacity-70")}>{habit.nome}</span>
                                              {habit.scheduledTime && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                  <Clock className="h-3 w-3" />
                                                  {habit.scheduledTime}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {isDone ? <Check className="h-4 w-4 text-primary" /> : <div className="w-4 h-4 rounded border border-muted-foreground" />}
                                        </button>
                                      );
                                    })}
                  </div>
                </div>
              );
            })()}

            {/* Tracker Reminders (Scheduled) */}
            {data.trackerReminders.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  {locale === 'pt-PT' ? 'Lembretes de Trackers' : 'Tracker Reminders'}
                </h4>
                <div className="space-y-1">
                  {data.trackerReminders.map(reminder => (
                    <button
                      key={reminder.trackerId}
                      onClick={() => {
                        setShowDayDetail(false);
                        navigate('/app/trackers');
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors"
                    >
                      <span className="text-sm">
                        {reminder.icon} {reminder.name}
                      </span>
                      <span className="text-sm font-medium text-primary flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {reminder.time}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tracker Activity */}
            {data.trackerEntries.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {locale === 'pt-PT' ? 'Registos de Trackers' : 'Tracker Entries'}
                </h4>
                <div className="space-y-1">
                  {data.trackerEntries.map(entry => {
                    const tracker = state.trackers?.find(t => t.id === entry.trackerId);
                    return (
                      <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                        <span className="text-sm">
                          {tracker?.icon} {tracker?.name}
                        </span>
                        <span className="text-sm font-medium">
                          +{entry.quantity} {entry.quantity === 1 ? tracker?.unitSingular : tracker?.unitPlural}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shopping Items */}
            {dailyShoppingItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  {locale === 'pt-PT' ? 'Compras' : 'Purchases'}
                </h4>
                <div className="space-y-1">
                  {dailyShoppingItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                      <span className="text-sm">{item.nome}</span>
                      {item.price && (
                        <span className="text-sm font-medium text-warning">
                          {item.price.toFixed(2)}€
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reflection */}
            {data.reflection && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PenLine className="h-4 w-4" />
                  {locale === 'pt-PT' ? 'Reflexão' : 'Reflection'}
                </h4>
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                  <p className="text-sm">{data.reflection.text}</p>
                  <Badge variant="outline" className="mt-2">
                    {data.reflection.mood === 'positive' ? '😊' : data.reflection.mood === 'challenging' ? '💪' : '😐'}
                  </Badge>
                </div>
              </div>
            )}

            {/* Empty State */}
            {data.completedHabits === 0 && data.trackerEntries.length === 0 && data.trackerReminders.length === 0 && !data.reflection && dailyShoppingItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {locale === 'pt-PT' ? 'Sem atividade registada' : 'No activity recorded'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <PageHeader
          title={t.calendar.title}
          subtitle={(t as any).pageSubtitles?.calendar || (locale === 'pt-PT' ? 'Visualiza o teu progresso ao longo do tempo' : 'View your progress over time')}
          icon={CalendarIcon}
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass">
            <Flame className="h-5 w-5 text-warning" />
            <span className="font-bold text-lg">{currentStreak}</span>
            <span className="text-sm text-muted-foreground">{t.kpis.days}</span>
          </div>
        </PageHeader>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="daily">{locale === 'pt-PT' ? 'Diário' : 'Daily'}</TabsTrigger>
            <TabsTrigger value="weekly">{locale === 'pt-PT' ? 'Semanal' : 'Weekly'}</TabsTrigger>
            <TabsTrigger value="monthly">{locale === 'pt-PT' ? 'Mensal' : 'Monthly'}</TabsTrigger>
          </TabsList>

          {/* Monthly View */}
          <TabsContent value="monthly" className="mt-6">
            <Card className="premium-card border-border/30">
              <CardHeader className="pb-4">
                <MonthSelector
                  year={currentYear}
                  month={currentMonth}
                  onPrevious={handlePreviousMonth}
                  onNext={handleNextMonth}
                  onToday={handleToday}
                />
              </CardHeader>
              <CardContent>
                {/* Weekday headers */}
                <div className="mb-2 grid grid-cols-7 gap-2">
                  {weekdays.map((day) => (
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
                  {calendarDays.map(({ date, key }) => renderDayCell(date, key))}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary" />
                    <span>{locale === 'pt-PT' ? 'Completo' : 'Complete'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary/20" />
                    <span>{locale === 'pt-PT' ? 'Parcial' : 'Partial'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>{locale === 'pt-PT' ? 'Reflexão' : 'Reflection'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                    <span>{locale === 'pt-PT' ? 'Tracker' : 'Tracker'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{locale === 'pt-PT' ? 'Lembrete' : 'Reminder'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly View */}
          <TabsContent value="weekly" className="mt-6">
            <Card className="premium-card border-border/30">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={handlePreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium">
                    {format(weekDays[0], "d MMM", { locale: dateLocale })} - {format(weekDays[6], "d MMM yyyy", { locale: dateLocale })}
                  </span>
                  <Button variant="ghost" size="icon" onClick={handleNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((date) => {
                    const data = getDayData(date);
                    const isTodayDate = isToday(date);
                    const isFutureDate = isFuture(date);
                    const isComplete = data.completedHabits === data.totalHabits && data.totalHabits > 0;

                    return (
                      <button
                        key={format(date, "yyyy-MM-dd")}
                        onClick={() => openDayDetail(date)}
                        className={cn(
                          "flex flex-col items-center p-4 rounded-xl transition-all hover:bg-secondary/50 cursor-pointer",
                          isFutureDate && "opacity-50",
                          isTodayDate && "ring-2 ring-primary",
                          isComplete && "bg-primary/10"
                        )}
                      >
                        <span className="text-xs text-muted-foreground">{weekdays[weekDays.indexOf(date)]}</span>
                        <span className={cn("text-2xl font-bold my-2", isComplete && "text-primary")}>
                          {format(date, "d")}
                        </span>
                        <div className="flex items-center gap-1">
                          {!isFutureDate ? (
                            isComplete 
                              ? <Check className="h-4 w-4 text-success" />
                              : <span className="text-xs">{data.completedHabits}/{data.totalHabits}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily View */}
          <TabsContent value="daily" className="mt-6">
            <Card className="premium-card border-border/30">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={handlePreviousDay}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center">
                    <span className="font-medium text-lg">
                      {formatDate(selectedDate, locale === 'pt-PT' ? "EEEE" : "EEEE")}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedDate, locale === 'pt-PT' ? "d 'de' MMMM yyyy" : "MMMM d, yyyy")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleNextDay}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {(() => {
                  const data = getDayData(selectedDate);
                  const dateStr = format(selectedDate, "yyyy-MM-dd");
                  const isComplete = data.completedHabits === data.totalHabits && data.totalHabits > 0;

                  return (
                    <>
                      {/* Status */}
                      <div className={cn(
                        "p-6 rounded-xl text-center",
                        isComplete ? "bg-success/10" : "bg-secondary/50"
                      )}>
                        <div className="text-4xl font-bold mb-2">
                          {data.completedHabits}/{data.totalHabits}
                        </div>
                        <p className="text-muted-foreground">
                          {locale === 'pt-PT' ? 'hábitos concluídos' : 'habits completed'}
                        </p>
                      </div>

                      {/* Habits - Filtered by weekday schedule */}
                      {(() => {
                        const habitsForDay = getHabitsForDate(selectedDate);
                        return habitsForDay.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium">{locale === 'pt-PT' ? 'Hábitos' : 'Habits'}</h4>
                            {habitsForDay.map(habit => {
                              const isDone = state.dailyLogs.some(
                                l => l.habitId === habit.id && l.date === dateStr && l.done
                              );
                              return (
                                <button
                                  key={habit.id}
                                  onClick={() => handleToggleHabit(habit.id, selectedDate)}
                                  disabled={isFuture(selectedDate)}
                                  className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-xl transition-all",
                                    isFuture(selectedDate) && "opacity-50 cursor-not-allowed",
                                    isDone 
                                      ? "bg-primary/10 border border-primary/30" 
                                      : "bg-secondary/50 hover:bg-secondary"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: habit.cor || '#14b8a6' }} 
                                    />
                                    <span>
                                      {habit.nome}
                                      {habit.scheduledTime && (
                                        <span className="text-muted-foreground ml-2 text-sm">
                                          {habit.scheduledTime}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  {isDone 
                                    ? <Check className="h-5 w-5 text-primary" />
                                    : <div className="w-5 h-5 rounded border-2 border-muted-foreground" />
                                  }
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Tracker Summary */}
                      {data.trackerCount > 0 && (
                        <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-warning" />
                            <span className="font-medium">{locale === 'pt-PT' ? 'Atividade de Trackers' : 'Tracker Activity'}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {data.trackerEntries.length} {locale === 'pt-PT' ? 'registos' : 'entries'} ({data.trackerCount} {locale === 'pt-PT' ? 'total' : 'total'})
                          </p>
                        </div>
                      )}

                      {/* Reflection */}
                      {data.reflection && (
                        <div className="p-4 rounded-xl bg-accent/10 border border-accent/30">
                          <div className="flex items-center gap-2 mb-2">
                            <PenLine className="h-4 w-4 text-accent" />
                            <span className="font-medium">{locale === 'pt-PT' ? 'Reflexão do Dia' : 'Daily Reflection'}</span>
                          </div>
                          <p className="text-sm">{data.reflection.text}</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {renderDayDetail()}

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={upgradeToPro}
        trigger="calendar"
        trialDaysLeft={trialStatus.daysRemaining}
      />
    </div>
  );
};

export default Calendario;