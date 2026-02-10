import { format, parseISO } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import { Clock, BarChart3, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tracker, TrackerEntry } from "@/data/types";
import { TrackerInputButton, TrackerEntryItem } from "@/components/Trackers/TrackerInputButton";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";

interface TrackerDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracker: Tracker | null;
  todayEntries: TrackerEntry[];
  allEntries: TrackerEntry[];
  summary: {
    todayCount: number;
    todayLoss: number;
    monthlyCount: number;
    monthlyLoss: number;
    daysOnTrack: number;
    average30Days: number;
  } | null;
  onAddEntry: (quantity: number, timestamp?: string) => void;
  onUpdateEntry: (entryId: string, updates: Partial<TrackerEntry>) => void;
  onDeleteEntry: (entryId: string) => void;
  onEdit: () => void;
}

export const TrackerDetailDrawer = ({
  open,
  onOpenChange,
  tracker,
  todayEntries,
  allEntries,
  summary,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onEdit,
}: TrackerDetailDrawerProps) => {
  const { t, locale, formatCurrency } = useI18n();
  const dateLocale = locale === 'pt-PT' ? pt : enUSLocale;
  const today = new Date();

  if (!tracker || !summary) return null;

  const getChartData = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayEntries = allEntries.filter(e => e.trackerId === tracker.id && e.date === dateStr);
      const count = dayEntries.reduce((sum, e) => sum + e.quantity, 0);
      days.push({
        date: dateStr,
        value: count,
        goal: tracker.dailyGoal ?? tracker.baseline,
      });
    }
    return days;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-2xl bg-[hsl(220_30%_8%)] border-t border-[hsl(174_65%_42%/0.2)] text-[hsl(210_20%_90%)]"
      >
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-[hsl(210_20%_92%)]">
              <span className="text-xl">{tracker.icon}</span>
              {tracker.name}
            </SheetTitle>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-[hsl(210_15%_50%)] hover:text-neon"
              onClick={onEdit}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(85vh-80px)] pr-4">
          <div className="space-y-4 pb-6">
            {/* Quick Add */}
            <div className="hud-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="hud-section-label flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-neon" />
                  {t.dashboard.today}
                </span>
                <span className="hud-badge">
                  {summary.todayCount} / {tracker.dailyGoal ?? tracker.baseline}
                </span>
              </div>
              
              <TrackerInputButton
                tracker={tracker}
                todayCount={summary.todayCount}
                onAddEntry={onAddEntry}
                className="h-12"
              />

              {tracker.type === 'reduce' && summary.todayLoss > 0 && (
                <div className="text-center p-2 mt-3 rounded-lg bg-[hsl(0_70%_60%/0.1)] border border-[hsl(0_70%_60%/0.2)]">
                  <p className="text-neon-danger text-sm font-medium">
                    {t.trackers.todayLoss.replace("{{amount}}", formatCurrency(summary.todayLoss))}
                  </p>
                </div>
              )}

              {todayEntries.length > 0 && (
                <div className="space-y-2 mt-3">
                  <h4 className="hud-section-label">{t.objectives.timeline}</h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {todayEntries.map((entry) => (
                      <TrackerEntryItem
                        key={entry.id}
                        entry={entry}
                        tracker={tracker}
                        onUpdate={onUpdateEntry}
                        onDelete={onDeleteEntry}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid gap-3 grid-cols-2">
              <div className="hud-stat">
                <p className="hud-stat-value text-neon">{summary.daysOnTrack}</p>
                <p className="hud-stat-label">{t.trackers.daysOnTrack}</p>
              </div>
              <div className="hud-stat">
                <p className="hud-stat-value text-[hsl(210_20%_85%)]">{summary.average30Days.toFixed(1)}</p>
                <p className="hud-stat-label">{t.trackers.average30Days}</p>
              </div>
              <div className="hud-stat">
                <p className={cn(
                  "hud-stat-value",
                  tracker.type === 'reduce' ? "text-neon-danger" : "text-neon-success"
                )}>
                  {tracker.type === 'reduce' 
                    ? formatCurrency(summary.monthlyLoss) 
                    : formatCurrency(0)}
                </p>
                <p className="hud-stat-label">
                  {tracker.type === 'reduce' ? t.trackers.monthLoss : t.trackers.monthSavings}
                </p>
              </div>
              <div className="hud-stat">
                <p className="hud-stat-value text-[hsl(210_20%_85%)]">{summary.monthlyCount}</p>
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
                <AreaChart data={getChartData()}>
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
                    stroke={tracker.type === 'reduce' ? "hsl(38 90% 60%)" : "hsl(155 70% 50%)"}
                    fill={tracker.type === 'reduce' ? "hsl(38 90% 60% / 0.15)" : "hsl(155 70% 50% / 0.15)"}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
