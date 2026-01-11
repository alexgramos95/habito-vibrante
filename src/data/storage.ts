import { 
  AppState, Habit, DailyLog, UserGamification, SavingsEntry, ShoppingItem,
  TobaccoConfig, CigaretteLog, PurchaseGoal, GoalContribution, PurchaseDetails,
  DEFAULT_TOBACCO_CONFIG, Tracker, TrackerEntry
} from "./types";
import { format, startOfWeek, parseISO } from "date-fns";
import { pt } from "date-fns/locale";

const STORAGE_KEY = "habit-tracker-data";

const defaultGamification: UserGamification = {
  pontos: 0,
  nivel: 1,
  conquistas: [],
};

const defaultState: AppState = {
  habits: [],
  dailyLogs: [],
  gamification: defaultGamification,
  savings: [],
  shoppingItems: [],
  tobaccoConfig: DEFAULT_TOBACCO_CONFIG,
  cigaretteLogs: [],
  trackers: [],
  trackerEntries: [],
  purchaseGoals: [],
};

export const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState;
    const parsed = JSON.parse(stored) as Partial<AppState>;
    // Merge with defaults to handle missing fields from old data
    return {
      habits: parsed.habits || [],
      dailyLogs: parsed.dailyLogs || [],
      gamification: parsed.gamification || defaultGamification,
      savings: parsed.savings || [],
      shoppingItems: parsed.shoppingItems || [],
      tobaccoConfig: parsed.tobaccoConfig || DEFAULT_TOBACCO_CONFIG,
      cigaretteLogs: parsed.cigaretteLogs || [],
      trackers: parsed.trackers || [],
      trackerEntries: parsed.trackerEntries || [],
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

// Habit operations
export const addHabit = (state: AppState, habit: Omit<Habit, "id" | "createdAt">): AppState => {
  const newHabit: Habit = {
    ...habit,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  // Award "primeiro_habito" achievement if this is the first habit
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

// Daily log operations with gamification
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
      // Remove points when un-completing
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
      // Mark as done - add points
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
    // Create new log as done - add points
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

// Legacy toggle without gamification feedback (for backwards compat)
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

// Savings operations
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

// Shopping list operations
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

// Gamification operations
export const addAchievement = (state: AppState, achievementId: string): AppState => {
  if (state.gamification.conquistas.includes(achievementId)) {
    return state;
  }
  
  return {
    ...state,
    gamification: {
      ...state.gamification,
      conquistas: [...state.gamification.conquistas, achievementId],
      pontos: state.gamification.pontos + 50, // Bonus for achievements
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

// Reset operations
export const resetMonth = (state: AppState, year: number, month: number): AppState => {
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  return {
    ...state,
    dailyLogs: state.dailyLogs.filter((l) => !l.date.startsWith(monthStr)),
    savings: state.savings.filter((s) => !s.date.startsWith(monthStr)),
  };
};

export const resetAll = (): AppState => {
  return defaultState;
};

// ============= TOBACCO OPERATIONS =============

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

// ============= PURCHASE GOALS OPERATIONS =============

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
  return { ...state, trackers: [...state.trackers, newTracker] };
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
  quantity: number = 1
): AppState => {
  const now = new Date();
  const newEntry: TrackerEntry = {
    id: generateId(),
    trackerId,
    timestamp: now.toISOString(),
    date: format(now, "yyyy-MM-dd"),
    quantity,
  };
  return { ...state, trackerEntries: [...state.trackerEntries, newEntry] };
};

export const deleteTrackerEntry = (state: AppState, id: string): AppState => {
  return {
    ...state,
    trackerEntries: state.trackerEntries.filter((e) => e.id !== id),
  };
};

export const getTrackerEntriesForDate = (state: AppState, trackerId: string, date: string): TrackerEntry[] => {
  return state.trackerEntries
    .filter((e) => e.trackerId === trackerId && e.date === date)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

// Migrate legacy tobacco data to tracker
export const migrateTobacoToTracker = (state: AppState): AppState => {
  // Check if already migrated
  const existingCigaretteTracker = state.trackers.find(t => t.name === "Cigarros");
  if (existingCigaretteTracker || state.cigaretteLogs.length === 0) {
    return state;
  }

  const valuePerUnit = state.tobaccoConfig.precoPorMaco / state.tobaccoConfig.numCigarrosPorMaco;
  
  const cigaretteTracker: Tracker = {
    id: generateId(),
    name: "Cigarros",
    type: "reduce",
    unitSingular: "cigarro",
    unitPlural: "cigarros",
    valuePerUnit,
    baseline: state.tobaccoConfig.baselineDeclarado,
    active: true,
    createdAt: new Date().toISOString(),
  };

  const migratedEntries: TrackerEntry[] = state.cigaretteLogs.map(log => ({
    id: log.id,
    trackerId: cigaretteTracker.id,
    timestamp: log.timestamp,
    date: log.date,
    quantity: 1,
  }));

  return {
    ...state,
    trackers: [...state.trackers, cigaretteTracker],
    trackerEntries: [...state.trackerEntries, ...migratedEntries],
  };
};
