import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import {
  Target, Plus, Trash2, TrendingUp, TrendingDown,
  Clock, Check, Pencil, BarChart3, Settings2, Activity, CheckSquare
} from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tracker, TrackerEntry } from "@/data/types";
import {
  addTracker, updateTracker, deleteTracker, archiveTracker,
  addTrackerEntry, deleteTrackerEntry, getTrackerEntriesForDate, updateTrackerEntry
} from "@/data/storage";
import { useData } from "@/contexts/DataContext";
import { TrackerEditDialog } from "@/components/Trackers/TrackerEditDialog";
import { TrackerDeleteDialog } from "@/components/Trackers/TrackerDeleteDialog";
import { TrackerInputButton, TrackerEntryItem } from "@/components/Trackers/TrackerInputButton";
import { CompactTrackerCard } from "@/components/Trackers/CompactTrackerCard";
import { TrackerQuickCheckPanel } from "@/components/Trackers/TrackerQuickCheckPanel";
import { TrackerDetailDrawer } from "@/components/Trackers/TrackerDetailDrawer";
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
  
  const trackerEntries = allEntries.filter(e => e.trackerId === tracker.id);
  const trackerStartDate = trackerEntries.length > 0
    ? trackerEntries.reduce((earliest, e) => e.date < earliest ? e.date : earliest, trackerEntries[0].date)
    : todayStr;
  
  const todayEntries = entries.filter(e => e.date === todayStr);
  const todayCount = todayEntries.reduce((sum, e) => sum + e.quantity, 0);
  
  const monthEntries = allEntries.filter(e => e.trackerId === tracker.id && e.date.startsWith(monthStr));
  const monthlyCount = monthEntries.reduce((sum, e) => sum + e.quantity, 0);
  
  const todayLoss = tracker.type === 'reduce' && tracker.valuePerUnit > 0
    ? todayCount * tracker.valuePerUnit
    : 0;
  
  const monthlyLoss = tracker.type === 'reduce' && tracker.valuePerUnit > 0
    ? monthlyCount * tracker.valuePerUnit
    : 0;
  
  let daysOnTrack = 0;
  const goal = tracker.dailyGoal ?? tracker.baseline;
  
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = format(checkDate, "yyyy-MM-dd");
    
    if (dateStr < trackerStartDate) continue;
    
    const dayCount = allEntries
      .filter(e => e.trackerId === tracker.id && e.date === dateStr)
      .reduce((sum, e) => sum + e.quantity, 0);
    
    const isOnTrack = tracker.type === 'reduce' ? dayCount <= goal : dayCount >= goal;
    if (isOnTrack) daysOnTrack++;
    else if (i > 0) break;
  }
  
  const trackerStartParsed = parseISO(trackerStartDate);
  const daysSinceStart = Math.min(30, Math.max(1, 
    Math.floor((today.getTime() - trackerStartParsed.getTime()) / (1000 * 60 * 60 * 24)) + 1
  ));
  
  const last30DaysEntries = allEntries.filter(e => {
    const entryDate = parseISO(e.date);
    const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    return e.trackerId === tracker.id && diffDays < 30 && e.date >= trackerStartDate;
  });
  
  const average30Days = last30DaysEntries.reduce((sum, e) => sum + e.quantity, 0) / daysSinceStart;
  
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
  const { state, setState } = useData();
  const isMobile = useIsMobile();
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
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  
  // Multi-select state (mode is derived from having selected items)
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const isMultiSelectMode = multiSelectedIds.length > 0;

  const activeTrackers = state.trackers.filter(t => t.active);
  const currentTracker = state.trackers.find(t => t.id === selectedTracker);
  const todayEntries = currentTracker 
    ? getTrackerEntriesForDate(state, currentTracker.id, todayStr)
    : [];

  const currentSummary = currentTracker 
    ? calculateTrackerSummary(currentTracker, todayEntries, state.trackerEntries)
    : null;

  // Get today count for any tracker
  const getTrackerTodayCount = (trackerId: string) => {
    const entries = getTrackerEntriesForDate(state, trackerId, todayStr);
    return entries.reduce((sum, e) => sum + e.quantity, 0);
  };

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
      setState(prev => deleteTracker(prev, deletingTracker.id));
    } else {
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

  // Multi-select handlers
  const handleToggleMultiSelect = (trackerId: string) => {
    setMultiSelectedIds(prev => 
      prev.includes(trackerId) 
        ? prev.filter(id => id !== trackerId)
        : [...prev, trackerId]
    );
  };

  const handleSelectAll = () => {
    setMultiSelectedIds(activeTrackers.map(t => t.id));
  };

  const handleClearSelection = () => {
    setMultiSelectedIds([]);
  };

  const handleQuickCheck = (trackerId: string, quantity: number, timestamp?: string) => {
    handleAddEntry(trackerId, quantity, timestamp);
  };

  // Select tracker and show details
  const handleSelectTracker = (trackerId: string) => {
    // Don't open details if we're in multi-select mode
    if (isMultiSelectMode) return;
    
    setSelectedTracker(trackerId);
    if (isMobile) {
      setShowDetailDrawer(true);
    }
  };
  
  // Start multi-select mode by long-pressing a tracker
  const handleStartMultiSelect = (trackerId: string) => {
    setMultiSelectedIds([trackerId]);
  };

  // Quick check from card
  const handleCardQuickCheck = (tracker: Tracker) => {
    const todayCount = getTrackerTodayCount(tracker.id);
    const goal = tracker.dailyGoal ?? tracker.baseline;
    
    if (tracker.inputMode === "binary") {
      if (todayCount < 1) {
        handleAddEntry(tracker.id, 1);
      }
    } else if (tracker.inputMode === "fixedAmount") {
      if (todayCount < goal) {
        handleAddEntry(tracker.id, goal);
      }
    } else if (tracker.inputMode === "incremental") {
      handleAddEntry(tracker.id, 1);
    }
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

      <main className="container py-4 md:py-6 space-y-4">
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
            <CardContent className="py-12 text-center">
              <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-1">{t.trackers.noTrackers}</p>
              <p className="text-sm text-muted-foreground mb-4">{t.trackers.noTrackersDescription}</p>
              <Button onClick={() => setShowNewTrackerDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t.trackers.createFirst}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={cn(
            "grid gap-4",
            !isMobile && "lg:grid-cols-5"
          )}>
            {/* Tracker List - Compact with multi-select */}
            <div className={cn(
              "space-y-0",
              !isMobile && "lg:col-span-2"
            )}>
              {/* Quick Check Panel */}
              <TrackerQuickCheckPanel
                trackers={activeTrackers}
                selectedIds={multiSelectedIds}
                onToggleSelect={handleToggleMultiSelect}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onQuickCheck={handleQuickCheck}
                getTrackerTodayCount={getTrackerTodayCount}
              />
              
              {/* Tracker List */}
              <ScrollArea className={cn(
                "pr-2",
                isMobile ? "max-h-[50vh]" : "max-h-[65vh]"
              )}>
                <div className="space-y-2 py-3">
                  {activeTrackers.map(tracker => {
                    const todayCount = getTrackerTodayCount(tracker.id);
                    const isSelected = selectedTracker === tracker.id;
                    const isCheckedInMultiSelect = multiSelectedIds.includes(tracker.id);
                    
                    return (
                      <CompactTrackerCard
                        key={tracker.id}
                        tracker={tracker}
                        todayCount={todayCount}
                        isSelected={isSelected}
                        isMultiSelectMode={isMultiSelectMode}
                        isCheckedInMultiSelect={isCheckedInMultiSelect}
                        onSelect={() => handleSelectTracker(tracker.id)}
                        onToggleMultiSelect={() => handleToggleMultiSelect(tracker.id)}
                        onEdit={() => openEditDialog(tracker)}
                        onDelete={() => openDeleteDialog(tracker)}
                        onQuickCheck={() => handleCardQuickCheck(tracker)}
                        onLongPress={() => handleStartMultiSelect(tracker.id)}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Selected Tracker Details - Desktop only, full inline */}
            {!isMobile && currentTracker && currentSummary && (
              <div className="lg:col-span-3 space-y-4">
                {/* Quick Add */}
                <Card className="glass border-border/30">
                  <CardHeader className="pb-2 pt-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{currentTracker.icon}</span>
                        {currentTracker.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {currentSummary.todayCount} / {currentTracker.dailyGoal ?? currentTracker.baseline}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(currentTracker)}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3">
                    <TrackerInputButton
                      tracker={currentTracker}
                      todayCount={currentSummary.todayCount}
                      onAddEntry={(qty, ts) => handleAddEntry(currentTracker.id, qty, ts)}
                      className="h-11"
                    />

                    {currentTracker.type === 'reduce' && currentSummary.todayLoss > 0 && (
                      <div className="text-center p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                        <p className="text-destructive text-sm font-medium">
                          {t.trackers.todayLoss.replace("{{amount}}", formatCurrency(currentSummary.todayLoss))}
                        </p>
                      </div>
                    )}

                    {todayEntries.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground">{t.objectives.timeline}</h4>
                        <div className="max-h-28 overflow-y-auto space-y-1">
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
                <div className="grid gap-3 grid-cols-4">
                  <Card className="glass border-border/30">
                    <CardContent className="p-3 text-center">
                      <p className="text-xl font-bold text-primary">{currentSummary.daysOnTrack}</p>
                      <p className="text-[10px] text-muted-foreground">{t.trackers.daysOnTrack}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-border/30">
                    <CardContent className="p-3 text-center">
                      <p className="text-xl font-bold">{currentSummary.average30Days.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground">{t.trackers.average30Days}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-border/30">
                    <CardContent className="p-3 text-center">
                      <p className={cn(
                        "text-xl font-bold",
                        currentTracker.type === 'reduce' ? "text-destructive" : "text-success"
                      )}>
                        {currentTracker.type === 'reduce' 
                          ? formatCurrency(currentSummary.monthlyLoss) 
                          : formatCurrency(0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {currentTracker.type === 'reduce' ? t.trackers.monthLoss : t.trackers.monthSavings}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-border/30">
                    <CardContent className="p-3 text-center">
                      <p className="text-xl font-bold">{currentSummary.monthlyCount}</p>
                      <p className="text-[10px] text-muted-foreground">{t.dashboard.thisMonth}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart */}
                <Card className="glass border-border/30">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      {t.objectives.monthlyChart}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={getChartData(currentTracker)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(val) => format(parseISO(val), "d", { locale: dateLocale })}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
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

      {/* Mobile Detail Drawer */}
      <TrackerDetailDrawer
        open={showDetailDrawer && isMobile}
        onOpenChange={setShowDetailDrawer}
        tracker={currentTracker || null}
        todayEntries={todayEntries}
        allEntries={state.trackerEntries}
        summary={currentSummary}
        onAddEntry={(qty, ts) => currentTracker && handleAddEntry(currentTracker.id, qty, ts)}
        onUpdateEntry={handleUpdateEntry}
        onDeleteEntry={handleDeleteEntry}
        onEdit={() => currentTracker && openEditDialog(currentTracker)}
      />

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
