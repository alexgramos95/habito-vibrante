// ============= CORE TRACKER SYSTEM =============
// Trackers are the central unit-based behavioral tracking system
// Supports: reduce, increase, boolean, event, neutral types

export type TrackerType = 'reduce' | 'increase' | 'boolean' | 'event' | 'neutral';
export type TrackerFrequency = 'daily' | 'weekly' | 'specific_days' | 'flex';

// Input mode defines how user enters data for this tracker
export type TrackerInputMode = 
  | 'binary'        // Done/Not done (1 click = day complete)
  | 'fixedAmount'   // Fixed daily amount (1 click = goal complete)
  | 'incremental'   // +1 per click with timeline
  | 'manualAmount'; // User enters custom value

export interface Tracker {
  id: string;
  name: string;
  type: TrackerType;
  inputMode: TrackerInputMode; // How user interacts with this tracker
  unitSingular: string;
  unitPlural: string;
  valuePerUnit: number; // monetary value per unit, 0 if no financial impact (can be negative for expenses like events)
  baseline: number; // daily baseline (expected/typical amount), 0 is valid
  dailyGoal?: number; // optional daily target (differs from baseline), can be undefined for goal-less trackers
  includeInFinances: boolean; // whether to show savings in Finanças
  active: boolean;
  createdAt: string;
  icon?: string; // optional emoji/icon
  color?: string; // optional color override
  frequency: TrackerFrequency; // tracking frequency
  specificDays?: number[]; // 0-6 for Sun-Sat when frequency is 'specific_days'
  scheduledTime?: string; // HH:MM format for scheduled reminder time
  scheduledDays?: number[]; // 0-6 for Sun-Sat for reminder days
}

export interface TrackerEntry {
  id: string;
  trackerId: string;
  timestamp: string; // ISO datetime - editable by user
  date: string; // YYYY-MM-DD for grouping
  quantity: number; // default 1, for binary always 1
  note?: string; // optional note
}

// Exported for backwards compatibility
export interface TobaccoSummary {
  consumoHoje: number;
  poupancaHoje: number;
  poupancaMensal: number;
  poupancaAcumulada: number;
  streakDiasAbaixoBaseline: number;
  streakDiasZero: number;
  mediaUltimos30Dias: number;
}

export interface TrackerSummary {
  todayCount: number;
  todaySavings: number;
  monthlyCount: number;
  monthlySavings: number;
  accumulatedSavings: number;
  daysOnTrack: number;
  currentStreak: number;
  average30Days: number;
  percentVsBaseline: number;
}

// ============= HABITS =============

export interface Habit {
  id: string;
  nome: string;
  categoria?: string;
  cor?: string;
  active: boolean;
  createdAt: string;
  // Scheduling and reminder fields (replaces Triggers)
  scheduledTime?: string; // HH:MM format for scheduled time
  scheduledDays?: number[]; // 0-6 for Sun-Sat, empty = every day
  reminderEnabled?: boolean; // Whether to show reminder notifications
}

export interface DailyLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD format
  done: boolean;
  completedAt?: string; // ISO datetime when completed
}

// ============= REFLECTION & FUTURE SELF =============

export interface DailyReflection {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  mood?: 'positive' | 'neutral' | 'challenging';
  createdAt: string;
}

export interface FutureSelfEntry {
  id: string;
  date: string;
  narrative: string; // "Who am I becoming?"
  themes: string[]; // e.g., ["health", "discipline", "calm"]
  createdAt: string;
}

// ============= INVESTMENTS / FINANCIAL GOALS =============

export interface InvestmentGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // YYYY-MM-DD
  linkedTrackerIds: string[]; // Trackers that contribute savings
  manualContributions: InvestmentContribution[];
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface InvestmentContribution {
  id: string;
  goalId: string;
  date: string;
  amount: number;
  source: 'tracker' | 'manual';
  sourceTrackerId?: string;
  description?: string;
}

// ============= SLEEP / CHRONOTYPE =============

export interface SleepEntry {
  id: string;
  date: string; // YYYY-MM-DD
  bedtime?: string; // HH:MM
  wakeTime?: string; // HH:MM
  quality?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export type Chronotype = 'early' | 'moderate' | 'late';

// ============= GAMIFICATION =============

export interface UserGamification {
  pontos: number;
  nivel: number;
  conquistas: string[]; // achievement IDs
  consistencyScore: number; // 0-100
  currentStreak: number;
  bestStreak: number;
}

export interface Achievement {
  id: string;
  nome: string;
  descricao: string;
  icon: string;
  category: 'streak' | 'consistency' | 'savings' | 'milestone';
  requirement: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "streak_7", nome: "7 Dias Seguidos", descricao: "7 dias consecutivos", icon: "🔥", category: "streak", requirement: 7 },
  { id: "streak_14", nome: "2 Semanas Fortes", descricao: "14 dias consecutivos", icon: "💪", category: "streak", requirement: 14 },
  { id: "streak_30", nome: "Maratonista", descricao: "30 dias consecutivos", icon: "🏆", category: "streak", requirement: 30 },
  { id: "streak_60", nome: "Transformação", descricao: "60 dias consecutivos", icon: "⚡", category: "streak", requirement: 60 },
  { id: "streak_90", nome: "Identidade", descricao: "90 dias consecutivos", icon: "🌟", category: "streak", requirement: 90 },
  { id: "mes_30", nome: "Mês Completo", descricao: "30 dias num mês", icon: "📅", category: "consistency", requirement: 30 },
  { id: "tres_habitos_ativos", nome: "Tripla Ameaça", descricao: "3+ hábitos ativos", icon: "🎯", category: "milestone", requirement: 3 },
  { id: "primeiro_habito", nome: "Primeiro Passo", descricao: "Primeiro hábito criado", icon: "🌱", category: "milestone", requirement: 1 },
  { id: "savings_50", nome: "Poupador", descricao: "50€ poupados", icon: "💰", category: "savings", requirement: 50 },
  { id: "savings_100", nome: "Centenário", descricao: "100€ poupados", icon: "💎", category: "savings", requirement: 100 },
  { id: "savings_500", nome: "Investidor", descricao: "500€ poupados", icon: "🏦", category: "savings", requirement: 500 },
  { id: "tracker_first", nome: "Primeiro Tracker", descricao: "Primeiro tracker criado", icon: "📊", category: "milestone", requirement: 1 },
  { id: "consistency_80", nome: "Consistente", descricao: "80% consistência num mês", icon: "📈", category: "consistency", requirement: 80 },
];

// ============= SAVINGS (Manual entries / External Deposits) =============

export interface SavingsEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  amount: number;
  moeda: string; // default "€"
  descricao: string;
  categoria?: string;
  habitId?: string;
  tags?: string[]; // optional tags for categorization (e.g., "investimento", "bonus")
  isExternalDeposit?: boolean; // true if this is a manual deposit, not tracker-based
}

export interface UserSavingsSummary {
  totalPoupadoAllTime: number;
  totalPoupadoMesAtual: number;
  numeroEntradasMesAtual: number;
  externalDepositsMonth: number;
  externalDepositsTotal: number;
}

// ============= SHOPPING =============

export interface ShoppingItem {
  id: string;
  weekStartDate: string; // YYYY-MM-DD (Monday of the week)
  nome: string;
  quantidade?: string;
  categoria?: string;
  price: number; // price per item (required)
  done: boolean;
  purchaseDate?: string; // YYYY-MM-DD when item was actually purchased
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

// ============= TRIGGERS =============

export interface Trigger {
  id: string;
  type: 'alarm' | 'event';
  name: string;
  // For alarms
  time?: string; // HH:MM
  repeat?: 'daily' | 'weekdays' | 'weekends' | 'custom';
  customDays?: number[]; // 0-6 for Sun-Sat
  // For events
  eventTrigger?: 'wake' | 'sleep' | 'meal' | 'custom';
  customTrigger?: string;
  // Common
  action: string;
  linkedHabitId?: string;
  linkedTrackerId?: string;
  active: boolean;
  createdAt: string;
}

// ============= LEGACY (for migration) =============

export interface TobaccoConfig {
  numCigarrosPorMaco: number;
  precoPorMaco: number;
  baselineDeclarado: number;
}

export interface CigaretteLog {
  id: string;
  timestamp: string;
  date: string;
}

export interface PurchaseGoal {
  id: string;
  nome: string;
  valorAlvo: number;
  prazoEmDias: number;
  dataInicio: string;
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
  investmentPlatform?: string;
}

export interface PurchaseDetails {
  loja: string;
  precoFinal: number;
  data: string;
  notas?: string;
  fotoUrl?: string;
}

// ============= APP STATE =============

export interface AppState {
  // Core
  habits: Habit[];
  dailyLogs: DailyLog[];
  trackers: Tracker[];
  trackerEntries: TrackerEntry[];
  
  // New modules
  reflections: DailyReflection[];
  futureSelf: FutureSelfEntry[];
  investmentGoals: InvestmentGoal[];
  sleepEntries: SleepEntry[];
  triggers: Trigger[];
  
  // Existing
  gamification: UserGamification;
  savings: SavingsEntry[];
  shoppingItems: ShoppingItem[];
  
  // Legacy (kept for migration)
  tobaccoConfig: TobaccoConfig;
  cigaretteLogs: CigaretteLog[];
  purchaseGoals: PurchaseGoal[];
}

export const DEFAULT_TOBACCO_CONFIG: TobaccoConfig = {
  numCigarrosPorMaco: 20,
  precoPorMaco: 6.20,
  baselineDeclarado: 20,
};

export const DEFAULT_COLORS = [
  "#00ffff", // cyan
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // teal
];

export const DEFAULT_CATEGORIES = [
  "Health",
  "Exercise",
  "Productivity",
  "Learning",
  "Mindfulness",
  "Social",
  "Finance",
  "Creativity",
];

export const SHOPPING_CATEGORIES = [
  "Groceries",
  "Fresh",
  "Dairy",
  "Meat & Fish",
  "Hygiene",
  "Cleaning",
  "Other",
];

export const SAVINGS_CATEGORIES = [
  "Expense Cut",
  "Investment",
  "Savings",
  "Refund",
  "Bonus",
  "Tracker",
  "Other",
];

// Tracker templates for quick setup
export const TRACKER_TEMPLATES = [
  { name: "Exercise", type: "increase" as const, unit: "minute", unitPlural: "minutes", baseline: 0, valuePerUnit: 0, icon: "🏃", frequency: "daily" as const },
  { name: "Meditation", type: "increase" as const, unit: "minute", unitPlural: "minutes", baseline: 0, valuePerUnit: 0, icon: "🧘", frequency: "daily" as const },
  { name: "Water", type: "increase" as const, unit: "glass", unitPlural: "glasses", baseline: 8, valuePerUnit: 0, icon: "💧", frequency: "daily" as const },
  { name: "Reading", type: "increase" as const, unit: "page", unitPlural: "pages", baseline: 0, valuePerUnit: 0, icon: "📚", frequency: "daily" as const },
  { name: "Steps", type: "increase" as const, unit: "step", unitPlural: "steps", baseline: 0, valuePerUnit: 0, icon: "👣", frequency: "daily" as const },
  { name: "Sleep", type: "increase" as const, unit: "hour", unitPlural: "hours", baseline: 7, valuePerUnit: 0, icon: "😴", frequency: "daily" as const },
  { name: "Coffee", type: "event" as const, unit: "cup", unitPlural: "cups", baseline: 0, valuePerUnit: -3.00, icon: "☕", frequency: "daily" as const },
  { name: "Alcohol", type: "reduce" as const, unit: "drink", unitPlural: "drinks", baseline: 2, valuePerUnit: 5.00, icon: "🍺", frequency: "daily" as const },
  { name: "Supplement", type: "boolean" as const, unit: "", unitPlural: "", baseline: 0, valuePerUnit: 0, icon: "💊", frequency: "daily" as const },
  { name: "Fasting", type: "boolean" as const, unit: "", unitPlural: "", baseline: 0, valuePerUnit: 0, icon: "⏰", frequency: "daily" as const },
];

export const DEPOSIT_TAGS = [
  "investment",
  "bonus",
  "refund",
  "gift",
  "savings",
  "other",
];

export const INVESTMENT_PLATFORMS = [
  "ETF",
  "Savings Bonds",
  "Retirement Fund",
  "Term Deposit",
  "Stocks",
  "Crypto",
  "Other",
];

export const GOAL_SOURCES = [
  { id: 'tracker', label: 'Tracker Savings' },
  { id: 'manual', label: 'Manual Contribution' },
] as const;
