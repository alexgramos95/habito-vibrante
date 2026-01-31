/**
 * PREMIUM MICROCOPY for becoMe
 * 
 * Tom: calmo, confiante, humano, sem pressão.
 * All copy should feel like a trusted friend, not a salesperson.
 */

import { FREE_LIMITS, APP_NAME } from "@/config/billing";

// ============================================
// TRIAL COPY
// ============================================
export const TRIAL_COPY = {
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
// FREE TIER COPY
// ============================================
export const FREE_COPY = {
  habitLimit: {
    pt: `Atingiste o máximo de ${FREE_LIMITS.maxHabits} hábitos no plano gratuito.`,
    en: `You've reached the ${FREE_LIMITS.maxHabits} habit limit on the free plan.`,
  },
  habitLimitCTA: {
    pt: "Desbloqueia hábitos ilimitados",
    en: "Unlock unlimited habits",
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
// PAYMENT COPY
// ============================================
export const PAYMENT_COPY = {
  processing: {
    pt: "A processar...",
    en: "Processing...",
  },
  success: {
    pt: "Bem-vindo ao PRO! 🎉",
    en: "Welcome to PRO! 🎉",
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
    pt: "Feedback enviado! 🙏",
    en: "Feedback sent! 🙏",
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
// GATING COPY
// ============================================
export const GATING_COPY = {
  title: {
    pt: "Funcionalidade PRO",
    en: "PRO Feature",
  },
  subtitle: {
    pt: (featureName: string) => `${featureName} está disponível no ${APP_NAME} PRO.`,
    en: (featureName: string) => `${featureName} is available in ${APP_NAME} PRO.`,
  },
  unlockCTA: {
    pt: "Desbloquear",
    en: "Unlock",
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
      pt: "Ainda sem hábitos",
      en: "No habits yet",
    },
    description: {
      pt: "Começa com um. Pequenas ações, grandes mudanças.",
      en: "Start with one. Small actions, big changes.",
    },
    cta: {
      pt: "Criar primeiro hábito",
      en: "Create first habit",
    },
  },
  trackers: {
    title: {
      pt: "Ainda sem trackers",
      en: "No trackers yet",
    },
    description: {
      pt: "Monitoriza comportamentos que queres mudar.",
      en: "Track behaviors you want to change.",
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
} as const;

// ============================================
// TOAST MESSAGES
// ============================================
export const TOAST_MESSAGES = {
  habitCompleted: {
    pt: (name: string) => `${name} ✓`,
    en: (name: string) => `${name} ✓`,
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
