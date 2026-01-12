import { useState, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { AppState, Habit, Tracker, TrackerEntry, DailyLog, ShoppingItem } from '@/data/types';
import { generateId } from '@/data/storage';
import { track } from './useAnalytics';

const DEMO_MODE_KEY = 'become-demo-mode';

// Demo data for App Store screenshots + marketing
const generateDemoData = (): Partial<AppState> => {
  const today = new Date();
  
  const habits: Habit[] = [
    { id: 'demo-habit-1', nome: 'Morning Workout', categoria: 'Health', cor: '#14b8a6', active: true, createdAt: subDays(today, 30).toISOString(), scheduledTime: '07:00', scheduledDays: [1, 2, 3, 4, 5, 6, 0] },
    { id: 'demo-habit-2', nome: 'Read 30 minutes', categoria: 'Growth', cor: '#8b5cf6', active: true, createdAt: subDays(today, 30).toISOString(), scheduledTime: '21:00', scheduledDays: [1, 2, 3, 4, 5, 6, 0] },
    { id: 'demo-habit-3', nome: 'Meditate', categoria: 'Mindfulness', cor: '#f59e0b', active: true, createdAt: subDays(today, 30).toISOString(), scheduledTime: '06:30', scheduledDays: [1, 2, 3, 4, 5, 6, 0] },
  ];
  
  const trackers: Tracker[] = [
    { id: 'demo-tracker-1', name: 'Coffees', icon: '☕', type: 'reduce', inputMode: 'incremental', unitSingular: 'coffee', unitPlural: 'coffees', baseline: 4, dailyGoal: 2, valuePerUnit: 3.50, includeInFinances: true, frequency: 'daily', active: true, createdAt: subDays(today, 30).toISOString() },
    { id: 'demo-tracker-2', name: 'Water', icon: '💧', type: 'increase', inputMode: 'incremental', unitSingular: 'glass', unitPlural: 'glasses', baseline: 4, dailyGoal: 8, valuePerUnit: 0, includeInFinances: false, frequency: 'daily', active: true, createdAt: subDays(today, 30).toISOString() },
  ];
  
  const dailyLogs: DailyLog[] = [];
  for (let i = 0; i < 30; i++) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    habits.forEach(habit => {
      if (Math.random() < 0.85) {
        dailyLogs.push({ id: generateId(), habitId: habit.id, date, done: true });
      }
    });
  }
  
  const trackerEntries: TrackerEntry[] = [];
  for (let i = 0; i < 30; i++) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    trackerEntries.push({ id: generateId(), trackerId: 'demo-tracker-1', date, quantity: Math.max(1, 4 - Math.floor(i / 10)), timestamp: `${date}T08:00:00` });
  }
  
  return {
    habits, trackers, dailyLogs, trackerEntries, shoppingItems: [],
    gamification: { pontos: 2450, nivel: 5, conquistas: ['streak_7', 'streak_14'], consistencyScore: 85, currentStreak: 14, bestStreak: 21 },
    reflections: [{ id: 'demo-ref-1', date: format(today, 'yyyy-MM-dd'), text: 'Feeling stronger and more focused.', mood: 'positive', createdAt: today.toISOString() }],
    futureSelf: [{ id: 'demo-fs-1', date: format(subDays(today, 7), 'yyyy-MM-dd'), narrative: 'In 6 months, I am disciplined and focused.', themes: ['Disciplined', 'Focused', 'Healthy'], createdAt: subDays(today, 7).toISOString() }],
    savings: [],
  };
};

export const useDemoMode = () => {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    try { return localStorage.getItem(DEMO_MODE_KEY) === 'true'; } catch { return false; }
  });
  
  const enableDemoMode = useCallback(() => {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    setIsDemoMode(true);
    track('screenshots_mode');
    const demoData = generateDemoData();
    const currentState = JSON.parse(localStorage.getItem('itero-state') || '{}');
    localStorage.setItem('itero-state-backup', JSON.stringify(currentState));
    localStorage.setItem('itero-state', JSON.stringify({ ...currentState, ...demoData }));
    window.location.reload();
  }, []);
  
  const disableDemoMode = useCallback(() => {
    localStorage.removeItem(DEMO_MODE_KEY);
    setIsDemoMode(false);
    const backup = localStorage.getItem('itero-state-backup');
    if (backup) { localStorage.setItem('itero-state', backup); localStorage.removeItem('itero-state-backup'); }
    window.location.reload();
  }, []);
  
  return { isDemoMode, enableDemoMode, disableDemoMode, getDemoData: generateDemoData };
};
