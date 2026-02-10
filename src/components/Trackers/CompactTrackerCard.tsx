import { useState, useRef, useCallback } from "react";
import { Check, TrendingDown, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // Long press handlers
  const handleTouchStart = useCallback(() => {
    setIsPressed(true);
    isLongPressTriggered.current = false;
    
    longPressTimer.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      setIsPressed(false);
      if (onLongPress) {
        onLongPress();
      } else {
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
    <div 
      className={cn(
        "hud-card cursor-pointer relative overflow-hidden group transition-all duration-300",
        isPressed && "scale-[0.98]",
        isSelected && !isMultiSelectMode && "hud-card-active",
        isMultiSelectMode && isCheckedInMultiSelect && "hud-card-active",
        isMultiSelectMode && !isCheckedInMultiSelect && "opacity-50"
      )}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Progress bar — neon glow */}
      <div 
        className="absolute inset-y-0 left-0 transition-all duration-500 opacity-30"
        style={{
          width: `${progressPercent}%`,
          background: tracker.type === 'reduce'
            ? isOnTrack 
              ? 'linear-gradient(90deg, hsl(155 70% 50% / 0.2), transparent)' 
              : 'linear-gradient(90deg, hsl(0 70% 60% / 0.2), transparent)'
            : isOnTrack 
              ? 'linear-gradient(90deg, hsl(155 70% 50% / 0.2), transparent)' 
              : 'linear-gradient(90deg, hsl(38 90% 60% / 0.2), transparent)',
        }}
      />
      
      <div className="p-3.5 relative">
        <div className="flex items-center gap-3">
          {/* Multi-select checkbox */}
          {isMultiSelectMode && (
            <div className="shrink-0 flex items-center" onClick={handleCheckboxClick}>
              <Checkbox 
                checked={isCheckedInMultiSelect}
                onCheckedChange={() => onToggleMultiSelect()}
                className={cn(
                  "h-5 w-5 border-2 transition-all rounded-lg",
                  isCheckedInMultiSelect 
                    ? "border-[hsl(174_80%_55%)] bg-[hsl(174_65%_42%/0.3)] data-[state=checked]:bg-[hsl(174_65%_42%/0.3)]" 
                    : "border-[hsl(210_15%_30%)]"
                )}
              />
            </div>
          )}
          
          {/* Icon */}
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center text-base shrink-0",
            "border transition-all",
            tracker.type === 'reduce' 
              ? "border-[hsl(38_90%_60%/0.2)] bg-[hsl(38_90%_60%/0.08)]" 
              : tracker.type === 'boolean'
              ? "border-[hsl(155_70%_50%/0.2)] bg-[hsl(155_70%_50%/0.08)]"
              : tracker.type === 'event'
              ? "border-[hsl(174_65%_42%/0.2)] bg-[hsl(174_65%_42%/0.08)]"
              : "border-[hsl(174_65%_42%/0.2)] bg-[hsl(174_65%_42%/0.08)]"
          )}>
            {tracker.icon || (tracker.type === 'reduce' ? <TrendingDown className="h-4 w-4 text-neon-warning" /> : <TrendingUp className="h-4 w-4 text-neon" />)}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[15px] truncate leading-tight text-[hsl(210_20%_90%)]">
              {tracker.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[hsl(210_15%_45%)] font-mono">
                {todayCount}<span className="text-[hsl(210_15%_30%)]">/</span>{goal} {tracker.unitPlural}
              </span>
              {isOnTrack && (
                <span className="text-neon-success text-[10px] font-bold uppercase tracking-wider neon-pulse">
                  ✓ ON
                </span>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!isMultiSelectMode && (tracker.inputMode === "binary" || tracker.inputMode === "fixedAmount" || tracker.inputMode === "incremental") && (
              <button
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 border",
                  isCompleted 
                    ? "bg-[hsl(155_70%_50%/0.1)] border-[hsl(155_70%_50%/0.3)] text-neon-success" 
                    : tracker.type === 'reduce'
                      ? "bg-[hsl(38_90%_60%/0.15)] border-[hsl(38_90%_60%/0.3)] text-neon-warning hover:bg-[hsl(38_90%_60%/0.25)] hover:shadow-[0_0_12px_hsl(38_90%_60%/0.2)]"
                      : "bg-[hsl(155_70%_50%/0.15)] border-[hsl(155_70%_50%/0.3)] text-neon-success hover:bg-[hsl(155_70%_50%/0.25)] hover:shadow-[0_0_12px_hsl(155_70%_50%/0.2)]"
                )}
                onClick={handleQuickCheckClick}
                disabled={isCompleted && tracker.inputMode !== "incremental"}
              >
                {tracker.inputMode === "incremental" ? (
                  <span className="text-xs font-bold">+1</span>
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
            )}
            
            {/* Edit/Delete when selected */}
            {isSelected && !isMultiSelectMode && (
              <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
                <button 
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(210_15%_50%)] hover:text-neon transition-colors"
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button 
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(0_70%_60%/0.6)] hover:text-neon-danger transition-colors"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
