export interface Habit {
  id: string;
  nome: string;
  categoria?: string;
  cor?: string;
  active: boolean;
  createdAt: string;
}

export interface DailyLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD format
  done: boolean;
}

export interface WeeklySummary {
  weekNumber: 1 | 2 | 3 | 4 | 5;
  weekLabel: string;
  totalDone: number;
  totalPossible: number;
}

export interface MonthlySummary {
  totalDone: number;
  totalPossible: number;
  streakAtual: number;
  melhorStreak: number;
  progressoMensal: number;
  habitosAtivos: number;
  habitosTotal: number;
}

export interface AppState {
  habits: Habit[];
  dailyLogs: DailyLog[];
}

export const DEFAULT_COLORS = [
  "#14b8a6", // teal
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
];

export const DEFAULT_CATEGORIES = [
  "Saúde",
  "Exercício",
  "Produtividade",
  "Aprendizagem",
  "Mindfulness",
  "Social",
  "Finanças",
  "Criatividade",
];
