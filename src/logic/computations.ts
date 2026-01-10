import { AppState, MonthlySummary, WeeklySummary } from "@/data/types";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getWeek,
  startOfWeek,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  differenceInDays,
  addDays,
  subDays,
} from "date-fns";

const formatDate = (date: Date): string => format(date, "yyyy-MM-dd");

export const getActiveHabits = (state: AppState) => {
  return state.habits.filter((h) => h.active);
};

export const getDaysInMonth = (year: number, month: number): Date[] => {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  return eachDayOfInterval({ start, end });
};

export const getWeeksInMonth = (year: number, month: number): { weekNumber: number; days: Date[] }[] => {
  const days = getDaysInMonth(year, month);
  const weeks: Map<number, Date[]> = new Map();
  
  let weekCounter = 1;
  let currentWeekStart: Date | null = null;
  
  days.forEach((day, index) => {
    const dayOfWeek = day.getDay();
    const isMonday = dayOfWeek === 1;
    const isFirstDay = index === 0;
    
    if (isFirstDay || isMonday) {
      if (isFirstDay && !isMonday) {
        // First week of month (partial)
        weeks.set(weekCounter, [day]);
      } else if (isMonday) {
        weekCounter = weeks.size + 1;
        weeks.set(weekCounter, [day]);
      }
      currentWeekStart = day;
    } else {
      const currentWeek = weeks.get(weekCounter);
      if (currentWeek) {
        currentWeek.push(day);
      }
    }
  });
  
  return Array.from(weeks.entries()).map(([weekNumber, days]) => ({
    weekNumber,
    days,
  }));
};

export const getCompletedDaysInRange = (
  state: AppState,
  startDate: Date,
  endDate: Date
): number => {
  const activeHabits = getActiveHabits(state);
  if (activeHabits.length === 0) return 0;
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  let completedDays = 0;
  
  days.forEach((day) => {
    const dateStr = formatDate(day);
    const allHabitsDone = activeHabits.every((habit) =>
      state.dailyLogs.some(
        (log) => log.habitId === habit.id && log.date === dateStr && log.done
      )
    );
    if (allHabitsDone) {
      completedDays++;
    }
  });
  
  return completedDays;
};

export const getCompletedHabitsOnDate = (
  state: AppState,
  date: Date
): number => {
  const dateStr = formatDate(date);
  const activeHabits = getActiveHabits(state);
  
  return activeHabits.filter((habit) =>
    state.dailyLogs.some(
      (log) => log.habitId === habit.id && log.date === dateStr && log.done
    )
  ).length;
};

export const isDayComplete = (state: AppState, date: Date): boolean => {
  const activeHabits = getActiveHabits(state);
  if (activeHabits.length === 0) return false;
  
  const dateStr = formatDate(date);
  return activeHabits.every((habit) =>
    state.dailyLogs.some(
      (log) => log.habitId === habit.id && log.date === dateStr && log.done
    )
  );
};

export const isDayPartial = (state: AppState, date: Date): boolean => {
  const activeHabits = getActiveHabits(state);
  if (activeHabits.length === 0) return false;
  
  const dateStr = formatDate(date);
  const completedCount = activeHabits.filter((habit) =>
    state.dailyLogs.some(
      (log) => log.habitId === habit.id && log.date === dateStr && log.done
    )
  ).length;
  
  return completedCount > 0 && completedCount < activeHabits.length;
};

export const calculateCurrentStreak = (state: AppState): number => {
  const activeHabits = getActiveHabits(state);
  if (activeHabits.length === 0) return 0;
  
  let streak = 0;
  let currentDate = new Date();
  
  // Check if today is complete, if not start from yesterday
  if (!isDayComplete(state, currentDate)) {
    currentDate = subDays(currentDate, 1);
  }
  
  while (isDayComplete(state, currentDate)) {
    streak++;
    currentDate = subDays(currentDate, 1);
  }
  
  return streak;
};

export const calculateBestStreak = (state: AppState): number => {
  const activeHabits = getActiveHabits(state);
  if (activeHabits.length === 0) return 0;
  
  // Get all unique dates from logs
  const allDates = [...new Set(state.dailyLogs.map((l) => l.date))].sort();
  if (allDates.length === 0) return 0;
  
  let bestStreak = 0;
  let currentStreak = 0;
  let previousDate: Date | null = null;
  
  allDates.forEach((dateStr) => {
    const date = parseISO(dateStr);
    
    if (isDayComplete(state, date)) {
      if (previousDate && differenceInDays(date, previousDate) === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      bestStreak = Math.max(bestStreak, currentStreak);
      previousDate = date;
    } else {
      currentStreak = 0;
      previousDate = null;
    }
  });
  
  return bestStreak;
};

export const calculateWeeklySummaries = (
  state: AppState,
  year: number,
  month: number
): WeeklySummary[] => {
  const weeks = getWeeksInMonth(year, month);
  const activeHabits = getActiveHabits(state);
  
  return weeks.map(({ weekNumber, days }) => {
    let totalDone = 0;
    
    days.forEach((day) => {
      if (isDayComplete(state, day)) {
        totalDone++;
      }
    });
    
    return {
      weekNumber: weekNumber as 1 | 2 | 3 | 4 | 5,
      weekLabel: `S${weekNumber}`,
      totalDone,
      totalPossible: days.length,
    };
  });
};

export const calculateMonthlySummary = (
  state: AppState,
  year: number,
  month: number
): MonthlySummary => {
  const days = getDaysInMonth(year, month);
  const activeHabits = getActiveHabits(state);
  const today = new Date();
  
  // Only count days up to today
  const relevantDays = days.filter(
    (day) => !isAfter(day, today) || isSameDay(day, today)
  );
  
  let totalDone = 0;
  relevantDays.forEach((day) => {
    if (isDayComplete(state, day)) {
      totalDone++;
    }
  });
  
  const totalPossible = relevantDays.length;
  const progressoMensal = totalPossible > 0 ? (totalDone / totalPossible) * 100 : 0;
  
  return {
    totalDone,
    totalPossible,
    streakAtual: calculateCurrentStreak(state),
    melhorStreak: calculateBestStreak(state),
    progressoMensal,
    habitosAtivos: activeHabits.length,
    habitosTotal: state.habits.length,
  };
};

export const getMotivationalMessage = (summary: MonthlySummary): string => {
  if (summary.streakAtual >= 7) {
    return "🔥 Excelente! Continua assim!";
  }
  if (summary.progressoMensal >= 80) {
    return "🏆 Progresso incrível!";
  }
  if (summary.progressoMensal >= 50) {
    return "💪 Bom progresso!";
  }
  return "🚀 Continua a construir o teu ritmo!";
};
