import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, GripVertical, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nContext";
import { AppState, Habit } from "@/data/types";
import { loadState, saveState, addHabit, updateHabit, deleteHabit } from "@/data/storage";
import { Navigation } from "@/components/Layout/Navigation";
import { HabitForm } from "@/components/Habits/HabitForm";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

const Habitos = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const [state, setState] = useState<AppState>(() => loadState());
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // FREE limit: max 3 habits
  const FREE_HABIT_LIMIT = 3;
  const canAddHabit = isPro || state.habits.length < FREE_HABIT_LIMIT;

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

  // Move habit up/down for touch devices
  const moveHabit = (habitId: string, direction: 'up' | 'down') => {
    const habits = [...state.habits];
    const index = habits.findIndex(h => h.id === habitId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= habits.length) return;
    
    [habits[index], habits[newIndex]] = [habits[newIndex], habits[index]];
    setState(prev => ({ ...prev, habits }));
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container max-w-lg mx-auto py-6 px-4 space-y-6">
        {/* Minimal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/app">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">{t.habits.management}</h1>
              <p className="text-sm text-muted-foreground">
                {state.habits.length} {state.habits.length === 1 ? 'hábito' : 'hábitos'}
                {!isPro && ` · ${FREE_HABIT_LIMIT - state.habits.length} disponíveis`}
              </p>
            </div>
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
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>

        {state.habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{t.habits.noHabits}</p>
            <Button
              onClick={() => {
                setEditingHabit(null);
                setShowHabitForm(true);
              }}
              variant="link"
              className="mt-2 text-primary"
            >
              {t.habits.add}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {state.habits.map((habit, index) => (
              <div
                key={habit.id}
                draggable
                onDragStart={() => handleDragStart(habit.id)}
                onDragOver={(e) => handleDragOver(e, habit.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all cursor-grab active:cursor-grabbing",
                  draggedId === habit.id && "opacity-50 scale-[0.98]",
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
                  <p className="font-medium truncate">{habit.nome}</p>
                  {(habit.categoria || habit.scheduledTime) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[habit.categoria, habit.scheduledTime].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Switch
                    checked={habit.active}
                    onCheckedChange={() => handleToggleActive(habit)}
                    className="scale-90"
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
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
            <Link to="/app/decision">
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
    </div>
  );
};

export default Habitos;
