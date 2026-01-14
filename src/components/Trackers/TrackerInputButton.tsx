import { useState } from "react";
import { Plus, Check, Clock, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tracker, TrackerEntry } from "@/data/types";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface TrackerInputButtonProps {
  tracker: Tracker;
  todayCount: number;
  onAddEntry: (quantity: number, timestamp?: string) => void;
  className?: string;
}

export const TrackerInputButton = ({
  tracker,
  todayCount,
  onAddEntry,
  className,
}: TrackerInputButtonProps) => {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [customTime, setCustomTime] = useState(format(new Date(), "HH:mm"));

  const goal = tracker.dailyGoal ?? tracker.baseline;
  const isCompleteToday = tracker.inputMode === "binary" 
    ? todayCount >= 1 
    : tracker.inputMode === "fixedAmount" 
      ? todayCount >= goal
      : false;

  const handleQuickAdd = () => {
    if (tracker.inputMode === "binary") {
      // Binary: toggle complete/incomplete
      if (!isCompleteToday) {
        onAddEntry(1);
      }
    } else if (tracker.inputMode === "fixedAmount") {
      // Fixed amount: add the goal value
      if (!isCompleteToday) {
        onAddEntry(goal);
      }
    } else if (tracker.inputMode === "incremental") {
      // Incremental: +1
      onAddEntry(1);
    } else if (tracker.inputMode === "manualAmount") {
      // Manual: open dialog
      setManualValue("");
      setCustomTime(format(new Date(), "HH:mm"));
      setShowManualInput(true);
    }
  };

  const handleManualSubmit = () => {
    const value = parseFloat(manualValue);
    if (value > 0) {
      // Create timestamp with custom time
      const now = new Date();
      const [hours, minutes] = customTime.split(":").map(Number);
      now.setHours(hours, minutes, 0, 0);
      onAddEntry(value, now.toISOString());
      setShowManualInput(false);
      setManualValue("");
    }
  };

  const getButtonContent = () => {
    switch (tracker.inputMode) {
      case "binary":
        return isCompleteToday ? (
          <>
            <Check className="h-5 w-5" />
            Concluído
          </>
        ) : (
          <>
            <Check className="h-5 w-5" />
            Concluir Hoje
          </>
        );
      
      case "fixedAmount":
        return isCompleteToday ? (
          <>
            <Check className="h-5 w-5" />
            {goal} {tracker.unitPlural} ✓
          </>
        ) : (
          <>
            <Plus className="h-5 w-5" />
            +{goal} {tracker.unitPlural}
          </>
        );
      
      case "incremental":
        return (
          <>
            <Plus className="h-4 w-4" />
            1 {tracker.unitSingular}
          </>
        );
      
      case "manualAmount":
        return (
          <>
            <Pencil className="h-5 w-5" />
            Registar Valor
          </>
        );
      
      default:
        return (
          <>
            <Plus className="h-4 w-4" />
            1 {tracker.unitSingular}
          </>
        );
    }
  };

  const getButtonVariant = () => {
    if (tracker.inputMode === "binary" || tracker.inputMode === "fixedAmount") {
      return isCompleteToday ? "outline" : "default";
    }
    return "default";
  };

  const getButtonColorClass = () => {
    if (isCompleteToday && (tracker.inputMode === "binary" || tracker.inputMode === "fixedAmount")) {
      return "bg-success/20 border-success/50 text-success hover:bg-success/30";
    }
    if (tracker.type === "reduce") {
      return "bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70";
    }
    return "bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70";
  };

  return (
    <>
      <Button
        size="lg"
        variant={getButtonVariant()}
        onClick={handleQuickAdd}
        disabled={isCompleteToday && (tracker.inputMode === "binary" || tracker.inputMode === "fixedAmount")}
        className={cn(
          "w-full h-14 text-lg gap-3",
          getButtonColorClass(),
          className
        )}
      >
        {getButtonContent()}
      </Button>

      {/* Manual Input Dialog */}
      <Dialog open={showManualInput} onOpenChange={setShowManualInput}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {tracker.icon} {tracker.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantidade ({tracker.unitPlural})</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder={`Ex: 5 ${tracker.unitPlural}`}
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora
              </Label>
              <Input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualInput(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleManualSubmit}
              disabled={!manualValue || parseFloat(manualValue) <= 0}
            >
              Registar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Component for editing a tracker entry's timestamp
interface TrackerEntryEditProps {
  entry: TrackerEntry;
  tracker: Tracker;
  onUpdate: (entryId: string, updates: Partial<TrackerEntry>) => void;
  onDelete: (entryId: string) => void;
}

export const TrackerEntryItem = ({
  entry,
  tracker,
  onUpdate,
  onDelete,
}: TrackerEntryEditProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTime, setEditTime] = useState(format(parseISO(entry.timestamp), "HH:mm"));

  const handleTimeUpdate = () => {
    const entryDate = parseISO(entry.timestamp);
    const [hours, minutes] = editTime.split(":").map(Number);
    entryDate.setHours(hours, minutes, 0, 0);
    onUpdate(entry.id, { timestamp: entryDate.toISOString() });
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 group">
      <div className="flex items-center gap-2">
        {isEditing ? (
          <Input
            type="time"
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
            className="h-7 w-24 text-xs"
            onBlur={handleTimeUpdate}
            onKeyDown={(e) => e.key === "Enter" && handleTimeUpdate()}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-muted-foreground font-mono hover:text-primary transition-colors"
            title="Clique para editar hora"
          >
            {format(parseISO(entry.timestamp), "HH:mm")}
          </button>
        )}
        <span className="text-sm">
          {entry.quantity} {entry.quantity === 1 ? tracker.unitSingular : tracker.unitPlural}
        </span>
        {entry.note && (
          <span className="text-xs text-muted-foreground">({entry.note})</span>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onDelete(entry.id)}
        >
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
};