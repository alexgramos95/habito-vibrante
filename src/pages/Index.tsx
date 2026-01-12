import { useState, useEffect, useCallback } from "react";
import { format, isToday, isFuture } from "date-fns";
import { 
  Flame, Trophy, TrendingUp, Target, PiggyBank, ShoppingCart, 
  Activity, Zap, ChevronRight, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nContext";
import { AppState, Habit, Tracker, TrackerEntry, DailyReflection, FutureSelfEntry } from "@/data/types";
import {
  loadState,
  saveState,
  addHabit,
  updateHabit,
  deleteHabit,
  toggleDailyLog,
  addAchievement,
  getWeekStartDate,
  addReflection,
  getReflectionForDate,
  addFutureSelfEntry,
  getLatestFutureSelf,
  addTrackerEntry,
} from "@/data/storage";
import {
  calculateMonthlySummary,
  calculateWeeklySummaries,
  getActiveHabits,
  checkAchievements,
  calculateSavingsSummary,
  getShoppingItemsForWeek,
} from "@/logic/computations";
import { Navigation } from "@/components/Layout/Navigation";
import { KPICard } from "@/components/Dashboard/KPICard";
import { WeeklyChart } from "@/components/Dashboard/WeeklyChart";
import { MonthSelector } from "@/components/Dashboard/MonthSelector";
import { HabitList } from "@/components/Habits/HabitList";
import { HabitForm } from "@/components/Habits/HabitForm";
import { MotivationalBanner } from "@/components/Feedback/MotivationalBanner";
import { ReflectionCard } from "@/components/Modules/ReflectionCard";
import { FutureSelfCard } from "@/components/Modules/FutureSelfCard";
import { TrackerQuickAdd } from "@/components/Modules/TrackerQuickAdd";
import { 
  StreakDrilldown, ConsistencyDrilldown, TrackersDrilldown, SavingsDrilldown 
} from "@/components/Dashboard/DrilldownModals";
import { ReflectionModal } from "@/components/Dashboard/ReflectionModal";
import { FutureSelfModal } from "@/components/Dashboard/FutureSelfModal";
import { WeeklyDrilldownModal } from "@/components/Dashboard/WeeklyDrilldownModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// Calculate tracker summary for dashboard
const calculateTrackerDashboardSummary = (
  trackers: Tracker[],
  entries: TrackerEntry[],
  formatCurrency: (v: number) => string
) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const activeTrackers = trackers.filter(t => t.active);
  
  let todayTotalSavings = 0;
  let monthTotalSavings = 0;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  activeTrackers.forEach(tracker => {
    if (tracker.valuePerUnit <= 0) return;
    
    const todayEntries = entries.filter(e => e.trackerId === tracker.id && e.date === today);
    const todayCount = todayEntries.reduce((sum, e) => sum + e.quantity, 0);
    
    if (tracker.type === 'reduce') {
      const dailySaving = (tracker.baseline - todayCount) * tracker.valuePerUnit;
      todayTotalSavings += Math.max(0, dailySaving);
    }
    
    // Month savings
    const monthEntries = entries.filter(e => {
      if (e.trackerId !== tracker.id) return false;
      const date = new Date(e.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const daysInMonth = new Date().getDate();
    const monthBaseline = tracker.baseline * daysInMonth;
    const monthActual = monthEntries.reduce((sum, e) => sum + e.quantity, 0);
    
    if (tracker.type === 'reduce') {
      monthTotalSavings += Math.max(0, (monthBaseline - monthActual) * tracker.valuePerUnit);
    }
  });
  
  return {
    activeCount: activeTrackers.length,
    todaySavings: todayTotalSavings,
    monthSavings: monthTotalSavings,
    formattedTodaySavings: formatCurrency(todayTotalSavings),
    formattedMonthSavings: formatCurrency(monthTotalSavings),
  };
};

const Index = () => {
  const { toast } = useToast();
  const { t, tr, formatCurrency, formatDate, locale } = useI18n();
  const [state, setState] = useState<AppState>(() => loadState());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // UI State
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  
  // Drilldown Modal States
  const [showStreakDrilldown, setShowStreakDrilldown] = useState(false);
  const [showConsistencyDrilldown, setShowConsistencyDrilldown] = useState(false);
  const [showTrackersDrilldown, setShowTrackersDrilldown] = useState(false);
  const [showSavingsDrilldown, setShowSavingsDrilldown] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showFutureSelfModal, setShowFutureSelfModal] = useState(false);
  const [showWeeklyDrilldown, setShowWeeklyDrilldown] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  const today = format(new Date(), "yyyy-MM-dd");

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Check achievements after state changes
  useEffect(() => {
    const newAchievements = checkAchievements(state);
    if (newAchievements.length > 0) {
      newAchievements.forEach((achievementId) => {
        setState((prev) => addAchievement(prev, achievementId));
        toast({
          title: "🏆 " + t.profile.achievements,
          description: tr("habits.habitCreated"),
        });
      });
    }
  }, [state.dailyLogs, t, tr]);

  // Get today's reflection
  const todayReflection = getReflectionForDate(state, today);
  const latestFutureSelf = getLatestFutureSelf(state);

  // Computed values
  const monthlySummary = calculateMonthlySummary(state, currentYear, currentMonth);
  const weeklySummaries = calculateWeeklySummaries(state, currentYear, currentMonth);
  const savingsSummary = calculateSavingsSummary(state, currentYear, currentMonth);
  const weekStartDate = getWeekStartDate(new Date());
  const shoppingData = getShoppingItemsForWeek(state, weekStartDate);
  const trackerSummary = calculateTrackerDashboardSummary(
    state.trackers || [], 
    state.trackerEntries || [],
    formatCurrency
  );

  // Calculate consistency score (percentage of days with all habits done)
  const consistencyScore = monthlySummary.totalPossible > 0 
    ? Math.round((monthlySummary.totalDone / monthlySummary.totalPossible) * 100)
    : 0;

  // Handlers
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

  const handleDayClick = (date: Date) => {
    if (!isFuture(date)) {
      setSelectedDate(date);
    }
  };

  const handleToggleHabit = useCallback((habitId: string) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const result = toggleDailyLog(state, habitId, dateStr);
    setState(result.newState);
    
    if (result.wasCompleted) {
      toast({
        title: t.habits.goodWork,
        description: tr("habits.dayCompleted", { habitName: result.habitName }),
      });
    }
  }, [selectedDate, state, toast, t, tr]);

  const handleSaveHabit = (data: Omit<Habit, "id" | "createdAt">) => {
    if (editingHabit) {
      setState((prev) => updateHabit(prev, editingHabit.id, data));
      toast({ title: t.habits.habitUpdated });
    } else {
      setState((prev) => addHabit(prev, data));
      toast({ title: t.habits.habitCreated });
    }
    setShowHabitForm(false);
    setEditingHabit(null);
  };

  const handleDeleteHabit = () => {
    if (!deletingHabitId) return;
    
    const activeCount = getActiveHabits(state).length;
    const habitToDelete = state.habits.find((h) => h.id === deletingHabitId);
    
    if (activeCount <= 1 && habitToDelete?.active) {
      toast({
        title: t.habits.atLeastOne,
        variant: "destructive",
      });
      setDeletingHabitId(null);
      return;
    }
    
    setState((prev) => deleteHabit(prev, deletingHabitId));
    toast({ title: t.habits.habitDeleted });
    setDeletingHabitId(null);
  };

  const handleSaveReflection = (text: string, mood: 'positive' | 'neutral' | 'challenging') => {
    setState(prev => addReflection(prev, {
      date: today,
      text,
      mood,
    }));
    toast({ title: t.reflection.saved });
  };

  const handleSaveFutureSelf = (narrative: string, themes: string[]) => {
    setState(prev => addFutureSelfEntry(prev, {
      date: today,
      narrative,
      themes,
    }));
    toast({ title: t.futureSelf.saved });
  };

  const handleTrackerQuickAdd = (trackerId: string) => {
    setState(prev => addTrackerEntry(prev, trackerId, 1));
    const tracker = state.trackers.find(t => t.id === trackerId);
    toast({ 
      title: `+1 ${tracker?.unitSingular || t.trackers.entry}`,
      description: tracker?.name,
    });
  };

  const dateLabel = isToday(selectedDate) 
    ? t.dashboard.today 
    : formatDate(selectedDate, locale === 'pt-PT' ? "d 'de' MMMM" : "MMMM d");

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gradient">
              {t.dashboard.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t.app.tagline}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-sm">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-medium">{t.kpis.level} {state.gamification?.nivel || 1}</span>
            </div>
          </div>
        </div>

        {/* KPI Cards - Premium Glass Style (Clickable) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div onClick={() => setShowStreakDrilldown(true)} className="cursor-pointer">
            <KPICard
              title={t.kpis.currentStreak}
              value={monthlySummary.streakAtual}
              subtitle={t.kpis.days}
              icon={<Flame className="h-5 w-5" />}
              variant="primary"
            />
          </div>
          <div onClick={() => setShowStreakDrilldown(true)} className="cursor-pointer">
            <KPICard
              title={t.kpis.bestStreak}
              value={monthlySummary.melhorStreak}
              subtitle={t.kpis.days}
              icon={<Trophy className="h-5 w-5" />}
              variant="warning"
            />
          </div>
          <div onClick={() => setShowConsistencyDrilldown(true)} className="cursor-pointer">
            <KPICard
              title={t.dashboard.consistencyScore}
              value={`${consistencyScore}%`}
              subtitle={`${monthlySummary.totalDone} ${t.kpis.ofTotal} ${monthlySummary.totalPossible}`}
              icon={<TrendingUp className="h-5 w-5" />}
              variant="success"
            />
          </div>
          <KPICard
            title={t.kpis.activeHabits}
            value={monthlySummary.habitosAtivos}
            subtitle={`${t.kpis.ofTotal} ${monthlySummary.habitosTotal}`}
            icon={<Target className="h-5 w-5" />}
            variant="default"
          />
        </div>

        {/* Motivational Banner */}
        <MotivationalBanner summary={monthlySummary} hasHabits={state.habits.length > 0} />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Chart + Mini Cards */}
          <div className="space-y-6 lg:col-span-2">
            {/* Weekly Chart - Premium Card */}
            <Card className="premium-card border-border/30 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">
                  {t.dashboard.weeklyEvolution}
                </CardTitle>
                <MonthSelector
                  year={currentYear}
                  month={currentMonth}
                  onPrevious={handlePreviousMonth}
                  onNext={handleNextMonth}
                  onToday={handleToday}
                />
              </CardHeader>
              <CardContent>
                <WeeklyChart 
                  data={weeklySummaries} 
                  onWeekClick={(weekNum) => {
                    setSelectedWeek(weekNum);
                    setShowWeeklyDrilldown(true);
                  }}
                />
              </CardContent>
            </Card>

            {/* Tracker Quick Add */}
            {(state.trackers?.length || 0) > 0 && (
              <TrackerQuickAdd
                trackers={state.trackers || []}
                entries={state.trackerEntries || []}
                onAddEntry={handleTrackerQuickAdd}
              />
            )}

            {/* Mini Cards Row - Premium Design */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Savings Mini Card */}
              <Card className="premium-card group hover:glow-subtle transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <div className="p-1.5 rounded-lg bg-success/10">
                      <PiggyBank className="h-4 w-4 text-success" />
                    </div>
                    {t.dashboard.piggyBank}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(savingsSummary.totalPoupadoMesAtual)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.dashboard.thisMonth}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.dashboard.total}: <span className="font-medium text-foreground">{formatCurrency(savingsSummary.totalPoupadoAllTime)}</span>
                  </div>
                  <Link to="/financas">
                    <Button variant="ghost" size="sm" className="w-full mt-1 group-hover:bg-success/10 group-hover:text-success">
                      {t.dashboard.viewDetails}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Trackers Mini Card */}
              <Card className="premium-card group hover:glow-subtle transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    {t.trackers.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {trackerSummary.formattedMonthSavings}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.trackers.monthSavings}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {trackerSummary.activeCount} {t.kpis.activeHabits.toLowerCase()}
                  </div>
                  <Link to="/objetivos">
                    <Button variant="ghost" size="sm" className="w-full mt-1 group-hover:bg-primary/10 group-hover:text-primary">
                      {t.dashboard.viewDetails}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Shopping List Mini Card */}
              <Card className="premium-card group hover:glow-subtle transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <div className="p-1.5 rounded-lg bg-warning/10">
                      <ShoppingCart className="h-4 w-4 text-warning" />
                    </div>
                    {t.dashboard.shoppingList}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold text-warning">
                      {shoppingData.doneCount}/{shoppingData.totalCount}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.dashboard.itemsThisWeek}</p>
                  </div>
                  {shoppingData.totalCount > 0 && (
                    <Progress 
                      value={(shoppingData.doneCount / shoppingData.totalCount) * 100} 
                      className="h-1.5"
                    />
                  )}
                  <Link to="/compras">
                    <Button variant="ghost" size="sm" className="w-full mt-1 group-hover:bg-warning/10 group-hover:text-warning">
                      {t.dashboard.viewList}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Reflection and Future Self Cards - Clickable */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div onClick={() => setShowReflectionModal(true)} className="cursor-pointer">
                <ReflectionCard 
                  reflection={todayReflection}
                  onSave={handleSaveReflection}
                  compact
                />
              </div>
              <div onClick={() => setShowFutureSelfModal(true)} className="cursor-pointer">
                <FutureSelfCard 
                  entry={latestFutureSelf}
                  onSave={handleSaveFutureSelf}
                  compact
                />
              </div>
            </div>
          </div>

          {/* Right Column: Today's Habits */}
          <Card className="premium-card h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {dateLabel}
                </span>
                {isToday(selectedDate) && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                    {t.dashboard.today}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HabitList
                state={state}
                selectedDate={selectedDate}
                onToggleHabit={handleToggleHabit}
                onEditHabit={(habit) => {
                  setEditingHabit(habit);
                  setShowHabitForm(true);
                }}
                onDeleteHabit={(id) => setDeletingHabitId(id)}
                onAddHabit={() => {
                  setEditingHabit(null);
                  setShowHabitForm(true);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Habit Form Modal */}
      {showHabitForm && (
        <HabitForm
          habit={editingHabit || undefined}
          onSave={handleSaveHabit}
          onCancel={() => {
            setShowHabitForm(false);
            setEditingHabit(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingHabitId}
        onOpenChange={() => setDeletingHabitId(null)}
      >
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.habits.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.habits.confirmDelete}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.habits.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHabit}>
              {t.habits.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drilldown Modals */}
      <StreakDrilldown
        open={showStreakDrilldown}
        onOpenChange={setShowStreakDrilldown}
        currentStreak={monthlySummary.streakAtual}
        bestStreak={monthlySummary.melhorStreak}
        dailyLogs={state.dailyLogs}
        habits={state.habits}
      />
      <ConsistencyDrilldown
        open={showConsistencyDrilldown}
        onOpenChange={setShowConsistencyDrilldown}
        consistencyScore={consistencyScore}
        habits={state.habits}
        dailyLogs={state.dailyLogs}
        month={currentMonth}
        year={currentYear}
      />
      <TrackersDrilldown
        open={showTrackersDrilldown}
        onOpenChange={setShowTrackersDrilldown}
        trackers={state.trackers || []}
        entries={state.trackerEntries || []}
        formatCurrency={formatCurrency}
      />
      <SavingsDrilldown
        open={showSavingsDrilldown}
        onOpenChange={setShowSavingsDrilldown}
        savingsSummary={savingsSummary}
        savings={state.savings}
        formatCurrency={formatCurrency}
      />
      <ReflectionModal
        open={showReflectionModal}
        onOpenChange={setShowReflectionModal}
        reflections={state.reflections || []}
        todayReflection={todayReflection}
        onSave={handleSaveReflection}
      />
      <FutureSelfModal
        open={showFutureSelfModal}
        onOpenChange={setShowFutureSelfModal}
        entries={state.futureSelf || []}
        latestEntry={latestFutureSelf}
        onSave={handleSaveFutureSelf}
      />
      <WeeklyDrilldownModal
        open={showWeeklyDrilldown}
        onOpenChange={setShowWeeklyDrilldown}
        weekSummary={weeklySummaries.find(w => w.weekNumber === selectedWeek) || weeklySummaries[0]}
        weekNumber={selectedWeek}
        year={currentYear}
        month={currentMonth}
        state={state}
        locale={locale}
      />
    </div>
  );
};

export default Index;
