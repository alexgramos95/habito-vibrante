import { useState } from "react";
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
import { ACHIEVEMENTS, SAVINGS_CATEGORIES } from "@/data/types";
import { addSavingsEntry, deleteSavingsEntry } from "@/data/storage";
import { getLevelProgress, calculateSavingsSummary } from "@/logic/computations";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/contexts/DataContext";

const Progresso = () => {
  const { toast } = useToast();
  const { state, setState } = useData();
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
    <div className="page-container">
      <Navigation />

      <main className="page-content">
        <h1 className="page-title">Progresso & Recompensas</h1>

        <div className="grid gap-3 grid-cols-2">
          {/* Pontos */}
          <div className="summary-card">
            <div className="summary-card-header">
              <Star className="summary-card-icon text-warning" />
              <span className="summary-card-label">Pontos</span>
            </div>
            <div className="summary-card-value text-warning">{state.gamification.pontos}</div>
            <p className="summary-card-subtext">acumulados</p>
          </div>

          {/* Nível Atual */}
          <div className="summary-card">
            <div className="summary-card-header">
              <Trophy className="summary-card-icon text-primary" />
              <span className="summary-card-label">Nível</span>
            </div>
            <div className="summary-card-value text-primary">{levelProgress.current}</div>
            <div className="mt-1.5">
              <Progress value={levelProgress.progress} className="h-1" />
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {500 - (state.gamification.pontos % 500)} pts para Nível {levelProgress.nextLevel}
              </p>
            </div>
          </div>
        </div>

        {/* Conquistas Desbloqueadas */}
        <Card className="border-border/30 bg-card/50">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Medal className="h-4 w-4 text-success" />
              Conquistas ({unlockedAchievements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {unlockedAchievements.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma conquista desbloqueada
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {unlockedAchievements.map((conquista) => (
                  <div
                    key={conquista.id}
                    className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-2.5"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-lg shrink-0">
                      {conquista.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{conquista.nome}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{conquista.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas Conquistas - Collapsed on mobile */}
        <Card className="border-border/30 bg-card/50">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              Próximas Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {lockedAchievements.slice(0, 4).map((conquista) => (
                <div
                  key={conquista.id}
                  className="flex items-center gap-3 rounded-xl border border-border/20 bg-secondary/20 p-2.5 opacity-60"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-lg grayscale shrink-0">
                    {conquista.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{conquista.nome}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{conquista.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
            {lockedAchievements.length > 4 && (
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                +{lockedAchievements.length - 4} mais conquistas por desbloquear
              </p>
            )}
          </CardContent>
        </Card>

        {/* Mealheiro / Poupanças */}
        <Card className="border-border/30 bg-card/50">
          <CardHeader className="pb-2 px-3 pt-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PiggyBank className="h-4 w-4 text-success" />
              Mealheiro
            </CardTitle>
            <Button onClick={() => setShowSavingsForm(true)} size="sm" variant="ghost" className="h-8 px-2">
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3">
            {/* Savings Summary - Compact */}
            <div className="metrics-grid-3">
              <div className="metric-compact border-success/20 bg-success/5">
                <p className="metric-compact-value text-success">{savingsSummary.totalPoupadoMesAtual.toFixed(0)} €</p>
                <p className="metric-compact-label">este mês</p>
              </div>
              <div className="metric-compact border-primary/20 bg-primary/5">
                <p className="metric-compact-value text-primary">{savingsSummary.totalPoupadoAllTime.toFixed(0)} €</p>
                <p className="metric-compact-label">total</p>
              </div>
              <div className="metric-compact">
                <p className="metric-compact-value">{savingsSummary.numeroEntradasMesAtual}</p>
                <p className="metric-compact-label">entradas</p>
              </div>
            </div>

            {/* Recent Entries - Compact */}
            {recentSavings.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {recentSavings.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="item-card py-2 group"
                  >
                    <span className="text-success font-medium text-sm">+{entry.amount.toFixed(0)} €</span>
                    <span className="text-xs text-muted-foreground truncate flex-1">{entry.descricao}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(entry.date), "dd/MM")}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteSavings(entry.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
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
