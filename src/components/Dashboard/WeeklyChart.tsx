import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { translations } from "@/i18n/translations.pt";
import { WeeklySummary } from "@/data/types";

interface WeeklyChartProps {
  data: WeeklySummary[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-foreground">
          {translations.chart.week} {label}: {payload[0].value}{" "}
          {translations.chart.daysCompleted}
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
    <div className="h-64 w-full animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(174 72% 46%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(174 72% 46%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(220 35% 18%)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke="hsl(215 20% 55%)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(215 20% 55%)"
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
            stroke="hsl(174 72% 46%)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorValue)"
            dot={{
              fill: "hsl(174 72% 46%)",
              stroke: "hsl(220 45% 10%)",
              strokeWidth: 2,
              r: 5,
            }}
            activeDot={{
              fill: "hsl(174 72% 46%)",
              stroke: "hsl(220 45% 10%)",
              strokeWidth: 3,
              r: 7,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
