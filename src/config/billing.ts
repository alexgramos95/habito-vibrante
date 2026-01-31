/**
 * SINGLE SOURCE OF TRUTH for all billing/pricing in becoMe
 * 
 * ALL pricing, Stripe IDs, and limits are defined here.
 * Do NOT hardcode prices or Stripe IDs anywhere else.
 */

// ============================================
// STRIPE PRICE IDS (Production - January 2026)
// ============================================
export const STRIPE_PRICE_IDS = {
  monthly: "price_1SvNnvPEplRqsp5IM3Q8fFXr",
  yearly: "price_1SvNpwPEplRqsp5IyW3A5VZv",
  lifetime: "price_1SvNtBPEplRqsp5IhDXGblEB",
} as const;

export type PlanType = keyof typeof STRIPE_PRICE_IDS;

// ============================================
// PRICING DISPLAY
// ============================================
export interface PricingPlan {
  id: PlanType;
  priceId: string;
  price: number;
  currency: "EUR";
  period: "month" | "year" | "once";
  mode: "subscription" | "payment";
  // Localized labels
  label: { en: string; pt: string };
  periodLabel: { en: string; pt: string };
  description: { en: string; pt: string };
  // Optional badges/discounts
  badge?: { en: string; pt: string };
  monthlyEquivalent?: number;
  savingsPercent?: number;
  popular?: boolean;
}

export const PLANS: PricingPlan[] = [
  {
    id: "monthly",
    priceId: STRIPE_PRICE_IDS.monthly,
    price: 7.99,
    currency: "EUR",
    period: "month",
    mode: "subscription",
    label: { en: "Monthly", pt: "Mensal" },
    periodLabel: { en: "/month", pt: "/mês" },
    description: { en: "Full access, cancel anytime", pt: "Acesso completo, cancela quando quiseres" },
  },
  {
    id: "yearly",
    priceId: STRIPE_PRICE_IDS.yearly,
    price: 59.99,
    currency: "EUR",
    period: "year",
    mode: "subscription",
    label: { en: "Yearly", pt: "Anual" },
    periodLabel: { en: "/year", pt: "/ano" },
    description: { en: "Best value - save 37%", pt: "Melhor valor - poupa 37%" },
    badge: { en: "Best value", pt: "Melhor valor" },
    monthlyEquivalent: 5.00,
    savingsPercent: 37,
    popular: true,
  },
  {
    id: "lifetime",
    priceId: STRIPE_PRICE_IDS.lifetime,
    price: 149,
    currency: "EUR",
    period: "once",
    mode: "payment",
    label: { en: "Lifetime", pt: "Lifetime" },
    periodLabel: { en: "", pt: "" },
    description: { en: "Pay once, access forever", pt: "Paga uma vez, acesso para sempre" },
    badge: { en: "Founder Access", pt: "Founder Access" },
  },
];

// Helper to get plan by ID
export const getPlanById = (id: PlanType): PricingPlan => {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
};

// Helper to validate price ID
export const isValidPriceId = (priceId: string): boolean => {
  return Object.values(STRIPE_PRICE_IDS).includes(priceId as typeof STRIPE_PRICE_IDS[PlanType]);
};

// ============================================
// PRO FEATURES (for display)
// ============================================
export const PRO_FEATURES = {
  en: [
    "Build the person you want to become",
    "Track what matters without limits",
    "See your patterns, not just numbers",
    "Your journey, synced everywhere",
  ],
  pt: [
    "Constrói a pessoa que queres ser",
    "Acompanha o que importa, sem limites",
    "Vê os teus padrões, não apenas números",
    "O teu percurso, sincronizado em todo o lado",
  ],
} as const;

// Trust signals for paywall
export const TRUST_SIGNALS = {
  en: [
    "Cancel anytime",
    "No ads, ever",
    "Your data stays private",
    "Secure payment via Stripe",
  ],
  pt: [
    "Cancelas quando quiseres",
    "Sem anúncios",
    "Os teus dados são privados",
    "Pagamento seguro via Stripe",
  ],
} as const;

// ============================================
// FREE TIER LIMITS
// ============================================
export const FREE_LIMITS = {
  maxHabits: 3,
  maxTrackers: 0,
  // Pages allowed for FREE users
  allowedRoutes: ["/app", "/app/calendar", "/app/profile"],
} as const;

// ============================================
// TRIAL CONFIGURATION
// ============================================
export const TRIAL_CONFIG = {
  durationDays: 7,
  durationHours: 168, // 7 * 24
} as const;

// ============================================
// APP BRANDING
// ============================================
export const APP_NAME = "becoMe";
export const APP_TAGLINE = {
  en: "Rhythm. Consistency. Identity.",
  pt: "Ritmo. Consistência. Identidade.",
} as const;

export const PAYWALL_HEADLINE = {
  en: "Become who you're meant to be",
  pt: "Torna-te na pessoa que queres ser",
} as const;

export const PAYWALL_CTA = {
  en: "Unlock the full becoMe",
  pt: "Desbloquear a becoMe completa",
} as const;

// ============================================
// FORMAT HELPERS
// ============================================
export const formatPrice = (price: number, locale: "en" | "pt" = "en"): string => {
  if (locale === "pt") {
    return `€${price.toFixed(2).replace(".", ",")}`;
  }
  return `€${price.toFixed(2)}`;
};

export const formatPriceCompact = (price: number): string => {
  return price % 1 === 0 ? `€${price}` : `€${price.toFixed(2).replace(".", ",")}`;
};
