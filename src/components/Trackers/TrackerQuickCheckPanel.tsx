import { useState } from "react";
import { Check, CheckSquare, Square, X, Plus, Clock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tracker, TrackerEntry } from "@/data/types";
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
  const { t, locale } = useI18n();
  const [manualInputTracker, setManualInputTracker] = useState<Tracker | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [customTime, setCustomTime] = useState(format(new Date(), "HH:mm"));

  const selectedTrackers = trackers.filter(t => selectedIds.includes(t.id));
  const allSelected = selectedIds.length === trackers.length;

  // Check if all selected trackers can be quick-checked (binary or fixedAmount)
  const canBulkCheck = selectedTrackers.every(t => 
    t.inputMode === "binary" || t.inputMode === "fixedAmount" || t.inputMode === "incremental"
  );

  // Check if any selected tracker needs manual input
  const hasManualTrackers = selectedTrackers.some(t => t.inputMode === "manualAmount");

  const handleBulkCheck = () => {
    selectedTrackers.forEach(tracker => {
      const todayCount = getTrackerTodayCount(tracker.id);
      const goal = tracker.dailyGoal ?? tracker.baseline;
      
      if (tracker.inputMode === "binary") {
        if (todayCount < 1) {
          onQuickCheck(tracker.id, 1);
        }
      } else if (tracker.inputMode === "fixedAmount") {
        if (todayCount < goal) {
          onQuickCheck(tracker.id, goal);
        }
      } else if (tracker.inputMode === "incremental") {
        onQuickCheck(tracker.id, 1);
      }
    });
    
    // Handle manual input trackers by opening dialog for each
    const manualTrackers = selectedTrackers.filter(t => t.inputMode === "manualAmount");
    if (manualTrackers.length > 0) {
      setManualInputTracker(manualTrackers[0]);
      setManualValue("");
      setCustomTime(format(new Date(), "HH:mm"));
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
      
      // Check if there are more manual trackers
      const manualTrackers = selectedTrackers.filter(t => t.inputMode === "manualAmount");
      const currentIndex = manualTrackers.findIndex(t => t.id === manualInputTracker.id);
      
      if (currentIndex < manualTrackers.length - 1) {
        setManualInputTracker(manualTrackers[currentIndex + 1]);
        setManualValue("");
        setCustomTime(format(new Date(), "HH:mm"));
      } else {
        setManualInputTracker(null);
      }
    }
  };

  if (selectedIds.length === 0) {
    return (
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            className="gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            {locale === 'pt-PT' ? 'Selecionar todos' : 'Select all'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {locale === 'pt-PT' ? 'Toca num tracker para selecionar' : 'Tap a tracker to select'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="font-medium">
              {selectedIds.length} {locale === 'pt-PT' ? 'selecionado(s)' : 'selected'}
            </Badge>
            {!allSelected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="text-xs h-7 px-2"
              >
                {locale === 'pt-PT' ? 'Todos' : 'All'}
              </Button>
            )}
          </div>
          
          <Button
            size="sm"
            onClick={handleBulkCheck}
            disabled={!canBulkCheck && hasManualTrackers && selectedIds.length > 1}
            className="gap-2 bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70"
          >
            <Check className="h-4 w-4" />
            {locale === 'pt-PT' ? 'Check todos' : 'Check all'}
          </Button>
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
            >
              {locale === 'pt-PT' ? 'Registar' : 'Log'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
