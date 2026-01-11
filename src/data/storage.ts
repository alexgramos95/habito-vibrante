import { 
  AppState, Habit, DailyLog, UserGamification, SavingsEntry, ShoppingItem,
  TobaccoConfig, CigaretteLog, PurchaseGoal, GoalContribution, PurchaseDetails,
  DEFAULT_TOBACCO_CONFIG, Tracker, TrackerEntry, DailyReflection, FutureSelfEntry,
  InvestmentGoal, InvestmentContribution, SleepEntry, Trigger
} from "./types";
import { format, startOfWeek, parseISO, subDays, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";

const STORAGE_KEY = "become-app-data";

const defaultGamification: UserGamification = {
  pontos: 0,
  nivel: 1,
  conquistas: [],
  consistencyScore: 0,
  currentStreak: 0,
  bestStreak: 0,
};

const defaultState: AppState = {
  habits: [],
  dailyLogs: [],
  trackers: [],
  trackerEntries: [],
  reflections: [],
  futureSelf: [],
  investmentGoals: [],
  sleepEntries: [],
  triggers: [],
  gamification: defaultGamification,
  savings: [],
  shoppingItems: [],
  tobaccoConfig: DEFAULT_TOBACCO_CONFIG,
  cigaretteLogs: [],
  purchaseGoals: [],
};

export const loadState = (): AppState => {
  try {
    // Try new key first, then fall back to old key for migration
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      stored = localStorage.getItem("habit-tracker-data");
    }
    if (!stored) return defaultState;
    
    const parsed = JSON.parse(stored) as Partial<AppState>;
    
    // Merge with defaults to handle missing fields
    return {
      habits: parsed.habits || [],
      dailyLogs: parsed.dailyLogs || [],
      trackers: parsed.trackers || [],
      trackerEntries: parsed.trackerEntries || [],
      reflections: parsed.reflections || [],
      futureSelf: parsed.futureSelf || [],
      investmentGoals: parsed.investmentGoals || [],
      sleepEntries: parsed.sleepEntries || [],
      triggers: parsed.triggers || [],
      gamification: { ...defaultGamification, ...parsed.gamification },
      savings: parsed.savings || [],
      shoppingItems: parsed.shoppingItems || [],
      tobaccoConfig: parsed.tobaccoConfig || DEFAULT_TOBACCO_CONFIG,
      cigaretteLogs: parsed.cigaretteLogs || [],
      purchaseGoals: parsed.purchaseGoals || [],
    };
  } catch {
    console.error("Failed to load state from localStorage");
    return defaultState;
  }
};

export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.error("Failed to save state to localStorage");
  }
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============= HABIT OPERATIONS =============

export const addHabit = (state: AppState, habit: Omit<Habit, "id" | "createdAt">): AppState => {
  const newHabit: Habit = {
    ...habit,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  let newGamification = state.gamification;
  if (state.habits.length === 0 && !state.gamification.conquistas.includes("primeiro_habito")) {
    newGamification = {
      ...state.gamification,
      conquistas: [...state.gamification.conquistas, "primeiro_habito"],
      pontos: state.gamification.pontos + 20,
    };
  }
  
  return { 
    ...state, 
    habits: [...state.habits, newHabit],
    gamification: newGamification,
  };
};

export const updateHabit = (state: AppState, id: string, updates: Partial<Habit>): AppState => {
  return {
    ...state,
    habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
  };
};

export const deleteHabit = (state: AppState, id: string): AppState => {
  return {
    ...state,
    habits: state.habits.filter((h) => h.id !== id),
    dailyLogs: state.dailyLogs.filter((l) => l.habitId !== id),
  };
};

// ============= DAILY LOG OPERATIONS =============

export const toggleDailyLog = (
  state: AppState,
  habitId: string,
  date: string
): { newState: AppState; wasCompleted: boolean; habitName: string } => {
  const existingLog = state.dailyLogs.find(
    (l) => l.habitId === habitId && l.date === date
  );
  
  const habit = state.habits.find((h) => h.id === habitId);
  const habitName = habit?.nome || "";

  if (existingLog) {
    if (existingLog.done) {
      const newPontos = Math.max(0, state.gamification.pontos - 10);
      const newNivel = Math.floor(newPontos / 500) + 1;
      
      return {
        newState: {
          ...state,
          dailyLogs: state.dailyLogs.filter((l) => l.id !== existingLog.id),
          gamification: {
            ...state.gamification,
            pontos: newPontos,
            nivel: newNivel,
          },
        },
        wasCompleted: false,
        habitName,
      };
    } else {
      const newPontos = state.gamification.pontos + 10;
      const newNivel = Math.floor(newPontos / 500) + 1;
      
      return {
        newState: {
          ...state,
          dailyLogs: state.dailyLogs.map((l) =>
            l.id === existingLog.id ? { ...l, done: true } : l
          ),
          gamification: {
            ...state.gamification,
            pontos: newPontos,
            nivel: newNivel,
          },
        },
        wasCompleted: true,
        habitName,
      };
    }
  } else {
    const newLog: DailyLog = {
      id: generateId(),
      habitId,
      date,
      done: true,
    };
    
    const newPontos = state.gamification.pontos + 10;
    const newNivel = Math.floor(newPontos / 500) + 1;
    
    return {
      newState: {
        ...state,
        dailyLogs: [...state.dailyLogs, newLog],
        gamification: {
          ...state.gamification,
          pontos: newPontos,
          nivel: newNivel,
        },
      },
      wasCompleted: true,
      habitName,
    };
  }
};

export const toggleDailyLogSimple = (
  state: AppState,
  habitId: string,
  date: string
): AppState => {
  return toggleDailyLog(state, habitId, date).newState;
};

export const isHabitDoneOnDate = (
  state: AppState,
  habitId: string,
  date: string
): boolean => {
  return state.dailyLogs.some(
    (l) => l.habitId === habitId && l.date === date && l.done
  );
};

// ============= TRACKER OPERATIONS =============

export const addTracker = (
  state: AppState,
  tracker: Omit<Tracker, "id" | "createdAt">
): AppState => {
  const newTracker: Tracker = {
    ...tracker,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  let newGamification = state.gamification;
  if (state.trackers.length === 0 && !state.gamification.conquistas.includes("tracker_first")) {
    newGamification = {
      ...state.gamification,
      conquistas: [...state.gamification.conquistas, "tracker_first"],
      pontos: state.gamification.pontos + 20,
    };
  }
  
  return { 
    ...state, 
    trackers: [...state.trackers, newTracker],
    gamification: newGamification,
  };
};

export const updateTracker = (
  state: AppState,
  id: string,
  updates: Partial<Tracker>
): AppState => {
  return {
    ...state,
    trackers: state.trackers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  };
};

export const deleteTracker = (state: AppState, id: string): AppState => {
  return {
    ...state,
    trackers: state.trackers.filter((t) => t.id !== id),
    trackerEntries: state.trackerEntries.filter((e) => e.trackerId !== id),
  };
};

export const addTrackerEntry = (
  state: AppState,
  trackerId: string,
  quantity: number = 1,
  note?: string
): AppState => {
  const now = new Date();
  const newEntry: TrackerEntry = {
    id: generateId(),
    trackerId,
    timestamp: now.toISOString(),
    date: format(now, "yyyy-MM-dd"),
    quantity,
    note,
  };
  
  // Add points for tracking
  const newPontos = state.gamification.pontos + 2;
  const newNivel = Math.floor(newPontos / 500) + 1;
  
  return { 
    ...state, 
    trackerEntries: [...state.trackerEntries, newEntry],
    gamification: {
      ...state.gamification,
      pontos: newPontos,
      nivel: newNivel,
    },
  };
};

export const deleteTrackerEntry = (state: AppState, entryId: string): AppState => {
  return {
    ...state,
    trackerEntries: state.trackerEntries.filter((e) => e.id !== entryId),
  };
};

export const getTrackerEntriesForDate = (state: AppState, trackerId: string, date: string): TrackerEntry[] => {
  return state.trackerEntries
    .filter((e) => e.trackerId === trackerId && e.date === date)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

// ============= REFLECTION OPERATIONS =============

export const addReflection = (
  state: AppState,
  reflection: Omit<DailyReflection, "id" | "createdAt">
): AppState => {
  // Check if reflection exists for this date
  const existing = state.reflections.find(r => r.date === reflection.date);
  if (existing) {
    return {
      ...state,
      reflections: state.reflections.map(r => 
        r.id === existing.id 
          ? { ...r, ...reflection, createdAt: r.createdAt }
          : r
      ),
    };
  }
  
  const newReflection: DailyReflection = {
    ...reflection,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  return { ...state, reflections: [...state.reflections, newReflection] };
};

export const getReflectionForDate = (state: AppState, date: string): DailyReflection | undefined => {
  return state.reflections.find(r => r.date === date);
};

// ============= FUTURE SELF OPERATIONS =============

export const addFutureSelfEntry = (
  state: AppState,
  entry: Omit<FutureSelfEntry, "id" | "createdAt">
): AppState => {
  const newEntry: FutureSelfEntry = {
    ...entry,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  return { ...state, futureSelf: [...state.futureSelf, newEntry] };
};

export const getLatestFutureSelf = (state: AppState): FutureSelfEntry | undefined => {
  return state.futureSelf.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
};

// ============= INVESTMENT GOAL OPERATIONS =============

export const addInvestmentGoal = (
  state: AppState,
  goal: Omit<InvestmentGoal, "id" | "currentAmount" | "manualContributions" | "completed" | "createdAt">
): AppState => {
  const newGoal: InvestmentGoal = {
    ...goal,
    id: generateId(),
    currentAmount: 0,
    manualContributions: [],
    completed: false,
    createdAt: new Date().toISOString(),
  };
  
  return { ...state, investmentGoals: [...state.investmentGoals, newGoal] };
};

export const addInvestmentContribution = (
  state: AppState,
  goalId: string,
  contribution: Omit<InvestmentContribution, "id" | "goalId">
): AppState => {
  const newContribution: InvestmentContribution = {
    ...contribution,
    id: generateId(),
    goalId,
  };
  
  return {
    ...state,
    investmentGoals: state.investmentGoals.map(g => 
      g.id === goalId
        ? { 
            ...g, 
            currentAmount: g.currentAmount + contribution.amount,
            manualContributions: [...g.manualContributions, newContribution],
            completed: (g.currentAmount + contribution.amount) >= g.targetAmount,
            completedAt: (g.currentAmount + contribution.amount) >= g.targetAmount 
              ? new Date().toISOString() 
              : undefined,
          }
        : g
    ),
  };
};

export const deleteInvestmentGoal = (state: AppState, id: string): AppState => {
  return {
    ...state,
    investmentGoals: state.investmentGoals.filter(g => g.id !== id),
  };
};

// ============= SLEEP OPERATIONS =============

export const addSleepEntry = (
  state: AppState,
  entry: Omit<SleepEntry, "id">
): AppState => {
  // Update if exists for date
  const existing = state.sleepEntries.find(s => s.date === entry.date);
  if (existing) {
    return {
      ...state,
      sleepEntries: state.sleepEntries.map(s => 
        s.id === existing.id ? { ...s, ...entry } : s
      ),
    };
  }
  
  const newEntry: SleepEntry = {
    ...entry,
    id: generateId(),
  };
  
  return { ...state, sleepEntries: [...state.sleepEntries, newEntry] };
};

// ============= TRIGGER OPERATIONS =============

export const addTrigger = (
  state: AppState,
  trigger: Omit<Trigger, "id" | "createdAt">
): AppState => {
  const newTrigger: Trigger = {
    ...trigger,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  return { ...state, triggers: [...state.triggers, newTrigger] };
};

export const updateTrigger = (
  state: AppState,
  id: string,
  updates: Partial<Trigger>
): AppState => {
  return {
    ...state,
    triggers: state.triggers.map(t => (t.id === id ? { ...t, ...updates } : t)),
  };
};

export const deleteTrigger = (state: AppState, id: string): AppState => {
  return {
    ...state,
    triggers: state.triggers.filter(t => t.id !== id),
  };
};

// ============= SAVINGS OPERATIONS =============

export const addSavingsEntry = (
  state: AppState,
  entry: Omit<SavingsEntry, "id">
): AppState => {
  const newEntry: SavingsEntry = {
    ...entry,
    id: generateId(),
  };
  return { ...state, savings: [...state.savings, newEntry] };
};

export const updateSavingsEntry = (
  state: AppState,
  id: string,
  updates: Partial<SavingsEntry>
): AppState => {
  return {
    ...state,
    savings: state.savings.map((s) => (s.id === id ? { ...s, ...updates } : s)),
  };
};

export const deleteSavingsEntry = (state: AppState, id: string): AppState => {
  return {
    ...state,
    savings: state.savings.filter((s) => s.id !== id),
  };
};

// ============= SHOPPING OPERATIONS =============

export const getWeekStartDate = (date: Date = new Date()): string => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1, locale: pt });
  return format(weekStart, "yyyy-MM-dd");
};

export const addShoppingItem = (
  state: AppState,
  item: Omit<ShoppingItem, "id" | "done">
): AppState => {
  const newItem: ShoppingItem = {
    ...item,
    id: generateId(),
    done: false,
  };
  return { ...state, shoppingItems: [...state.shoppingItems, newItem] };
};

export const updateShoppingItem = (
  state: AppState,
  id: string,
  updates: Partial<ShoppingItem>
): AppState => {
  return {
    ...state,
    shoppingItems: state.shoppingItems.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    ),
  };
};

export const toggleShoppingItem = (state: AppState, id: string): AppState => {
  return {
    ...state,
    shoppingItems: state.shoppingItems.map((s) =>
      s.id === id ? { ...s, done: !s.done } : s
    ),
  };
};

export const deleteShoppingItem = (state: AppState, id: string): AppState => {
  return {
    ...state,
    shoppingItems: state.shoppingItems.filter((s) => s.id !== id),
  };
};

// ============= GAMIFICATION OPERATIONS =============

export const addAchievement = (state: AppState, achievementId: string): AppState => {
  if (state.gamification.conquistas.includes(achievementId)) {
    return state;
  }
  
  return {
    ...state,
    gamification: {
      ...state.gamification,
      conquistas: [...state.gamification.conquistas, achievementId],
      pontos: state.gamification.pontos + 50,
    },
  };
};

export const updateGamification = (
  state: AppState,
  updates: Partial<UserGamification>
): AppState => {
  const newGamification = { ...state.gamification, ...updates };
  newGamification.nivel = Math.floor(newGamification.pontos / 500) + 1;
  
  return {
    ...state,
    gamification: newGamification,
  };
};

// ============= RESET OPERATIONS =============

export const resetMonth = (state: AppState, year: number, month: number): AppState => {
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  return {
    ...state,
    dailyLogs: state.dailyLogs.filter((l) => !l.date.startsWith(monthStr)),
    savings: state.savings.filter((s) => !s.date.startsWith(monthStr)),
    trackerEntries: state.trackerEntries.filter((e) => !e.date.startsWith(monthStr)),
  };
};

export const resetAll = (): AppState => {
  return defaultState;
};

// ============= LEGACY TOBACCO OPERATIONS (for migration) =============

export const updateTobaccoConfig = (
  state: AppState,
  config: Partial<TobaccoConfig>
): AppState => {
  return {
    ...state,
    tobaccoConfig: { ...state.tobaccoConfig, ...config },
  };
};

export const addCigaretteLog = (state: AppState): AppState => {
  const now = new Date();
  const newLog: CigaretteLog = {
    id: generateId(),
    timestamp: now.toISOString(),
    date: format(now, "yyyy-MM-dd"),
  };
  return { ...state, cigaretteLogs: [...state.cigaretteLogs, newLog] };
};

export const deleteCigaretteLog = (state: AppState, id: string): AppState => {
  return {
    ...state,
    cigaretteLogs: state.cigaretteLogs.filter((l) => l.id !== id),
  };
};

export const getCigaretteLogsForDate = (state: AppState, date: string): CigaretteLog[] => {
  return state.cigaretteLogs
    .filter((l) => l.date === date)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

// ============= LEGACY PURCHASE GOALS (for migration) =============

export const addPurchaseGoal = (
  state: AppState,
  goal: Omit<PurchaseGoal, "id" | "contribuicoes" | "completed">
): AppState => {
  const newGoal: PurchaseGoal = {
    ...goal,
    id: generateId(),
    contribuicoes: [],
    completed: false,
  };
  return { ...state, purchaseGoals: [...state.purchaseGoals, newGoal] };
};

export const updatePurchaseGoal = (
  state: AppState,
  id: string,
  updates: Partial<PurchaseGoal>
): AppState => {
  return {
    ...state,
    purchaseGoals: state.purchaseGoals.map((g) =>
      g.id === id ? { ...g, ...updates } : g
    ),
  };
};

export const deletePurchaseGoal = (state: AppState, id: string): AppState => {
  return {
    ...state,
    purchaseGoals: state.purchaseGoals.filter((g) => g.id !== id),
  };
};

export const addGoalContribution = (
  state: AppState,
  goalId: string,
  contribution: Omit<GoalContribution, "id" | "goalId">
): AppState => {
  const newContribution: GoalContribution = {
    ...contribution,
    id: generateId(),
    goalId,
  };
  
  return {
    ...state,
    purchaseGoals: state.purchaseGoals.map((g) =>
      g.id === goalId
        ? { ...g, contribuicoes: [...g.contribuicoes, newContribution] }
        : g
    ),
  };
};

export const completePurchaseGoal = (
  state: AppState,
  goalId: string,
  purchaseDetails: PurchaseDetails
): AppState => {
  return {
    ...state,
    purchaseGoals: state.purchaseGoals.map((g) =>
      g.id === goalId
        ? { ...g, completed: true, purchaseDetails }
        : g
    ),
  };
};

export const convertGoalToHabit = (
  state: AppState,
  goalId: string,
  habitData: Omit<Habit, "id" | "createdAt">
): AppState => {
  const newHabit: Habit = {
    ...habitData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  return {
    ...state,
    habits: [...state.habits, newHabit],
    purchaseGoals: state.purchaseGoals.map((g) =>
      g.id === goalId ? { ...g, convertedToHabitId: newHabit.id } : g
    ),
  };
};

// ============= MIGRATION HELPER =============

export const migrateTobacoToTracker = (state: AppState): AppState => {
  // Check if tobacco tracker already exists
  const hasTobaccoTracker = state.trackers.some(t => 
    t.name.toLowerCase().includes("cigarro") || t.name.toLowerCase().includes("tabaco")
  );
  
  if (hasTobaccoTracker || state.cigaretteLogs.length === 0) {
    return state;
  }
  
  const { tobaccoConfig, cigaretteLogs } = state;
  const valorUnit = tobaccoConfig.precoPorMaco / tobaccoConfig.numCigarrosPorMaco;
  
  const tobaccoTracker: Tracker = {
    id: generateId(),
    name: "Cigarros",
    type: "reduce",
    unitSingular: "cigarro",
    unitPlural: "cigarros",
    valuePerUnit: valorUnit,
    baseline: tobaccoConfig.baselineDeclarado,
    dailyGoal: Math.floor(tobaccoConfig.baselineDeclarado * 0.8),
    includeInFinances: true,
    active: true,
    createdAt: new Date().toISOString(),
    icon: "🚬",
  };
  
  const trackerEntries: TrackerEntry[] = cigaretteLogs.map(log => ({
    id: log.id,
    trackerId: tobaccoTracker.id,
    timestamp: log.timestamp,
    date: log.date,
    quantity: 1,
  }));
  
  return {
    ...state,
    trackers: [...state.trackers, tobaccoTracker],
    trackerEntries: [...state.trackerEntries, ...trackerEntries],
  };
};
