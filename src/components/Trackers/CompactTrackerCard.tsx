import { Check, TrendingDown, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tracker } from "@/data/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nContext";

interface CompactTrackerCardProps {
  tracker: Tracker;
  todayCount: number;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  isCheckedInMultiSelect: boolean;
  onSelect: () => void;
  onToggleMultiSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onQuickCheck: () => void;
}

export const CompactTrackerCard = ({
  tracker,
  todayCount,
  isSelected,
  isMultiSelectMode,
  isCheckedInMultiSelect,
  onSelect,
  onToggleMultiSelect,
  onEdit,
  onDelete,
  onQuickCheck,
}: CompactTrackerCardProps) => {
  const { t, locale } = useI18n();
  
  const goal = tracker.dailyGoal ?? tracker.baseline;
  const isOnTrack = tracker.type === "boolean" 
    ? todayCount >= 1
    : tracker.type === "reduce" 
      ? todayCount <= goal 
      : todayCount >= goal;

  const isCompleted = tracker.inputMode === "binary" 
    ? todayCount >= 1 
    : tracker.inputMode === "fixedAmount" 
      ? todayCount >= goal
      : false;

  const progressPercent = tracker.type === "reduce"
    ? Math.max(0, 100 - (todayCount / goal) * 100)
    : Math.min(100, (todayCount / goal) * 100);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isMultiSelectMode) {
      onToggleMultiSelect();
    } else {
      onSelect();
    }
  };

  const handleQuickCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickCheck();
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 border-border/30 cursor-pointer relative overflow-hidden",
        isSelected && !isMultiSelectMode
          ? "glass border-primary/50 ring-1 ring-primary/30" 
          : "hover:bg-secondary/50",
        isCheckedInMultiSelect && "bg-primary/5 border-primary/30"
      )}
      onClick={handleCardClick}
    >
      {/* Progress bar background */}
      <div 
        className={cn(
          "absolute inset-y-0 left-0 transition-all duration-500",
          tracker.type === 'reduce' 
            ? isOnTrack ? "bg-success/10" : "bg-destructive/10"
            : isOnTrack ? "bg-success/10" : "bg-warning/10"
        )}
        style={{ width: `${progressPercent}%` }}
      />
      
      <CardContent className="p-3 relative">
        <div className="flex items-center gap-3">
          {/* Multi-select checkbox */}
          {isMultiSelectMode && (
            <Checkbox 
              checked={isCheckedInMultiSelect}
              onCheckedChange={() => onToggleMultiSelect()}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            />
          )}
          
          {/* Icon */}
          <div className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center text-base shrink-0",
            tracker.type === 'reduce' 
              ? "bg-warning/10" 
              : tracker.type === 'boolean'
              ? "bg-success/10"
              : tracker.type === 'event'
              ? "bg-accent/10"
              : "bg-primary/10"
          )}>
            {tracker.icon || (tracker.type === 'reduce' ? <TrendingDown className="h-4 w-4 text-warning" /> : <TrendingUp className="h-4 w-4 text-success" />)}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{tracker.name}</p>
            <p className="text-xs text-muted-foreground">
              {todayCount} / {goal} {tracker.unitPlural}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Quick check button - only show for completable types when not multi-select */}
            {!isMultiSelectMode && (tracker.inputMode === "binary" || tracker.inputMode === "fixedAmount" || tracker.inputMode === "incremental") && (
              <Button
                variant={isCompleted ? "outline" : "default"}
                size="icon"
                className={cn(
                  "h-8 w-8",
                  isCompleted 
                    ? "bg-success/20 border-success/50 text-success hover:bg-success/30" 
                    : tracker.type === 'reduce'
                      ? "bg-warning/90 hover:bg-warning text-warning-foreground"
                      : "bg-success/90 hover:bg-success text-success-foreground"
                )}
                onClick={handleQuickCheckClick}
                disabled={isCompleted && tracker.inputMode !== "incremental"}
              >
                {tracker.inputMode === "incremental" ? (
                  <span className="text-xs font-bold">+1</span>
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {/* Edit/Delete buttons when selected */}
            {isSelected && !isMultiSelectMode && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            
            {/* Status badge */}
            <Badge 
              variant={isOnTrack ? "default" : "destructive"} 
              className={cn(
                "text-[10px] px-1.5 py-0 h-5",
                isOnTrack && "bg-success/20 text-success border-success/30"
              )}
            >
              {isOnTrack ? "✓" : "!"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
