import { useState, useEffect, useMemo, useCallback } from "react";
import { format, getDay, subDays } from "date-fns";
import { Plus, CheckCircle2, Check, ListChecks } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nContext";
import { Habit, Tracker, TrackerEntry } from "@/data/types";
import { addHabit, updateHabit, deleteHabit, addTrackerEntry, updateTrackerEntry, deleteTrackerEntry, isHabitDoneOnDate, getHabitCompletionWeight, toggleDailyLog } from "@/data/storage";
import { Navigation } from "@/components/Layout/Navigation";
import { HabitForm } from "@/components/Habits/HabitForm";
import { MinimalHabitCard } from "@/components/Habits/MinimalHabitCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sortHabitsByTime } from "@/logic/habitSorting";
import { getHabitsSortedForDay } from "@/logic/habitSorting";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { TrialBanner } from "@/components/Paywall/TrialBanner";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { NotificationSetup } from "@/components/Habits/NotificationSetup";
import { TrackerDetailDrawer } from "@/components/Trackers/TrackerDetailDrawer";
import { TrackerEditDialog } from "@/components/Trackers/TrackerEditDialog";
import { MyHabitsDialog } from "@/components/Habits/MyHabitsDialog";
import { getContextualHabitFeedback, getHabitFeedbackEnabled } from "@/logic/habitFeedback";
import { MotivationCard } from "@/components/Dashboard/MotivationCard";
import { getDailyMotivation } from "@/logic/dailyMotivation";
import { JourneyHero } from "@/components/Dashboard/JourneyHero";
import { ReferralPrompt } from "@/components/Referral/ReferralPrompt";
import { hasSeenReferralPrompt, markReferralPromptSeen } from "@/lib/referral";
import { track, trackOnce, checkReturnEvents } from "@/hooks/useAnalytics";
// HabitCoachTip removed — coach is now on the detail page

// --- Circular progress ring ---
const CircularProgress = ({ percent, size = 60 }: { percent: number; size?: number }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, percent) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="hsl(var(--primary))" strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700 ease-out"
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" className="text-sm font-bold fill-foreground">
        {Math.round(percent)}%
      </text>
    </svg>
  );
};

// --- Habit → Tracker adapter ---
const habitToTracker = (h: Habit): Tracker => ({
  id: h.id, name: h.nome, type: h.type || "increase",
  inputMode: h.inputMode || "incremental",
  unitSingular: h.unitSingular || "", unitPlural: h.unitPlural || "",
  valuePerUnit: h.valuePerUnit || 0, baseline: h.baseline || 0,
  dailyGoal: h.dailyGoal, active: h.active, createdAt: h.createdAt,
  icon: h.icon, color: h.cor, frequency: h.frequency || "daily",
  specificDays: h.specificDays, scheduledTime: h.scheduledTime,
  scheduledDays: h.scheduledDays, includeInFinances: h.includeInFinances || false,
});

const Index = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, isEmailVerified } = useAuth();
  const { isPro, trialStatus, upgradeToPro } = useSubscription();
  const { state, setState, isLoading } = useData();

  const [showHabitForm, setShowHabitForm] = useState(false);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showMyHabits, setShowMyHabits] = useState(false);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [showFirstSession, setShowFirstSession] = useState<boolean>(() => {
    try { return localStorage.getItem("become-first-session") === "1"; } catch { return false; }
  });
  const [showReferralPrompt, setShowReferralPrompt] = useState(false);
  const dismissFirstSession = useCallback(() => {
    try { localStorage.removeItem("become-first-session"); } catch { /* ignore */ }
    setShowFirstSession(false);
  }, []);

  // Journey day (0 = signup day) — drives early-day decluttering
  const journeyDay = useMemo(() => {
    try {
      const start = localStorage.getItem("become-journey-start");
      if (!start) return 0;
      const ms = new Date().setHours(0,0,0,0) - new Date(start).setHours(0,0,0,0);
      return Math.max(0, Math.floor(ms / 86400000));
    } catch { return 0; }
  }, []);
  const isEarlyDay = journeyDay <= 1; // Day 0 & 1 → minimal dashboard

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) navigate("/auth?next=trial", { replace: true });
    else if (!isEmailVerified) navigate("/auth?verify=required", { replace: true });
    else if (!isPro && trialStatus.isExpired) navigate("/decision", { replace: true });
  }, [isAuthenticated, isEmailVerified, isPro, trialStatus.isExpired, navigate]);

  // --- Analytics: app_open + return cohort checks (D1/D3/D7) ---
  useEffect(() => {
    track("app_open", { route: "/app" });
    checkReturnEvents();

    // Referee XP reward — if user signed up via ?ref= link, grant once.
    import("@/lib/referral").then(({ consumePendingRefForReward, REFERRAL_XP_REWARD }) => {
      const reward = consumePendingRefForReward();
      if (reward) {
        setState(prev => ({
          ...prev,
          gamification: {
            ...prev.gamification,
            pontos: (prev.gamification?.pontos || 0) + REFERRAL_XP_REWARD,
          },
        }));
        toast({
          title: `+${REFERRAL_XP_REWARD} XP`,
          description: "Welcome bonus from your invite. Build something.",
          duration: 3500,
        });
      }
    });
  }, [setState, toast]);

  // --- Derived data ---
  const today = format(new Date(), "yyyy-MM-dd");
  const dayOfWeek = getDay(new Date());

  const simpleHabits = useMemo(() => state.habits.filter(h => !h.mode || h.mode === "simple"), [state.habits]);
  const metricHabits = useMemo(() => state.habits.filter(h => h.mode === "metric"), [state.habits]);

  // Simple habits scheduled for today
  const todaySimple = useMemo(() => {
    return simpleHabits.filter(h => {
      if (!h.active) return false;
      if (!h.scheduledDays || h.scheduledDays.length === 0) return true;
      return h.scheduledDays.includes(dayOfWeek);
    });
  }, [simpleHabits, dayOfWeek]);

  const sortedTodaySimple = useMemo(() => getHabitsSortedForDay(todaySimple, dayOfWeek), [todaySimple, dayOfWeek]);
  const activeMetrics = useMemo(() => metricHabits.filter(h => h.active), [metricHabits]);

  const FREE_LIMIT = 3;
  const canAddSimple = isPro || simpleHabits.length < FREE_LIMIT;
  const canAddMetric = isPro;

  // --- Progress computations ---
  const isSimpleDone = useCallback((id: string) => {
    return state.dailyLogs.some(l => l.habitId === id && l.date === today && l.done);
  }, [state.dailyLogs, today]);

  const getTodayCount = useCallback((id: string) => {
    return state.trackerEntries.filter(e => e.trackerId === id && e.date === today).reduce((s, e) => s + e.quantity, 0);
  }, [state.trackerEntries, today]);

  // doneSimple uses weighted completion: 1.0 = on time, 0.5 = late
  const doneSimple = todaySimple.reduce((sum, h) => sum + getHabitCompletionWeight(state, h.id, today), 0);
  const onTrackMetrics = activeMetrics.filter(h => {
    const c = getTodayCount(h.id);
    const g = h.dailyGoal ?? h.baseline ?? 1;
    if (h.type === "reduce") return c <= g;
    return g > 0 ? c >= g : c > 0; // For increase: need at least goal met, or any entry if goal is 0
  }).length;
  const totalTracked = todaySimple.length + activeMetrics.length;
  const totalDone = doneSimple + onTrackMetrics;
  const progressPercent = totalTracked > 0 ? (totalDone / totalTracked) * 100 : 0;

  // Streak (simple: consecutive days with all simple habits done)
  const streak = useMemo(() => {
    let s = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = format(d, "yyyy-MM-dd");
      const dow = getDay(d);
      const scheduled = simpleHabits.filter(h => {
        if (!h.active) return false;
        if (!h.scheduledDays || h.scheduledDays.length === 0) return true;
        return h.scheduledDays.includes(dow);
      });
      if (scheduled.length === 0) { d.setDate(d.getDate() - 1); continue; }
      const allDone = scheduled.every(h => state.dailyLogs.some(l => l.habitId === h.id && l.date === ds && l.done));
      if (allDone) s++;
      else break;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [simpleHabits, state.dailyLogs]);

  // Did the user break yesterday? (had scheduled habits but completed none)
  const brokeYesterday = useMemo(() => {
    const y = subDays(new Date(), 1);
    const yds = format(y, "yyyy-MM-dd");
    const ydow = getDay(y);
    const scheduled = simpleHabits.filter(h => {
      if (!h.active) return false;
      if (!h.scheduledDays || h.scheduledDays.length === 0) return true;
      return h.scheduledDays.includes(ydow);
    });
    if (scheduled.length === 0) return false;
    const anyDone = scheduled.some(h => state.dailyLogs.some(l => l.habitId === h.id && l.date === yds && l.done));
    return !anyDone;
  }, [simpleHabits, state.dailyLogs]);

  // Daily motivation card — stable per day + state-bucket
  const motivationCard = useMemo(() => {
    return getDailyMotivation({
      totalTracked,
      totalDone,
      streak,
      brokeYesterday,
      dateKey: today,
      hour: new Date().getHours(),
    });
  }, [totalTracked, totalDone, streak, brokeYesterday, today]);

  // Coach data
  const coachData = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), "yyyy-MM-dd"));
    return {
      habits: state.habits.filter(h => h.active).map(h => {
        if (!h.mode || h.mode === "simple") {
          const done7 = last7.filter(d => state.dailyLogs.some(l => l.habitId === h.id && l.date === d && l.done)).length;
          return { name: h.nome, mode: "simple" as const, completionRate7d: done7 / 7 };
        }
        const entries7 = state.trackerEntries.filter(e => e.trackerId === h.id && last7.includes(e.date));
        const goal = h.dailyGoal ?? h.baseline ?? 1;
        const onTrackDays = last7.filter(d => {
          const qty = entries7.filter(e => e.date === d).reduce((s, e) => s + e.quantity, 0);
          return h.type === "reduce" ? qty <= goal : qty >= goal;
        }).length;
        return { name: h.nome, mode: "metric" as const, completionRate7d: onTrackDays / 7 };
      }),
      currentStreak: streak,
      todayProgress: totalTracked > 0 ? totalDone / totalTracked : 0,
    };
  }, [state.habits, state.dailyLogs, state.trackerEntries, streak, totalDone, totalTracked]);

  // --- Handlers ---
  const handleToggleSimple = useCallback((habitId: string) => {
    if (showFirstSession) dismissFirstSession();
    const wasDone = isSimpleDone(habitId);
    const habit = state.habits.find(h => h.id === habitId);
    let result: { wasCompleted: boolean; isLate: boolean } | null = null;
    setState(prev => {
      const r = toggleDailyLog(prev, habitId, today);
      result = { wasCompleted: r.wasCompleted, isLate: r.isLate };
      return r.newState;
    });
    if (!wasDone && habit && result) {
      // Analytics: every completion + first-ever completion (one-shot)
      track("habit_completed", { habitId, isLate: result.isLate });
      trackOnce("first_habit_completed", "first_habit_completed", { habitId, isLate: result.isLate });

      // Late completion → editorial notice; on-time → contextual feedback (if enabled)
      if (result.isLate) {
        toast({
          title: "Marcado como tardio",
          description: `Conta como parcial (50%) — o horário agendado já tinha passado.`,
          duration: 2800,
        });
      } else {
        const feedbackEnabled = getHabitFeedbackEnabled();
        if (feedbackEnabled) {
          const { title, description } = getContextualHabitFeedback(habit);
          toast({ title, description, duration: 2200 });
        }
      }

      // Referral milestone: 3 lifetime habit completions → invite prompt (once)
      if (!hasSeenReferralPrompt()) {
        const lifetimeWins = (state.dailyLogs?.filter(l => l.done).length || 0) + 1;
        if (lifetimeWins >= 3) {
          markReferralPromptSeen();
          // small delay so the completion toast is felt first
          setTimeout(() => setShowReferralPrompt(true), 900);
        }
      }
    }
  }, [isSimpleDone, today, setState, state.habits, state.dailyLogs, toast, showFirstSession, dismissFirstSession]);

  const handleAddMetricEntry = useCallback((habitId: string, qty: number, ts?: string) => {
    setState(prev => addTrackerEntry(prev, habitId, qty, undefined, ts));
    toast({ title: "✓ Registado" });
  }, [setState, toast]);

  const handleDeleteMetricEntry = useCallback((entryId: string) => {
    setState(prev => deleteTrackerEntry(prev, entryId));
  }, [setState]);

  const handleUpdateMetricEntry = useCallback((entryId: string, updates: Partial<TrackerEntry>) => {
    setState(prev => updateTrackerEntry(prev, entryId, updates));
  }, [setState]);

  const handleSaveSimple = useCallback((data: Omit<Habit, "id" | "createdAt">) => {
    if (editingHabit) {
      setState(prev => updateHabit(prev, editingHabit.id, { ...data, mode: "simple" }));
      toast({ title: t.habits.habitUpdated });
    } else {
      if (!canAddSimple) { setShowPaywall(true); return; }
      setState(prev => addHabit(prev, { ...data, mode: "simple" }));
      track("habit_created", { mode: "simple" });
      trackOnce("first_habit_created", "first_habit_created", { source: "manual", mode: "simple" });
      toast({ title: t.habits.habitCreated });
    }
    setShowHabitForm(false);
    setEditingHabit(null);
  }, [editingHabit, canAddSimple, setState, toast, t]);

  const handleSaveMetric = useCallback((trackerData: Omit<Tracker, "id" | "createdAt">) => {
    const habitData: Partial<Habit> & Omit<Habit, "id" | "createdAt"> = {
      nome: trackerData.name, cor: trackerData.color, active: trackerData.active,
      mode: "metric", type: trackerData.type, inputMode: trackerData.inputMode,
      icon: trackerData.icon, unitSingular: trackerData.unitSingular,
      unitPlural: trackerData.unitPlural, baseline: trackerData.baseline,
      dailyGoal: trackerData.dailyGoal, valuePerUnit: trackerData.valuePerUnit,
      frequency: trackerData.frequency, includeInFinances: trackerData.includeInFinances,
      specificDays: trackerData.specificDays, scheduledTime: trackerData.scheduledTime,
      scheduledDays: trackerData.scheduledDays,
    };
    if (editingHabit) {
      setState(prev => updateHabit(prev, editingHabit.id, habitData));
      toast({ title: "Métrica atualizada" });
    } else {
      if (!canAddMetric) { setShowPaywall(true); return; }
      setState(prev => addHabit(prev, habitData as Omit<Habit, "id" | "createdAt">));
      track("habit_created", { mode: "metric" });
      trackOnce("first_habit_created", "first_habit_created", { source: "manual", mode: "metric" });
      toast({ title: "Métrica criada" });
    }
    setShowMetricForm(false);
    setEditingHabit(null);
  }, [editingHabit, canAddMetric, setState, toast]);

  const handleDeleteHabit = useCallback(() => {
    if (!deletingHabitId) return;
    setState(prev => deleteHabit(prev, deletingHabitId));
    toast({ title: t.habits.habitDeleted });
    setDeletingHabitId(null);
  }, [deletingHabitId, setState, toast, t]);

  // --- Metric detail drawer data ---
  const selectedMetric = selectedMetricId ? metricHabits.find(h => h.id === selectedMetricId) : null;
  const selectedTracker = selectedMetric ? habitToTracker(selectedMetric) : null;
  const metricEntries = selectedMetricId ? state.trackerEntries.filter(e => e.trackerId === selectedMetricId) : [];
  const todayMetricEntries = metricEntries.filter(e => e.date === today);

  const getMetricSummary = useCallback((habitId: string) => {
    const entries = state.trackerEntries.filter(e => e.trackerId === habitId);
    const habit = metricHabits.find(h => h.id === habitId);
    if (!habit) return null;
    const todayCount = getTodayCount(habitId);
    const goal = habit.dailyGoal ?? habit.baseline ?? 0;
    const last30 = Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), i), "yyyy-MM-dd"));
    const monthlyCount = entries.filter(e => last30.includes(e.date)).reduce((s, e) => s + e.quantity, 0);
    const daysOnTrack = new Set(entries.filter(e => {
      const q = entries.filter(ee => ee.date === e.date).reduce((s, ee) => s + ee.quantity, 0);
      return habit.type === "reduce" ? q <= goal : q >= goal;
    }).map(e => e.date)).size;
    return {
      todayCount, todayLoss: habit.type === "reduce" ? Math.max(0, todayCount * (habit.valuePerUnit || 0)) : 0,
      monthlyCount,
      monthlyLoss: habit.type === "reduce" ? entries.filter(e => last30.includes(e.date)).reduce((s, e) => s + e.quantity * (habit.valuePerUnit || 0), 0) : 0,
      daysOnTrack, average30Days: monthlyCount / 30,
    };
  }, [state.trackerEntries, metricHabits, getTodayCount]);

  // --- Render ---
  return (
    <div className="page-container">
      <Navigation />

      <main className="page-content max-w-xl mx-auto space-y-8">
        {/* ═══ UNIFIED HERO — greeting, progress, streak, next-action CTA ═══ */}
        {state.habits.length > 0 && (
          <JourneyHero
            state={state}
            streak={streak}
            totalDone={totalDone}
            totalTracked={totalTracked}
            brokeYesterday={brokeYesterday}
            locale="pt-PT"
            nextActionName={sortedTodaySimple.find(h => !isSimpleDone(h.id))?.nome}
            onPrimaryAction={
              sortedTodaySimple.length > 0
                ? () => {
                    track("journeyhero_cta_clicked", { habitsScheduled: sortedTodaySimple.length });
                    if (showFirstSession) dismissFirstSession();
                    const first = sortedTodaySimple.find(h => !isSimpleDone(h.id));
                    if (first) {
                      const el = document.getElementById(`habit-${first.id}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }
                : undefined
            }
          />
        )}

        {/* Trial banner — calm, single line */}
        {trialStatus.isActive && (
          <TrialBanner daysRemaining={trialStatus.daysRemaining} onUpgrade={() => setShowPaywall(true)} />
        )}

        <NotificationSetup />

        {/* ═══ Daily Motivation — only past early days, calm spacing ═══ */}
        {!isEarlyDay && state.habits.length > 0 && <MotivationCard card={motivationCard} />}

        {/* ═══ Empty state — minimal, inviting ═══ */}
        {state.habits.length === 0 && (
          <div className="border border-dashed border-foreground/15 bg-card/40 p-10 text-center rounded-2xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">Um hábito basta.</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
              Identidade constrói-se um dia de cada vez.
            </p>
            <Button onClick={() => setShowModeSelector(true)} size="lg" className="mt-6 gap-2">
              <Plus className="h-4 w-4" /> Criar primeiro hábito
            </Button>
          </div>
        )}

        {/* ═══ Hoje (rituals + metrics) — single section, clear hierarchy ═══ */}
        {(sortedTodaySimple.length > 0 || activeMetrics.length > 0) && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-semibold tracking-tight text-foreground">Hoje</h2>
                {totalTracked > 0 && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {Math.round(totalDone)}/{totalTracked}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 px-2.5 text-muted-foreground hover:text-foreground" onClick={() => setShowMyHabits(true)}>
                  <ListChecks className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline text-xs">Todos</span>
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2.5 text-muted-foreground hover:text-foreground" onClick={() => setShowModeSelector(true)}>
                  <Plus className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline text-xs">Novo</span>
                </Button>
              </div>
            </div>

            {/* Simple habits */}
            {sortedTodaySimple.length > 0 && (
              <div className="space-y-1.5">
                {sortedTodaySimple.map(habit => {
                  const log = state.dailyLogs.find(l => l.habitId === habit.id && l.date === today && l.done);
                  return (
                    <div key={habit.id} id={`habit-${habit.id}`}>
                      <MinimalHabitCard
                        habit={habit}
                        isDone={isSimpleDone(habit.id)}
                        isLate={!!log?.isLate}
                        onToggle={() => handleToggleSimple(habit.id)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Metrics — quieter, calmer rows */}
            {activeMetrics.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {activeMetrics.map(habit => {
                  const count = getTodayCount(habit.id);
                  const goal = habit.dailyGoal ?? habit.baseline ?? 1;
                  const prog = habit.type === "reduce"
                    ? Math.max(0, 100 - (count / Math.max(goal, 1)) * 100)
                    : Math.min(100, (count / Math.max(goal, 1)) * 100);
                  const isOnTrack = habit.type === "reduce" ? count <= goal : count >= goal;

                  return (
                    <button
                      key={habit.id}
                      onClick={() => navigate(`/app/habit/${habit.id}`)}
                      className={cn(
                        "press-tactile w-full flex items-center gap-3 p-4 border text-left min-h-[72px] rounded-xl",
                        "transition-[background-color,border-color] duration-200",
                        isOnTrack
                          ? "border-success/30 bg-success/[0.04]"
                          : "border-foreground/[0.08] bg-card hover:border-foreground/15"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 flex items-center justify-center text-base shrink-0 rounded-lg",
                        isOnTrack
                          ? "bg-success/10 text-success"
                          : habit.type === "reduce"
                            ? "bg-warning/10 text-warning"
                            : "bg-primary/10 text-primary"
                      )}>
                        {habit.icon || "📊"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-foreground">{habit.nome}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1 bg-foreground/8 overflow-hidden rounded-full">
                            <div
                              className={cn(
                                "h-full transition-all duration-500 ease-out rounded-full",
                                isOnTrack ? "bg-success" : habit.type === "reduce" ? "bg-warning" : "bg-primary"
                              )}
                              style={{ width: `${Math.min(100, prog)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                            {count}/{goal}
                          </span>
                        </div>
                      </div>
                      {habit.inputMode === "incremental" && (
                        <div
                          onClick={e => { e.stopPropagation(); handleAddMetricEntry(habit.id, 1); }}
                          className={cn(
                            "h-9 w-9 flex items-center justify-center shrink-0 rounded-lg transition-all active:scale-95",
                            habit.type === "reduce"
                              ? "bg-warning/10 text-warning hover:bg-warning/20"
                              : "bg-primary/10 text-primary hover:bg-primary/20"
                          )}
                        >
                          <Plus className="h-4 w-4" />
                        </div>
                      )}
                      {(habit.inputMode === "binary" || habit.inputMode === "fixedAmount") && (
                        <div
                          onClick={e => {
                            e.stopPropagation();
                            if (isOnTrack && count > 0) {
                              const todayEntries = state.trackerEntries.filter(
                                en => en.trackerId === habit.id && en.date === today
                              );
                              todayEntries.forEach(en => handleDeleteMetricEntry(en.id));
                            } else {
                              handleAddMetricEntry(habit.id, habit.inputMode === "binary" ? 1 : goal);
                            }
                          }}
                          className={cn(
                            "h-9 w-9 flex items-center justify-center shrink-0 rounded-lg transition-all active:scale-95",
                            isOnTrack && count > 0
                              ? "bg-success/15 text-success"
                              : "bg-primary/10 text-primary hover:bg-primary/20"
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* PRO upsell — calm, single line */}
        {!isPro && simpleHabits.length >= FREE_LIMIT && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-2">
              Limite gratuito atingido. Hábitos ilimitados na PRO.
            </p>
            <Link to="/decision">
              <Button variant="outline" size="sm">Desbloquear PRO</Button>
            </Link>
          </div>
        )}
      </main>

      {/* ═══ Mode Selector Dialog ═══ */}
      <Dialog open={showModeSelector} onOpenChange={setShowModeSelector}>
        <DialogContent className="w-[90vw] max-w-sm">
          <DialogHeader>
            <p className="mono-label text-primary mb-1">// Novo</p>
            <DialogTitle className="display-headline text-2xl">Escolhe o tipo</DialogTitle>
            <DialogDescription>Ritual diário ou métrica que cresce ao longo do dia.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <button
              onClick={() => { setShowModeSelector(false); setEditingHabit(null); setShowHabitForm(true); }}
              disabled={!canAddSimple}
              className={cn(
                "press-tactile flex flex-col items-center gap-2.5 p-5 border-2 transition-all text-center",
                canAddSimple
                  ? "border-primary/40 bg-primary/[0.04] hover:bg-primary/10 hover:shadow-[0_0_18px_hsl(var(--neon-toxic)/0.35)]"
                  : "border-foreground/10 opacity-40 cursor-not-allowed"
              )}
            >
              <div className="h-12 w-12 border-2 border-primary bg-primary/15 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <span className="font-bold uppercase italic tracking-tight text-sm">Simples</span>
              <span className="mono-label text-muted-foreground/70">Checkbox</span>
            </button>
            <button
              onClick={() => { setShowModeSelector(false); setEditingHabit(null); setShowMetricForm(true); }}
              disabled={!canAddMetric}
              className={cn(
                "press-tactile flex flex-col items-center gap-2.5 p-5 border-2 transition-all text-center",
                canAddMetric
                  ? "border-accent/40 bg-accent/[0.04] hover:bg-accent/10 hover:shadow-[0_0_18px_hsl(var(--neon-ultra)/0.35)]"
                  : "border-foreground/10 opacity-40 cursor-not-allowed"
              )}
            >
              <div className="h-12 w-12 border-2 border-accent bg-accent/15 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <span className="font-bold uppercase italic tracking-tight text-sm">Métrica</span>
              <span className="mono-label text-muted-foreground/70">{canAddMetric ? "Valores" : "PRO"}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Simple Habit Form ═══ */}
      {showHabitForm && (
        <HabitForm
          habit={editingHabit || undefined}
          onSave={handleSaveSimple}
          onCancel={() => { setShowHabitForm(false); setEditingHabit(null); }}
        />
      )}

      {/* ═══ Metric Habit Form (TrackerEditDialog) ═══ */}
      <TrackerEditDialog
        open={showMetricForm}
        onOpenChange={(open) => { if (!open) { setShowMetricForm(false); setEditingHabit(null); } }}
        tracker={editingHabit?.mode === "metric" ? habitToTracker(editingHabit) : null}
        onSave={handleSaveMetric}
        onDelete={editingHabit ? () => { setDeletingHabitId(editingHabit.id); setShowMetricForm(false); } : undefined}
      />

      {/* ═══ Metric Detail Drawer ═══ */}
      {selectedTracker && selectedMetric && (
        <TrackerDetailDrawer
          open={!!selectedMetricId}
          onOpenChange={open => { if (!open) setSelectedMetricId(null); }}
          tracker={selectedTracker}
          todayEntries={todayMetricEntries}
          allEntries={metricEntries}
          summary={getMetricSummary(selectedMetricId!)}
          onAddEntry={(qty, ts) => handleAddMetricEntry(selectedMetricId!, qty, ts)}
          onUpdateEntry={handleUpdateMetricEntry}
          onDeleteEntry={handleDeleteMetricEntry}
          onEdit={() => { setEditingHabit(selectedMetric); setShowMetricForm(true); setSelectedMetricId(null); }}
        />
      )}

      {/* ═══ Delete Confirmation ═══ */}
      <AlertDialog open={!!deletingHabitId} onOpenChange={() => setDeletingHabitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.habits.delete}</AlertDialogTitle>
            <AlertDialogDescription>{t.habits.confirmDelete}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.habits.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHabit}>{t.habits.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ My Habits Dialog ═══ */}
      <MyHabitsDialog open={showMyHabits} onOpenChange={setShowMyHabits} />

      {/* ═══ Paywall ═══ */}
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} onUpgrade={upgradeToPro} trialDaysLeft={trialStatus.daysRemaining} />

      {/* ═══ Referral milestone prompt ═══ */}
      <ReferralPrompt open={showReferralPrompt} onClose={() => setShowReferralPrompt(false)} variant="milestone" />
    </div>
  );
};

export default Index;
