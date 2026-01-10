import { AppState, Habit, DailyLog } from "./types";

const STORAGE_KEY = "habit-tracker-data";

const defaultState: AppState = {
  habits: [],
  dailyLogs: [],
};

export const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState;
    return JSON.parse(stored) as AppState;
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
  return { ...state, habits: [...state.habits, newHabit] };
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

// Daily log operations
export const toggleDailyLog = (
  state: AppState,
  habitId: string,
  date: string
): AppState => {
  const existingLog = state.dailyLogs.find(
    (l) => l.habitId === habitId && l.date === date
  );

  if (existingLog) {
    // Toggle existing log
    if (existingLog.done) {
      // Remove the log if it was done
      return {
        ...state,
        dailyLogs: state.dailyLogs.filter((l) => l.id !== existingLog.id),
      };
    } else {
      // Mark as done
      return {
        ...state,
        dailyLogs: state.dailyLogs.map((l) =>
          l.id === existingLog.id ? { ...l, done: true } : l
        ),
      };
    }
  } else {
    // Create new log as done
    const newLog: DailyLog = {
      id: generateId(),
      habitId,
      date,
      done: true,
    };
    return { ...state, dailyLogs: [...state.dailyLogs, newLog] };
  }
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

// Reset operations
export const resetMonth = (state: AppState, year: number, month: number): AppState => {
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  return {
    ...state,
    dailyLogs: state.dailyLogs.filter((l) => !l.date.startsWith(monthStr)),
  };
};

export const resetAll = (): AppState => {
  return defaultState;
};
