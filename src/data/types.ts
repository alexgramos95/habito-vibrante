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

// Tobacco tracking types
export interface TobaccoConfig {
  numCigarrosPorMaco: number;
  precoPorMaco: number;
  baselineDeclarado: number; // cigarros por dia
}

export interface CigaretteLog {
  id: string;
  timestamp: string; // ISO datetime
  date: string; // YYYY-MM-DD for grouping
}

export interface TobaccoSummary {
  consumoHoje: number;
  poupancaHoje: number;
  poupancaMensal: number;
  poupancaAcumulada: number;
  streakDiasAbaixoBaseline: number;
  streakDiasZero: number;
  mediaUltimos30Dias: number;
}

// Financial Goals types
export interface PurchaseGoal {
  id: string;
  nome: string;
  valorAlvo: number;
  prazoEmDias: number;
  dataInicio: string; // YYYY-MM-DD
  fontesPoupanca: ('tabaco' | 'compras' | 'habito' | 'manual')[];
  contribuicoes: GoalContribution[];
  completed: boolean;
  purchaseDetails?: PurchaseDetails;
  convertedToHabitId?: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  date: string;
  amount: number;
  fonte: 'tabaco' | 'compras' | 'habito' | 'manual' | 'investimento';
  descricao: string;
  investmentPlatform?: string; // For symbolic investments
}

export interface PurchaseDetails {
  loja: string;
  precoFinal: number;
  data: string;
  notas?: string;
  fotoUrl?: string;
}

export interface AppState {
  habits: Habit[];
  dailyLogs: DailyLog[];
  gamification: UserGamification;
  savings: SavingsEntry[];
  shoppingItems: ShoppingItem[];
  tobaccoConfig: TobaccoConfig;
  cigaretteLogs: CigaretteLog[];
  purchaseGoals: PurchaseGoal[];
}

export const DEFAULT_TOBACCO_CONFIG: TobaccoConfig = {
  numCigarrosPorMaco: 20,
  precoPorMaco: 6.20,
  baselineDeclarado: 20, // 1 maço/dia
};

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
  "Tabaco",
  "Outro",
];

export const GOAL_SOURCES = [
  { id: 'tabaco', label: 'Poupança Tabaco' },
  { id: 'compras', label: 'Compras Evitadas' },
  { id: 'habito', label: 'Ligado a Hábito' },
  { id: 'manual', label: 'Contribuição Manual' },
] as const;

export const INVESTMENT_PLATFORMS = [
  "ETF Genérico",
  "Certificados de Aforro",
  "PPR",
  "Depósito a Prazo",
  "Ações",
  "Crypto",
  "Outro",
];
