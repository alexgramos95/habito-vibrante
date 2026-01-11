import { useState, useEffect } from "react";
import { Star, Trophy, Medal, Zap, Target, PiggyBank, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AppState, ACHIEVEMENTS, SAVINGS_CATEGORIES } from "@/data/types";
import { loadState, saveState, addSavingsEntry, deleteSavingsEntry } from "@/data/storage";
import { getLevelProgress, calculateSavingsSummary } from "@/logic/computations";
import { useToast } from "@/hooks/use-toast";

const Progresso = () => {
  const { toast } = useToast();
  const [state, setState] = useState<AppState>(() => loadState());
  const [showSavingsForm, setShowSavingsForm] = useState(false);
  const [savingsForm, setSavingsForm] = useState({
    amount: "",
    descricao: "",
    categoria: "",
    habitId: "",
  });

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  useEffect(() => {
    saveState(state);
  }, [state]);

  const levelProgress = getLevelProgress(state.gamification.pontos);
  const savingsSummary = calculateSavingsSummary(state, currentYear, currentMonth);

  // Get all achievements with unlock status
  const allAchievements = ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    desbloqueada: state.gamification.conquistas.includes(achievement.id),
  }));

  const unlockedAchievements = allAchievements.filter((a) => a.desbloqueada);
  const lockedAchievements = allAchievements.filter((a) => !a.desbloqueada);

  // Recent savings entries (last 10)
  const recentSavings = [...state.savings]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const handleAddSavings = () => {
    const amount = parseFloat(savingsForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    if (!savingsForm.descricao.trim()) {
      toast({ title: "Descrição obrigatória", variant: "destructive" });
      return;
    }

    setState((prev) =>
      addSavingsEntry(prev, {
        date: format(today, "yyyy-MM-dd"),
        amount,
        moeda: "€",
        descricao: savingsForm.descricao.trim(),
        categoria: savingsForm.categoria || undefined,
        habitId: savingsForm.habitId || undefined,
      })
    );

    toast({ title: `Poupança de ${amount.toFixed(2)} € registada!` });
    setShowSavingsForm(false);
    setSavingsForm({ amount: "", descricao: "", categoria: "", habitId: "" });
  };

  const handleDeleteSavings = (id: string) => {
    setState((prev) => deleteSavingsEntry(prev, id));
    toast({ title: "Entrada removida" });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-8 space-y-8">
        <h1 className="text-2xl font-bold">Progresso & Recompensas</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pontos */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-warning" />
                Pontos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-5xl font-bold text-gradient">{state.gamification.pontos}</p>
              <p className="text-sm text-muted-foreground mt-1">pontos acumulados</p>
              <p className="text-xs text-muted-foreground mt-2">+10 pontos por cada hábito concluído</p>
            </CardContent>
          </Card>

          {/* Nível Atual */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Nível Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-5xl font-bold text-primary">Nível {levelProgress.current}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Próximo nível</span>
                  <span className="font-medium">{state.gamification.pontos % 500}/500</span>
                </div>
                <Progress value={levelProgress.progress} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  Faltam {500 - (state.gamification.pontos % 500)} pontos para o Nível {levelProgress.nextLevel}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conquistas Desbloqueadas */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-success" />
              Conquistas Desbloqueadas ({unlockedAchievements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unlockedAchievements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Ainda não desbloqueaste nenhuma conquista. Continua!
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {unlockedAchievements.map((conquista) => (
                  <div
                    key={conquista.id}
                    className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 animate-fade-in"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl">
                      {conquista.icon}
                    </div>
                    <div>
                      <p className="font-medium text-primary">{conquista.nome}</p>
                      <p className="text-sm text-muted-foreground">{conquista.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas Conquistas */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              Próximas Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {lockedAchievements.map((conquista) => (
                <div
                  key={conquista.id}
                  className="flex items-center gap-4 rounded-2xl border border-border/30 bg-secondary/30 p-4 opacity-60"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl grayscale">
                    {conquista.icon}
                  </div>
                  <div>
                    <p className="font-medium">{conquista.nome}</p>
                    <p className="text-sm text-muted-foreground">{conquista.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mealheiro / Poupanças */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-success" />
              Mealheiro
            </CardTitle>
            <Button onClick={() => setShowSavingsForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar poupança
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Savings Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-success/10 border border-success/30 p-4 text-center">
                <p className="text-3xl font-bold text-success">{savingsSummary.totalPoupadoMesAtual.toFixed(2)} €</p>
                <p className="text-sm text-muted-foreground">este mês</p>
              </div>
              <div className="rounded-xl bg-primary/10 border border-primary/30 p-4 text-center">
                <p className="text-3xl font-bold text-primary">{savingsSummary.totalPoupadoAllTime.toFixed(2)} €</p>
                <p className="text-sm text-muted-foreground">total acumulado</p>
              </div>
              <div className="rounded-xl bg-secondary p-4 text-center">
                <p className="text-3xl font-bold">{savingsSummary.numeroEntradasMesAtual}</p>
                <p className="text-sm text-muted-foreground">entradas este mês</p>
              </div>
            </div>

            {savingsSummary.totalPoupadoAllTime > 0 && (
              <p className="text-center text-muted-foreground italic">
                🎉 Já poupaste {savingsSummary.totalPoupadoAllTime.toFixed(2)} € ao cuidar dos teus hábitos!
              </p>
            )}

            {/* Recent Entries */}
            {recentSavings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Últimas entradas</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentSavings.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl bg-secondary/50 p-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-success font-semibold">+{entry.amount.toFixed(2)} €</span>
                        <span className="text-sm">{entry.descricao}</span>
                        {entry.categoria && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {entry.categoria}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), "dd/MM")}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteSavings(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Savings Dialog */}
      <Dialog open={showSavingsForm} onOpenChange={setShowSavingsForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Poupança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="10.00"
                value={savingsForm.amount}
                onChange={(e) => setSavingsForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                placeholder="Ex: Não comprei café fora"
                value={savingsForm.descricao}
                onChange={(e) => setSavingsForm((prev) => ({ ...prev, descricao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria (opcional)</Label>
              <Select
                value={savingsForm.categoria}
                onValueChange={(value) => setSavingsForm((prev) => ({ ...prev, categoria: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {SAVINGS_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="habit">Hábito relacionado (opcional)</Label>
              <Select
                value={savingsForm.habitId}
                onValueChange={(value) => setSavingsForm((prev) => ({ ...prev, habitId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar hábito" />
                </SelectTrigger>
                <SelectContent>
                  {state.habits.map((habit) => (
                    <SelectItem key={habit.id} value={habit.id}>
                      {habit.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSavingsForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddSavings}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Progresso;
