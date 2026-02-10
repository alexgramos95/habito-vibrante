import { useState } from "react";
import { Check, X, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tracker } from "@/data/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useI18n } from "@/i18n/I18nContext";

interface TrackerQuickCheckPanelProps {
  trackers: Tracker[];
  selectedIds: string[];
  onToggleSelect: (trackerId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onQuickCheck: (trackerId: string, quantity: number, timestamp?: string) => void;
  getTrackerTodayCount: (trackerId: string) => number;
}

export const TrackerQuickCheckPanel = ({
  trackers,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onQuickCheck,
  getTrackerTodayCount,
}: TrackerQuickCheckPanelProps) => {
  const { locale } = useI18n();
  const [manualInputTracker, setManualInputTracker] = useState<Tracker | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [customTime, setCustomTime] = useState(format(new Date(), "HH:mm"));

  const selectedTrackers = trackers.filter(t => selectedIds.includes(t.id));
  const allSelected = selectedIds.length === trackers.length && trackers.length > 0;

  const canBulkCheck = selectedTrackers.every(t => 
    t.inputMode === "binary" || t.inputMode === "fixedAmount" || t.inputMode === "incremental"
  );

  const handleBulkCheck = () => {
    selectedTrackers.forEach(tracker => {
      const todayCount = getTrackerTodayCount(tracker.id);
      const goal = tracker.dailyGoal ?? tracker.baseline;
      
      if (tracker.inputMode === "binary") {
        if (todayCount < 1) onQuickCheck(tracker.id, 1);
      } else if (tracker.inputMode === "fixedAmount") {
        if (todayCount < goal) onQuickCheck(tracker.id, goal);
      } else if (tracker.inputMode === "incremental") {
        onQuickCheck(tracker.id, 1);
      }
    });
    
    const manualTrackers = selectedTrackers.filter(t => t.inputMode === "manualAmount");
    if (manualTrackers.length > 0) {
      setManualInputTracker(manualTrackers[0]);
      setManualValue("");
      setCustomTime(format(new Date(), "HH:mm"));
    } else {
      onClearSelection();
    }
  };

  const handleManualSubmit = () => {
    if (!manualInputTracker) return;
    const value = parseFloat(manualValue);
    if (value > 0) {
      const now = new Date();
      const [hours, minutes] = customTime.split(":").map(Number);
      now.setHours(hours, minutes, 0, 0);
      onQuickCheck(manualInputTracker.id, value, now.toISOString());
      
      const manualTrackers = selectedTrackers.filter(t => t.inputMode === "manualAmount");
      const currentIndex = manualTrackers.findIndex(t => t.id === manualInputTracker.id);
      
      if (currentIndex < manualTrackers.length - 1) {
        setManualInputTracker(manualTrackers[currentIndex + 1]);
        setManualValue("");
        setCustomTime(format(new Date(), "HH:mm"));
      } else {
        setManualInputTracker(null);
        onClearSelection();
      }
    }
  };

  // No selection — show hint in HUD style
  if (selectedIds.length === 0) {
    return (
      <div className="border-b border-[hsl(174_65%_42%/0.08)] px-3 py-2.5">
        <p className="text-[11px] text-[hsl(210_15%_40%)] text-center font-mono tracking-wide">
          {locale === 'pt-PT' 
            ? '[ MANTÉM PRESSIONADO PARA SELEÇÃO MÚLTIPLA ]' 
            : '[ LONG PRESS FOR MULTI-SELECT ]'}
        </p>
      </div>
    );
  }

  // Multi-select active
  return (
    <>
      <div className="sticky top-0 z-10 bg-[hsl(174_65%_42%/0.06)] backdrop-blur-lg border-b border-[hsl(174_65%_42%/0.2)] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClearSelection}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(210_15%_50%)] hover:text-neon transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            
            <span className="hud-badge">
              {selectedIds.length} {locale === 'pt-PT' ? 'selecionado(s)' : 'selected'}
            </span>
            
            {!allSelected && (
              <button
                onClick={onSelectAll}
                className="text-[11px] font-mono text-[hsl(210_15%_45%)] hover:text-neon transition-colors uppercase tracking-wider"
              >
                {locale === 'pt-PT' ? 'Todos' : 'All'}
              </button>
            )}
          </div>
          
          <button
            onClick={handleBulkCheck}
            disabled={!canBulkCheck && selectedTrackers.some(t => t.inputMode === "manualAmount") && selectedIds.length > 1}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              "bg-[hsl(155_70%_50%/0.15)] border border-[hsl(155_70%_50%/0.3)] text-neon-success",
              "hover:bg-[hsl(155_70%_50%/0.25)] hover:shadow-[0_0_15px_hsl(155_70%_50%/0.15)]",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {locale === 'pt-PT' ? 'Check' : 'Check all'}
          </button>
        </div>
      </div>

      {/* Manual Input Dialog */}
      <Dialog open={!!manualInputTracker} onOpenChange={() => setManualInputTracker(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {manualInputTracker?.icon} {manualInputTracker?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{locale === 'pt-PT' ? 'Quantidade' : 'Quantity'} ({manualInputTracker?.unitPlural})</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder={`Ex: 5 ${manualInputTracker?.unitPlural}`}
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                autoFocus
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {locale === 'pt-PT' ? 'Hora' : 'Time'}
              </Label>
              <Input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualInputTracker(null)}>
              {locale === 'pt-PT' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleManualSubmit}
              disabled={!manualValue || parseFloat(manualValue) <= 0}
              className="bg-[hsl(155_70%_50%)] hover:bg-[hsl(155_70%_45%)]"
            >
              {locale === 'pt-PT' ? 'Registar' : 'Log'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
