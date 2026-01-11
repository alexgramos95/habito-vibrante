import { Plus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nContext";
import { Tracker, TrackerEntry } from "@/data/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TrackerQuickAddProps {
  trackers: Tracker[];
  entries: TrackerEntry[];
  onAddEntry: (trackerId: string, quantity?: number) => void;
}

export const TrackerQuickAdd = ({ trackers, entries, onAddEntry }: TrackerQuickAddProps) => {
  const { t, formatCurrency } = useI18n();
  const today = format(new Date(), "yyyy-MM-dd");

  const activeTrackers = trackers.filter(t => t.active).slice(0, 4);

  if (activeTrackers.length === 0) return null;

  const getTrackerStats = (tracker: Tracker) => {
    const todayEntries = entries.filter(e => e.trackerId === tracker.id && e.date === today);
    const todayCount = todayEntries.reduce((sum, e) => sum + e.quantity, 0);
    const goal = tracker.dailyGoal ?? tracker.baseline;
    const isOnTrack = tracker.type === 'reduce' ? todayCount <= goal : todayCount >= goal;
    return { todayCount, goal, isOnTrack };
  };

  return (
    <Card className="premium-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.dashboard.quickTrack}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 grid-cols-2">
          {activeTrackers.map((tracker) => {
            const stats = getTrackerStats(tracker);
            return (
              <Button
                key={tracker.id}
                variant="outline"
                className={cn(
                  "h-auto py-3 px-3 flex-col items-start gap-1 relative overflow-hidden",
                  "hover:bg-secondary/50 transition-all",
                  tracker.type === 'reduce' && !stats.isOnTrack && "border-warning/50"
                )}
                onClick={() => onAddEntry(tracker.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="text-lg">{tracker.icon || (tracker.type === 'reduce' ? '📉' : '📈')}</span>
                  <span className="text-sm font-medium truncate flex-1 text-left">{tracker.name}</span>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                  <span>{stats.todayCount} / {stats.goal}</span>
                  <Badge 
                    variant={stats.isOnTrack ? "default" : "destructive"} 
                    className="h-4 text-[10px] px-1"
                  >
                    {stats.isOnTrack ? "✓" : "!"}
                  </Badge>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};