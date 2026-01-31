import { useState, useRef, useCallback } from "react";
import { Check, TrendingDown, TrendingUp, Pencil, Trash2, GripVertical } from "lucide-react";
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
  onLongPress?: () => void;
}

const LONG_PRESS_DURATION = 600;

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
  onLongPress,
}: CompactTrackerCardProps) => {
  const { t, locale } = useI18n();
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);
  
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

  // Long press handlers for entering multi-select mode
  const handleTouchStart = useCallback(() => {
    setIsPressed(true);
    isLongPressTriggered.current = false;
    
    longPressTimer.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      setIsPressed(false);
      if (onLongPress) {
        onLongPress();
      } else {
        // If no onLongPress handler, trigger multi-select
        onToggleMultiSelect();
      }
    }, LONG_PRESS_DURATION);
  }, [onLongPress, onToggleMultiSelect]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleCardClick = (e: React.MouseEvent) => {
    // If long press was triggered, don't process click
    if (isLongPressTriggered.current) {
      isLongPressTriggered.current = false;
      return;
    }

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

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-300 cursor-pointer relative overflow-hidden group",
        "border-border/20 hover:border-border/40",
        isPressed && "scale-[0.98]",
        isSelected && !isMultiSelectMode
          ? "bg-primary/8 border-primary/30 shadow-sm shadow-primary/5" 
          : "bg-card/40 hover:bg-card/60",
        isMultiSelectMode && isCheckedInMultiSelect && "bg-primary/10 border-primary/30",
        isMultiSelectMode && !isCheckedInMultiSelect && "opacity-70"
      )}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Progress bar background - more subtle gradient */}
      <div 
        className={cn(
          "absolute inset-y-0 left-0 transition-all duration-500 opacity-40",
          tracker.type === 'reduce' 
            ? isOnTrack ? "bg-gradient-to-r from-success/10 to-transparent" : "bg-gradient-to-r from-destructive/10 to-transparent"
            : isOnTrack ? "bg-gradient-to-r from-success/10 to-transparent" : "bg-gradient-to-r from-warning/10 to-transparent"
        )}
        style={{ width: `${progressPercent}%` }}
      />
      
      <CardContent className="p-4 relative">
        <div className="flex items-center gap-3.5">
          {/* Multi-select checkbox with better styling */}
          {isMultiSelectMode && (
            <div 
              className="shrink-0 flex items-center"
              onClick={handleCheckboxClick}
            >
              <Checkbox 
                checked={isCheckedInMultiSelect}
                onCheckedChange={() => onToggleMultiSelect()}
                className={cn(
                  "h-5 w-5 border-2 transition-all rounded-lg",
                  isCheckedInMultiSelect 
                    ? "border-primary bg-primary data-[state=checked]:bg-primary" 
                    : "border-muted-foreground/30"
                )}
              />
            </div>
          )}
          
          {/* Icon with better container - more refined */}
          <div className={cn(
            "h-11 w-11 rounded-2xl flex items-center justify-center text-lg shrink-0 transition-all",
            "border border-border/20",
            tracker.type === 'reduce' 
              ? "bg-warning/8 text-warning" 
              : tracker.type === 'boolean'
              ? "bg-success/8 text-success"
              : tracker.type === 'event'
              ? "bg-accent/8 text-accent"
              : "bg-primary/8 text-primary"
          )}>
            {tracker.icon || (tracker.type === 'reduce' ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />)}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[15px] truncate leading-tight">{tracker.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground/70">
                {todayCount} / {goal} {tracker.unitPlural}
              </span>
              {isOnTrack && (
                <Badge 
                  variant="outline" 
                  className="text-[9px] px-1.5 py-0 h-4 border-success/20 text-success bg-success/10 rounded-md"
                >
                  ✓
                </Badge>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick check button - always visible for actionable types */}
            {!isMultiSelectMode && (tracker.inputMode === "binary" || tracker.inputMode === "fixedAmount" || tracker.inputMode === "incremental") && (
              <Button
                variant={isCompleted ? "outline" : "default"}
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-xl transition-all duration-200",
                  isCompleted 
                    ? "bg-success/10 border-success/30 text-success hover:bg-success/20" 
                    : tracker.type === 'reduce'
                      ? "bg-warning hover:bg-warning/90 text-warning-foreground shadow-sm"
                      : "bg-success hover:bg-success/90 text-success-foreground shadow-sm"
                )}
                onClick={handleQuickCheckClick}
                disabled={isCompleted && tracker.inputMode !== "incremental"}
              >
                {tracker.inputMode === "incremental" ? (
                  <span className="text-sm font-semibold">+1</span>
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {/* Edit/Delete buttons when selected - with slide animation */}
            {isSelected && !isMultiSelectMode && (
              <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-xl"
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
                  className="h-9 w-9 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
