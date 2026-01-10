import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { translations } from "@/i18n/translations.pt";
import { AppState, Habit } from "@/data/types";
import { loadState, saveState, addHabit, updateHabit, deleteHabit } from "@/data/storage";
import { getActiveHabits } from "@/logic/computations";
import { Navigation } from "@/components/Layout/Navigation";
import { HabitForm } from "@/components/Habits/HabitForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const Habitos = () => {
  const { toast } = useToast();
  const [state, setState] = useState<AppState>(() => loadState());
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

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

  const handleToggleActive = (habit: Habit) => {
    const activeCount = getActiveHabits(state).length;
    
    if (habit.active && activeCount <= 1) {
      toast({
        title: translations.habits.atLeastOne,
        variant: "destructive",
      });
      return;
    }
    
    setState((prev) => updateHabit(prev, habit.id, { active: !habit.active }));
    toast({ title: habit.active ? "Hábito desativado" : "Hábito ativado" });
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestão de Hábitos</h1>
          <Button
            onClick={() => {
              setEditingHabit(null);
              setShowHabitForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {translations.habits.add}
          </Button>
        </div>

        {state.habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card py-16 text-center">
            <p className="text-muted-foreground">{translations.habits.noHabits}</p>
            <Button
              onClick={() => {
                setEditingHabit(null);
                setShowHabitForm(true);
              }}
              variant="link"
              className="mt-2 text-primary"
            >
              {translations.habits.add}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {state.habits.map((habit) => (
              <div
                key={habit.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-all",
                  !habit.active && "opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: habit.cor || "hsl(var(--primary))" }}
                  />
                  <div>
                    <p className="font-medium">{habit.nome}</p>
                    {habit.categoria && (
                      <p className="text-sm text-muted-foreground">{habit.categoria}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={habit.active ? "default" : "secondary"}>
                    {habit.active ? translations.habits.active : translations.habits.inactive}
                  </Badge>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(habit)}
                    title={habit.active ? "Desativar" : "Ativar"}
                  >
                    <Power className={cn("h-4 w-4", habit.active ? "text-primary" : "text-muted-foreground")} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingHabit(habit);
                      setShowHabitForm(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingHabitId(habit.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
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

export default Habitos;
