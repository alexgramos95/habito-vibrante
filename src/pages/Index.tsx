import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, GripVertical, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n/I18nContext";
import { Habit } from "@/data/types";
import { addHabit, updateHabit, deleteHabit } from "@/data/storage";
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

  // FREE limit: max 3 habits
  const FREE_HABIT_LIMIT = 3;
  const canAddHabit = isPro || state.habits.length < FREE_HABIT_LIMIT;
  
  // Sort habits chronologically by scheduledTime
  const sortedHabits = useMemo(() => sortHabitsByTime(state.habits), [state.habits]);

  const handleSaveHabit = (data: Omit<Habit, "id" | "createdAt">) => {
    if (editingHabit) {
      setState((prev) => updateHabit(prev, editingHabit.id, data));
      toast({ title: t.habits.habitUpdated });
    } else {
      if (!canAddHabit) {
        toast({
          title: "Limite atingido",
          description: "Actualiza para PRO para adicionar mais hábitos.",
          variant: "destructive",
        });
        return;
      }
      setState((prev) => addHabit(prev, data));
      toast({ title: t.habits.habitCreated });
    }
    setShowHabitForm(false);
    setEditingHabit(null);
  };

  const handleToggleActive = (habit: Habit) => {
    setState((prev) => updateHabit(prev, habit.id, { active: !habit.active }));
    toast({ title: habit.active ? t.habits.inactive : t.habits.active });
  };

  const handleDeleteHabit = () => {
    if (!deletingHabitId) return;
    setState((prev) => deleteHabit(prev, deletingHabitId));
    toast({ title: t.habits.habitDeleted });
    setDeletingHabitId(null);
  };

  // Drag and drop reorder
  const handleDragStart = (habitId: string) => {
    setDraggedId(habitId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    
    const habits = [...state.habits];
    const draggedIndex = habits.findIndex(h => h.id === draggedId);
    const targetIndex = habits.findIndex(h => h.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedItem] = habits.splice(draggedIndex, 1);
      habits.splice(targetIndex, 0, draggedItem);
      setState(prev => ({ ...prev, habits }));
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
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

        {/* Header - Compact */}
        <div className="page-header">
          <div>
            <h1 className="page-title">{t.habits.management}</h1>
            <p className="page-subtitle">
              {state.habits.length} {state.habits.length === 1 ? 'hábito' : 'hábitos'}
              {!isPro && ` · ${FREE_HABIT_LIMIT - state.habits.length} disponíveis`}
            </p>
          </div>
          <Button
            onClick={() => {
              if (!canAddHabit) {
                toast({
                  title: "Limite FREE atingido",
                  description: "Actualiza para PRO para adicionar mais hábitos.",
                  variant: "destructive",
                });
                return;
              }
              setEditingHabit(null);
              setShowHabitForm(true);
            }}
            size="sm"
            className="gap-1.5 rounded-xl h-9 px-3"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>

        {state.habits.length === 0 ? (
          <Card className="border-border/30 border-dashed bg-card/30">
            <CardContent className="empty-state">
              <CheckCircle2 className="empty-state-icon" />
              <p className="empty-state-title">{t.habits.noHabits}</p>
              <Button
                onClick={() => {
                  setEditingHabit(null);
                  setShowHabitForm(true);
                }}
                variant="link"
                className="mt-2 text-sm"
              >
                {t.habits.add}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {sortedHabits.map((habit, index) => (
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
                <div className="flex flex-col gap-0.5 touch-none">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                </div>

                {/* Color indicator */}
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: habit.cor || "hsl(var(--primary))" }}
                />

                {/* Habit info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{habit.nome}</p>
                  {(habit.categoria || habit.scheduledTime) && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {[habit.categoria, habit.scheduledTime].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={habit.active}
                    onCheckedChange={() => handleToggleActive(habit)}
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
          </div>
        )}

        {/* FREE limit notice */}
        {!isPro && state.habits.length >= FREE_HABIT_LIMIT && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Limite de {FREE_HABIT_LIMIT} hábitos atingido
            </p>
            <Link to="/decision">
              <Button variant="outline" size="sm">
                Explorar becoMe PRO
              </Button>
            </Link>
          </div>
        )}
      </main>

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
