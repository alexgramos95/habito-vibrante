import { 
  AppState, MonthlySummary, WeeklySummary, UserSavingsSummary, ACHIEVEMENTS,
  TobaccoSummary, PurchaseGoal
} from "@/data/types";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isAfter,
  isSameDay,
  parseISO,
  differenceInDays,
  subDays,
  getDaysInMonth as dateFnsGetDaysInMonth,
  addDays,
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
  
  days.forEach((day, index) => {
    const dayOfWeek = day.getDay();
    const isMonday = dayOfWeek === 1;
    const isFirstDay = index === 0;
    
    if (isFirstDay || isMonday) {
      if (isFirstDay && !isMonday) {
        weeks.set(weekCounter, [day]);
      } else if (isMonday) {
        weekCounter = weeks.size + 1;
        weeks.set(weekCounter, [day]);
      }
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

// Check if at least one habit was completed on a given date
export const hasAnyHabitDone = (state: AppState, date: Date): boolean => {
  const dateStr = formatDate(date);
  return state.dailyLogs.some((log) => log.date === dateStr && log.done);
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

// Calculate streak based on at least 1 habit done per day
export const calculateCurrentStreak = (state: AppState): number => {
  if (state.dailyLogs.length === 0) return 0;
  
  let streak = 0;
  let currentDate = new Date();
  
  // Check if today has any habit done, if not start from yesterday
  if (!hasAnyHabitDone(state, currentDate)) {
    currentDate = subDays(currentDate, 1);
  }
  
  while (hasAnyHabitDone(state, currentDate)) {
    streak++;
    currentDate = subDays(currentDate, 1);
  }
  
  return streak;
};

export const calculateBestStreak = (state: AppState): number => {
  if (state.dailyLogs.length === 0) return 0;
  
  // Get all unique dates from logs where done=true
  const allDates = [...new Set(
    state.dailyLogs
      .filter((l) => l.done)
      .map((l) => l.date)
  )].sort();
  
  if (allDates.length === 0) return 0;
  
  let bestStreak = 0;
  let currentStreak = 0;
  let previousDate: Date | null = null;
  
  allDates.forEach((dateStr) => {
    const date = parseISO(dateStr);
    
    if (previousDate && differenceInDays(date, previousDate) === 1) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    bestStreak = Math.max(bestStreak, currentStreak);
    previousDate = date;
  });
  
  return bestStreak;
};

// Calculate weekly summaries - count total habits completed per week
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
      const dateStr = formatDate(day);
      // Count total habits completed for each day in the week
      activeHabits.forEach((habit) => {
        if (state.dailyLogs.some((log) => log.habitId === habit.id && log.date === dateStr && log.done)) {
          totalDone++;
        }
      });
    });
    
    const totalPossible = days.length * activeHabits.length;
    
    return {
      weekNumber: weekNumber as 1 | 2 | 3 | 4 | 5,
      weekLabel: `S${weekNumber}`,
      totalDone,
      totalPossible: Math.max(totalPossible, 1),
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
  
  // Only count days up to today for current month
  const relevantDays = days.filter(
    (day) => !isAfter(day, today) || isSameDay(day, today)
  );
  
  // Count total habits completed in the month
  let totalDone = 0;
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  
  state.dailyLogs.forEach((log) => {
    if (log.done && log.date.startsWith(monthStr)) {
      // Only count if the habit is currently active
      if (activeHabits.some((h) => h.id === log.habitId)) {
        totalDone++;
      }
    }
  });
  
  // Calculate total possible = days * active habits
  const totalPossible = relevantDays.length * activeHabits.length;
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

// Dynamic motivational messages
export const getMotivationalMessage = (
  summary: MonthlySummary,
  hasHabits: boolean
): string => {
  // No habits scenario
  if (!hasHabits || summary.habitosAtivos === 0) {
    return "Começa hoje. Pequenos passos criam grandes mudanças.";
  }
  
  // No streak yet
  if (summary.streakAtual === 0) {
    return "🚀 Começa hoje. Pequenos passos criam grandes mudanças.";
  }
  
  // Progress-based messages
  if (summary.progressoMensal > 70) {
    return `🌟 Excelente! Já concluíste ${Math.round(summary.progressoMensal)}% deste mês.`;
  }
  
  // Streak-based messages
  if (summary.streakAtual === summary.melhorStreak && summary.streakAtual > 0) {
    return "🔥 Estás a igualar o teu melhor momento. Continua!";
  }
  
  if (summary.streakAtual > 0 && summary.streakAtual < summary.melhorStreak) {
    const daysToRecord = summary.melhorStreak - summary.streakAtual;
    return `💪 Estás a ${daysToRecord} dia${daysToRecord > 1 ? 's' : ''} de igualar o teu recorde.`;
  }
  
  if (summary.progressoMensal >= 30 && summary.progressoMensal <= 70) {
    return "👍 Bom ritmo. Mantém a consistência e vais mais longe.";
  }
  
  if (summary.progressoMensal < 30) {
    return "🌱 Começos são sempre os mais difíceis. Um hábito de cada vez.";
  }
  
  return "🚀 Continua a construir o teu ritmo!";
};

// Check and award achievements
export const checkAchievements = (state: AppState): string[] => {
  const newAchievements: string[] = [];
  const currentAchievements = state.gamification.conquistas;
  const streakAtual = calculateCurrentStreak(state);
  const bestStreak = calculateBestStreak(state);
  
  // 7-day streak achievement
  if (bestStreak >= 7 && !currentAchievements.includes("streak_7")) {
    newAchievements.push("streak_7");
  }
  
  // 14-day streak achievement
  if (bestStreak >= 14 && !currentAchievements.includes("streak_14")) {
    newAchievements.push("streak_14");
  }
  
  // 30-day streak achievement
  if (bestStreak >= 30 && !currentAchievements.includes("streak_30")) {
    newAchievements.push("streak_30");
  }
  
  // Check for "mes_30" - 30 unique days with at least 1 habit done in current month
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  
  const uniqueDaysInMonth = new Set(
    state.dailyLogs
      .filter((l) => l.done && l.date.startsWith(monthStr))
      .map((l) => l.date)
  );
  
  if (uniqueDaysInMonth.size >= 30 && !currentAchievements.includes("mes_30")) {
    newAchievements.push("mes_30");
  }
  
  // Check for "tres_habitos_ativos" - 3+ active habits with at least 1 log each in the month
  const activeHabits = getActiveHabits(state);
  if (activeHabits.length >= 3 && !currentAchievements.includes("tres_habitos_ativos")) {
    const habitsWithLogsThisMonth = activeHabits.filter((habit) =>
      state.dailyLogs.some(
        (log) => log.habitId === habit.id && log.done && log.date.startsWith(monthStr)
      )
    );
    
    if (habitsWithLogsThisMonth.length >= 3) {
      newAchievements.push("tres_habitos_ativos");
    }
  }
  
  return newAchievements;
};

// Savings computations
export const calculateSavingsSummary = (
  state: AppState,
  year: number,
  month: number
): UserSavingsSummary => {
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  
  const entriesThisMonth = state.savings.filter((s) => s.date.startsWith(monthStr));
  
  const totalPoupadoAllTime = state.savings.reduce((sum, s) => sum + s.amount, 0);
  const totalPoupadoMesAtual = entriesThisMonth.reduce((sum, s) => sum + s.amount, 0);
  
  return {
    totalPoupadoAllTime,
    totalPoupadoMesAtual,
    numeroEntradasMesAtual: entriesThisMonth.length,
  };
};

// Shopping list computations
export const getShoppingItemsForWeek = (
  state: AppState,
  weekStartDate: string
): { items: typeof state.shoppingItems; doneCount: number; totalCount: number } => {
  const items = state.shoppingItems.filter((s) => s.weekStartDate === weekStartDate);
  const doneCount = items.filter((s) => s.done).length;
  
  return {
    items,
    doneCount,
    totalCount: items.length,
  };
};

// Level progress calculation
export const getLevelProgress = (pontos: number): { current: number; nextLevel: number; progress: number } => {
  const nivel = Math.floor(pontos / 500) + 1;
  const pontosNoNivelAtual = pontos % 500;
  const progress = (pontosNoNivelAtual / 500) * 100;
  
  return {
    current: nivel,
    nextLevel: nivel + 1,
    progress,
  };
};

// ============= TOBACCO COMPUTATIONS =============

export const calculateTobaccoSummary = (state: AppState): TobaccoSummary => {
  const { tobaccoConfig, cigaretteLogs } = state;
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  
  // Unit price per cigarette
  const valorUnit = tobaccoConfig.precoPorMaco / tobaccoConfig.numCigarrosPorMaco;
  const baselineFinanceiro = tobaccoConfig.baselineDeclarado * valorUnit;
  
  // Today's consumption
  const consumoHoje = cigaretteLogs.filter(l => l.date === todayStr).length;
  const consumoHojeFinanceiro = consumoHoje * valorUnit;
  const poupancaHoje = Math.max(0, baselineFinanceiro - consumoHojeFinanceiro);
  
  // Monthly consumption
  const currentMonth = format(today, "yyyy-MM");
  const logsThisMonth = cigaretteLogs.filter(l => l.date.startsWith(currentMonth));
  const daysThisMonth = today.getDate();
  const baselineMensal = baselineFinanceiro * daysThisMonth;
  const consumoMensal = logsThisMonth.length * valorUnit;
  const poupancaMensal = Math.max(0, baselineMensal - consumoMensal);
  
  // Accumulated savings (all time)
  const allUniqueDates = [...new Set(cigaretteLogs.map(l => l.date))];
  const firstLogDate = allUniqueDates.length > 0 
    ? parseISO(allUniqueDates.sort()[0])
    : today;
  const totalDays = Math.max(1, differenceInDays(today, firstLogDate) + 1);
  const totalBaseline = baselineFinanceiro * totalDays;
  const totalConsumo = cigaretteLogs.length * valorUnit;
  const poupancaAcumulada = Math.max(0, totalBaseline - totalConsumo);
  
  // Calculate streaks
  let streakDiasAbaixoBaseline = 0;
  let streakDiasZero = 0;
  let checkDate = today;
  
  // Streak: days below baseline
  while (true) {
    const dateStr = format(checkDate, "yyyy-MM-dd");
    const count = cigaretteLogs.filter(l => l.date === dateStr).length;
    if (count < tobaccoConfig.baselineDeclarado) {
      streakDiasAbaixoBaseline++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
    if (differenceInDays(today, checkDate) > 365) break; // Safety limit
  }
  
  // Streak: zero cigarette days
  checkDate = today;
  while (true) {
    const dateStr = format(checkDate, "yyyy-MM-dd");
    const count = cigaretteLogs.filter(l => l.date === dateStr).length;
    if (count === 0) {
      streakDiasZero++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
    if (differenceInDays(today, checkDate) > 365) break;
  }
  
  // 30-day moving average
  const last30Days: string[] = [];
  for (let i = 0; i < 30; i++) {
    last30Days.push(format(subDays(today, i), "yyyy-MM-dd"));
  }
  const logsLast30 = cigaretteLogs.filter(l => last30Days.includes(l.date));
  const mediaUltimos30Dias = logsLast30.length / 30;
  
  return {
    consumoHoje,
    poupancaHoje,
    poupancaMensal,
    poupancaAcumulada,
    streakDiasAbaixoBaseline,
    streakDiasZero,
    mediaUltimos30Dias,
  };
};

export const getTobaccoDailyData = (
  state: AppState,
  year: number,
  month: number
): { date: string; consumo: number; baseline: number; poupanca: number }[] => {
  const { tobaccoConfig, cigaretteLogs } = state;
  const valorUnit = tobaccoConfig.precoPorMaco / tobaccoConfig.numCigarrosPorMaco;
  const baselineFinanceiro = tobaccoConfig.baselineDeclarado * valorUnit;
  
  const days = getDaysInMonth(year, month);
  const today = new Date();
  
  return days
    .filter(day => !isAfter(day, today))
    .map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const consumo = cigaretteLogs.filter(l => l.date === dateStr).length;
      const consumoFinanceiro = consumo * valorUnit;
      const poupanca = Math.max(0, baselineFinanceiro - consumoFinanceiro);
      
      return {
        date: dateStr,
        consumo,
        baseline: tobaccoConfig.baselineDeclarado,
        poupanca,
      };
    });
};

// ============= PURCHASE GOALS COMPUTATIONS =============

export const calculateGoalProgress = (goal: PurchaseGoal): {
  totalContribuido: number;
  percentual: number;
  diasRestantes: number;
  previsaoDias: number;
  acimaDoPrazo: boolean;
  mediaContribuicaoDiaria: number;
} => {
  const totalContribuido = goal.contribuicoes.reduce((sum, c) => sum + c.amount, 0);
  const percentual = (totalContribuido / goal.valorAlvo) * 100;
  
  const dataInicio = parseISO(goal.dataInicio);
  const dataFim = addDays(dataInicio, goal.prazoEmDias);
  const today = new Date();
  const diasRestantes = Math.max(0, differenceInDays(dataFim, today));
  
  // Calculate average daily contribution
  const diasPassados = Math.max(1, differenceInDays(today, dataInicio));
  const mediaContribuicaoDiaria = totalContribuido / diasPassados;
  
  // Forecast days to complete at current rate
  const valorRestante = goal.valorAlvo - totalContribuido;
  const previsaoDias = mediaContribuicaoDiaria > 0 
    ? Math.ceil(valorRestante / mediaContribuicaoDiaria)
    : Infinity;
  
  // Check if above expected pace
  const esperadoAgora = (diasPassados / goal.prazoEmDias) * goal.valorAlvo;
  const acimaDoPrazo = totalContribuido >= esperadoAgora;
  
  return {
    totalContribuido,
    percentual: Math.min(100, percentual),
    diasRestantes,
    previsaoDias: previsaoDias === Infinity ? 999 : previsaoDias,
    acimaDoPrazo,
    mediaContribuicaoDiaria,
  };
};

export const getFinancialKPIs = (state: AppState, year: number, month: number): {
  poupancaTabaco: number;
  contribuicoesInvestimento: number;
  comprasMetas: number;
  totalPoupado: number;
} => {
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  
  // Tobacco savings for month
  const tobaccoSummary = calculateTobaccoSummary(state);
  const poupancaTabaco = tobaccoSummary.poupancaMensal;
  
  // Investment contributions for month
  const contribuicoesInvestimento = state.purchaseGoals
    .flatMap(g => g.contribuicoes)
    .filter(c => c.date.startsWith(monthStr) && c.fonte === 'investimento')
    .reduce((sum, c) => sum + c.amount, 0);
  
  // Purchases made from goals this month
  const comprasMetas = state.purchaseGoals
    .filter(g => g.completed && g.purchaseDetails?.data.startsWith(monthStr))
    .reduce((sum, g) => sum + (g.purchaseDetails?.precoFinal || 0), 0);
  
  // Regular savings
  const savingsThisMonth = state.savings
    .filter(s => s.date.startsWith(monthStr))
    .reduce((sum, s) => sum + s.amount, 0);
  
  return {
    poupancaTabaco,
    contribuicoesInvestimento,
    comprasMetas,
    totalPoupado: poupancaTabaco + savingsThisMonth,
  };
};

export const getMotivationalFinanceMessage = (
  tobaccoSummary: TobaccoSummary,
  goalProgress?: { percentual: number; diasRestantes: number; acimaDoPrazo: boolean }
): string => {
  if (tobaccoSummary.poupancaHoje > 0) {
    return `💰 Hoje poupaste ${tobaccoSummary.poupancaHoje.toFixed(2)}€ por reduzir cigarros!`;
  }
  
  if (tobaccoSummary.streakDiasZero > 0) {
    return `🌟 ${tobaccoSummary.streakDiasZero} dias sem fumar! Continua assim!`;
  }
  
  if (goalProgress && goalProgress.acimaDoPrazo) {
    return `🚀 A este ritmo cumpres a meta antes do prazo!`;
  }
  
  if (tobaccoSummary.streakDiasAbaixoBaseline > 3) {
    return `📉 ${tobaccoSummary.streakDiasAbaixoBaseline} dias abaixo do baseline. Boa redução!`;
  }
  
  return `💪 Cada pequena poupança conta para os teus objetivos!`;
};
