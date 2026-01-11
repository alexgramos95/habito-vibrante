import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import {
  Target, Plus, Trash2, ChevronRight, TrendingUp, TrendingDown,
  Clock, Check, X, Pencil, BarChart3, Play
} from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nContext";
import { AppState, Tracker, TrackerEntry } from "@/data/types";
import {
  loadState, saveState, addTracker, updateTracker, deleteTracker,
  addTrackerEntry, deleteTrackerEntry, getTrackerEntriesForDate
} from "@/data/storage";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";
import { cn } from "@/lib/utils";

// Tracker summary computation
const calculateTrackerSummary = (
  tracker: Tracker,
  entries: TrackerEntry[],
  allEntries: TrackerEntry[]
) => {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const monthStr = format(today, "yyyy-MM");
  
  const todayEntries = entries.filter(e => e.date === todayStr);
  const todayCount = todayEntries.reduce((sum, e) => sum + e.quantity, 0);
  
  const monthEntries = allEntries.filter(e => e.trackerId === tracker.id && e.date.startsWith(monthStr));
  const monthlyCount = monthEntries.reduce((sum, e) => sum + e.quantity, 0);
  
  // Financial impact
  const baselineFinancial = tracker.baseline * tracker.valuePerUnit;
  const todayFinancial = todayCount * tracker.valuePerUnit;
  const todaySavings = tracker.type === 'reduce' 
    ? Math.max(0, baselineFinancial - todayFinancial)
    : 0;
  
  const daysInMonth = today.getDate();
  const monthlyBaseline = baselineFinancial * daysInMonth;
  const monthlyActual = monthlyCount * tracker.valuePerUnit;
  const monthlySavings = tracker.type === 'reduce'
    ? Math.max(0, monthlyBaseline - monthlyActual)
    : 0;
  
  // Days on track
  let daysOnTrack = 0;
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = format(checkDate, "yyyy-MM-dd");
    const dayCount = allEntries
      .filter(e => e.trackerId === tracker.id && e.date === dateStr)
      .reduce((sum, e) => sum + e.quantity, 0);
    
    const goal = tracker.dailyGoal ?? tracker.baseline;
    const isOnTrack = tracker.type === 'reduce' ? dayCount <= goal : dayCount >= goal;
    if (isOnTrack) daysOnTrack++;
    else if (i > 0) break;
  }
  
  // 30-day average
  const last30DaysEntries = allEntries.filter(e => {
    const entryDate = parseISO(e.date);
    const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    return e.trackerId === tracker.id && diffDays < 30;
  });
  const average30Days = last30DaysEntries.reduce((sum, e) => sum + e.quantity, 0) / 30;
  
  return {
    todayCount,
    todaySavings,
    monthlyCount,
    monthlySavings,
    daysOnTrack,
    average30Days
  };
};

const Objetivos = () => {
  const { toast } = useToast();
  const { t, locale, formatCurrency } = useI18n();
  const [state, setState] = useState<AppState>(() => loadState());
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  
  const dateLocale = locale === 'pt-PT' ? pt : enUSLocale;
  
  // UI State
  const [selectedTracker, setSelectedTracker] = useState<string | null>(null);
  const [showNewTrackerDialog, setShowNewTrackerDialog] = useState(false);
  const [editingTracker, setEditingTracker] = useState<Tracker | null>(null);
  
  // Form state
  const [trackerForm, setTrackerForm] = useState({
    name: "",
    type: "reduce" as "reduce" | "increase",
    unitSingular: "",
    unitPlural: "",
    valuePerUnit: "0",
    baseline: "0",
    dailyGoal: "",
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Select first tracker if none selected
  useEffect(() => {
    if (!selectedTracker && state.trackers.length > 0) {
      setSelectedTracker(state.trackers[0].id);
    }
  }, [state.trackers, selectedTracker]);

  const activeTrackers = state.trackers.filter(t => t.active);
  const currentTracker = state.trackers.find(t => t.id === selectedTracker);
  const todayEntries = currentTracker 
    ? getTrackerEntriesForDate(state, currentTracker.id, todayStr)
    : [];

  const currentSummary = currentTracker 
    ? calculateTrackerSummary(currentTracker, todayEntries, state.trackerEntries)
    : null;

  // Handlers
  const handleAddEntry = (trackerId: string, quantity: number = 1) => {
    setState(prev => addTrackerEntry(prev, trackerId, quantity));
    const tracker = state.trackers.find(t => t.id === trackerId);
    toast({ 
      title: t.trackers.entryRegistered.replace("{{unit}}", tracker?.unitSingular || "") 
    });
  };

  const handleDeleteEntry = (entryId: string) => {
    setState(prev => deleteTrackerEntry(prev, entryId));
    toast({ title: t.trackers.entryRemoved });
  };

  const handleCreateTracker = () => {
    if (!trackerForm.name.trim() || !trackerForm.unitSingular.trim()) {
      toast({ title: "Preenche os campos obrigatórios", variant: "destructive" });
      return;
    }

    setState(prev => addTracker(prev, {
      name: trackerForm.name.trim(),
      type: trackerForm.type,
      unitSingular: trackerForm.unitSingular.trim(),
      unitPlural: trackerForm.unitPlural.trim() || trackerForm.unitSingular.trim() + "s",
      valuePerUnit: parseFloat(trackerForm.valuePerUnit) || 0,
      baseline: parseInt(trackerForm.baseline) || 0,
      dailyGoal: trackerForm.dailyGoal ? parseInt(trackerForm.dailyGoal) : undefined,
      active: true,
    }));

    toast({ title: t.objectives.newObjective });
    setShowNewTrackerDialog(false);
    resetForm();
  };

  const handleDeleteTracker = (id: string) => {
    setState(prev => deleteTracker(prev, id));
    if (selectedTracker === id) {
      setSelectedTracker(state.trackers.find(t => t.id !== id)?.id || null);
    }
    toast({ title: t.finances.goalDeleted });
  };

  const resetForm = () => {
    setTrackerForm({
      name: "",
      type: "reduce",
      unitSingular: "",
      unitPlural: "",
      valuePerUnit: "0",
      baseline: "0",
      dailyGoal: "",
    });
  };

  // Chart data
  const getChartData = (tracker: Tracker) => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayEntries = state.trackerEntries
        .filter(e => e.trackerId === tracker.id && e.date === dateStr);
      const count = dayEntries.reduce((sum, e) => sum + e.quantity, 0);
      
      days.push({
        date: dateStr,
        value: count,
        baseline: tracker.baseline,
        goal: tracker.dailyGoal ?? tracker.baseline,
      });
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{t.objectives.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t.motivational.consistencyWins}
            </p>
          </div>
          <Button onClick={() => setShowNewTrackerDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t.objectives.newObjective}
          </Button>
        </div>

        {/* Empty State */}
        {activeTrackers.length === 0 ? (
          <Card className="glass border-border/30">
            <CardContent className="py-16 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">{t.trackers.noTrackers}</p>
              <p className="text-sm text-muted-foreground mb-6">{t.trackers.noTrackersDescription}</p>
              <Button onClick={() => setShowNewTrackerDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t.trackers.createFirst}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Tracker Selector */}
            <div className="space-y-3">
              {activeTrackers.map(tracker => {
                const summary = calculateTrackerSummary(tracker, [], state.trackerEntries);
                const goal = tracker.dailyGoal ?? tracker.baseline;
                const isOnTrack = tracker.type === 'reduce' 
                  ? summary.todayCount <= goal 
                  : summary.todayCount >= goal;
                
                return (
                  <Card 
                    key={tracker.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 border-border/30",
                      selectedTracker === tracker.id 
                        ? "glass border-primary/50 shadow-lg" 
                        : "hover:bg-secondary/50"
                    )}
                    onClick={() => setSelectedTracker(tracker.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center",
                            tracker.type === 'reduce' 
                              ? "bg-warning/10 text-warning" 
                              : "bg-success/10 text-success"
                          )}>
                            {tracker.type === 'reduce' ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium">{tracker.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {summary.todayCount} {summary.todayCount === 1 ? tracker.unitSingular : tracker.unitPlural} {t.dashboard.today.toLowerCase()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={isOnTrack ? "default" : "destructive"}>
                          {isOnTrack ? t.objectives.onTrack : t.objectives.offTrack}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Selected Tracker Details */}
            {currentTracker && currentSummary && (
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Add */}
                <Card className="glass border-border/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        {t.dashboard.today}
                      </CardTitle>
                      <Badge variant="outline">
                        {currentSummary.todayCount} / {currentTracker.dailyGoal ?? currentTracker.baseline}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      size="lg"
                      onClick={() => handleAddEntry(currentTracker.id)}
                      className={cn(
                        "w-full h-14 text-lg gap-3",
                        currentTracker.type === 'reduce'
                          ? "bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70"
                          : "bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70"
                      )}
                    >
                      <Plus className="h-6 w-6" />
                      +1 {currentTracker.unitSingular}
                    </Button>

                    {currentSummary.todaySavings > 0 && (
                      <div className="text-center p-3 rounded-xl bg-success/10 border border-success/30">
                        <p className="text-success font-medium">
                          {t.trackers.todaySavings.replace("{{amount}}", formatCurrency(currentSummary.todaySavings))}
                        </p>
                      </div>
                    )}

                    {/* Timeline */}
                    {todayEntries.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">{t.objectives.timeline}</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {todayEntries.map((entry, idx) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 group"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-mono">
                                  {format(parseISO(entry.timestamp), "HH:mm")}
                                </span>
                                <span className="text-sm">
                                  +{entry.quantity} {entry.quantity === 1 ? currentTracker.unitSingular : currentTracker.unitPlural}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteEntry(entry.id)}
                              >
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <Card className="glass border-border/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{currentSummary.daysOnTrack}</p>
                      <p className="text-xs text-muted-foreground">{t.trackers.daysOnTrack}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-border/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{currentSummary.average30Days.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">{t.trackers.average30Days}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-border/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-success">{formatCurrency(currentSummary.monthlySavings)}</p>
                      <p className="text-xs text-muted-foreground">{t.trackers.monthSavings}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-border/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{currentSummary.monthlyCount}</p>
                      <p className="text-xs text-muted-foreground">{t.dashboard.thisMonth}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart */}
                <Card className="glass border-border/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      {t.objectives.monthlyChart}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={getChartData(currentTracker)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(val) => format(parseISO(val), "d", { locale: dateLocale })}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          labelFormatter={(val) => format(parseISO(val as string), "d MMM", { locale: dateLocale })}
                        />
                        <Area
                          type="monotone"
                          dataKey="goal"
                          stroke="hsl(var(--muted-foreground))"
                          fill="transparent"
                          strokeDasharray="5 5"
                          strokeWidth={1}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={currentTracker.type === 'reduce' ? "hsl(var(--warning))" : "hsl(var(--success))"}
                          fill={currentTracker.type === 'reduce' ? "hsl(var(--warning) / 0.2)" : "hsl(var(--success) / 0.2)"}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </main>

      {/* New Tracker Dialog */}
      <Dialog open={showNewTrackerDialog} onOpenChange={setShowNewTrackerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.objectives.newObjective}</DialogTitle>
            <DialogDescription>
              {t.trackers.noTrackersDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.trackers.name}</Label>
              <Input
                placeholder="Ex: Cigarros, Exercício, Água..."
                value={trackerForm.name}
                onChange={(e) => setTrackerForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.trackers.type}</Label>
              <Select
                value={trackerForm.type}
                onValueChange={(value: "reduce" | "increase") => setTrackerForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reduce">{t.trackers.typeReduce}</SelectItem>
                  <SelectItem value="increase">{t.trackers.typeIncrease}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.trackers.unitSingular}</Label>
                <Input
                  placeholder="cigarro"
                  value={trackerForm.unitSingular}
                  onChange={(e) => setTrackerForm(prev => ({ ...prev, unitSingular: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.trackers.unitPlural}</Label>
                <Input
                  placeholder="cigarros"
                  value={trackerForm.unitPlural}
                  onChange={(e) => setTrackerForm(prev => ({ ...prev, unitPlural: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.trackers.baseline}</Label>
                <Input
                  type="number"
                  value={trackerForm.baseline}
                  onChange={(e) => setTrackerForm(prev => ({ ...prev, baseline: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.trackers.dailyGoal} ({t.shopping.optional})</Label>
                <Input
                  type="number"
                  value={trackerForm.dailyGoal}
                  onChange={(e) => setTrackerForm(prev => ({ ...prev, dailyGoal: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.trackers.valuePerUnit}</Label>
              <Input
                type="number"
                step="0.01"
                value={trackerForm.valuePerUnit}
                onChange={(e) => setTrackerForm(prev => ({ ...prev, valuePerUnit: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">0 se não tiver impacto financeiro</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTrackerDialog(false)}>
              {t.actions.cancel}
            </Button>
            <Button onClick={handleCreateTracker}>
              {t.actions.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Objetivos;
