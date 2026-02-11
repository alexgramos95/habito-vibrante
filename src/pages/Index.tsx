import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, GripVertical, CheckCircle2, TrendingUp, TrendingDown, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n/I18nContext";
import { Habit } from "@/data/types";
import { addHabit, updateHabit, deleteHabit, addTrackerEntry, updateTrackerEntry, deleteTrackerEntry } from "@/data/storage";
import { Navigation } from "@/components/Layout/Navigation";
import { HabitForm } from "@/components/Habits/HabitForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { sortHabitsByTime } from "@/logic/habitSorting";
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
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { TrialBanner } from "@/components/Paywall/TrialBanner";
import { PaywallModal } from "@/components/Paywall/PaywallModal";
import { Link } from "react-router-dom";
import { NotificationSetup, NotificationIndicator } from "@/components/Habits/NotificationSetup";
import { TrackerDetailDrawer } from "@/components/Trackers/TrackerDetailDrawer";
import { TrackerDeleteDialog } from "@/components/Trackers/TrackerDeleteDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

const Index = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, isEmailVerified } = useAuth();
  const { isPro, trialStatus, upgradeToPro } = useSubscription();
  const { state, setState, isLoading } = useData();
  
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [selectedMetricHabitId, setSelectedMetricHabitId] = useState<string | null>(null);
  const [metricToDelete, setMetricToDelete] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth?next=trial", { replace: true });
    } else if (!isEmailVerified) {
      navigate("/auth?verify=required", { replace: true });
    } else if (!isPro && trialStatus.isExpired) {
      navigate("/decision", { replace: true });
    }
  }, [isAuthenticated, isEmailVerified, isPro, trialStatus.isExpired, navigate]);

  // Separate habits by mode
  const simpleHabits = useMemo(() => {
    return state.habits.filter(h => !h.mode || h.mode === 'simple');
  }, [state.habits]);

  const metricHabits = useMemo(() => {
    return state.habits.filter(h => h.mode === 'metric');
  }, [state.habits]);

  // FREE limit: max 3 simple habits, metrics require PRO
  const FREE_SIMPLE_LIMIT = 3;
  const canAddSimple = isPro || simpleHabits.length < FREE_SIMPLE_LIMIT;
  const canAddMetric = isPro;
  
  // Sort habits chronologically
  const sortedSimpleHabits = useMemo(() => sortHabitsByTime(simpleHabits), [simpleHabits]);
  
  // Get today's date
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Get metric habit entry counts for today
  const getTodayCount = (habitId: string) => {
    return state.trackerEntries
      .filter(e => e.trackerId === habitId && e.date === today)
      .reduce((sum, e) => sum + e.quantity, 0);
  };

  // Check if simple habit is done today
  const isHabitDoneToday = (habitId: string) => {
    return state.dailyLogs.some(log => log.habitId === habitId && log.date === today && log.done);
  };

  // Handlers for simple habits
  const handleToggleSimple = (habit: Habit) => {
    const isDone = isHabitDoneToday(habit.id);
    setState((prev) => {
      const updatedLogs = isDone
        ? prev.dailyLogs.filter(log => !(log.habitId === habit.id && log.date === today))
        : [
            ...prev.dailyLogs,
            {
              id: Math.random().toString(36).substring(7),
              habitId: habit.id,
              date: today,
              done: true,
              completedAt: new Date().toISOString(),
            }
          ];
      return { ...prev, dailyLogs: updatedLogs };
    });
    toast({ title: isDone ? t.habits.inactive : t.habits.active });
  };

  // Handlers for metric habits
  const handleAddMetricEntry = (habitId: string, quantity: number) => {
    setState((prev) => addTrackerEntry(prev, habitId, quantity));
    toast({ title: "Entry added" });
  };

  const handleDeleteMetricEntry = (entryId: string) => {
    setState((prev) => deleteTrackerEntry(prev, entryId));
    toast({ title: "Entry removed" });
  };

  const handleUpdateMetricEntry = (entryId: string, updates: Partial<any>) => {
    setState((prev) => updateTrackerEntry(prev, entryId, updates));
    toast({ title: "Entry updated" });
  };

  // Habit management
  const handleSaveHabit = (data: Omit<Habit, "id" | "createdAt">, mode: 'simple' | 'metric' = 'simple') => {
    if (editingHabit) {
      setState((prev) => updateHabit(prev, editingHabit.id, { ...data, mode }));
      toast({ title: t.habits.habitUpdated });
    } else {
      const isMetric = mode === 'metric';
      if (!isMetric && !canAddSimple) {
        toast({
          title: "Limit reached",
          description: "Upgrade to PRO to add more simple habits.",
          variant: "destructive",
        });
        return;
      }
      if (isMetric && !canAddMetric) {
        toast({
          title: "PRO feature",
          description: "Metric habits require PRO.",
          variant: "destructive",
        });
        return;
      }
      setState((prev) => addHabit(prev, { ...data, mode }));
      toast({ title: t.habits.habitCreated });
    }
    setShowHabitForm(false);
    setEditingHabit(null);
    setShowModeSelector(false);
  };

  const handleDeleteHabit = () => {
    if (!deletingHabitId) return;
    setState((prev) => deleteHabit(prev, deletingHabitId));
    toast({ title: t.habits.habitDeleted });
    setDeletingHabitId(null);
  };

  const handleToggleActive = (habit: Habit) => {
    setState((prev) => updateHabit(prev, habit.id, { active: !habit.active }));
    toast({ title: habit.active ? t.habits.inactive : t.habits.active });
  };

  // Drag and drop reorder (simple habits only)
  const handleDragStart = (habitId: string) => {
    setDraggedId(habitId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    
    const habits = [...sortedSimpleHabits];
    const draggedIndex = habits.findIndex(h => h.id === draggedId);
    const targetIndex = habits.findIndex(h => h.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedItem] = habits.splice(draggedIndex, 1);
      habits.splice(targetIndex, 0, draggedItem);
      const newState = habits.concat(metricHabits);
      setState(prev => ({ ...prev, habits: newState }));
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  // Helper to convert metric habit to tracker format for detail drawer
  const metricHabitToTracker = (habit: Habit) => {
    return {
      id: habit.id,
      name: habit.nome,
      type: habit.type || 'increase' as const,
      inputMode: habit.inputMode || 'incremental' as const,
      unitSingular: habit.unitSingular || '',
      unitPlural: habit.unitPlural || 's',
      icon: habit.icon,
      baseline: habit.baseline || 0,
      dailyGoal: habit.dailyGoal,
      valuePerUnit: habit.valuePerUnit || 0,
      active: habit.active,
      createdAt: habit.createdAt,
      includeInFinances: habit.includeInFinances || false,
      frequency: habit.frequency || 'daily' as const,
      scheduledTime: habit.scheduledTime,
      scheduledDays: habit.scheduledDays,
      specificDays: habit.specificDays,
      color: habit.cor,
    };
  };

  const selectedMetricHabit = selectedMetricHabitId 
    ? metricHabits.find(h => h.id === selectedMetricHabitId)
    : null;
  
  const selectedMetricAsTracker = selectedMetricHabit 
    ? metricHabitToTracker(selectedMetricHabit)
    : null;

  const metricEntries = selectedMetricHabitId
    ? state.trackerEntries.filter(e => e.trackerId === selectedMetricHabitId)
    : [];

  const todayMetricEntries = metricEntries.filter(e => e.date === today);

  const getMetricSummary = (habitId: string) => {
    const entries = state.trackerEntries.filter(e => e.trackerId === habitId);
    const habit = metricHabits.find(h => h.id === habitId);
    if (!habit) return null;

    const todayCount = getTodayCount(habitId);
    const goal = habit.dailyGoal ?? habit.baseline ?? 0;
    
    // Calculate 30-day stats
    const last30Days = new Array(30).fill(0).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'yyyy-MM-dd');
    });
    
    const monthlyCount = entries
      .filter(e => last30Days.includes(e.date))
      .reduce((sum, e) => sum + e.quantity, 0);
    
    const daysOnTrack = new Set(
      entries
        .filter(e => {
          const qty = entries
            .filter(ee => ee.date === e.date)
            .reduce((sum, ee) => sum + ee.quantity, 0);
          return habit.type === 'reduce' ? qty <= goal : qty >= goal;
        })
        .map(e => e.date)
    ).size;

    const average30Days = last30Days.length > 0 
      ? monthlyCount / last30Days.length 
      : 0;

    return {
      todayCount,
      todayLoss: habit.type === 'reduce' ? Math.max(0, todayCount * (habit.valuePerUnit || 0)) : 0,
      monthlyCount,
      monthlyLoss: habit.type === 'reduce' 
        ? entries
            .filter(e => last30Days.includes(e.date))
            .reduce((sum, e) => sum + e.quantity * (habit.valuePerUnit || 0), 0)
        : 0,
      daysOnTrack,
      average30Days,
    };
  };

  return (
    <div className="page-container">
      <Navigation />

      <main className="page-content max-w-xl mx-auto">
        {/* Trial banner */}
        {trialStatus.isActive && (
          <div className="flex justify-center">
            <TrialBanner
              daysRemaining={trialStatus.daysRemaining}
              onUpgrade={() => setShowPaywall(true)}
            />
          </div>
        )}

        {/* Notification setup banner */}
        <NotificationSetup />

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Hábitos</h1>
            <p className="page-subtitle">
              {state.habits.length} {state.habits.length === 1 ? 'hábito' : 'hábitos'}
              {!isPro && ` · ${FREE_SIMPLE_LIMIT - simpleHabits.length} disponíveis`}
            </p>
          </div>
          <Dialog open={showModeSelector} onOpenChange={setShowModeSelector}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 rounded-xl h-9 px-3">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-xs">
              <DialogHeader>
                <DialogTitle>Que tipo de hábito?</DialogTitle>
                <DialogDescription>
                  Escolhe se queres um simples (check) ou com métrica (rastrear).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <button
                  onClick={() => {
                    setEditingHabit(null);
                    setShowHabitForm(true);
                  }}
                  className="w-full p-4 rounded-xl border-2 border-primary/20 hover:bg-primary/5 transition-colors text-left"
                  disabled={!canAddSimple}
                >
                  <div className="font-semibold">✓ Simples (Check)</div>
                  <div className="text-sm text-muted-foreground">Checkbox diário</div>
                </button>
                <button
                  onClick={() => {
                    setEditingHabit(null);
                    setShowHabitForm(true);
                  }}
                  className="w-full p-4 rounded-xl border-2 border-primary/20 hover:bg-primary/5 transition-colors text-left disabled:opacity-50"
                  disabled={!canAddMetric}
                >
                  <div className="font-semibold">📊 Com Métrica</div>
                  <div className="text-sm text-muted-foreground">
                    {isPro ? "Rastrear quantidade" : "Requer PRO"}
                  </div>
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Habits list */}
        {state.habits.length === 0 ? (
          <Card className="border-border/30 border-dashed bg-card/30">
            <CardContent className="empty-state">
              <CheckCircle2 className="empty-state-icon" />
              <p className="empty-state-title">Começa com um hábito simples.</p>
              <p className="text-sm text-muted-foreground">
                A consistência constrói-se passo a passo.
              </p>
              <Button
                onClick={() => setShowModeSelector(true)}
                variant="link"
                className="mt-2 text-sm"
              >
                Criar hábito
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {/* Simple habits */}
            {sortedSimpleHabits.map((habit) => (
              <div
                key={habit.id}
                draggable
                onDragStart={() => handleDragStart(habit.id)}
                onDragOver={(e) => handleDragOver(e, habit.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all duration-200 cursor-grab active:cursor-grabbing hover:bg-card/80 hover:shadow-sm",
                  draggedId === habit.id && "opacity-50 scale-[0.99]",
                  !habit.active && "opacity-50"
                )}
              >
                {/* Drag handle */}
                <GripVertical className="h-4 w-4 text-muted-foreground/40" />

                {/* Color indicator */}
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: habit.cor || "hsl(var(--primary))" }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm truncate">{habit.nome}</p>
                    <NotificationIndicator 
                      hasTime={!!habit.scheduledTime} 
                      reminderEnabled={habit.reminderEnabled}
                    />
                  </div>
                  {(habit.categoria || habit.scheduledTime) && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {[habit.categoria, habit.scheduledTime].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={isHabitDoneToday(habit.id)}
                    onCheckedChange={() => handleToggleSimple(habit)}
                    disabled={!habit.active}
                    className="scale-90"
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-xl"
                    onClick={() => {
                      setEditingHabit(habit);
                      setShowHabitForm(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-all duration-200 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    onClick={() => setDeletingHabitId(habit.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Metric habits */}
            {metricHabits.map((habit) => {
              const todayCount = getTodayCount(habit.id);
              const goal = habit.dailyGoal ?? habit.baseline ?? 0;
              const isOnTrack = habit.type === 'reduce' 
                ? todayCount <= goal 
                : todayCount >= goal;

              return (
                <div
                  key={habit.id}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all duration-200",
                    !habit.active && "opacity-50"
                  )}
                >
                  {/* Icon */}
                  <div className="h-9 w-9 flex items-center justify-center text-lg">
                    {habit.icon || '📊'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{habit.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {todayCount}/{goal} {habit.unitPlural}
                    </p>
                  </div>

                  {/* Quick buttons */}
                  <div className="flex items-center gap-1.5">
                    {habit.inputMode === 'incremental' && (
                      <button
                        onClick={() => handleAddMetricEntry(habit.id, 1)}
                        disabled={!habit.active}
                        className="h-8 px-2 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                      >
                        +1
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedMetricHabitId(habit.id)}
                      className="h-8 px-2 rounded-lg text-xs bg-muted text-muted-foreground hover:bg-muted/80"
                    >
                      Ver
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                      onClick={() => setDeletingHabitId(habit.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FREE limit notice */}
        {!isPro && simpleHabits.length >= FREE_SIMPLE_LIMIT && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Versão gratuita: máximo {FREE_SIMPLE_LIMIT} hábitos. Métrica e ilimitados na PRO.
            </p>
            <Link to="/decision">
              <Button variant="outline" size="sm">
                Desbloquear PRO
              </Button>
            </Link>
          </div>
        )}
      </main>

      {/* Habit form modal */}
      {showHabitForm && (
        <HabitForm
          habit={editingHabit || undefined}
          onSave={(data) => handleSaveHabit(data, editingHabit?.mode || (showModeSelector ? 'metric' : 'simple'))}
          onCancel={() => {
            setShowHabitForm(false);
            setEditingHabit(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingHabitId}
        onOpenChange={() => setDeletingHabitId(null)}
      >
        <AlertDialogContent>
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

      {/* Metric habit detail drawer */}
      {selectedMetricAsTracker && selectedMetricHabit && (
        <TrackerDetailDrawer
          open={!!selectedMetricHabitId}
          onOpenChange={(open) => !open && setSelectedMetricHabitId(null)}
          tracker={selectedMetricAsTracker}
          todayEntries={todayMetricEntries}
          allEntries={metricEntries}
          summary={getMetricSummary(selectedMetricHabitId!)}
          onAddEntry={(qty) => handleAddMetricEntry(selectedMetricHabitId!, qty)}
          onUpdateEntry={handleUpdateMetricEntry}
          onDeleteEntry={handleDeleteMetricEntry}
          onEdit={() => {
            setEditingHabit(selectedMetricHabit);
            setShowHabitForm(true);
            setSelectedMetricHabitId(null);
          }}
        />
      )}

      {/* Metric delete dialog */}
      {metricToDelete && selectedMetricAsTracker && (
        <TrackerDeleteDialog
          open={!!metricToDelete}
          onOpenChange={() => setMetricToDelete(null)}
          tracker={selectedMetricAsTracker}
          entriesCount={metricEntries.length}
          onConfirm={() => {
            if (metricToDelete) {
              handleDeleteHabit();
              setMetricToDelete(null);
            }
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
