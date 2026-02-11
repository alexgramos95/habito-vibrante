import { useState, useMemo } from "react";
import { Star, Trophy, Medal, Target, PiggyBank, Plus, Trash2, TrendingUp, Flame, Sparkles } from "lucide-react";
import { format, subDays } from "date-fns";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

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

const Progresso = () => {
  const { toast } = useToast();
  const { state, setState } = useData();
  const [showSavingsForm, setShowSavingsForm] = useState(false);
  const [savingsForm, setSavingsForm] = useState({ amount: "", descricao: "", categoria: "", habitId: "" });

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const levelProgress = getLevelProgress(state.gamification.pontos);
  const savingsSummary = calculateSavingsSummary(state, currentYear, currentMonth);

  // 30-day consistency
  const consistency30d = useMemo(() => {
    const last30 = Array.from({ length: 30 }, (_, i) => format(subDays(today, i), "yyyy-MM-dd"));
    const activeHabits = state.habits.filter(h => h.active);
    if (activeHabits.length === 0) return 0;
    let totalDone = 0;
    let totalPossible = 0;
    last30.forEach(date => {
      activeHabits.forEach(h => {
        if (!h.mode || h.mode === "simple") {
          totalPossible++;
          if (state.dailyLogs.some(l => l.habitId === h.id && l.date === date && l.done)) totalDone++;
        } else if (h.mode === "metric") {
          totalPossible++;
          const qty = state.trackerEntries.filter(e => e.trackerId === h.id && e.date === date).reduce((s, e) => s + e.quantity, 0);
          const goal = h.dailyGoal ?? h.baseline ?? 0;
          const onTrack = h.type === "reduce" ? qty <= goal : qty >= goal;
          if (onTrack) totalDone++;
        }
      });
    });
    return totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  }, [state]);

  const allAchievements = ACHIEVEMENTS.map(a => ({
    ...a,
    desbloqueada: state.gamification.conquistas.includes(a.id),
  }));
  const unlockedAchievements = allAchievements.filter(a => a.desbloqueada);
  const lockedAchievements = allAchievements.filter(a => !a.desbloqueada);

  const recentSavings = [...state.savings]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const handleAddSavings = () => {
    const amount = parseFloat(savingsForm.amount);
    if (isNaN(amount) || amount <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    if (!savingsForm.descricao.trim()) { toast({ title: "Descrição obrigatória", variant: "destructive" }); return; }

    setState(prev => addSavingsEntry(prev, {
      date: format(today, "yyyy-MM-dd"),
      amount, moeda: "€", descricao: savingsForm.descricao.trim(),
      categoria: savingsForm.categoria || undefined,
      habitId: savingsForm.habitId || undefined,
    }));
    toast({ title: `Poupança de ${amount.toFixed(2)} € registada!` });
    setShowSavingsForm(false);
    setSavingsForm({ amount: "", descricao: "", categoria: "", habitId: "" });
  };

  return (
    <div className="page-container">
      <Navigation />

      <main className="page-content max-w-xl mx-auto space-y-5">
        {/* ═══ Level Hero ═══ */}
        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 p-5">
          <div className="flex items-center gap-5">
            <CircularProgress percent={levelProgress.progress} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Nível</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">
                {levelProgress.current}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <Star className="h-3.5 w-3.5" /> {state.gamification.pontos} pts
                </span>
                <span className="text-xs text-muted-foreground">
                  {levelProgress.pointsToNext} para nível {levelProgress.nextLevel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Page Header ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Progresso</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Recompensas e poupanças</p>
          </div>
        </div>

        {/* ═══ Stats Grid ═══ */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-center">
            <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-primary">{consistency30d}%</p>
            <p className="text-[9px] text-muted-foreground">30 dias</p>
          </div>
          <div className="rounded-xl border border-warning/15 bg-warning/5 p-3 text-center">
            <Flame className="h-4 w-4 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold text-warning">{state.gamification.currentStreak || 0}</p>
            <p className="text-[9px] text-muted-foreground">streak</p>
          </div>
          <div className="rounded-xl border border-success/15 bg-success/5 p-3 text-center">
            <Target className="h-4 w-4 text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-success">{state.habits.filter(h => h.active).length}</p>
            <p className="text-[9px] text-muted-foreground">ativos</p>
          </div>
        </div>

        {/* ═══ Achievements ═══ */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Conquistas · {unlockedAchievements.length}/{ACHIEVEMENTS.length}
          </h2>
          {unlockedAchievements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/40 bg-card/30 p-8 text-center">
              <Medal className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma conquista desbloqueada</p>
            </div>
          ) : (
            <div className="grid gap-1.5 grid-cols-2">
              {unlockedAchievements.map(a => (
                <div key={a.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-primary/15 bg-primary/5">
                  <span className="text-lg">{a.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{a.nome}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{a.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {lockedAchievements.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {lockedAchievements.slice(0, 5).map(a => (
                <span key={a.id} className="text-sm opacity-30 grayscale">{a.icon}</span>
              ))}
              {lockedAchievements.length > 5 && (
                <span className="text-xs text-muted-foreground/50">+{lockedAchievements.length - 5}</span>
              )}
            </div>
          )}
        </div>

        {/* ═══ Savings / Mealheiro ═══ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mealheiro
            </h2>
            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => setShowSavingsForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-success/15 bg-success/5 p-3 text-center">
              <p className="text-lg font-bold text-success">{savingsSummary.totalPoupadoMesAtual.toFixed(0)} €</p>
              <p className="text-[9px] text-muted-foreground">este mês</p>
            </div>
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-center">
              <p className="text-lg font-bold text-primary">{savingsSummary.totalPoupadoAllTime.toFixed(0)} €</p>
              <p className="text-[9px] text-muted-foreground">total</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-card/50 p-3 text-center">
              <p className="text-lg font-bold text-foreground">{savingsSummary.numeroEntradasMesAtual}</p>
              <p className="text-[9px] text-muted-foreground">entradas</p>
            </div>
          </div>

          {/* Recent entries */}
          {recentSavings.length > 0 && (
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {recentSavings.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-card/50 border border-border/20 group">
                  <span className="text-success font-semibold text-sm">+{entry.amount.toFixed(0)} €</span>
                  <span className="text-xs text-muted-foreground truncate flex-1">{entry.descricao}</span>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(entry.date), "dd/MM")}</span>
                  <button
                    onClick={() => { setState(prev => deleteSavingsEntry(prev, entry.id)); toast({ title: "Removido" }); }}
                    className="h-6 w-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Savings Dialog */}
      <Dialog open={showSavingsForm} onOpenChange={setShowSavingsForm}>
        <DialogContent className="w-[90vw] max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Poupança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (€)</Label>
              <Input id="amount" type="number" step="0.01" min="0" placeholder="10.00"
                value={savingsForm.amount} onChange={e => setSavingsForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" placeholder="Ex: Não comprei café fora"
                value={savingsForm.descricao} onChange={e => setSavingsForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Select value={savingsForm.categoria} onValueChange={v => setSavingsForm(p => ({ ...p, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {SAVINGS_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hábito relacionado (opcional)</Label>
              <Select value={savingsForm.habitId} onValueChange={v => setSavingsForm(p => ({ ...p, habitId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {state.habits.map(h => <SelectItem key={h.id} value={h.id}>{h.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSavingsForm(false)}>Cancelar</Button>
            <Button onClick={handleAddSavings}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Progresso;