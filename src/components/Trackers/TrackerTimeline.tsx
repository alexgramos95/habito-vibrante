import { format, parseISO } from "date-fns";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrackerEntry, Tracker } from "@/data/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TrackerTimelineProps {
  tracker: Tracker;
  entries: TrackerEntry[];
  onAddEntry: (quantity: number) => void;
  onDeleteEntry: (entryId: string) => void;
}

export const TrackerTimeline = ({
  tracker,
  entries,
  onAddEntry,
  onDeleteEntry,
}: TrackerTimelineProps) => {
  const [customValue, setCustomValue] = useState("");
  
  // Sort entries descending by timestamp
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  const totalToday = entries.reduce((sum, e) => sum + e.quantity, 0);
  const goal = tracker.dailyGoal ?? tracker.baseline;
  const isBooleanType = tracker.type === "boolean";
  const isOnTrack = tracker.type === "reduce" 
    ? totalToday <= goal 
    : totalToday >= goal;

  const handleQuickAdd = () => {
    onAddEntry(1);
  };

  const handleCustomAdd = () => {
    const value = parseFloat(customValue);
    if (value > 0) {
      onAddEntry(value);
      setCustomValue("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Add Buttons */}
      <div className="flex gap-2">
        <Button
          size="lg"
          onClick={handleQuickAdd}
          className={cn(
            "flex-1 h-14 text-lg gap-3",
            tracker.type === "reduce"
              ? "bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70"
              : tracker.type === "boolean"
              ? "bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70"
              : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          )}
          disabled={isBooleanType && totalToday >= 1}
        >
          <Plus className="h-6 w-6" />
          {isBooleanType ? "✓ Feito" : `+1 ${tracker.unitSingular}`}
        </Button>
      </div>

      {/* Custom Input - hide for boolean */}
      {!isBooleanType && (
        <div className="flex gap-2">
          <Input
            type="number"
            min="1"
            step="1"
            placeholder="Valor personalizado"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="secondary"
            onClick={handleCustomAdd}
            disabled={!customValue || parseFloat(customValue) <= 0}
          >
            Adicionar
          </Button>
        </div>
      )}

      {/* Summary */}
      <div className={cn(
        "text-center p-3 rounded-xl border",
        isOnTrack 
          ? "bg-success/10 border-success/30" 
          : "bg-destructive/10 border-destructive/30"
      )}>
        <p className={cn("font-medium", isOnTrack ? "text-success" : "text-destructive")}>
          {totalToday} {totalToday === 1 ? tracker.unitSingular : tracker.unitPlural}
          {goal > 0 && !isBooleanType && ` / ${goal}`}
        </p>
      </div>

      {/* Timeline */}
      {sortedEntries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Timeline</h4>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {sortedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono min-w-[50px]">
                    {format(parseISO(entry.timestamp), "HH:mm")}
                  </span>
                  <span className="text-sm">
                    +{entry.quantity} {entry.quantity === 1 ? tracker.unitSingular : tracker.unitPlural}
                  </span>
                  {entry.note && (
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {entry.note}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDeleteEntry(entry.id)}
                >
                  <X className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sortedEntries.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Sem registos hoje. Adiciona o primeiro.
        </p>
      )}
    </div>
  );
};
