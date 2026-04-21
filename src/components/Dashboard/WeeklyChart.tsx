import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useI18n } from "@/i18n/I18nContext";
import { WeeklySummary } from "@/data/types";

interface WeeklyChartProps {
  data: WeeklySummary[];
  onWeekClick?: (weekNumber: number) => void;
}

/**
 * WeeklyChart — Arcade Overdrive
 * Toxic-green signal, void grid.
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  const { t } = useI18n();

  if (active && payload && payload.length) {
    return (
      <div className="border-2 border-primary/60 bg-card px-3 py-2 shadow-[3px_3px_0_0_hsl(var(--neon-ultra))]">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {t.chart.week} {label}
        </p>
        <p className="font-black italic uppercase tracking-tighter text-lg text-primary">
          {payload[0].value} <span className="text-xs font-mono normal-case">{t.chart.daysCompleted}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const WeeklyChart = ({ data, onWeekClick }: WeeklyChartProps) => {
  const chartData = data.map((week) => ({
    name: week.weekLabel,
    value: week.totalDone,
    total: week.totalPossible,
    weekNumber: week.weekNumber,
  }));

  const maxValue = Math.max(...data.map((d) => d.totalPossible), 7);

  const handleClick = (data: any) => {
    if (onWeekClick && data && data.activePayload && data.activePayload[0]) {
      const weekNumber = data.activePayload[0].payload.weekNumber;
      onWeekClick(weekNumber);
    }
  };

  return (
    <div className="h-64 w-full fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          onClick={handleClick}
          style={{ cursor: onWeekClick ? "pointer" : "default" }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--neon-toxic))" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(var(--neon-toxic))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--foreground) / 0.08)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            style={{ fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase" }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            domain={[0, maxValue]}
            tickFormatter={(value) => `${value}`}
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--neon-toxic))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
            dot={{
              fill: "hsl(var(--neon-toxic))",
              stroke: "hsl(var(--background))",
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{
              fill: "hsl(var(--neon-toxic))",
              stroke: "hsl(var(--background))",
              strokeWidth: 3,
              r: 7,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
