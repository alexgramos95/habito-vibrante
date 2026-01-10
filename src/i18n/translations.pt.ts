export const translations = {
  app: {
    title: "Rastreador de Hábitos",
    subtitle: "Construa melhores hábitos, um dia de cada vez",
  },
  dashboard: {
    title: "Dashboard",
    weeklyEvolution: "Evolução Semanal",
    monthlyCalendar: "Calendário Mensal",
  },
  kpis: {
    currentStreak: "Dias Seguidos",
    bestStreak: "Melhor Sequência",
    totalProgress: "Progresso Total",
    activeHabits: "Hábitos Ativos",
    days: "dias",
    ofTotal: "de um total de",
  },
  habits: {
    title: "Os Meus Hábitos",
    add: "Adicionar Hábito",
    edit: "Editar",
    delete: "Eliminar",
    name: "Nome do hábito",
    category: "Categoria",
    color: "Cor",
    active: "Ativo",
    inactive: "Inativo",
    noHabits: "Ainda não tens hábitos. Cria o primeiro!",
    confirmDelete: "Tens a certeza que queres eliminar este hábito?",
    atLeastOne: "Precisas de pelo menos um hábito ativo.",
    save: "Guardar",
    cancel: "Cancelar",
  },
  calendar: {
    weekdays: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    months: [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ],
  },
  chart: {
    week: "Semana",
    weekPrefix: "S",
    daysCompleted: "dias cumpridos",
    tooltip: "Semana S{week}: {days} dias",
  },
  feedback: {
    streakCongrats: "🔥 Excelente! Continua assim!",
    perfectWeek: "🏆 Semana perfeita!",
    goodProgress: "💪 Bom progresso!",
    keepGoing: "🚀 Continua a construir o teu ritmo!",
  },
  actions: {
    today: "Hoje",
    previousMonth: "Mês anterior",
    nextMonth: "Mês seguinte",
    reset: "Reiniciar",
    resetMonth: "Reiniciar mês",
    resetAll: "Reiniciar tudo",
  },
} as const;

export type TranslationKey = typeof translations;
