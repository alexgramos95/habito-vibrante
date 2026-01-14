import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import {
  Target, Plus, Trash2, ChevronRight, TrendingUp, TrendingDown,
  Clock, Check, X, Pencil, BarChart3, Play, Settings2, Activity
} from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { PageHeader } from "@/components/Layout/PageHeader";
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
  loadState, saveState, addTracker, updateTracker, deleteTracker, archiveTracker,
  addTrackerEntry, deleteTrackerEntry, getTrackerEntriesForDate, updateTrackerEntry
} from "@/data/storage";
import { TrackerEditDialog } from "@/components/Trackers/TrackerEditDialog";
import { TrackerDeleteDialog } from "@/components/Trackers/TrackerDeleteDialog";
import { TrackerTimeline } from "@/components/Trackers/TrackerTimeline";
import { TrackerInputButton, TrackerEntryItem } from "@/components/Trackers/TrackerInputButton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend
} from "recharts";
import { cn } from "@/lib/utils";
import { subDays } from "date-fns";

// Tracker summary computation - for reduction trackers, we compute LOSSES not savings
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
  
  // For reduction trackers: compute LOSSES (how much was lost by consuming)
  // Loss = count * valuePerUnit (each unit consumed is money lost)
  const todayLoss = tracker.type === 'reduce' && tracker.valuePerUnit > 0
    ? todayCount * tracker.valuePerUnit
    : 0;
  
  const monthlyLoss = tracker.type === 'reduce' && tracker.valuePerUnit > 0
    ? monthlyCount * tracker.valuePerUnit
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
    todayLoss,
    monthlyCount,
    monthlyLoss,
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingTracker, setDeletingTracker] = useState<Tracker | null>(null);

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
  const handleAddEntry = (trackerId: string, quantity: number = 1, timestamp?: string) => {
    setState(prev => addTrackerEntry(prev, trackerId, quantity, undefined, timestamp));
    const tracker = state.trackers.find(t => t.id === trackerId);
    toast({ 
      title: `+${quantity} ${quantity === 1 ? tracker?.unitSingular : tracker?.unitPlural || t.trackers.entry}` 
    });
  };

  const handleUpdateEntry = (entryId: string, updates: Partial<typeof state.trackerEntries[0]>) => {
    setState(prev => updateTrackerEntry(prev, entryId, updates));
  };

  const handleDeleteEntry = (entryId: string) => {
    setState(prev => deleteTrackerEntry(prev, entryId));
    toast({ title: t.trackers.entryRemoved });
  };

  const handleCreateTracker = (data: Omit<Tracker, "id" | "createdAt">) => {
    setState(prev => addTracker(prev, data));
    toast({ title: t.objectives.newObjective });
    setShowNewTrackerDialog(false);
  };

  const handleUpdateTracker = (data: Omit<Tracker, "id" | "createdAt">) => {
    if (!editingTracker) return;
    setState(prev => updateTracker(prev, editingTracker.id, data));
    toast({ title: t.habits.habitUpdated });
    setShowEditDialog(false);
    setEditingTracker(null);
  };

  const handleDeleteTracker = (deleteHistory: boolean) => {
    if (!deletingTracker) return;
    
    if (deleteHistory) {
      // Delete tracker and all entries
      setState(prev => deleteTracker(prev, deletingTracker.id));
    } else {
      // Archive: just remove tracker, keep entries for historical data
      setState(prev => archiveTracker(prev, deletingTracker.id));
    }
    
    if (selectedTracker === deletingTracker.id) {
      setSelectedTracker(state.trackers.find(t => t.id !== deletingTracker.id)?.id || null);
    }
    toast({ title: deleteHistory 
      ? (locale === 'pt-PT' ? "Tracker eliminado" : "Tracker deleted")
      : (locale === 'pt-PT' ? "Tracker arquivado" : "Tracker archived")
    });
    setShowDeleteDialog(false);
    setShowEditDialog(false);
    setDeletingTracker(null);
    setEditingTracker(null);
  };

  const openDeleteDialog = (tracker: Tracker) => {
    setDeletingTracker(tracker);
    setShowDeleteDialog(true);
  };

  const openEditDialog = (tracker: Tracker) => {
    setEditingTracker(tracker);
    setShowEditDialog(true);
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

  // Overall performance chart data (last 30 days, all trackers)
  const overallChartData = useMemo(() => {
    const data: { date: string; [key: string]: number | string }[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayData: { date: string; [key: string]: number | string } = { date: dateStr };
      
      activeTrackers.forEach(tracker => {
        const dayEntries = state.trackerEntries.filter(
          e => e.trackerId === tracker.id && e.date === dateStr
        );
        dayData[tracker.name] = dayEntries.reduce((sum, e) => sum + e.quantity, 0);
      });
      
      data.push(dayData);
    }
    
    return data;
  }, [activeTrackers, state.trackerEntries, today]);

  const chartColors = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--destructive))"];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <PageHeader
          title={t.nav.trackers}
          subtitle={(t as any).pageSubtitles?.trackers || t.motivational.consistencyWins}
          icon={Activity}
          action={{
            icon: Plus,
            label: t.objectives.newObjective,
            onClick: () => setShowNewTrackerDialog(true),
          }}
        />

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
                const isOnTrack = tracker.type === "boolean" 
                  ? summary.todayCount >= 1
                  : tracker.type === "reduce" 
                    ? summary.todayCount <= goal 
                    : summary.todayCount >= goal;
                
                return (
                  <Card 
                    key={tracker.id}
                    className={cn(
                      "transition-all duration-200 border-border/30 group",
                      selectedTracker === tracker.id 
                        ? "glass border-primary/50 shadow-lg" 
                        : "hover:bg-secondary/50"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div 
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => setSelectedTracker(tracker.id)}
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                            tracker.type === 'reduce' 
                              ? "bg-warning/10" 
                              : tracker.type === 'boolean'
                              ? "bg-success/10"
                              : tracker.type === 'event'
                              ? "bg-accent/10"
                              : "bg-primary/10"
                          )}>
                            {tracker.icon || (tracker.type === 'reduce' ? <TrendingDown className="h-5 w-5 text-warning" /> : <TrendingUp className="h-5 w-5 text-success" />)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{tracker.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {summary.todayCount} {summary.todayCount === 1 ? tracker.unitSingular : tracker.unitPlural} {t.dashboard.today.toLowerCase()}
                            </p>
                          </div>
                        </div>
                        
                        {/* Actions - Edit/Delete */}
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(tracker);
                            }}
                            title={locale === 'pt-PT' ? "Editar" : "Edit"}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog(tracker);
                            }}
                            title={locale === 'pt-PT' ? "Eliminar" : "Delete"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Badge variant={isOnTrack ? "default" : "destructive"} className="ml-1">
                            {isOnTrack ? t.objectives.onTrack : t.objectives.offTrack}
                          </Badge>
                        </div>
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
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {currentSummary.todayCount} / {currentTracker.dailyGoal ?? currentTracker.baseline}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(currentTracker)}
                          title={locale === 'pt-PT' ? "Editar Tracker" : "Edit Tracker"}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TrackerInputButton
                      tracker={currentTracker}
                      todayCount={currentSummary.todayCount}
                      onAddEntry={(qty, ts) => handleAddEntry(currentTracker.id, qty, ts)}
                    />

                    {/* Show loss for reduction trackers */}
                    {currentTracker.type === 'reduce' && currentSummary.todayLoss > 0 && (
                      <div className="text-center p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                        <p className="text-destructive font-medium">
                          {t.trackers.todayLoss.replace("{{amount}}", formatCurrency(currentSummary.todayLoss))}
                        </p>
                      </div>
                    )}

                    {/* Timeline with editable entries */}
                    {todayEntries.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">{t.objectives.timeline}</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {todayEntries.map((entry) => (
                            <TrackerEntryItem
                              key={entry.id}
                              entry={entry}
                              tracker={currentTracker}
                              onUpdate={handleUpdateEntry}
                              onDelete={handleDeleteEntry}
                            />
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
                      <p className={cn(
                        "text-2xl font-bold",
                        currentTracker.type === 'reduce' ? "text-destructive" : "text-success"
                      )}>
                        {currentTracker.type === 'reduce' 
                          ? formatCurrency(currentSummary.monthlyLoss) 
                          : formatCurrency(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {currentTracker.type === 'reduce' ? t.trackers.monthLoss : t.trackers.monthSavings}
                      </p>
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
      <TrackerEditDialog
        open={showNewTrackerDialog}
        onOpenChange={setShowNewTrackerDialog}
        onSave={handleCreateTracker}
      />

      {/* Edit Tracker Dialog */}
      <TrackerEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        tracker={editingTracker}
        onSave={handleUpdateTracker}
        onDelete={() => editingTracker && openDeleteDialog(editingTracker)}
      />

      {/* Delete Tracker Dialog */}
      <TrackerDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        tracker={deletingTracker}
        entriesCount={deletingTracker 
          ? state.trackerEntries.filter(e => e.trackerId === deletingTracker.id).length 
          : 0
        }
        onConfirm={handleDeleteTracker}
      />
    </div>
  );
};

export default Objetivos;
