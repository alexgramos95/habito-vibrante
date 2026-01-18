import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nContext";
import { AppState, Habit } from "@/data/types";
import {
  loadState,
  saveState,
  addHabit,
  updateHabit,
  toggleDailyLog,
} from "@/data/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Layout/Navigation";
import { TemporalTabs, TemporalView } from "@/components/Dashboard/TemporalTabs";
import { DayView } from "@/components/Dashboard/DayView";
import { WeekView } from "@/components/Dashboard/WeekView";
import { MonthView } from "@/components/Dashboard/MonthView";
import { HabitForm } from "@/components/Habits/HabitForm";
import { TrialBanner } from "@/components/Paywall/TrialBanner";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const { isAuthenticated, isEmailVerified } = useAuth();
  
  const [state, setState] = useState<AppState>(() => loadState());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Temporal view state - Day is default
  const [temporalView, setTemporalView] = useState<TemporalView>('dia');
  
  // UI State
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // Subscription
  const { isPro, trialStatus, upgradeToPro, getLimits } = useSubscription();
  const limits = getLimits();

  // Auth guard: require login, email verification, and active trial/pro before accessing /app
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth?next=trial", { replace: true });
    } else if (!isEmailVerified) {
      navigate("/auth?verify=required", { replace: true });
    } else if (!isPro && trialStatus.isExpired) {
      navigate("/decision", { replace: true });
    }
  }, [isAuthenticated, isEmailVerified, isPro, trialStatus.isExpired, navigate]);

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Handlers
  const handleToggleHabit = useCallback(
    (habitId: string) => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const result = toggleDailyLog(state, habitId, dateStr);
      setState(result.newState);

      if (result.wasCompleted) {
        toast({
          title: t.habits.goodWork,
          description: result.habitName,
        });
      }
    },
    [selectedDate, state, toast, t],
  );

  const handleSaveHabit = (data: Omit<Habit, "id" | "createdAt">) => {
    if (editingHabit) {
      setState((prev) => updateHabit(prev, editingHabit.id, data));
      toast({ title: t.habits.habitUpdated });
    } else {
      // Check habit limit for free users
      const currentHabitCount = state.habits.filter((h) => h.active).length;
      const maxHabits = limits.maxHabits as number;

      if (!isPro && currentHabitCount >= maxHabits) {
        setShowPaywall(true);
        return;
      }

      setState((prev) => addHabit(prev, data));
      toast({ title: t.habits.habitCreated });
    }
    setShowHabitForm(false);
    setEditingHabit(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navigation />

      <main className="container py-6 md:py-8 max-w-lg mx-auto">
        {/* Trial banner */}
        {trialStatus.isActive && (
          <div className="mb-6 flex justify-center">
            <TrialBanner
              daysRemaining={trialStatus.daysRemaining}
              onUpgrade={() => setShowPaywall(true)}
            />
          </div>
        )}

        {/* Temporal tabs */}
        <div className="mb-8">
          <TemporalTabs active={temporalView} onChange={setTemporalView} />
        </div>

        {/* Views */}
        {temporalView === 'dia' && (
          <DayView
            state={state}
            selectedDate={selectedDate}
            onToggleHabit={handleToggleHabit}
            onAddHabit={() => setShowHabitForm(true)}
          />
        )}

        {temporalView === 'semana' && (
          <WeekView state={state} selectedDate={selectedDate} />
        )}

        {temporalView === 'mes' && (
          <MonthView
            state={state}
            currentMonth={currentMonth}
            currentYear={currentYear}
          />
        )}
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

      {/* Paywall */}
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={upgradeToPro}
        trialDaysLeft={trialStatus.daysRemaining}
      />
    </div>
  );
};

export default Index;
