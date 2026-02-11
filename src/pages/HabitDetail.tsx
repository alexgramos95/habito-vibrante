import { useMemo, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, subDays, getDay } from "date-fns";
import { ArrowLeft, Flame, CalendarDays, Lightbulb, BarChart3, CheckCircle2, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/contexts/DataContext";
import { useI18n } from "@/i18n/I18nContext";
import { Navigation } from "@/components/Layout/Navigation";
import { cn } from "@/lib/utils";
import { HabitForm } from "@/components/Habits/HabitForm";
import { TrackerEditDialog } from "@/components/Trackers/TrackerEditDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { updateHabit, deleteHabit, addTrackerEntry, updateTrackerEntry, deleteTrackerEntry } from "@/data/storage";
import { Habit, Tracker, TrackerEntry } from "@/data/types";

// --- Coach tips engine ---
function getCoachTips(params: {
  completionRate7d: number; completionRate30d: number;
  currentStreak: number; bestStreak: number; isDoneToday: boolean;
  type?: string; category?: string; mode: "simple" | "metric";
}): string[] {
  const { mode, completionRate7d, completionRate30d, currentStreak, bestStreak, isDoneToday, type, category } = params;
  const rate7 = Math.round(completionRate7d * 100);
  const rate30 = Math.round(completionRate30d * 100);
  const tips: string[] = [];

  if (isDoneToday) {
    if (currentStreak >= 21) tips.push("Isto já faz parte de quem és. A identidade constrói-se com repetição.");
    else if (currentStreak >= 7) tips.push(`${currentStreak} dias seguidos — o teu cérebro está a formar uma via neural dedicada a isto.`);
    if (rate7 >= 80) tips.push("Consistência forte esta semana. Estás a construir identidade, não apenas hábitos.");
    if (currentStreak > 0 && currentStreak === bestStreak) tips.push("🏆 Estás no teu melhor streak de sempre! Não pares agora.");
    if (tips.length === 0) tips.push("Feito! Cada repetição conta mais do que parece.");
  } else {
    if (rate7 < 30) {
      tips.push(mode === "metric" && type === "reduce"
        ? "Tenta reduzir só um pouco hoje. Progresso > perfeição."
        : "Começa com a versão mais fácil deste hábito. Só 2 minutos bastam.");
      tips.push("Associa isto a algo que já fazes todos os dias — «habit stacking».");
    } else if (rate7 < 50) {
      tips.push("Associa este hábito a algo que já fazes diariamente para criar um gatilho automático.");
      if (rate30 > rate7) tips.push("A tua média mensal é melhor que a semanal. Talvez precises de um reset esta semana.");
    } else if (rate7 < 70) {
      tips.push("Estás quase na zona de consistência. Hoje pode ser o dia que faz a diferença.");
    } else if (rate7 < 90) {
      tips.push("Bom ritmo — não quebres a cadeia. A consistência cria momentum.");
    }
  }

  if (category) {
    const cat = category.toLowerCase();
    if (cat.includes("saúde") || cat.includes("exerc") || cat.includes("fitness"))
      tips.push("Movimento gera energia. Mesmo 5 minutos fazem diferença no teu dia.");
    else if (cat.includes("mente") || cat.includes("mental") || cat.includes("medita"))
      tips.push("A mente treina-se como um músculo. Paciência é progresso.");
    else if (cat.includes("finanç") || cat.includes("poupar") || cat.includes("dinheiro"))
      tips.push("Pequenas decisões financeiras diárias criam grandes resultados a longo prazo.");
  }

  if (rate30 > 0 && rate7 > rate30 + 15) tips.push("📈 Tendência ascendente! A tua semana está melhor que a média do mês.");
  else if (rate30 > 0 && rate7 < rate30 - 15) tips.push("📉 Esta semana está abaixo da tua média. Um bom dia hoje pode inverter a tendência.");

  return tips.slice(0, 4);
}

// --- Circular progress ---
const ProgressRing = ({ percent, size = 80, label }: { percent: number; size?: number; label: string }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, percent) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="hsl(var(--primary))" strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700 ease-out" />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" className="text-lg font-bold fill-foreground">
          {Math.round(percent)}%
        </text>
      </svg>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
};

// --- Last 14 days mini chart ---
const MiniBarChart = ({ data, type }: { data: { date: string; value: number; goal: number }[]; type?: string }) => {
  const max = Math.max(...data.map(d => Math.max(d.value, d.goal)), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        const isOnTrack = type === "reduce" ? d.value <= d.goal : d.value >= d.goal;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className={cn(
                "w-full rounded-sm transition-all min-h-[2px]",
                d.value === 0 ? "bg-muted/40" : isOnTrack ? "bg-primary" : "bg-warning"
              )}
              style={{ height: `${Math.max(h, 3)}%` }}
            />
            {i % 2 === 0 && (
              <span className="text-[8px] text-muted-foreground/60">{format(new Date(d.date), "d")}</span>
            )}
          </div>
        );
      })}
    </div>
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

const HabitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, setState } = useData();
  const { t } = useI18n();
  const { toast } = useToast();

  const habit = state.habits.find(h => h.id === id);
  const today = format(new Date(), "yyyy-MM-dd");
  const isMetric = habit?.mode === "metric";

  // Edit/delete state
  const [showEditSimple, setShowEditSimple] = useState(false);
  const [showEditMetric, setShowEditMetric] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // Metric entries for this habit
  const allEntries = useMemo(() => {
    if (!habit || !isMetric) return [];
    return state.trackerEntries
      .filter(e => e.trackerId === habit.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [habit, isMetric, state.trackerEntries]);

  const todayEntries = useMemo(() => allEntries.filter(e => e.date === today), [allEntries, today]);

  // Compute stats
  const stats = useMemo(() => {
    if (!habit) return null;
    const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), "yyyy-MM-dd"));
    const last30 = Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), i), "yyyy-MM-dd"));

    if (!isMetric) {
      const done7 = last7.filter(d => state.dailyLogs.some(l => l.habitId === habit.id && l.date === d && l.done)).length;
      const done30 = last30.filter(d => state.dailyLogs.some(l => l.habitId === habit.id && l.date === d && l.done)).length;
      const isDoneToday = state.dailyLogs.some(l => l.habitId === habit.id && l.date === today && l.done);
      let currentStreak = 0, bestStreak = 0, tempStreak = 0;
      for (let i = 0; i < 365; i++) {
        const ds = format(subDays(new Date(), i), "yyyy-MM-dd");
        const dow = getDay(subDays(new Date(), i));
        if (habit.scheduledDays?.length && !habit.scheduledDays.includes(dow)) continue;
        const done = state.dailyLogs.some(l => l.habitId === habit.id && l.date === ds && l.done);
        if (done) { tempStreak++; if (i <= currentStreak + 5) currentStreak = tempStreak; }
        else { bestStreak = Math.max(bestStreak, tempStreak); tempStreak = 0; if (currentStreak === 0 && i === 0) currentStreak = 0; break; }
      }
      bestStreak = Math.max(bestStreak, tempStreak, currentStreak);
      const last14 = Array.from({ length: 14 }, (_, i) => {
        const d = format(subDays(new Date(), 13 - i), "yyyy-MM-dd");
        return { date: d, value: state.dailyLogs.some(l => l.habitId === habit.id && l.date === d && l.done) ? 1 : 0, goal: 1 };
      });
      return { completionRate7d: done7 / 7, completionRate30d: done30 / 30, currentStreak, bestStreak, isDoneToday, last14, totalDays: done30 };
    } else {
      const goal = habit.dailyGoal ?? habit.baseline ?? 1;
      const getCount = (date: string) => state.trackerEntries.filter(e => e.trackerId === habit.id && e.date === date).reduce((s, e) => s + e.quantity, 0);
      const onTrack7 = last7.filter(d => { const c = getCount(d); return habit.type === "reduce" ? c <= goal : c >= goal; }).length;
      const onTrack30 = last30.filter(d => { const c = getCount(d); return habit.type === "reduce" ? c <= goal : c >= goal; }).length;
      const todayCount = getCount(today);
      const isDoneToday = habit.type === "reduce" ? todayCount <= goal : todayCount >= goal;
      let currentStreak = 0;
      for (let i = 0; i < 365; i++) {
        const ds = format(subDays(new Date(), i), "yyyy-MM-dd");
        const c = getCount(ds);
        const ok = habit.type === "reduce" ? c <= goal : c >= goal;
        if (ok && c > 0) currentStreak++; else if (i > 0) break;
      }
      const last14 = Array.from({ length: 14 }, (_, i) => {
        const d = format(subDays(new Date(), 13 - i), "yyyy-MM-dd");
        return { date: d, value: getCount(d), goal };
      });
      return { completionRate7d: onTrack7 / 7, completionRate30d: onTrack30 / 30, currentStreak, bestStreak: currentStreak, isDoneToday, last14, totalDays: onTrack30, todayCount };
    }
  }, [habit, state.dailyLogs, state.trackerEntries, today, isMetric]);

  const tips = useMemo(() => {
    if (!habit || !stats) return [];
    return getCoachTips({
      mode: isMetric ? "metric" : "simple",
      completionRate7d: stats.completionRate7d, completionRate30d: stats.completionRate30d,
      currentStreak: stats.currentStreak, bestStreak: stats.bestStreak,
      isDoneToday: stats.isDoneToday, type: habit.type, category: habit.categoria,
    });
  }, [habit, stats, isMetric]);

  // --- Handlers ---
  const handleSaveSimple = useCallback((data: Omit<Habit, "id" | "createdAt">) => {
    if (!habit) return;
    setState(prev => updateHabit(prev, habit.id, { ...data, mode: "simple" }));
    toast({ title: "Hábito atualizado" });
    setShowEditSimple(false);
  }, [habit, setState, toast]);

  const handleSaveMetric = useCallback((trackerData: Omit<Tracker, "id" | "createdAt">) => {
    if (!habit) return;
    const habitData: Partial<Habit> = {
      nome: trackerData.name, cor: trackerData.color, active: trackerData.active,
      mode: "metric", type: trackerData.type, inputMode: trackerData.inputMode,
      icon: trackerData.icon, unitSingular: trackerData.unitSingular,
      unitPlural: trackerData.unitPlural, baseline: trackerData.baseline,
      dailyGoal: trackerData.dailyGoal, valuePerUnit: trackerData.valuePerUnit,
      frequency: trackerData.frequency, includeInFinances: trackerData.includeInFinances,
      specificDays: trackerData.specificDays, scheduledTime: trackerData.scheduledTime,
      scheduledDays: trackerData.scheduledDays,
    };
    setState(prev => updateHabit(prev, habit.id, habitData));
    toast({ title: "Métrica atualizada" });
    setShowEditMetric(false);
  }, [habit, setState, toast]);

  const handleDeleteHabit = useCallback(() => {
    if (!habit) return;
    setState(prev => deleteHabit(prev, habit.id));
    toast({ title: "Hábito eliminado" });
    navigate("/app");
  }, [habit, setState, toast, navigate]);

  const handleAddEntry = useCallback((qty: number) => {
    if (!habit) return;
    setState(prev => addTrackerEntry(prev, habit.id, qty));
    toast({ title: "✓ Registado" });
  }, [habit, setState, toast]);

  const handleDeleteEntry = useCallback(() => {
    if (!deletingEntryId) return;
    setState(prev => deleteTrackerEntry(prev, deletingEntryId));
    toast({ title: "Registo eliminado" });
    setDeletingEntryId(null);
  }, [deletingEntryId, setState, toast]);

  if (!habit || !stats) {
    return (
      <div className="page-container">
        <Navigation />
        <main className="page-content max-w-xl mx-auto py-12 text-center">
          <p className="text-muted-foreground">Hábito não encontrado.</p>
          <Button variant="ghost" onClick={() => navigate("/app")} className="mt-4">Voltar</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Navigation />
      <main className="page-content max-w-xl mx-auto space-y-5">
        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/app")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 h-8"
              onClick={() => isMetric ? setShowEditMetric(true) : setShowEditSimple(true)}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </Button>
          </div>
        </div>

        {/* Hero */}
        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center border border-primary/20"
              style={{ backgroundColor: habit.cor ? `${habit.cor}15` : "hsl(var(--primary) / 0.1)" }}>
              {isMetric && habit.icon ? <span className="text-xl">{habit.icon}</span> : <CheckCircle2 className="h-6 w-6" style={{ color: habit.cor || "hsl(var(--primary))" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{habit.nome}</h1>
              {habit.categoria && <p className="text-xs text-muted-foreground">{habit.categoria}</p>}
            </div>
            {stats.isDoneToday && (
              <span className="text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full">✓ Hoje</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ProgressRing percent={stats.completionRate7d * 100} label="7 dias" />
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1 text-2xl font-bold text-foreground">
                <Flame className="h-5 w-5 text-primary" /> {stats.currentStreak}
              </div>
              <span className="text-xs text-muted-foreground">Streak</span>
            </div>
            <ProgressRing percent={stats.completionRate30d * 100} label="30 dias" />
          </div>
        </div>

        {/* Mini bar chart */}
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Últimos 14 dias
          </h3>
          <MiniBarChart data={stats.last14} type={habit.type} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalDays}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Dias cumpridos (30d)</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.bestStreak}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Melhor streak</p>
          </div>
          {isMetric && (
            <>
              <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{(stats as any).todayCount ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Hoje</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{habit.dailyGoal ?? habit.baseline ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Objetivo diário</p>
              </div>
            </>
          )}
        </div>

        {/* ═══ Metric Entries Management ═══ */}
        {isMetric && (
          <div className="rounded-2xl border border-border/40 bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Registos de hoje
              </h3>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => handleAddEntry(1)}>
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>
            {todayEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">Sem registos hoje</p>
            ) : (
              <div className="space-y-1.5">
                {todayEntries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-xl bg-background/60 border border-border/30">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {entry.quantity} {entry.quantity === 1 ? habit.unitSingular : habit.unitPlural}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.timestamp), "HH:mm")}
                      </span>
                    </div>
                    <button
                      onClick={() => setDeletingEntryId(entry.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Recent entries (last 7 days) */}
            {allEntries.filter(e => e.date !== today).length > 0 && (
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Ver registos anteriores ({allEntries.filter(e => e.date !== today).length})
                </summary>
                <div className="space-y-1.5 mt-2 max-h-48 overflow-y-auto">
                  {allEntries.filter(e => e.date !== today).slice(0, 20).map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border/20">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-foreground/70">
                          {entry.quantity} {entry.quantity === 1 ? habit.unitSingular : habit.unitPlural}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(entry.timestamp), "d MMM · HH:mm")}
                        </span>
                      </div>
                      <button
                        onClick={() => setDeletingEntryId(entry.id)}
                        className="h-6 w-6 rounded flex items-center justify-center text-destructive/40 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Coach Tips */}
        {tips.length > 0 && (
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5" /> Coach — {habit.nome}
            </h3>
            <div className="space-y-2.5">
              {tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent/60 shrink-0 mt-1.5" />
                  <p className="text-sm text-foreground/80 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="rounded-xl border border-border/30 bg-card/40 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" /> Detalhes
          </h3>
          <div className="space-y-1.5 text-sm text-foreground/70">
            {habit.scheduledTime && <p>⏰ Horário: {habit.scheduledTime}</p>}
            {habit.scheduledDays && habit.scheduledDays.length > 0 && (
              <p>📅 Dias: {habit.scheduledDays.map(d => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d]).join(", ")}</p>
            )}
            {habit.frequency && <p>🔄 Frequência: {habit.frequency}</p>}
            <p>📊 Modo: {isMetric ? "Métrica" : "Simples"}</p>
            {isMetric && habit.type && <p>{habit.type === "reduce" ? "📉 Objetivo: Reduzir" : "📈 Objetivo: Aumentar"}</p>}
          </div>
        </div>
      </main>

      {/* ═══ Edit Simple Habit ═══ */}
      {showEditSimple && (
        <HabitForm
          habit={habit}
          onSave={handleSaveSimple}
          onCancel={() => setShowEditSimple(false)}
        />
      )}

      {/* ═══ Edit Metric Habit ═══ */}
      <TrackerEditDialog
        open={showEditMetric}
        onOpenChange={setShowEditMetric}
        tracker={isMetric ? habitToTracker(habit) : null}
        onSave={handleSaveMetric}
        onDelete={() => { setShowEditMetric(false); setShowDeleteConfirm(true); }}
      />

      {/* ═══ Delete Habit Confirmation ═══ */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar hábito</AlertDialogTitle>
            <AlertDialogDescription>Tens a certeza que queres eliminar "{habit.nome}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHabit}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ Delete Entry Confirmation ═══ */}
      <AlertDialog open={!!deletingEntryId} onOpenChange={() => setDeletingEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar registo</AlertDialogTitle>
            <AlertDialogDescription>Queres eliminar este registo?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HabitDetail;
