import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isFuture, getDay, startOfWeek, addDays, subDays, addWeeks, subWeeks } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Flame, Check, X, Clock, PenLine, ShoppingCart, Lock, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Habit, DailyReflection } from "@/data/types";
import { toggleDailyLog, getReflectionForDate } from "@/data/storage";
import { getCompletedHabitsOnDate, getActiveHabits } from "@/logic/computations";
import { getHabitsSortedForDay } from "@/logic/habitSorting";
import { Navigation } from "@/components/Layout/Navigation";
import { PageHeader } from "@/components/Layout/PageHeader";
import { MonthSelector } from "@/components/Dashboard/MonthSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useData } from "@/contexts/DataContext";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { TrialBanner } from "@/components/Paywall/TrialBanner";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

// --- Circular progress ring (shared pattern) ---
const CircularProgress = ({ percent, size = 52 }: { percent: number; size?: number }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, percent) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="hsl(var(--primary))" strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700 ease-out"
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" className="text-xs font-bold fill-foreground">
        {Math.round(percent)}%
      </text>
    </svg>
  );
};

type ViewMode = "monthly" | "weekly" | "daily";

const Calendario = () => {
  const navigate = useNavigate();
  const { t, locale, formatDate } = useI18n();
  const { state, setState } = useData();
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

  const isDateAccessible = (date: Date): boolean => {
    if (isPro) return true;
    const today = new Date();
    const daysBack = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return daysBack <= (limits.calendarDaysBack as number);
  };

  const weekdays = locale === 'pt-PT'
    ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const viewTabs: { id: ViewMode; label: string }[] = [
    { id: 'daily', label: locale === 'pt-PT' ? 'Dia' : 'Day' },
    { id: 'weekly', label: locale === 'pt-PT' ? 'Semana' : 'Week' },
    { id: 'monthly', label: locale === 'pt-PT' ? 'Mês' : 'Month' },
  ];

  // Navigation handlers
  const handlePreviousMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
  const handleNextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };
  const handleToday = () => { const d = new Date(); setCurrentMonth(d.getMonth()); setCurrentYear(d.getFullYear()); setSelectedDate(d); };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(new Date(currentYear, currentMonth));
    const monthEnd = endOfMonth(new Date(currentYear, currentMonth));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const firstDayOfMonth = getDay(monthStart);
    const startPadding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const paddingDays = Array.from({ length: startPadding }, (_, i) => ({ date: null as Date | null, key: `p-${i}` }));
    const monthDays = daysInMonth.map(date => ({ date, key: format(date, "yyyy-MM-dd") }));
    return [...paddingDays, ...monthDays];
  }, [currentYear, currentMonth]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [selectedDate]);

  const activeHabits = useMemo(() => {
    const habits = getActiveHabits(state);
    return habits.sort((a, b) => {
      if (!a.scheduledTime && !b.scheduledTime) return 0;
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });
  }, [state]);

  const getHabitsForDate = (date: Date) => {
    const dayOfWeek = getDay(date);
    return getHabitsSortedForDay(activeHabits, dayOfWeek);
  };

  // Only use unified habits (mode-aware), no legacy tracker data
  const getDayData = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const habitsForDay = getHabitsForDate(date);
    // Simple habits completion
    const simpleHabits = habitsForDay.filter(h => !h.mode || h.mode === "simple");
    const completedSimple = simpleHabits.filter(habit =>
      state.dailyLogs.some(log => log.habitId === habit.id && log.date === dateStr && log.done)
    ).length;

    // Metric habits (unified habits with mode=metric only)
    const metricHabits = habitsForDay.filter(h => h.mode === "metric");
    const metricEntries = (state.trackerEntries || []).filter(e => 
      e.date === dateStr && metricHabits.some(h => h.id === e.trackerId)
    );
    const isPastOrToday = !isFuture(date);
    const onTrackMetrics = metricHabits.filter(h => {
      const habitEntries = metricEntries.filter(e => e.trackerId === h.id);
      const qty = habitEntries.reduce((s, e) => s + e.quantity, 0);
      const goal = h.dailyGoal ?? h.baseline ?? 0;

      // For reduction trackers (e.g. cigarettes, alcohol): success = staying at/under the limit.
      // No entries on a past/today day means the user did NOT engage in the behavior → success.
      if (h.type === "reduce") {
        if (!isPastOrToday) return false;
        return goal > 0 ? qty <= goal : qty === 0;
      }

      // For increase/boolean/event/neutral: requires actual engagement
      if (habitEntries.length === 0) return false;
      if (goal <= 0) return qty > 0;
      return qty >= goal;
    }).length;

    const totalHabits = simpleHabits.length + metricHabits.length;
    const completedHabits = completedSimple + onTrackMetrics;
    const reflection = getReflectionForDate(state, dateStr);

    return { completedHabits, totalHabits, reflection, metricEntries, simpleHabits, metricHabits };
  };

  // Monthly overview stats
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(new Date(currentYear, currentMonth));
    const monthEnd = endOfMonth(new Date(currentYear, currentMonth));
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => !isFuture(d));
    let perfectDays = 0;
    let totalCompleted = 0;
    let totalPossible = 0;
    days.forEach(d => {
      const data = getDayData(d);
      totalCompleted += data.completedHabits;
      totalPossible += data.totalHabits;
      if (data.completedHabits === data.totalHabits && data.totalHabits > 0) perfectDays++;
    });
    const consistency = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    return { perfectDays, totalDays: days.length, consistency };
  }, [currentYear, currentMonth, state]);

  // Streak
  const currentStreak = useMemo(() => {
    let streak = 0;
    let d = new Date();
    for (let i = 0; i < 365; i++) {
      const data = getDayData(d);
      if (data.totalHabits === 0) { d = subDays(d, 1); continue; }
      if (data.completedHabits === data.totalHabits) streak++;
      else break;
      d = subDays(d, 1);
    }
    return streak;
  }, [state]);

  const handleToggleHabit = (habitId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const result = toggleDailyLog(state, habitId, dateStr);
    setState(result.newState);
  };

  const openDayDetail = (date: Date) => {
    if (!isFuture(date) && !isDateAccessible(date)) { setShowPaywall(true); return; }
    setDetailDate(date);
    setShowDayDetail(true);
  };

  const renderDayCell = (date: Date | null, key: string) => {
    if (!date) return <div key={key} className="aspect-square" />;
    const data = getDayData(date);
    const isTodayDate = isToday(date);
    const isFutureDate = isFuture(date);
    const isComplete = data.completedHabits === data.totalHabits && data.totalHabits > 0;
    const isPartial = data.completedHabits > 0 && data.completedHabits < data.totalHabits;
    const isLocked = !isFutureDate && !isDateAccessible(date);

    return (
      <button
        key={key}
        onClick={() => openDayDetail(date)}
        className={cn(
          "calendar-cell relative font-medium transition-all duration-200",
          "hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/40",
          isFutureDate && "opacity-40",
          isLocked && "opacity-40",
          !isFutureDate && !isComplete && !isPartial && !isLocked && "bg-secondary/40 text-muted-foreground hover:bg-secondary/60",
          !isLocked && isPartial && "bg-primary/15 text-primary",
          !isLocked && isComplete && "bg-primary text-primary-foreground shadow-sm",
          isTodayDate && "ring-2 ring-primary ring-offset-1 ring-offset-background"
        )}
      >
        {isLocked ? (
          <Lock className="h-3 w-3 text-muted-foreground" />
        ) : (
          <>
            <span className="calendar-cell-day">{format(date, "d")}</span>
            {!isFutureDate && data.totalHabits > 0 && (
              <span className="calendar-cell-meta opacity-70">{data.completedHabits}/{data.totalHabits}</span>
            )}
          </>
        )}
      </button>
    );
  };

  const renderDayDetail = () => {
    if (!detailDate) return null;
    const data = getDayData(detailDate);
    const dateStr = format(detailDate, "yyyy-MM-dd");
    const isComplete = data.completedHabits === data.totalHabits && data.totalHabits > 0;
    const isFutureDetail = isFuture(detailDate);

    return (
      <Dialog open={showDayDetail} onOpenChange={setShowDayDetail}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {formatDate(detailDate, locale === 'pt-PT' ? "EEEE, d 'de' MMMM" : "EEEE, MMMM d")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status */}
            <div className={cn(
              "p-4 rounded-xl border text-center",
              isComplete ? "bg-success/10 border-success/30" : "bg-secondary/50 border-border/30"
            )}>
              <p className="text-2xl font-bold">{data.completedHabits}/{data.totalHabits}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isComplete
                  ? (locale === 'pt-PT' ? '✨ Dia perfeito!' : '✨ Perfect day!')
                  : (locale === 'pt-PT' ? 'hábitos concluídos' : 'habits completed')}
              </p>
            </div>

            {/* Simple Habits */}
            {data.simpleHabits.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {locale === 'pt-PT' ? 'Rituais' : 'Rituals'}
                </h4>
                {data.simpleHabits.map(habit => {
                  const isDone = state.dailyLogs.some(l => l.habitId === habit.id && l.date === dateStr && l.done);
                  return (
                    <button
                      key={habit.id}
                      onClick={() => !isFutureDetail && handleToggleHabit(habit.id, detailDate)}
                      disabled={isFutureDetail}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                        isFutureDetail && "opacity-50 cursor-not-allowed",
                        isDone ? "bg-primary/10 border border-primary/20" : "bg-secondary/40 hover:bg-secondary/60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: habit.cor || '#14b8a6' }} />
                        <span className={cn("text-sm", isDone && "line-through opacity-70")}>{habit.nome}</span>
                      </div>
                      {isDone ? <Check className="h-4 w-4 text-primary" /> : <div className="w-4 h-4 rounded border border-muted-foreground/40" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Metric Habits */}
            {data.metricHabits.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {locale === 'pt-PT' ? 'Métricas' : 'Metrics'}
                </h4>
                {data.metricHabits.map(habit => {
                  const qty = data.metricEntries.filter(e => e.trackerId === habit.id).reduce((s, e) => s + e.quantity, 0);
                  const goal = habit.dailyGoal ?? habit.baseline ?? 0;
                  const onTrack = habit.type === "reduce" ? qty <= goal : qty >= goal;
                  return (
                    <div key={habit.id} className={cn(
                      "flex items-center justify-between p-3 rounded-xl",
                      onTrack ? "bg-success/8 border border-success/20" : "bg-secondary/40"
                    )}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{habit.icon || "📊"}</span>
                        <span className="text-sm font-medium">{habit.nome}</span>
                      </div>
                      <span className={cn("text-sm font-mono", onTrack ? "text-success" : "text-muted-foreground")}>
                        {qty}/{goal} {habit.unitSingular || ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reflection */}
            {data.reflection && (
              <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                <div className="flex items-center gap-2 mb-1">
                  <PenLine className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-medium text-accent">{locale === 'pt-PT' ? 'Reflexão' : 'Reflection'}</span>
                </div>
                <p className="text-sm text-foreground/80">{data.reflection.text}</p>
              </div>
            )}

            {/* Empty */}
            {data.totalHabits === 0 && !data.reflection && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">{locale === 'pt-PT' ? 'Sem atividade registada' : 'No activity recorded'}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="page-container">
      <Navigation />

      <main className="page-content max-w-xl mx-auto space-y-8">
        <PageHeader
          title={t.calendar.title}
          subtitle={locale === 'pt-PT' ? 'Visualiza o teu progresso' : 'View your progress'}
          icon={CalendarIcon}
          actions={
            <SegmentedTabs
              size="sm"
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              options={viewTabs.map(t => ({ value: t.id, label: t.label }))}
              ariaLabel={locale === 'pt-PT' ? 'Modo de visualização' : 'View mode'}
            />
          }
        />

        {/* Trial banner */}
        {trialStatus.isActive && (
          <div className="flex justify-center">
            <TrialBanner daysRemaining={trialStatus.daysRemaining} onUpgrade={() => setShowPaywall(true)} />
          </div>
        )}

        {/* ═══ Month Identity Hero ═══ */}
        {(() => {
          const monthLabel = format(new Date(currentYear, currentMonth), "MMMM", { locale: dateLocale });
          const isPT = locale === 'pt-PT';
          // Adaptive reflective subline based on rhythm
          let subline: string;
          if (monthStats.totalDays === 0 || monthStats.perfectDays === 0 && monthStats.consistency === 0) {
            subline = isPT ? 'Um mês começa em silêncio.' : 'A month begins in silence.';
          } else if (currentStreak >= 14) {
            subline = isPT ? 'Já não é esforço. É quem te tornaste.' : "It's no longer effort. It's who you've become.";
          } else if (currentStreak >= 5) {
            subline = isPT ? 'A continuidade está a moldar-te.' : 'Continuity is shaping you.';
          } else if (monthStats.consistency >= 70) {
            subline = isPT ? 'O ritmo está a tornar-se tu.' : 'The rhythm is becoming you.';
          } else if (monthStats.consistency >= 40) {
            subline = isPT ? 'Pequenos sistemas. Mudança silenciosa.' : 'Small systems. Quiet change.';
          } else if (monthStats.perfectDays > 0) {
            subline = isPT ? 'Cada dia conta uma frase do mês.' : 'Each day writes a sentence of the month.';
          } else {
            subline = isPT ? 'Identidade não é perfeição — é regresso.' : "Identity isn't perfection — it's return.";
          }

          return (
            <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card/40 px-6 py-7 backdrop-blur-sm">
              {/* ambient glow */}
              <div
                className="pointer-events-none absolute -top-1/2 left-1/2 h-[200%] w-[200%] -translate-x-1/2 opacity-40"
                style={{
                  background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.06), transparent 60%)',
                  animation: 'breathe-soft 14s ease-in-out infinite',
                }}
              />
              <div className="relative flex items-center gap-6">
                <div style={{ animation: 'breathe-soft 12s ease-in-out infinite' }}>
                  <CircularProgress percent={monthStats.consistency} size={64} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
                    {monthLabel} · {currentYear}
                  </p>
                  <p className="mt-1 text-[15px] font-medium text-foreground/90 leading-snug">
                    {subline}
                  </p>
                  {(currentStreak > 0 || monthStats.perfectDays > 0) && (
                    <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground/70 tabular-nums">
                      {monthStats.perfectDays > 0 && (
                        <span>
                          {monthStats.perfectDays} {isPT
                            ? (monthStats.perfectDays === 1 ? 'dia inteiro' : 'dias inteiros')
                            : (monthStats.perfectDays === 1 ? 'whole day' : 'whole days')}
                        </span>
                      )}
                      {currentStreak > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-primary/60" style={{ animation: 'living-pulse 3s ease-in-out infinite' }} />
                          {currentStreak} {isPT
                            ? (currentStreak === 1 ? 'dia consecutivo' : 'dias consecutivos')
                            : (currentStreak === 1 ? 'day in a row' : 'days in a row')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══ Monthly View ═══ */}
        {viewMode === "monthly" && (
          <div className="space-y-3">
            <MonthSelector
              year={currentYear}
              month={currentMonth}
              onPrevious={handlePreviousMonth}
              onNext={handleNextMonth}
              onToday={handleToday}
            />
            <div className="rounded-2xl border border-border/30 bg-card/50 p-3">
              <div className="mb-1 grid grid-cols-7 gap-1">
                {weekdays.map(day => (
                  <div key={day} className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, key }) => renderDayCell(date, key))}
              </div>
              {/* Legend */}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/70">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-primary" /><span>{locale === 'pt-PT' ? 'Completo' : 'Complete'}</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-primary/20" /><span>{locale === 'pt-PT' ? 'Parcial' : 'Partial'}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Weekly View ═══ */}
        {viewMode === "weekly" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => subWeeks(d, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {format(weekDays[0], "d MMM", { locale: dateLocale })} – {format(weekDays[6], "d MMM", { locale: dateLocale })}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => addWeeks(d, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map(date => {
                const data = getDayData(date);
                const isTodayDate = isToday(date);
                const isFutureDate = isFuture(date);
                const isComplete = data.completedHabits === data.totalHabits && data.totalHabits > 0;
                return (
                  <button
                    key={format(date, "yyyy-MM-dd")}
                    onClick={() => openDayDetail(date)}
                    className={cn(
                      "flex flex-col items-center py-3 px-1 rounded-xl transition-all hover:bg-secondary/50",
                      isFutureDate && "opacity-40",
                      isTodayDate && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      isComplete && "bg-primary/10"
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground/70">{weekdays[weekDays.indexOf(date)]}</span>
                    <span className={cn("text-lg font-bold my-1", isComplete && "text-primary")}>{format(date, "d")}</span>
                    {!isFutureDate ? (
                      isComplete
                        ? <Check className="h-3 w-3 text-success" />
                        : <span className="text-[10px] text-muted-foreground">{data.completedHabits}/{data.totalHabits}</span>
                    ) : <span className="text-[10px] text-muted-foreground">—</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ Daily View ═══ */}
        {viewMode === "daily" && (() => {
          const data = getDayData(selectedDate);
          const dateStr = format(selectedDate, "yyyy-MM-dd");
          const isComplete = data.completedHabits === data.totalHabits && data.totalHabits > 0;
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => subDays(d, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <span className="font-medium text-sm">{formatDate(selectedDate, locale === 'pt-PT' ? "EEEE" : "EEEE")}</span>
                  <p className="text-xs text-muted-foreground">{formatDate(selectedDate, locale === 'pt-PT' ? "d 'de' MMMM" : "MMMM d")}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(d => addDays(d, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className={cn(
                "p-4 rounded-2xl text-center border",
                isComplete ? "bg-success/10 border-success/20" : "bg-secondary/30 border-border/30"
              )}>
                <p className="text-3xl font-bold">{data.completedHabits}/{data.totalHabits}</p>
                <p className="text-xs text-muted-foreground">{locale === 'pt-PT' ? 'hábitos concluídos' : 'habits completed'}</p>
              </div>

              {/* Simple habits */}
              {data.simpleHabits.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    {locale === 'pt-PT' ? 'Rituais' : 'Rituals'}
                  </h4>
                  {data.simpleHabits.map(habit => {
                    const isDone = state.dailyLogs.some(l => l.habitId === habit.id && l.date === dateStr && l.done);
                    return (
                      <button
                        key={habit.id}
                        onClick={() => handleToggleHabit(habit.id, selectedDate)}
                        disabled={isFuture(selectedDate)}
                        className={cn(
                          "w-full flex items-center justify-between p-3.5 rounded-xl transition-all",
                          isDone ? "bg-primary/10 border border-primary/20" : "bg-card/50 border border-border/30 hover:bg-secondary/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: habit.cor || '#14b8a6' }} />
                          <span className={cn("text-sm", isDone && "line-through opacity-70")}>{habit.nome}</span>
                        </div>
                        {isDone ? <Check className="h-4 w-4 text-primary" /> : <div className="w-4 h-4 rounded border border-muted-foreground/40" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Metric habits */}
              {data.metricHabits.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    {locale === 'pt-PT' ? 'Métricas' : 'Metrics'}
                  </h4>
                  {data.metricHabits.map(habit => {
                    const qty = data.metricEntries.filter(e => e.trackerId === habit.id).reduce((s, e) => s + e.quantity, 0);
                    const goal = habit.dailyGoal ?? habit.baseline ?? 0;
                    const onTrack = habit.type === "reduce" ? qty <= goal : qty >= goal;
                    return (
                      <div key={habit.id} className={cn(
                        "flex items-center justify-between p-3.5 rounded-xl",
                        onTrack ? "bg-success/8 border border-success/20" : "bg-card/50 border border-border/30"
                      )}>
                        <div className="flex items-center gap-2">
                          <span>{habit.icon || "📊"}</span>
                          <span className="text-sm font-medium">{habit.nome}</span>
                        </div>
                        <span className={cn("text-sm font-mono", onTrack ? "text-success" : "text-muted-foreground")}>
                          {qty}/{goal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {data.reflection && (
                <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                  <p className="text-sm text-foreground/80">{data.reflection.text}</p>
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {renderDayDetail()}

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