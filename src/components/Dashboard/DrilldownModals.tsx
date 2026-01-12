import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { 
  Flame, Trophy, TrendingUp, PiggyBank, Activity, Calendar, 
  X, ChevronRight, ArrowUpRight, ArrowDownRight 
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription 
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { AppState, Tracker, TrackerEntry, MonthlySummary } from "@/data/types";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar 
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface StreakDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStreak: number;
  bestStreak: number;
  dailyLogs: AppState['dailyLogs'];
  habits: AppState['habits'];
}

export const StreakDrilldown = ({ 
  open, onOpenChange, currentStreak, bestStreak, dailyLogs, habits 
}: StreakDrilldownProps) => {
  const { t, formatDate, locale } = useI18n();
  const isMobile = useIsMobile();
  
  // Build streak history (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const logsForDay = dailyLogs.filter(log => log.date === dateStr && log.done);
    const activeHabits = habits.filter(h => h.active);
    const allDone = activeHabits.length > 0 && logsForDay.length >= activeHabits.length;
    return {
      date: dateStr,
      label: format(date, "dd"),
      isComplete: allDone,
      count: logsForDay.length,
      total: activeHabits.length,
    };
  });

  // Calculate streaks from history
  const streakHistory: { start: string; length: number }[] = [];
  let currentRun = 0;
  let runStart = "";
  
  last30Days.forEach((day, i) => {
    if (day.isComplete) {
      if (currentRun === 0) runStart = day.date;
      currentRun++;
    } else {
      if (currentRun > 0) {
        streakHistory.push({ start: runStart, length: currentRun });
      }
      currentRun = 0;
    }
    if (i === last30Days.length - 1 && currentRun > 0) {
      streakHistory.push({ start: runStart, length: currentRun });
    }
  });

  const Content = (
    <div className="space-y-6">
      {/* Current vs Best */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 text-center">
            <Flame className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-3xl font-bold">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">{t.kpis.currentStreak}</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-4 text-center">
            <Trophy className="h-8 w-8 mx-auto text-warning mb-2" />
            <p className="text-3xl font-bold">{bestStreak}</p>
            <p className="text-xs text-muted-foreground">{t.kpis.bestStreak}</p>
          </CardContent>
        </Card>
      </div>

      {/* 30-Day Chart */}
      <div>
        <h4 className="text-sm font-medium mb-3">{t.objectives.history} (30 {t.kpis.days})</h4>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last30Days}>
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10 }} 
                interval={4}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload?.[0]) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                        <p className="font-medium">{formatDate(new Date(data.date), locale === 'pt-PT' ? "d MMM" : "MMM d")}</p>
                        <p>{data.count}/{data.total} {t.habits.title.toLowerCase()}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--primary))" 
                radius={[2, 2, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Streaks */}
      {streakHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Streaks Recentes</h4>
          <div className="space-y-2">
            {streakHistory.slice(-5).reverse().map((streak, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">
                  {formatDate(new Date(streak.start), locale === 'pt-PT' ? "d MMM" : "MMM d")}
                </span>
                <Badge variant={i === 0 ? "default" : "secondary"}>
                  {streak.length} {t.kpis.days}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              {t.kpis.currentStreak}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-4 pr-4">
            {Content}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            {t.kpis.currentStreak}
          </DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
};

interface ConsistencyDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consistencyScore: number;
  habits: AppState['habits'];
  dailyLogs: AppState['dailyLogs'];
  month: number;
  year: number;
}

export const ConsistencyDrilldown = ({ 
  open, onOpenChange, consistencyScore, habits, dailyLogs, month, year 
}: ConsistencyDrilldownProps) => {
  const { t, formatDate, locale } = useI18n();
  const isMobile = useIsMobile();

  // Calculate per-habit consistency
  const startDate = startOfMonth(new Date(year, month));
  const endDate = new Date() < endOfMonth(startDate) ? new Date() : endOfMonth(startDate);
  const daysInPeriod = eachDayOfInterval({ start: startDate, end: endDate }).length;
  
  const habitStats = habits
    .filter(h => h.active)
    .map(habit => {
      const completedDays = dailyLogs.filter(
        log => log.habitId === habit.id && log.done
      ).length;
      const percentage = daysInPeriod > 0 ? Math.round((completedDays / daysInPeriod) * 100) : 0;
      return {
        id: habit.id,
        name: habit.nome,
        color: habit.cor || '#14b8a6',
        completedDays,
        totalDays: daysInPeriod,
        percentage,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  const Content = (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card className="bg-success/5 border-success/20">
        <CardContent className="pt-4 text-center">
          <TrendingUp className="h-8 w-8 mx-auto text-success mb-2" />
          <p className="text-4xl font-bold">{consistencyScore}%</p>
          <p className="text-sm text-muted-foreground">{t.kpis.consistency}</p>
        </CardContent>
      </Card>

      {/* Per-Habit Breakdown */}
      <div>
        <h4 className="text-sm font-medium mb-3">{t.finances.trackerBreakdown}</h4>
        <div className="space-y-3">
          {habitStats.map(stat => (
            <div key={stat.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: stat.color }}
                  />
                  <span>{stat.name}</span>
                </div>
                <span className="font-medium">{stat.percentage}%</span>
              </div>
              <Progress 
                value={stat.percentage} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground text-right">
                {stat.completedDays} {t.common.of} {stat.totalDays} {t.kpis.days}
              </p>
            </div>
          ))}
        </div>
      </div>

      {habitStats.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">
          {t.habits.noHabits}
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              {t.kpis.consistency}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-4 pr-4">
            {Content}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            {t.kpis.consistency}
          </DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
};

interface TrackersDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackers: Tracker[];
  entries: TrackerEntry[];
  formatCurrency: (value: number) => string;
}

export const TrackersDrilldown = ({ 
  open, onOpenChange, trackers, entries, formatCurrency 
}: TrackersDrilldownProps) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Calculate per-tracker stats
  const trackerStats = trackers
    .filter(t => t.active)
    .map(tracker => {
      const monthEntries = entries.filter(e => {
        if (e.trackerId !== tracker.id) return false;
        const date = new Date(e.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
      
      const todayEntries = entries.filter(e => e.trackerId === tracker.id && e.date === today);
      const todayCount = todayEntries.reduce((sum, e) => sum + e.quantity, 0);
      
      const daysInMonth = new Date().getDate();
      const monthBaseline = tracker.baseline * daysInMonth;
      const monthActual = monthEntries.reduce((sum, e) => sum + e.quantity, 0);
      
      let monthlySavings = 0;
      if (tracker.type === 'reduce' && tracker.valuePerUnit > 0) {
        monthlySavings = Math.max(0, (monthBaseline - monthActual) * tracker.valuePerUnit);
      }
      
      const onTrack = tracker.type === 'reduce' 
        ? todayCount <= (tracker.dailyGoal || tracker.baseline)
        : todayCount >= (tracker.dailyGoal || 0);

      return {
        id: tracker.id,
        name: tracker.name,
        icon: tracker.icon,
        type: tracker.type,
        todayCount,
        goal: tracker.dailyGoal,
        baseline: tracker.baseline,
        monthlySavings,
        onTrack,
        unit: tracker.unitPlural || tracker.unitSingular,
      };
    })
    .sort((a, b) => b.monthlySavings - a.monthlySavings);

  const totalMonthlySavings = trackerStats.reduce((sum, t) => sum + t.monthlySavings, 0);
  const topSource = trackerStats[0];

  const Content = (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{formatCurrency(totalMonthlySavings)}</p>
            <p className="text-xs text-muted-foreground">{t.finances.monthlySavings}</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{trackerStats.length}</p>
            <p className="text-xs text-muted-foreground">{t.finances.activeTrackers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Source */}
      {topSource && topSource.monthlySavings > 0 && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/20">
          <p className="text-xs text-muted-foreground mb-1">{t.finances.topSource}</p>
          <div className="flex items-center justify-between">
            <span className="font-medium">{topSource.name}</span>
            <span className="text-success font-bold">{formatCurrency(topSource.monthlySavings)}</span>
          </div>
        </div>
      )}

      {/* Per-Tracker Breakdown */}
      <div>
        <h4 className="text-sm font-medium mb-3">{t.trackers.title}</h4>
        <div className="space-y-2">
          {trackerStats.map(stat => (
            <div 
              key={stat.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{stat.icon}</span>
                <div>
                  <p className="text-sm font-medium">{stat.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {stat.todayCount} {stat.unit} hoje
                    {stat.goal && ` (meta: ${stat.goal})`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {stat.monthlySavings > 0 && (
                  <p className="text-sm font-medium text-success">
                    +{formatCurrency(stat.monthlySavings)}
                  </p>
                )}
                <Badge 
                  variant={stat.onTrack ? "default" : "destructive"} 
                  className="text-xs mt-1"
                >
                  {stat.onTrack ? t.trackers.onTrack : t.trackers.offTrack}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {trackerStats.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">
          {t.trackers.noTrackers}
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t.trackers.title}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-4 pr-4">
            {Content}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t.trackers.title}
          </DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
};

interface SavingsDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savingsSummary: {
    totalPoupadoMesAtual: number;
    totalPoupadoAllTime: number;
  };
  savings: AppState['savings'];
  formatCurrency: (value: number) => string;
}

export const SavingsDrilldown = ({ 
  open, onOpenChange, savingsSummary, savings, formatCurrency 
}: SavingsDrilldownProps) => {
  const { t, formatDate, locale } = useI18n();
  const isMobile = useIsMobile();

  // Build monthly evolution chart (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const monthSavings = (savings || []).filter(s => {
      const sDate = new Date(s.date);
      return sDate.getMonth() === month && sDate.getFullYear() === year;
    }).reduce((sum, s) => sum + s.amount, 0);
    
    return {
      month: format(date, locale === 'pt-PT' ? 'MMM' : 'MMM'),
      value: monthSavings,
    };
  });

  // Recent entries
  const recentSavings = (savings || [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const Content = (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-success">
              {formatCurrency(savingsSummary.totalPoupadoMesAtual)}
            </p>
            <p className="text-xs text-muted-foreground">{t.dashboard.thisMonth}</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">
              {formatCurrency(savingsSummary.totalPoupadoAllTime)}
            </p>
            <p className="text-xs text-muted-foreground">{t.finances.allTime}</p>
          </CardContent>
        </Card>
      </div>

      {/* Evolution Chart */}
      <div>
        <h4 className="text-sm font-medium mb-3">{t.finances.cumulativeSavings}</h4>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10 }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload?.[0]) {
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                        <p className="font-medium">{formatCurrency(payload[0].value as number)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--success))" 
                fill="url(#savingsGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Entries */}
      {recentSavings.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">{t.progress.recentSavings}</h4>
          <div className="space-y-2">
            {recentSavings.map((entry, i) => (
              <div 
                key={entry.id || i} 
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="text-sm">{entry.descricao || t.finances.savings}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(new Date(entry.date), locale === 'pt-PT' ? "d MMM" : "MMM d")}
                  </p>
                </div>
                <span className={`font-medium ${entry.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentSavings.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">
          {t.finances.noSavings}
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-success" />
              {t.dashboard.piggyBank}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-4 pr-4">
            {Content}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-success" />
            {t.dashboard.piggyBank}
          </DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
};
