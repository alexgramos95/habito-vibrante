import { Habit } from "@/data/types";

/**
 * Sort habits chronologically by scheduledTime.
 * Habits with earlier times appear first.
 * Habits without a scheduled time go last.
 */
export const sortHabitsByTime = (habits: Habit[]): Habit[] => {
  return [...habits].sort((a, b) => {
    // Both have no time - maintain original order
    if (!a.scheduledTime && !b.scheduledTime) return 0;
    // Only a has no time - a goes last
    if (!a.scheduledTime) return 1;
    // Only b has no time - b goes last
    if (!b.scheduledTime) return -1;
    // Both have time - compare lexicographically (works for HH:MM format)
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
};

/**
 * Sort habits for a specific day of the week, filtering to only those scheduled for that day.
 */
export const getHabitsSortedForDay = (habits: Habit[], dayOfWeek: number): Habit[] => {
  const filtered = habits.filter(habit => {
    // If no scheduled days set, show every day
    if (!habit.scheduledDays || habit.scheduledDays.length === 0) {
      return true;
    }
    // Show only if this day is in the scheduled days
    return habit.scheduledDays.includes(dayOfWeek);
  });
  
  return sortHabitsByTime(filtered);
};
