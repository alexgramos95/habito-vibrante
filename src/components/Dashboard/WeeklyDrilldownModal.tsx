import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, X, Flame, TrendingUp, Target } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { pt, enUS as enUSLocale } from "date-fns/locale";
import { AppState, Habit, Tracker, TrackerEntry, WeeklySummary } from "@/data/types";
import { cn } from "@/lib/utils";

interface WeeklyDrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekSummary: WeeklySummary;
  weekNumber: number;
  year: number;
  month: number;
  state: AppState;
  locale: string;
}

export const WeeklyDrilldownModal = ({
  open,
  onOpenChange,
  weekSummary,
  weekNumber,
  year,
  month,
  state,
  locale,
}: WeeklyDrilldownModalProps) => {
  const dateLocale = locale === 'pt-PT' ? pt : enUSLocale;
  
  // Calculate the week start date based on weekNumber (1-5) and month
  const monthStart = new Date(year, month, 1);
  const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const weekStart = addDays(firstWeekStart, (weekNumber - 1) * 7);
  
  // Generate 7 days for this week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Filter days that are in the target month
  const daysInMonth = weekDays.filter(d => d.getMonth() === month);
  
  const activeHabits = state.habits.filter(h => h.active);
  const activeTrackers = (state.trackers || []).filter(t => t.active);

  const getDayData = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    // Get habits completed
    const habitsCompleted = activeHabits.filter(habit => 
      state.dailyLogs.some(l => l.habitId === habit.id && l.date === dateStr && l.done)
    );
    
    // Get tracker entries
    const trackerEntries = (state.trackerEntries || []).filter(e => e.date === dateStr);
    
    return {
      date,
      dateStr,
      habitsCompleted,
      totalHabits: activeHabits.length,
      trackerEntries,
      isComplete: habitsCompleted.length === activeHabits.length && activeHabits.length > 0,
    };
  };

  const daysData = daysInMonth.map(getDayData);
  
  // Calculate week stats
  const totalPossible = daysData.length * activeHabits.length;
  const totalCompleted = daysData.reduce((sum, d) => sum + d.habitsCompleted.length, 0);
  const consistencyPercent = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  
  // Calculate streak within the week
  let weekStreak = 0;
  for (const day of daysData) {
    if (day.isComplete) {
      weekStreak++;
    } else {
      weekStreak = 0;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {locale === 'pt-PT' ? 'Semana' : 'Week'} {weekNumber}
            <Badge variant="outline" className="ml-2">
              {format(daysInMonth[0] || weekStart, "d MMM", { locale: dateLocale })} - {format(daysInMonth[daysInMonth.length - 1] || weekStart, "d MMM", { locale: dateLocale })}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Week Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-primary/10">
              <p className="text-2xl font-bold text-primary">{consistencyPercent}%</p>
              <p className="text-xs text-muted-foreground">
                {locale === 'pt-PT' ? 'Consistência' : 'Consistency'}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-warning/10">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-5 w-5 text-warning" />
                <span className="text-2xl font-bold text-warning">{weekStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {locale === 'pt-PT' ? 'Streak' : 'Streak'}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-success/10">
              <p className="text-2xl font-bold text-success">{totalCompleted}/{totalPossible}</p>
              <p className="text-xs text-muted-foreground">
                {locale === 'pt-PT' ? 'Completos' : 'Completed'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {locale === 'pt-PT' ? 'Progresso da Semana' : 'Week Progress'}
              </span>
              <span className="font-medium">{consistencyPercent}%</span>
            </div>
            <Progress value={consistencyPercent} className="h-2" />
          </div>

          {/* Day by Day Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              {locale === 'pt-PT' ? 'Dias da Semana' : 'Days of Week'}
            </h4>
            
            <div className="space-y-2">
              {daysData.map((day) => (
                <div
                  key={day.dateStr}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                    day.isComplete 
                      ? "bg-success/10 border-success/30" 
                      : "bg-secondary/50 border-border/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                      day.isComplete ? "bg-success text-success-foreground" : "bg-muted"
                    )}>
                      {format(day.date, "d")}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {format(day.date, "EEEE", { locale: dateLocale })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {day.habitsCompleted.length}/{day.totalHabits} {locale === 'pt-PT' ? 'hábitos' : 'habits'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {day.trackerEntries.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {day.trackerEntries.reduce((sum, e) => sum + e.quantity, 0)} {locale === 'pt-PT' ? 'registos' : 'entries'}
                      </Badge>
                    )}
                    {day.isComplete ? (
                      <Check className="h-5 w-5 text-success" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Habits Breakdown */}
          {activeHabits.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                {locale === 'pt-PT' ? 'Hábitos esta semana' : 'Habits this week'}
              </h4>
              <div className="space-y-2">
                {activeHabits.map(habit => {
                  const completedDays = daysData.filter(d => 
                    d.habitsCompleted.some(h => h.id === habit.id)
                  ).length;
                  const habitPercent = Math.round((completedDays / daysData.length) * 100);
                  
                  return (
                    <div key={habit.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: habit.cor || '#888' }}
                      />
                      <span className="flex-1 text-sm">{habit.nome}</span>
                      <span className="text-sm text-muted-foreground">
                        {completedDays}/{daysData.length}
                      </span>
                      <Badge 
                        variant={habitPercent >= 80 ? "default" : habitPercent >= 50 ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {habitPercent}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};