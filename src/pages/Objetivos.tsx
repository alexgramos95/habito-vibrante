import { useState } from "react";
import { format, parseISO } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import {
  Target, Plus, BarChart3, Settings2, Activity
} from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { Button } from "@/components/ui/button";
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
    <div className="tracker-hud">
      {/* Scan-line effect */}
      <div className="hud-scanline" />
      
      <Navigation />

      <main className="page-content pb-24 md:pb-8">
        {/* HUD Header */}
        <div className="hud-header flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center border border-[hsl(174_65%_42%/0.3)] bg-[hsl(174_65%_42%/0.1)]">
              <Activity className="h-5 w-5 text-neon" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-semibold tracking-tight text-[hsl(210_20%_92%)]">
                {t.nav.trackers}
              </h1>
              <p className="text-xs text-[hsl(210_15%_50%)] truncate">
                {(t as any).pageSubtitles?.trackers || t.motivational.consistencyWins}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowNewTrackerDialog(true)} 
            size="sm" 
            className="hud-btn gap-1.5 h-9 px-3 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t.objectives.newObjective}</span>
          </Button>
        </div>

        {/* HUD Status Bar */}
        {activeTrackers.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="hud-badge">
              {activeTrackers.length} {locale === 'pt-PT' ? 'ativos' : 'active'}
            </div>
            {(() => {
              const onTrackCount = activeTrackers.filter(tracker => {
                const count = getTrackerTodayCount(tracker.id);
                const goal = tracker.dailyGoal ?? tracker.baseline;
                return tracker.type === 'reduce' ? count <= goal : count >= goal;
              }).length;
              const pct = Math.round((onTrackCount / activeTrackers.length) * 100);
              return (
                <>
                  <div className="hud-badge" style={{ 
                    borderColor: pct >= 70 ? 'hsl(155 70% 50% / 0.3)' : pct >= 40 ? 'hsl(38 90% 60% / 0.3)' : 'hsl(0 70% 60% / 0.3)',
                    color: pct >= 70 ? 'hsl(155 70% 55%)' : pct >= 40 ? 'hsl(38 90% 65%)' : 'hsl(0 70% 65%)',
                    background: pct >= 70 ? 'hsl(155 70% 50% / 0.1)' : pct >= 40 ? 'hsl(38 90% 60% / 0.1)' : 'hsl(0 70% 60% / 0.1)',
                  }}>
                    {pct}% on-track
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <div className="hud-progress">
                      <div 
                        className="hud-progress-bar"
                        style={{ 
                          width: `${pct}%`,
                          background: pct >= 70 ? 'hsl(155 70% 50%)' : pct >= 40 ? 'hsl(38 90% 60%)' : 'hsl(0 70% 60%)',
                          color: pct >= 70 ? 'hsl(155 70% 50%)' : pct >= 40 ? 'hsl(38 90% 60%)' : 'hsl(0 70% 60%)',
                        }}
                      />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Empty State */}
        {activeTrackers.length === 0 ? (
          <div className="hud-card">
            <div className="hud-empty-state">
              <Target className="h-12 w-12" />
              <p className="text-base font-medium text-[hsl(210_20%_80%)] mb-1">{t.trackers.noTrackers}</p>
              <p className="text-sm text-[hsl(210_15%_45%)] max-w-xs mb-4">{t.trackers.noTrackersDescription}</p>
              <Button onClick={() => setShowNewTrackerDialog(true)} size="sm" className="hud-btn">
                <Plus className="h-4 w-4 mr-1.5" />
                {t.trackers.createFirst}
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn(
            "grid gap-4",
            !isMobile && "lg:grid-cols-5"
          )}>
            {/* Tracker List */}
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
                
                {activeTrackers.length > 0 && (
                  <p className="text-center text-[10px] text-[hsl(210_15%_40%)] pt-2">
                    {activeTrackers.length} {activeTrackers.length === 1 
                      ? (locale === 'pt-PT' ? 'tracker' : 'tracker') 
                      : (locale === 'pt-PT' ? 'trackers' : 'trackers')}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop Detail Panel */}
            {!isMobile && currentTracker && currentSummary && (
              <div className="lg:col-span-3 space-y-4">
                {/* Quick Add */}
                <div className="hud-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{currentTracker.icon}</span>
                      <span className="font-semibold text-[hsl(210_20%_90%)]">{currentTracker.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hud-badge">
                        {currentSummary.todayCount} / {currentTracker.dailyGoal ?? currentTracker.baseline}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 text-[hsl(210_15%_50%)] hover:text-[hsl(174_80%_60%)]"
                        onClick={() => openEditDialog(currentTracker)}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <TrackerInputButton
                    tracker={currentTracker}
                    todayCount={currentSummary.todayCount}
                    onAddEntry={(qty, ts) => handleAddEntry(currentTracker.id, qty, ts)}
                    className="h-11"
                  />

                  {currentTracker.type === 'reduce' && currentSummary.todayLoss > 0 && (
                    <div className="text-center p-2 mt-3 rounded-lg bg-[hsl(0_70%_60%/0.1)] border border-[hsl(0_70%_60%/0.2)]">
                      <p className="text-neon-danger text-sm font-medium">
                        {t.trackers.todayLoss.replace("{{amount}}", formatCurrency(currentSummary.todayLoss))}
                      </p>
                    </div>
                  )}

                  {todayEntries.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <h4 className="hud-section-label">{t.objectives.timeline}</h4>
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
                </div>

                {/* Stats Grid */}
                <div className="grid gap-3 grid-cols-4">
                  <div className="hud-stat">
                    <p className="hud-stat-value text-neon">{currentSummary.daysOnTrack}</p>
                    <p className="hud-stat-label">{t.trackers.daysOnTrack}</p>
                  </div>
                  <div className="hud-stat">
                    <p className="hud-stat-value text-[hsl(210_20%_85%)]">{currentSummary.average30Days.toFixed(1)}</p>
                    <p className="hud-stat-label">{t.trackers.average30Days}</p>
                  </div>
                  <div className="hud-stat">
                    <p className={cn(
                      "hud-stat-value",
                      currentTracker.type === 'reduce' ? "text-neon-danger" : "text-neon-success"
                    )}>
                      {currentTracker.type === 'reduce' 
                        ? formatCurrency(currentSummary.monthlyLoss) 
                        : formatCurrency(0)}
                    </p>
                    <p className="hud-stat-label">
                      {currentTracker.type === 'reduce' ? t.trackers.monthLoss : t.trackers.monthSavings}
                    </p>
                  </div>
                  <div className="hud-stat">
                    <p className="hud-stat-value text-[hsl(210_20%_85%)]">{currentSummary.monthlyCount}</p>
                    <p className="hud-stat-label">{t.dashboard.thisMonth}</p>
                  </div>
                </div>

                {/* Chart */}
                <div className="hud-chart-container">
                  <h3 className="hud-section-label mb-3 flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-neon" />
                    {t.objectives.monthlyChart}
                  </h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={getChartData(currentTracker)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 25% 20%)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) => format(parseISO(val), "d", { locale: dateLocale })}
                        stroke="hsl(210 15% 40%)"
                        fontSize={10}
                      />
                      <YAxis stroke="hsl(210 15% 40%)" fontSize={10} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(220 25% 12%)",
                          border: "1px solid hsl(174 65% 42% / 0.3)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "hsl(210 20% 85%)",
                        }}
                        labelFormatter={(val) => format(parseISO(val as string), "d MMM", { locale: dateLocale })}
                      />
                      <Area
                        type="monotone"
                        dataKey="goal"
                        stroke="hsl(210 15% 35%)"
                        fill="transparent"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={currentTracker.type === 'reduce' ? "hsl(38 90% 60%)" : "hsl(155 70% 50%)"}
                        fill={currentTracker.type === 'reduce' ? "hsl(38 90% 60% / 0.15)" : "hsl(155 70% 50% / 0.15)"}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
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
