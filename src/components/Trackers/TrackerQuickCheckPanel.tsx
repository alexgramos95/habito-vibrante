import { useState } from "react";
import { Check, X, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

  // Check if all selected trackers can be quick-checked
  const canBulkCheck = selectedTrackers.every(t => 
    t.inputMode === "binary" || t.inputMode === "fixedAmount" || t.inputMode === "incremental"
  );

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
    
    // Handle manual input trackers
    const manualTrackers = selectedTrackers.filter(t => t.inputMode === "manualAmount");
    if (manualTrackers.length > 0) {
      setManualInputTracker(manualTrackers[0]);
      setManualValue("");
      setCustomTime(format(new Date(), "HH:mm"));
    } else {
      // Clear selection after bulk check if no manual trackers
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

  // No selection state - show hint
  if (selectedIds.length === 0) {
    return (
      <div className="bg-card/30 backdrop-blur-sm border-b border-border/30 px-3 py-2.5">
        <p className="text-xs text-muted-foreground text-center">
          {locale === 'pt-PT' 
            ? '💡 Mantém pressionado para selecionar vários' 
            : '💡 Long press to select multiple'}
        </p>
      </div>
    );
  }

  // Multi-select active state
  return (
    <>
      <div className="sticky top-0 z-10 bg-primary/5 backdrop-blur-lg border-b border-primary/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <Badge 
              variant="secondary" 
              className="font-medium bg-primary/10 text-primary border-primary/20"
            >
              {selectedIds.length} {locale === 'pt-PT' ? 'selecionado(s)' : 'selected'}
            </Badge>
            
            {!allSelected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                {locale === 'pt-PT' ? 'Todos' : 'All'}
              </Button>
            )}
          </div>
          
          <Button
            size="sm"
            onClick={handleBulkCheck}
            disabled={!canBulkCheck && selectedTrackers.some(t => t.inputMode === "manualAmount") && selectedIds.length > 1}
            className={cn(
              "gap-2 font-medium transition-all",
              "bg-success hover:bg-success/90 text-success-foreground",
              "shadow-lg shadow-success/20"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {locale === 'pt-PT' ? 'Check' : 'Check all'}
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
              className="bg-success hover:bg-success/90"
            >
              {locale === 'pt-PT' ? 'Registar' : 'Log'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
