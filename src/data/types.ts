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

// Gamification types
export interface UserGamification {
  pontos: number;
  nivel: number;
  conquistas: string[]; // achievement IDs
}

export interface Achievement {
  id: string;
  nome: string;
  descricao: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "streak_7", nome: "7 Dias Seguidos", descricao: "Manteve pelo menos 1 hábito durante 7 dias consecutivos", icon: "🔥" },
  { id: "mes_30", nome: "Mês Completo", descricao: "Pelo menos 1 hábito concluído em 30 dias do mesmo mês", icon: "📅" },
  { id: "tres_habitos_ativos", nome: "Tripla Ameaça", descricao: "3 ou mais hábitos ativos durante um mês inteiro", icon: "⚡" },
  { id: "primeiro_habito", nome: "Primeiro Passo", descricao: "Criaste o teu primeiro hábito", icon: "🌱" },
  { id: "streak_14", nome: "2 Semanas Fortes", descricao: "14 dias consecutivos de hábitos", icon: "💪" },
  { id: "streak_30", nome: "Maratonista", descricao: "30 dias consecutivos de hábitos", icon: "🏆" },
];

// Savings types
export interface SavingsEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  amount: number;
  moeda: string; // default "€"
  descricao: string;
  categoria?: string;
  habitId?: string;
}

export interface UserSavingsSummary {
  totalPoupadoAllTime: number;
  totalPoupadoMesAtual: number;
  numeroEntradasMesAtual: number;
}

// Shopping list types
export interface ShoppingItem {
  id: string;
  weekStartDate: string; // YYYY-MM-DD (Monday of the week)
  nome: string;
  quantidade?: string;
  categoria?: string;
  done: boolean;
}

export interface AppState {
  habits: Habit[];
  dailyLogs: DailyLog[];
  gamification: UserGamification;
  savings: SavingsEntry[];
  shoppingItems: ShoppingItem[];
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

export const SHOPPING_CATEGORIES = [
  "Mercearia",
  "Fresco",
  "Lacticínios",
  "Carne & Peixe",
  "Higiene",
  "Limpeza",
  "Outros",
];

export const SAVINGS_CATEGORIES = [
  "Corte de gastos",
  "Investimento",
  "Poupança",
  "Reembolso",
  "Bónus",
  "Outro",
];
