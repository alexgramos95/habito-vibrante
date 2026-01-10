import { useState, useEffect, useCallback } from "react";
import { format, isToday, isFuture } from "date-fns";
import { Flame, Trophy, TrendingUp, Target } from "lucide-react";
import { translations } from "@/i18n/translations.pt";
import { AppState, Habit } from "@/data/types";
import {
  loadState,
  saveState,
  addHabit,
  updateHabit,
  deleteHabit,
  toggleDailyLog,
} from "@/data/storage";
import {
  calculateMonthlySummary,
  calculateWeeklySummaries,
  getActiveHabits,
} from "@/logic/computations";
import { Navigation } from "@/components/Layout/Navigation";
import { KPICard } from "@/components/Dashboard/KPICard";
import { WeeklyChart } from "@/components/Dashboard/WeeklyChart";
import { MonthSelector } from "@/components/Dashboard/MonthSelector";
import { HabitList } from "@/components/Habits/HabitList";
import { HabitForm } from "@/components/Habits/HabitForm";
import { MotivationalBanner } from "@/components/Feedback/MotivationalBanner";
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

const Index = () => {
  const { toast } = useToast();
  const [state, setState] = useState<AppState>(() => loadState());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // UI State
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Computed values
  const monthlySummary = calculateMonthlySummary(state, currentYear, currentMonth);
  const weeklySummaries = calculateWeeklySummaries(state, currentYear, currentMonth);

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
    setState((prev) => toggleDailyLog(prev, habitId, dateStr));
  }, [selectedDate]);

  const handleSaveHabit = (data: Omit<Habit, "id" | "createdAt">) => {
    if (editingHabit) {
      setState((prev) => updateHabit(prev, editingHabit.id, data));
      toast({ title: "Hábito atualizado!" });
    } else {
      setState((prev) => addHabit(prev, data));
      toast({ title: "Novo hábito criado!" });
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
        title: translations.habits.atLeastOne,
        variant: "destructive",
      });
      setDeletingHabitId(null);
      return;
    }
    
    setState((prev) => deleteHabit(prev, deletingHabitId));
    toast({ title: "Hábito eliminado" });
    setDeletingHabitId(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title={translations.kpis.currentStreak}
            value={monthlySummary.streakAtual}
            subtitle={translations.kpis.days}
            icon={<Flame className="h-5 w-5" />}
            variant="primary"
          />
          <KPICard
            title={translations.kpis.bestStreak}
            value={monthlySummary.melhorStreak}
            subtitle={translations.kpis.days}
            icon={<Trophy className="h-5 w-5" />}
            variant="warning"
          />
          <KPICard
            title={translations.kpis.totalProgress}
            value={`${Math.round(monthlySummary.progressoMensal)}%`}
            subtitle={`${monthlySummary.totalDone} ${translations.kpis.ofTotal} ${monthlySummary.totalPossible}`}
            icon={<TrendingUp className="h-5 w-5" />}
            variant="success"
          />
          <KPICard
            title={translations.kpis.activeHabits}
            value={monthlySummary.habitosAtivos}
            subtitle={`${translations.kpis.ofTotal} ${monthlySummary.habitosTotal}`}
            icon={<Target className="h-5 w-5" />}
            variant="default"
          />
        </div>

        {/* Motivational Banner */}
        {state.habits.length > 0 && (
          <MotivationalBanner summary={monthlySummary} />
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Chart */}
          <div className="space-y-6 lg:col-span-2">
            {/* Weekly Chart */}
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {translations.dashboard.weeklyEvolution}
                </h2>
                <MonthSelector
                  year={currentYear}
                  month={currentMonth}
                  onPrevious={handlePreviousMonth}
                  onNext={handleNextMonth}
                  onToday={handleToday}
                />
              </div>
              <WeeklyChart data={weeklySummaries} />
            </div>
          </div>

          {/* Right Column: Habits */}
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {isToday(selectedDate)
                  ? "Hoje"
                  : format(selectedDate, "d 'de' MMMM")}
              </span>
            </div>
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
          </div>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translations.habits.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              {translations.habits.confirmDelete}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translations.habits.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHabit}>
              {translations.habits.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;