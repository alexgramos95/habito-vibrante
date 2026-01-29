import { format, parseISO } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import { Clock, BarChart3, Settings2, TrendingDown, TrendingUp, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // Chart data
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
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-xl">{tracker.icon}</span>
              {tracker.name}
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={onEdit}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(85vh-80px)] pr-4">
          <div className="space-y-4 pb-6">
            {/* Quick Add */}
            <Card className="glass border-border/30">
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    {t.dashboard.today}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {summary.todayCount} / {tracker.dailyGoal ?? tracker.baseline}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-3">
                <TrackerInputButton
                  tracker={tracker}
                  todayCount={summary.todayCount}
                  onAddEntry={onAddEntry}
                  className="h-12"
                />

                {/* Show loss for reduction trackers */}
                {tracker.type === 'reduce' && summary.todayLoss > 0 && (
                  <div className="text-center p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                    <p className="text-destructive text-sm font-medium">
                      {t.trackers.todayLoss.replace("{{amount}}", formatCurrency(summary.todayLoss))}
                    </p>
                  </div>
                )}

                {/* Timeline */}
                {todayEntries.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">{t.objectives.timeline}</h4>
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
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-3 grid-cols-2">
              <Card className="glass border-border/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold text-primary">{summary.daysOnTrack}</p>
                  <p className="text-[10px] text-muted-foreground">{t.trackers.daysOnTrack}</p>
                </CardContent>
              </Card>
              <Card className="glass border-border/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{summary.average30Days.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">{t.trackers.average30Days}</p>
                </CardContent>
              </Card>
              <Card className="glass border-border/30">
                <CardContent className="p-3 text-center">
                  <p className={cn(
                    "text-xl font-bold",
                    tracker.type === 'reduce' ? "text-destructive" : "text-success"
                  )}>
                    {tracker.type === 'reduce' 
                      ? formatCurrency(summary.monthlyLoss) 
                      : formatCurrency(0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {tracker.type === 'reduce' ? t.trackers.monthLoss : t.trackers.monthSavings}
                  </p>
                </CardContent>
              </Card>
              <Card className="glass border-border/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{summary.monthlyCount}</p>
                  <p className="text-[10px] text-muted-foreground">{t.dashboard.thisMonth}</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card className="glass border-border/30">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {t.objectives.monthlyChart}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => format(parseISO(val), "d", { locale: dateLocale })}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelFormatter={(val) => format(parseISO(val as string), "d MMM", { locale: dateLocale })}
                    />
                    <Area
                      type="monotone"
                      dataKey="goal"
                      stroke="hsl(var(--muted-foreground))"
                      fill="transparent"
                      strokeDasharray="5 5"
                      strokeWidth={1}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={tracker.type === 'reduce' ? "hsl(var(--warning))" : "hsl(var(--success))"}
                      fill={tracker.type === 'reduce' ? "hsl(var(--warning) / 0.2)" : "hsl(var(--success) / 0.2)"}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
