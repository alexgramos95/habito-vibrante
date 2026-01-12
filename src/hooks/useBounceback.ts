import { useMemo } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, isAfter, isBefore, isSameDay } from "date-fns";
import { AppState, DailyLog, WeeklyStats } from "@/data/types";
import { getActiveHabits } from "@/logic/computations";

export type DayStatus = 'win' | 'bounceback' | 'miss' | 'future' | 'partial';

export interface DayState {
  date: string;
  status: DayStatus;
  completedHabits: number;
  totalHabits: number;
  isBounceback: boolean;
  canRecover: boolean;
}

// Check if all active habits are done for a given date
const isAllHabitsDone = (state: AppState, dateStr: string): boolean => {
  const activeHabits = getActiveHabits(state);
  if (activeHabits.length === 0) return false;
  
  return activeHabits.every(habit =>
    state.dailyLogs.some(log => 
      log.habitId === habit.id && 
      log.date === dateStr && 
      log.done
    )
  );
};

// Check if day has any bounceback logs
const hasBouncebackLogs = (state: AppState, dateStr: string): boolean => {
  return state.dailyLogs.some(log => 
    log.date === dateStr && 
    log.done && 
    log.isBounceback
  );
};

// Get completed habits count for a date
const getCompletedCount = (state: AppState, dateStr: string): number => {
  const activeHabits = getActiveHabits(state);
  return activeHabits.filter(habit =>
    state.dailyLogs.some(log => 
      log.habitId === habit.id && 
      log.date === dateStr && 
      log.done
    )
  ).length;
};

// Get day status
export const getDayStatus = (state: AppState, date: Date): DayState => {
  const today = new Date();
  const dateStr = format(date, "yyyy-MM-dd");
  const activeHabits = getActiveHabits(state);
  const totalHabits = activeHabits.length;
  const completedHabits = getCompletedCount(state, dateStr);
  const isBounceback = hasBouncebackLogs(state, dateStr);
  
  // Future dates
  if (isAfter(date, today) && !isSameDay(date, today)) {
    return {
      date: dateStr,
      status: 'future',
      completedHabits: 0,
      totalHabits,
      isBounceback: false,
      canRecover: false,
    };
  }
  
  // Calculate if can recover (within same week, not today)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const canRecover = !isSameDay(date, today) && 
                     !isBefore(date, weekStart) && 
                     completedHabits < totalHabits &&
                     !isBounceback;
  
  // Determine status
  let status: DayStatus;
  if (totalHabits === 0) {
    status = 'future';
  } else if (isAllHabitsDone(state, dateStr)) {
    status = isBounceback ? 'bounceback' : 'win';
  } else if (completedHabits > 0) {
    status = 'partial';
  } else {
    status = 'miss';
  }
  
  return {
    date: dateStr,
    status,
    completedHabits,
    totalHabits,
    isBounceback,
    canRecover,
  };
};

// Calculate weekly stats
export const calculateWeeklyStats = (state: AppState, weekStartDate?: Date): WeeklyStats => {
  const today = new Date();
  const weekStart = weekStartDate || startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    .filter(day => !isAfter(day, today)); // Only count days up to today
  
  let wins = 0;
  let bouncebacks = 0;
  let misses = 0;
  
  days.forEach(day => {
    const dayState = getDayStatus(state, day);
    if (dayState.status === 'win') {
      wins++;
    } else if (dayState.status === 'bounceback') {
      wins++; // Bounceback counts as a win
      bouncebacks++;
    } else if (dayState.status === 'miss' || dayState.status === 'partial') {
      misses++;
    }
  });
  
  const daysElapsed = Math.max(days.length, 1);
  const consistency = Math.round((wins / daysElapsed) * 100);
  
  // Determine weekly signal
  let signal: WeeklyStats['signal'];
  if (consistency >= 100) {
    signal = 'consistent';
  } else if (bouncebacks > 0 && consistency >= 70) {
    signal = 'recovered';
  } else if (bouncebacks > 0) {
    signal = 'bounceback';
  } else {
    signal = 'building';
  }
  
  return {
    weekStart: format(weekStart, "yyyy-MM-dd"),
    wins,
    bouncebacks,
    misses,
    consistency,
    signal,
  };
};

// Check if yesterday can be recovered (bounceback opportunity)
export const canRecoverYesterday = (state: AppState): { canRecover: boolean; missedHabits: string[] } => {
  const yesterday = subDays(new Date(), 1);
  const yesterdayStr = format(yesterday, "yyyy-MM-dd");
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  
  // Can only recover if yesterday is in the same week
  if (isBefore(yesterday, weekStart)) {
    return { canRecover: false, missedHabits: [] };
  }
  
  const dayState = getDayStatus(state, yesterday);
  
  if (dayState.status === 'miss' || dayState.status === 'partial') {
    const activeHabits = getActiveHabits(state);
    const missedHabits = activeHabits
      .filter(habit => 
        !state.dailyLogs.some(log => 
          log.habitId === habit.id && 
          log.date === yesterdayStr && 
          log.done
        )
      )
      .map(h => h.nome);
    
    return { canRecover: true, missedHabits };
  }
  
  return { canRecover: false, missedHabits: [] };
};

// Hook to get all bounceback data
export const useBounceback = (state: AppState) => {
  const weeklyStats = useMemo(() => calculateWeeklyStats(state), [state]);
  
  const yesterdayRecovery = useMemo(() => canRecoverYesterday(state), [state]);
  
  const todayState = useMemo(() => getDayStatus(state, new Date()), [state]);
  
  return {
    weeklyStats,
    yesterdayRecovery,
    todayState,
    getDayStatus: (date: Date) => getDayStatus(state, date),
  };
};

export default useBounceback;
