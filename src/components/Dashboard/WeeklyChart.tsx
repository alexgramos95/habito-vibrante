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
}

const CustomTooltip = ({ active, payload, label }: any) => {
  const { t } = useI18n();
  
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong rounded-xl px-4 py-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">
          {t.chart.week} {label}
        </p>
        <p className="text-lg font-bold text-primary">
          {payload[0].value} {t.chart.daysCompleted}
        </p>
      </div>
    );
  }
  return null;
};

export const WeeklyChart = ({ data }: WeeklyChartProps) => {
  const chartData = data.map((week) => ({
    name: week.weekLabel,
    value: week.totalDone,
    total: week.totalPossible,
  }));

  const maxValue = Math.max(...data.map((d) => d.totalPossible), 7);

  return (
    <div className="h-64 w-full fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(174 72% 46%)" stopOpacity={0.4} />
              <stop offset="50%" stopColor="hsl(174 72% 46%)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="hsl(174 72% 46%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(174 72% 46%)" />
              <stop offset="100%" stopColor="hsl(186 78% 42%)" />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(220 35% 14%)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke="hsl(215 20% 40%)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(215 20% 40%)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[0, maxValue]}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="url(#strokeGradient)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorValue)"
            dot={{
              fill: "hsl(174 72% 46%)",
              stroke: "hsl(220 45% 8%)",
              strokeWidth: 3,
              r: 5,
            }}
            activeDot={{
              fill: "hsl(174 72% 50%)",
              stroke: "hsl(220 45% 8%)",
              strokeWidth: 3,
              r: 8,
              className: "drop-shadow-lg",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
