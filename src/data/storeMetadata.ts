// App Store / Play Store Metadata for becoMe
// EN-first with identity-based messaging

export const storeMetadata = {
  // App name
  name: "becoMe",
  
  // Taglines (A/B test options)
  taglines: [
    "Identity > Intensity",
    "Become who you're aiming to be",
    "Consistency compounds",
    "Track habits. See savings. Become.",
  ],
  
  // Short description (80 chars max for Play Store)
  shortDescription: "Track habits, see savings, and become who you're aiming to be. Identity-driven consistency.",
  
  // Long description
  longDescription: `becoMe is not another habit tracker. It's a system for identity transformation.

Most habit apps focus on streaks and gamification. becoMe focuses on who you're becoming.

WHAT MAKES BECOME DIFFERENT:

🎯 Identity-First Design
Start with who you want to become, not what you want to do. Your habits flow from your identity.

📊 Financial Awareness
See the real cost of your habits. Track savings from reduced consumption. Watch your discipline pay off.

📅 Weekly Cycles
Life isn't about perfect days—it's about consistent weeks. becoMe uses weekly cycles that match how you actually live.

🧠 Scientific Approach
Based on behavioral science: cue → routine → reward. No moralization. No judgment. Just data.

KEY FEATURES:

• Habit Tracking — Simple, visual, effective
• Trackers — Monitor any metric that matters
• Financial Impact — See savings from behavior change
• Shopping List — Weekly planning with spending awareness
• Calendar View — Your consistency at a glance
• Reflections — Brief daily check-ins
• Future Self — Define who you're becoming

WHO IS BECOME FOR:

• People tired of apps that shame them
• Those who want data, not motivation theater
• Anyone who understands: small actions → big identity shifts
• People who think in weeks, not days

PRICING:

• Free: 3 habits, limited calendar history
• Pro: Unlimited everything
• 2-day free trial with Monthly plan (no credit card required)

No ads. No data selling. Just a tool that works.

Start your 2-day free trial. Become who you're aiming to be.`,

  // Feature bullets
  features: [
    "Track unlimited habits and custom metrics",
    "See financial impact of behavior changes",
    "Weekly cycle design matches real life",
    "Calendar view for visual consistency",
    "Shopping list with spending awareness",
    "Daily reflections and future self journaling",
    "Export data (CSV/PDF) anytime",
    "Dark mode optimized for focus",
    "PWA: works offline, installable",
    "No ads, no data selling",
  ],
  
  // Benefits (outcome-focused)
  benefits: [
    "Build lasting habits through identity, not willpower",
    "Save money by tracking consumption habits",
    "Stay consistent without the guilt of broken streaks",
    "See your transformation with clear data",
    "Focus on becoming, not just doing",
  ],
  
  // Keywords/ASO
  keywords: [
    "habit tracker",
    "consistency",
    "self improvement",
    "discipline",
    "savings tracker",
    "behavior change",
    "identity",
    "routine builder",
    "financial awareness",
    "weekly planner",
    "mindfulness",
    "personal growth",
    "goal tracking",
    "daily habits",
    "productivity",
  ],
  
  // Category mapping
  categories: {
    appStore: {
      primary: "Health & Fitness",
      secondary: "Productivity",
    },
    playStore: {
      primary: "Health & Fitness",
      secondary: "Lifestyle",
    },
  },
  
  // Screenshot storyboard
  screenshots: [
    {
      id: 1,
      title: "Track Your Journey",
      subtitle: "See your consistency at a glance",
      focus: "Dashboard with KPIs and weekly chart",
    },
    {
      id: 2,
      title: "Build Real Habits",
      subtitle: "Simple. Visual. Effective.",
      focus: "Habit list with completion status",
    },
    {
      id: 3,
      title: "See Your Savings",
      subtitle: "Discipline pays off",
      focus: "Finances page with savings breakdown",
    },
    {
      id: 4,
      title: "Weekly Cycles",
      subtitle: "Consistency > perfection",
      focus: "Calendar view with weekly breakdown",
    },
    {
      id: 5,
      title: "Track What Matters",
      subtitle: "Custom trackers for any metric",
      focus: "Trackers page with entry timeline",
    },
    {
      id: 6,
      title: "Define Your Future",
      subtitle: "Start with who you're becoming",
      focus: "Future self / identity screen",
    },
  ],
  
  // Privacy
  privacyUrl: "/privacy",
  termsUrl: "/terms",
  supportEmail: "support@become.app",
};

// ICP Messaging Segments
export const icpMessaging = {
  warrior: {
    headline: "Discipline is the path",
    subheadline: "Build consistency through identity, not motivation",
    cta: "Start your discipline",
    tone: "Direct, assertive, no fluff",
    keywords: ["discipline", "consistency", "warrior", "strength", "control"],
    painPoints: [
      "Tired of starting over",
      "Motivation doesn't last",
      "Need systems, not inspiration",
    ],
    benefits: [
      "Build unbreakable consistency",
      "Track progress with data",
      "No judgment, just results",
    ],
  },
  
  coach: {
    headline: "Your accountability system",
    subheadline: "Gentle nudges. Clear feedback. Real progress.",
    cta: "Get started",
    tone: "Supportive, structured, results-focused",
    keywords: ["accountability", "coach", "support", "progress", "growth"],
    painPoints: [
      "Hard to stay on track alone",
      "Need reminders and check-ins",
      "Want feedback, not lectures",
    ],
    benefits: [
      "Daily check-ins that work",
      "See your progress clearly",
      "Bounce back without guilt",
    ],
  },
  
  scientific: {
    headline: "Data-driven behavior change",
    subheadline: "Track, analyze, iterate. No pseudoscience.",
    cta: "See the data",
    tone: "Analytical, precise, evidence-based",
    keywords: ["data", "tracking", "analytics", "behavioral science", "metrics"],
    painPoints: [
      "Most apps are surface-level",
      "Want real insights, not badges",
      "Need to understand patterns",
    ],
    benefits: [
      "Detailed tracking and analytics",
      "Export your data anytime",
      "Based on behavioral science",
    ],
  },
  
  finance: {
    headline: "Your habits cost money",
    subheadline: "Track consumption. See savings. Reinvest in yourself.",
    cta: "Calculate your savings",
    tone: "Pragmatic, ROI-focused, clear",
    keywords: ["savings", "money", "finance", "ROI", "cost", "investment"],
    painPoints: [
      "Don't know where money goes",
      "Bad habits are expensive",
      "Want to see financial impact",
    ],
    benefits: [
      "See real savings from changes",
      "Track spending habits",
      "Financial awareness built-in",
    ],
  },
};

// Pricing display with explicit types
export interface PricingPlan {
  price: number;
  currency: string;
  period: string;
  label: string;
  description: string;
  discount?: number;
  popular?: boolean;
}

export const pricingDisplay: Record<string, PricingPlan> = {
  monthly: {
    price: 9.99,
    currency: "USD",
    period: "month",
    label: "Monthly",
    description: "Full access, cancel anytime",
  },
  yearly: {
    price: 79,
    currency: "USD",
    period: "year",
    label: "Yearly",
    description: "Save 34%",
    discount: 34,
    popular: true,
  },
  lifetime: {
    price: 149,
    currency: "USD",
    period: "once",
    label: "Lifetime",
    description: "Pay once, own forever",
  },
};
