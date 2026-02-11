import { useState, useEffect, useMemo, useCallback } from "react";
import { format, getDay, subDays } from "date-fns";
import { Plus, CheckCircle2, Flame, Sparkles, TrendingUp, TrendingDown, Check, ChevronRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nContext";
import { Habit, Tracker, TrackerEntry } from "@/data/types";
import { addHabit, updateHabit, deleteHabit, addTrackerEntry, updateTrackerEntry, deleteTrackerEntry, isHabitDoneOnDate } from "@/data/storage";
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
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) navigate("/auth?next=trial", { replace: true });
    else if (!isEmailVerified) navigate("/auth?verify=required", { replace: true });
    else if (!isPro && trialStatus.isExpired) navigate("/decision", { replace: true });
  }, [isAuthenticated, isEmailVerified, isPro, trialStatus.isExpired, navigate]);

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

  const doneSimple = todaySimple.filter(h => isSimpleDone(h.id)).length;
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
    const isDone = isSimpleDone(habitId);
    setState(prev => {
      const logs = isDone
        ? prev.dailyLogs.filter(l => !(l.habitId === habitId && l.date === today))
        : [...prev.dailyLogs, { id: Math.random().toString(36).substring(7), habitId, date: today, done: true, completedAt: new Date().toISOString() }];
      return { ...prev, dailyLogs: logs };
    });
  }, [isSimpleDone, today, setState]);

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

      <main className="page-content max-w-xl mx-auto space-y-5">
        {/* Trial banner */}
        {trialStatus.isActive && (
          <div className="flex justify-center">
            <TrialBanner daysRemaining={trialStatus.daysRemaining} onUpgrade={() => setShowPaywall(true)} />
          </div>
        )}

        <NotificationSetup />

        {/* ═══ Daily Progress Hero ═══ */}
        {state.habits.length > 0 && totalTracked > 0 && (
          <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 p-5">
            <div className="flex items-center gap-5">
              <CircularProgress percent={progressPercent} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Progresso de hoje</p>
                <p className="text-2xl font-bold text-foreground tracking-tight">
                  {totalDone}<span className="text-muted-foreground font-normal text-lg">/{totalTracked}</span>
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {streak > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <Flame className="h-3.5 w-3.5" /> {streak} {streak === 1 ? "dia" : "dias"}
                    </span>
                  )}
                  {progressPercent >= 100 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-success">
                      <Sparkles className="h-3.5 w-3.5" /> Completo!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coach is now per-habit, no global card */}
        {/* ═══ Page Header ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Hábitos</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalTracked} {totalTracked === 1 ? "hábito hoje" : "hábitos hoje"}
              {!isPro && simpleHabits.length < FREE_LIMIT && ` · ${FREE_LIMIT - simpleHabits.length} disponíveis`}
            </p>
          </div>
          <Button size="sm" className="gap-1.5 rounded-xl h-9 px-3" onClick={() => setShowModeSelector(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo</span>
          </Button>
        </div>

        {/* ═══ Empty state ═══ */}
        {state.habits.length === 0 && (
          <Card className="border-dashed border-border/40 bg-card/30">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-foreground/80">Começa com um hábito simples</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
                A consistência constrói-se passo a passo. Um hábito basta para começar.
              </p>
              <Button onClick={() => setShowModeSelector(true)} variant="default" size="sm" className="mt-4 gap-1.5">
                <Plus className="h-4 w-4" /> Criar hábito
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ Simple Habits Section ═══ */}
        {sortedTodaySimple.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rituais · {doneSimple}/{todaySimple.length}
              </h2>
            </div>
            <div className="space-y-1.5">
               {sortedTodaySimple.map(habit => {
                return (
                  <MinimalHabitCard
                    key={habit.id}
                    habit={habit}
                    isDone={isSimpleDone(habit.id)}
                    onToggle={() => handleToggleSimple(habit.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ Metric Habits Section ═══ */}
        {activeMetrics.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Métricas · {onTrackMetrics}/{activeMetrics.length} on track
              </h2>
            </div>
            <div className="space-y-2">
              {activeMetrics.map(habit => {
                const count = getTodayCount(habit.id);
                const goal = habit.dailyGoal ?? habit.baseline ?? 1;
                const prog = habit.type === "reduce"
                  ? Math.max(0, 100 - (count / Math.max(goal, 1)) * 100)
                  : Math.min(100, (count / Math.max(goal, 1)) * 100);
                const isOnTrack = habit.type === "reduce" ? count <= goal : count >= goal;

                return (
                  <div key={habit.id}>
                    <button
                      onClick={() => navigate(`/app/habit/${habit.id}`)}
                      className={cn(
                        "w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all duration-300 text-left group",
                        "hover:shadow-sm hover:border-primary/20",
                        isOnTrack
                          ? "border-success/20 bg-success/5"
                          : "border-border/40 bg-card/60"
                      )}
                    >
                      <div className={cn(
                        "h-11 w-11 rounded-xl flex items-center justify-center text-lg shrink-0 border transition-colors",
                        isOnTrack
                          ? "border-success/20 bg-success/8"
                          : habit.type === "reduce"
                            ? "border-warning/20 bg-warning/8"
                            : "border-primary/20 bg-primary/8"
                      )}>
                        {habit.icon || "📊"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-foreground">{habit.nome}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700 ease-out",
                                isOnTrack ? "bg-success" : habit.type === "reduce" ? "bg-warning" : "bg-primary"
                              )}
                              style={{ width: `${Math.min(100, prog)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {count}/{goal}
                          </span>
                        </div>
                      </div>
                      {habit.inputMode === "incremental" && (
                        <div
                          onClick={e => { e.stopPropagation(); handleAddMetricEntry(habit.id, 1); }}
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                            "hover:shadow-md active:scale-95",
                            habit.type === "reduce"
                              ? "border-warning/30 bg-warning/10 text-warning hover:bg-warning/20"
                              : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
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
                              // Uncheck: remove today's entries for this metric
                              const todayEntries = state.trackerEntries.filter(
                                en => en.trackerId === habit.id && en.date === today
                              );
                              todayEntries.forEach(en => handleDeleteMetricEntry(en.id));
                            } else {
                              handleAddMetricEntry(habit.id, habit.inputMode === "binary" ? 1 : goal);
                            }
                          }}
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                            "hover:shadow-md active:scale-95",
                            isOnTrack && count > 0
                              ? "border-success/30 bg-success/10 text-success"
                              : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inactive habits notice */}
        {state.habits.filter(h => !h.active).length > 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            {state.habits.filter(h => !h.active).length} hábito(s) inativo(s)
          </p>
        )}

        {/* PRO upsell */}
        {!isPro && simpleHabits.length >= FREE_LIMIT && (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground mb-2">
              Limite gratuito atingido. Hábitos ilimitados + métricas na PRO.
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
            <DialogTitle>Novo hábito</DialogTitle>
            <DialogDescription>Escolhe o tipo de hábito que queres criar.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <button
              onClick={() => { setShowModeSelector(false); setEditingHabit(null); setShowHabitForm(true); }}
              disabled={!canAddSimple}
              className={cn(
                "flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all text-center",
                canAddSimple
                  ? "border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                  : "border-muted opacity-50 cursor-not-allowed"
              )}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <span className="font-semibold text-sm">Simples</span>
              <span className="text-xs text-muted-foreground">Checkbox diário</span>
            </button>
            <button
              onClick={() => { setShowModeSelector(false); setEditingHabit(null); setShowMetricForm(true); }}
              disabled={!canAddMetric}
              className={cn(
                "flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all text-center",
                canAddMetric
                  ? "border-accent/20 hover:border-accent/40 hover:bg-accent/5"
                  : "border-muted opacity-50 cursor-not-allowed"
              )}
            >
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <span className="font-semibold text-sm">Métrica</span>
              <span className="text-xs text-muted-foreground">{canAddMetric ? "Rastrear valores" : "Requer PRO"}</span>
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

      {/* ═══ Paywall ═══ */}
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} onUpgrade={upgradeToPro} trialDaysLeft={trialStatus.daysRemaining} />
    </div>
  );
};

export default Index;
