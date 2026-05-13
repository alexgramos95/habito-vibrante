import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";
import { pt, enUS } from "date-fns/locale";
import {
  Flame, Trophy, TrendingUp, Target, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Navigation } from "@/components/Layout/Navigation";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/i18n/I18nContext";
import { useData } from "@/contexts/DataContext";
import { getLevelProgress } from "@/logic/computations";
import { ACHIEVEMENTS } from "@/data/types";
import { cn } from "@/lib/utils";

const LevelProgress = () => {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const { state } = useData();
  const isPt = locale === "pt-PT";
  const dfLocale = isPt ? pt : enUS;

  const levelProgress = getLevelProgress(state.gamification.pontos);
  const activeHabits = state.habits.filter((h) => h.active);
  const unlocked = ACHIEVEMENTS.filter((a) =>
    state.gamification.conquistas.includes(a.id),
  );

  // ─── 30 day points chart ───
  const pointsLast30Days = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 29), end: today });
    return days.map((day) => {
      const dStr = format(day, "yyyy-MM-dd");
      const logs = state.dailyLogs.filter((l) => l.date === dStr && l.done);
      const points = logs.reduce((sum, l) => sum + (l.isLate ? 5 : 10), 0);
      return {
        date: format(day, "dd/MM"),
        rawDate: dStr,
        points,
      };
    });
  }, [state.dailyLogs]);

  const totalPoints30d = pointsLast30Days.reduce((s, d) => s + d.points, 0);
  const avgPoints30d = Math.round(totalPoints30d / 30);

  // ─── Weekly completions (last 8 weeks) ───
  const weeklyCompletions = useMemo(() => {
    const today = new Date();
    const weeks: { label: string; done: number; possible: number; pct: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const ref = subDays(today, i * 7);
      const start = startOfWeek(ref, { weekStartsOn: 1 });
      const end = endOfWeek(ref, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end });

      let done = 0;
      let possible = 0;
      for (const day of days) {
        const dStr = format(day, "yyyy-MM-dd");
        const dow = day.getDay();
        const scheduled = activeHabits.filter((h) => {
          if (h.mode === "metric") return false;
          if (!h.scheduledDays || h.scheduledDays.length === 0) return true;
          return h.scheduledDays.includes(dow);
        });
        possible += scheduled.length;
        for (const h of scheduled) {
          const log = state.dailyLogs.find(
            (l) => l.habitId === h.id && l.date === dStr && l.done,
          );
          if (log) done += log.isLate ? 0.5 : 1;
        }
      }
      weeks.push({
        label: format(start, "dd/MM", { locale: dfLocale }),
        done: Math.round(done * 10) / 10,
        possible,
        pct: possible > 0 ? Math.round((done / possible) * 100) : 0,
      });
    }
    return weeks;
  }, [state.dailyLogs, activeHabits, dfLocale]);

  // ─── Streak data ───
  const streakData = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 29), end: today });
    return days.map((day) => {
      const dStr = format(day, "yyyy-MM-dd");
      const hasAny = state.dailyLogs.some((l) => l.date === dStr && l.done);
      return {
        date: format(day, "dd/MM"),
        active: hasAny ? 1 : 0,
      };
    });
  }, [state.dailyLogs]);

  return (
    <div className="page-container">
      <Navigation />

      <main className="page-content max-w-2xl mx-auto space-y-5">
        <PageHeader
          title={isPt ? "A tua evolução" : "Your evolution"}
          subtitle={isPt ? "A história de quem te estás a tornar." : "The story of who you are becoming."}
          backTo="/app/profile"
          backLabel={isPt ? "Voltar" : "Back"}
        />

        {/* Hero level card — calmer, identity-led */}
        <div className="rounded-2xl border border-foreground/[0.08] bg-card/60 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/80">
                LV.{levelProgress.current}
              </p>
              <p className="text-2xl font-semibold tracking-tight text-foreground mt-1">
                {isPt
                  ? ["A tornares-te consistente","A construir estrutura","A encontrar o teu ritmo","A identidade a emergir","A tornares-te quem és","A viver isso"][Math.min(levelProgress.current - 1, 5)]
                  : ["Becoming consistent","Building structure","Finding rhythm","Identity emerging","Becoming who you are","Living it"][Math.min(levelProgress.current - 1, 5)]}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isPt
                  ? `${state.gamification.pontos} pontos ganhos através de consistência`
                  : `${state.gamification.pontos} points earned through consistency`}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {isPt ? "Próxima evolução" : "Next evolution"}
              </span>
              <span className="font-mono text-muted-foreground">
                {isPt ? `${levelProgress.pointsToNext} pontos` : `${levelProgress.pointsToNext} points`}
              </span>
            </div>
            <Progress value={levelProgress.progress} className="h-1.5" />
          </div>
        </div>

        {/* Quiet identity tiles */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            icon={<Flame className="h-3.5 w-3.5" />}
            label={isPt ? "Dias em movimento" : "Days in motion"}
            value={state.gamification.currentStreak || 0}
            color="primary"
          />
          <StatTile
            icon={<Trophy className="h-3.5 w-3.5" />}
            label={isPt ? "Melhor sequência" : "Longest stretch"}
            value={state.gamification.bestStreak || 0}
            color="warning"
          />
          <StatTile
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label={isPt ? "Marcos" : "Milestones"}
            value={unlocked.length}
            color="success"
          />
        </div>

        {/* ─── 30-day rhythm (atmospheric area) ─── */}
        <ChartCard
          title={isPt ? "Ritmo recente" : "Recent rhythm"}
          subtitle={isPt ? "Últimos 30 dias" : "Last 30 days"}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        >
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={pointsLast30Days} margin={{ top: 10, right: 4, left: -35, bottom: 0 }}>
              <defs>
                <linearGradient id="pointsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={(v: number) => [`${v} pts`, isPt ? "Pontos" : "Points"]}
              />
              <Area
                type="monotone"
                dataKey="points"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                fill="url(#pointsGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ─── Weekly consistency — softer bars ─── */}
        <ChartCard
          title={isPt ? "Consistência semanal" : "Weekly consistency"}
          subtitle={isPt ? "Mostraste-te." : "You showed up."}
          icon={<Target className="h-3.5 w-3.5" />}
        >
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyCompletions} margin={{ top: 10, right: 4, left: -35, bottom: 0 }}>
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={(_: number, __: string, item: any) => [
                  `${item.payload.pct}% · ${item.payload.done}/${item.payload.possible}`,
                  isPt ? "Concluído" : "Done",
                ]}
              />
              <Bar dataKey="pct" fill="hsl(var(--primary) / 0.6)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ─── Proof of presence — organic dots ─── */}
        <ChartCard
          title={isPt ? "Prova de presença" : "Proof of presence"}
          subtitle={
            isPt
              ? `${streakData.filter((d) => d.active).length} / 30 dias`
              : `${streakData.filter((d) => d.active).length} / 30 days`
          }
          icon={<Flame className="h-3.5 w-3.5" />}
        >
          <div className="grid grid-cols-10 gap-2 py-1">
            {streakData.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-full transition-all",
                  d.active
                    ? "bg-primary/70 shadow-[0_0_8px_hsl(var(--primary)/0.45)]"
                    : "bg-foreground/[0.06]",
                )}
                title={`${d.date}: ${d.active ? (isPt ? "presente" : "present") : (isPt ? "ausente" : "absent")}`}
              />
            ))}
          </div>
        </ChartCard>

        {/* ─── Milestones (formerly achievements) ─── */}
        <ChartCard
          title={isPt ? "Marcos de evolução" : "Milestones in evolution"}
          subtitle={`${unlocked.length} / ${ACHIEVEMENTS.length}`}
          icon={<Trophy className="h-3.5 w-3.5" />}
        >
          <div className="grid grid-cols-2 gap-2">
            {ACHIEVEMENTS.map((a) => {
              const isUnlocked = state.gamification.conquistas.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2.5 transition-colors",
                    isUnlocked
                      ? "border-primary/20 bg-primary/[0.04]"
                      : "border-border/20 bg-muted/10 opacity-50",
                  )}
                >
                  <span className="text-lg">{a.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{a.nome}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {a.descricao}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </main>
    </div>
  );
};

// ─── Helpers ───
const StatTile = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "primary" | "warning" | "success";
}) => {
  const colorClasses = {
    primary: "border-primary/15 bg-primary/5 text-primary",
    warning: "border-warning/15 bg-warning/5 text-warning",
    success: "border-success/15 bg-success/5 text-success",
  };
  return (
    <div className={cn("rounded-xl border p-3 text-center", colorClasses[color])}>
      <div className="flex items-center justify-center gap-1 mb-1">
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
};

const ChartCard = ({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-border/30 bg-card/50 p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {subtitle && (
        <span className="text-[10px] text-muted-foreground font-mono">{subtitle}</span>
      )}
    </div>
    {children}
  </div>
);

export default LevelProgress;
