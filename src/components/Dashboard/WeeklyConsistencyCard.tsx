import { Target, Zap, RefreshCw, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeeklyStats } from "@/data/types";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";

interface WeeklyConsistencyCardProps {
  stats: WeeklyStats;
}

export const WeeklyConsistencyCard = ({ stats }: WeeklyConsistencyCardProps) => {
  const { t } = useI18n();
  
  const signalConfig = {
    consistent: {
      icon: Target,
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/30",
    },
    recovered: {
      icon: RefreshCw,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/30",
    },
    bounceback: {
      icon: Zap,
      color: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/30",
    },
    building: {
      icon: TrendingUp,
      color: "text-muted-foreground",
      bg: "bg-secondary/50",
      border: "border-border/30",
    },
  };
  
  const config = signalConfig[stats.signal];
  const Icon = config.icon;
  
  return (
    <Card className={cn("premium-card group transition-all duration-300", config.border)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", config.bg)}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            {t.bounceback.weeklyConsistency}
          </div>
          <Badge variant="outline" className={cn("text-xs", config.color)}>
            {t.bounceback.signals[stats.signal]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-1">
          <span className={cn("text-3xl font-bold", config.color)}>
            {stats.consistency}%
          </span>
          <span className="text-sm text-muted-foreground">
            {t.bounceback.thisWeek}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-success/10">
            <p className="text-lg font-bold text-success">{stats.wins}</p>
            <p className="text-xs text-muted-foreground">{t.bounceback.win}</p>
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <p className="text-lg font-bold text-primary">{stats.bouncebacks}</p>
            <p className="text-xs text-muted-foreground">{t.bounceback.recovered}</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10">
            <p className="text-lg font-bold text-destructive">{stats.misses}</p>
            <p className="text-xs text-muted-foreground">{t.bounceback.miss}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
