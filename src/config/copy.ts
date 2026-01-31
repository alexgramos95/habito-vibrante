/**
 * PREMIUM MICROCOPY for becoMe
 * 
 * Tom: calmo, confiante, humano, sem pressão.
 * A becoMe acompanha. Não empurra.
 */

import { FREE_LIMITS, APP_NAME } from "@/config/billing";

// ============================================
// LANDING COPY
// ============================================
export const LANDING_COPY = {
  headline: {
    pt: "Torna-te consistente, um dia de cada vez.",
    en: "Become consistent, one day at a time.",
  },
  subheadline: {
    pt: "A becoMe ajuda-te a criar hábitos com intenção, clareza e continuidade.",
    en: "becoMe helps you build habits with intention, clarity, and continuity.",
  },
  ctaPrimary: {
    pt: "Começar agora",
    en: "Start now",
  },
  ctaSecondary: {
    pt: "Saber mais",
    en: "Learn more",
  },
} as const;

// ============================================
// ONBOARDING COPY
// ============================================
export const ONBOARDING_COPY = {
  screen1: {
    pt: "A consistência não nasce da força.\nNasce da repetição certa.",
    en: "Consistency doesn't come from force.\nIt comes from the right repetition.",
  },
  screen2: {
    pt: "Pequenas ações, feitas com intenção, mudam tudo.",
    en: "Small actions, done with intention, change everything.",
  },
  screen3: {
    pt: "A becoMe não te cobra perfeição.\nAjuda-te a manter presença.",
    en: "becoMe doesn't demand perfection.\nIt helps you stay present.",
  },
  ctaFinal: {
    pt: "Criar o meu primeiro hábito",
    en: "Create my first habit",
  },
} as const;

// ============================================
// HABITS COPY
// ============================================
export const HABITS_COPY = {
  title: {
    pt: "Os teus hábitos",
    en: "Your habits",
  },
  emptyTitle: {
    pt: "Começa com um hábito simples.",
    en: "Start with a simple habit.",
  },
  emptyDescription: {
    pt: "A consistência constrói-se passo a passo.",
    en: "Consistency builds step by step.",
  },
  addButton: {
    pt: "Adicionar hábito",
    en: "Add habit",
  },
} as const;

// ============================================
// HABIT COMPLETION FEEDBACK (alternating)
// ============================================
export const HABIT_FEEDBACK = {
  messages: {
    pt: ["Feito.", "Bom ritmo hoje."],
    en: ["Done.", "Good rhythm today."],
  },
} as const;

// ============================================
// CALENDAR COPY
// ============================================
export const CALENDAR_COPY = {
  title: {
    pt: "Calendário",
    en: "Calendar",
  },
  weekSummary: {
    pt: "Esta semana mantiveste presença.",
    en: "This week you stayed present.",
  },
  daySummary: {
    pt: "Hábitos concluídos hoje",
    en: "Habits completed today",
  },
} as const;

// ============================================
// WEEKLY INSIGHTS (rotational, show 1 per week)
// ============================================
export const WEEKLY_INSIGHTS = {
  messages: {
    pt: [
      "Esta semana foste mais consistente do que na anterior.",
      "Os teus hábitos funcionam melhor no início do dia.",
      "Mesmo nos dias incompletos, mantiveste presença.",
      "Este hábito foi o mais estável esta semana.",
      "Nem todas as semanas são iguais — e isso também conta.",
    ],
    en: [
      "This week you were more consistent than the last.",
      "Your habits work better in the morning.",
      "Even on incomplete days, you stayed present.",
      "This habit was the most stable this week.",
      "Not all weeks are equal — and that counts too.",
    ],
  },
} as const;

// ============================================
// TRACKERS COPY
// ============================================
export const TRACKERS_COPY = {
  title: {
    pt: "Trackers",
    en: "Trackers",
  },
  description: {
    pt: "Observa padrões ao longo do tempo, sem pressão.",
    en: "Observe patterns over time, without pressure.",
  },
  emptyTitle: {
    pt: "Os trackers ajudam-te a ver tendências.",
    en: "Trackers help you see trends.",
  },
  emptyDescription: {
    pt: "Não precisam de ser perfeitos.",
    en: "They don't need to be perfect.",
  },
} as const;

// ============================================
// SHOPPING COPY
// ============================================
export const SHOPPING_COPY = {
  title: {
    pt: "Compras",
    en: "Shopping",
  },
  description: {
    pt: "Acompanha gastos com clareza, não com culpa.",
    en: "Track expenses with clarity, not guilt.",
  },
  emptyState: {
    pt: "Regista apenas o que faz sentido acompanhar.",
    en: "Only log what makes sense to track.",
  },
} as const;

// ============================================
// PROFILE COPY
// ============================================
export const PROFILE_COPY = {
  title: {
    pt: "Perfil",
    en: "Profile",
  },
  subtitle: {
    pt: "O teu espaço pessoal de progresso.",
    en: "Your personal progress space.",
  },
  proPlan: {
    pt: "becoMe PRO ativo",
    en: "becoMe PRO active",
  },
  freePlan: {
    pt: "Versão gratuita",
    en: "Free version",
  },
} as const;

// ============================================
// GATING COPY (PRO Features)
// ============================================
export const GATING_COPY = {
  title: {
    pt: "Desbloqueia esta funcionalidade",
    en: "Unlock this feature",
  },
  subtitle: {
    pt: "Esta área faz parte da versão PRO da becoMe.\nDá-te mais clareza, sem complicar.",
    en: "This area is part of the PRO version of becoMe.\nIt gives you more clarity, without complications.",
  },
  unlockCTA: {
    pt: "Desbloquear PRO",
    en: "Unlock PRO",
  },
  backCTA: {
    pt: "Voltar",
    en: "Go back",
  },
  freePlan: {
    pt: "Plano Gratuito",
    en: "Free Plan",
  },
  freePlanLimits: {
    pt: `${FREE_LIMITS.maxHabits} hábitos • Calendário • Perfil`,
    en: `${FREE_LIMITS.maxHabits} habits • Calendar • Profile`,
  },
} as const;

// ============================================
// FREE LIMIT COPY (3 Habits)
// ============================================
export const FREE_COPY = {
  habitLimit: {
    pt: `Na versão gratuita podes criar até ${FREE_LIMITS.maxHabits} hábitos.\nA versão PRO remove este limite.`,
    en: `On the free version you can create up to ${FREE_LIMITS.maxHabits} habits.\nThe PRO version removes this limit.`,
  },
  habitLimitCTA: {
    pt: "Desbloquear PRO",
    en: "Unlock PRO",
  },
  trackerLimit: {
    pt: "Trackers são uma funcionalidade PRO.",
    en: "Trackers are a PRO feature.",
  },
  trackerLimitCTA: {
    pt: "Experimenta trackers",
    en: "Try trackers",
  },
  pageBlocked: {
    pt: (pageName: string) => `${pageName} faz parte do ${APP_NAME} PRO.`,
    en: (pageName: string) => `${pageName} is part of ${APP_NAME} PRO.`,
  },
  pageBlockedCTA: {
    pt: "Ver planos",
    en: "See plans",
  },
  remainingHabits: {
    pt: (remaining: number) => remaining === 1 
      ? "Podes criar mais 1 hábito" 
      : `Podes criar mais ${remaining} hábitos`,
    en: (remaining: number) => remaining === 1 
      ? "You can create 1 more habit" 
      : `You can create ${remaining} more habits`,
  },
} as const;

// ============================================
// TRIAL COPY
// ============================================
export const TRIAL_COPY = {
  banner: {
    pt: (days: number) => `Trial PRO — faltam ${days} dia${days === 1 ? "" : "s"}`,
    en: (days: number) => `PRO Trial — ${days} day${days === 1 ? "" : "s"} left`,
  },
  lastDay: {
    pt: "O teu trial PRO termina hoje.\nPodes continuar gratuitamente ou desbloquear todas as funcionalidades.",
    en: "Your PRO trial ends today.\nYou can continue for free or unlock all features.",
  },
  active: {
    pt: (days: number) => days === 1 
      ? "1 dia de trial PRO" 
      : `${days} dias de trial PRO`,
    en: (days: number) => days === 1 
      ? "1 day PRO trial" 
      : `${days} days PRO trial`,
  },
  lastHours: {
    pt: (hours: number) => `${hours}h de trial restantes`,
    en: (hours: number) => `${hours}h trial remaining`,
  },
  expiring: {
    pt: "O teu trial está a terminar. Continua sem interrupções.",
    en: "Your trial is ending. Continue without interruption.",
  },
  expired: {
    pt: "O teu trial terminou. Escolhe como continuar.",
    en: "Your trial ended. Choose how to continue.",
  },
} as const;

// ============================================
// PAYWALL COPY (CRITICAL)
// ============================================
export const PAYWALL_COPY = {
  headline: {
    pt: "Desbloqueia a tua versão consistente",
    en: "Unlock your consistent self",
  },
  subheadline: {
    pt: "A becoMe PRO ajuda-te a transformar intenção em identidade.",
    en: "becoMe PRO helps you transform intention into identity.",
  },
  benefits: {
    pt: [
      "Hábitos e trackers sem limites",
      "Padrões claros ao longo do tempo",
      "Visão semanal e mensal",
      "Tudo sincronizado, sem distrações",
    ],
    en: [
      "Habits and trackers without limits",
      "Clear patterns over time",
      "Weekly and monthly views",
      "Everything synced, no distractions",
    ],
  },
  plans: {
    monthly: {
      label: { pt: "Mensal", en: "Monthly" },
      description: { pt: "Para quem quer flexibilidade.", en: "For those who want flexibility." },
    },
    yearly: {
      label: { pt: "Anual", en: "Yearly" },
      description: { pt: "Melhor valor. Menos de €5 por mês.", en: "Best value. Less than €5 per month." },
      badge: { pt: "Mais escolhido", en: "Most chosen" },
    },
    lifetime: {
      label: { pt: "Vitalício", en: "Lifetime" },
      description: { pt: "Para quem leva a consistência a sério.", en: "For those who take consistency seriously." },
    },
  },
  ctaPrimary: {
    pt: "Desbloquear a becoMe completa",
    en: "Unlock the full becoMe",
  },
  ctaSecondary: {
    pt: "Talvez mais tarde",
    en: "Maybe later",
  },
  trustSignals: {
    pt: "Cancelas quando quiseres · Sem anúncios · Dados privados · Pagamento seguro",
    en: "Cancel anytime · No ads · Private data · Secure payment",
  },
} as const;

// ============================================
// REVIEW REQUEST COPY
// ============================================
export const REVIEW_COPY = {
  title: {
    pt: "Estás a gostar da becoMe?",
    en: "Are you enjoying becoMe?",
  },
  description: {
    pt: "Se a app te tem ajudado a manter consistência, uma avaliação ajuda-nos a continuar a melhorá-la.",
    en: "If the app has helped you stay consistent, a review helps us continue improving it.",
  },
  ctaReview: {
    pt: "Avaliar",
    en: "Review",
  },
  ctaLater: {
    pt: "Mais tarde",
    en: "Later",
  },
} as const;

// ============================================
// PAYMENT COPY
// ============================================
export const PAYMENT_COPY = {
  processing: {
    pt: "A processar...",
    en: "Processing...",
  },
  success: {
    pt: "Bem-vindo ao PRO!",
    en: "Welcome to PRO!",
  },
  successDescription: {
    pt: "Todas as funcionalidades estão agora desbloqueadas.",
    en: "All features are now unlocked.",
  },
  cancelled: {
    pt: "Compra cancelada",
    en: "Purchase cancelled",
  },
  cancelledDescription: {
    pt: "Sem stress. Podes continuar quando quiseres.",
    en: "No worries. You can continue anytime.",
  },
  error: {
    pt: "Algo correu mal",
    en: "Something went wrong",
  },
  errorDescription: {
    pt: "Tenta novamente ou contacta o suporte.",
    en: "Please try again or contact support.",
  },
  retryButton: {
    pt: "Tentar novamente",
    en: "Try again",
  },
} as const;

// ============================================
// FEEDBACK COPY
// ============================================
export const FEEDBACK_COPY = {
  sent: {
    pt: "Feedback enviado!",
    en: "Feedback sent!",
  },
  sentDescription: {
    pt: "Obrigado por partilhares. A tua opinião ajuda-nos a melhorar.",
    en: "Thanks for sharing. Your input helps us improve.",
  },
  error: {
    pt: "Não foi possível enviar",
    en: "Couldn't send",
  },
  errorDescription: {
    pt: "Tenta novamente em alguns segundos.",
    en: "Please try again in a few seconds.",
  },
} as const;

// ============================================
// UPGRADE COPY
// ============================================
export const UPGRADE_COPY = {
  cta: {
    pt: "Explorar PRO",
    en: "Explore PRO",
  },
  restore: {
    pt: "Restaurar compra",
    en: "Restore purchase",
  },
  maybeLater: {
    pt: "Talvez depois",
    en: "Maybe later",
  },
  continueWithFree: {
    pt: "Continuar com FREE",
    en: "Continue with FREE",
  },
  termsPrefix: {
    pt: "Subscrições renovam automaticamente. Cancela a qualquer momento.",
    en: "Subscriptions auto-renew. Cancel anytime.",
  },
} as const;

// ============================================
// PWA COPY
// ============================================
export const PWA_COPY = {
  updateAvailable: {
    pt: "Nova versão disponível",
    en: "New version available",
  },
  updateDescription: {
    pt: "Atualiza para a versão mais recente.",
    en: "Update to the latest version.",
  },
  updateCTA: {
    pt: "Atualizar",
    en: "Update",
  },
  dismiss: {
    pt: "Mais tarde",
    en: "Later",
  },
} as const;

// ============================================
// EMPTY STATES
// ============================================
export const EMPTY_STATES = {
  habits: {
    title: {
      pt: "Começa com um hábito simples.",
      en: "Start with a simple habit.",
    },
    description: {
      pt: "A consistência constrói-se passo a passo.",
      en: "Consistency builds step by step.",
    },
    cta: {
      pt: "Adicionar hábito",
      en: "Add habit",
    },
  },
  trackers: {
    title: {
      pt: "Os trackers ajudam-te a ver tendências.",
      en: "Trackers help you see trends.",
    },
    description: {
      pt: "Não precisam de ser perfeitos.",
      en: "They don't need to be perfect.",
    },
    cta: {
      pt: "Criar primeiro tracker",
      en: "Create first tracker",
    },
  },
  calendar: {
    title: {
      pt: "Sem atividade",
      en: "No activity",
    },
    description: {
      pt: "Marca hábitos para ver o teu progresso aqui.",
      en: "Complete habits to see your progress here.",
    },
  },
  shopping: {
    title: {
      pt: "Regista apenas o que faz sentido acompanhar.",
      en: "Only log what makes sense to track.",
    },
  },
} as const;

// ============================================
// TOAST MESSAGES
// ============================================
export const TOAST_MESSAGES = {
  habitCompleted: {
    pt: () => HABIT_FEEDBACK.messages.pt[Math.floor(Math.random() * HABIT_FEEDBACK.messages.pt.length)],
    en: () => HABIT_FEEDBACK.messages.en[Math.floor(Math.random() * HABIT_FEEDBACK.messages.en.length)],
  },
  habitUncompleted: {
    pt: (name: string) => `${name} desmarcado`,
    en: (name: string) => `${name} unchecked`,
  },
  saved: {
    pt: "Guardado",
    en: "Saved",
  },
  deleted: {
    pt: "Eliminado",
    en: "Deleted",
  },
} as const;

// Helper to get weekly insight based on week number
export const getWeeklyInsight = (weekNumber: number, lang: "pt" | "en"): string => {
  const messages = WEEKLY_INSIGHTS.messages[lang];
  const index = weekNumber % messages.length;
  return messages[index];
};