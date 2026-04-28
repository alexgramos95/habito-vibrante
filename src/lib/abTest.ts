// Lightweight A/B variant assignment + winner computation.
// - Sticky variants per browser
// - Confidence labels based on sample size + lift
// - Auto-promote: when a "strong winner" is detected, traffic shifts 80/20
// - Experiment history: persisted winners for reference
// - Suggested next experiments

import { getEventLog } from "@/hooks/useAnalytics";

const STORAGE_PREFIX = "become-ab:";
const HISTORY_KEY = "become-ab-history";
const PROMOTED_KEY = "become-ab-promoted"; // map<testKey, variantId>

export interface VariantDef {
  id: string;
  copy: string;
}

// ---------- assignment ----------

const readPromoted = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(PROMOTED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const writePromoted = (m: Record<string, string>) => {
  try { localStorage.setItem(PROMOTED_KEY, JSON.stringify(m)); } catch { /* ignore */ }
};

export const getPromotedVariant = (testKey: string): string | null => {
  return readPromoted()[testKey] || null;
};

export const setPromotedVariant = (testKey: string, variantId: string) => {
  const m = readPromoted();
  m[testKey] = variantId;
  writePromoted(m);
};

export const clearPromotedVariant = (testKey: string) => {
  const m = readPromoted();
  delete m[testKey];
  writePromoted(m);
};

/**
 * Sticky pick. If a variant has been auto-promoted, the promoted variant is
 * served to 80% of traffic; the remaining 20% is split evenly across challengers.
 * First call assigns and persists; subsequent calls return the same id.
 */
export const pickVariant = (testKey: string, variants: VariantDef[]): VariantDef => {
  try {
    const key = STORAGE_PREFIX + testKey;
    const existing = localStorage.getItem(key);
    if (existing) {
      const found = variants.find(v => v.id === existing);
      if (found) return found;
    }

    const promoted = getPromotedVariant(testKey);
    let choice: VariantDef;
    if (promoted && variants.find(v => v.id === promoted)) {
      const winner = variants.find(v => v.id === promoted)!;
      const challengers = variants.filter(v => v.id !== promoted);
      if (Math.random() < 0.80 || challengers.length === 0) {
        choice = winner;
      } else {
        choice = challengers[Math.floor(Math.random() * challengers.length)];
      }
    } else {
      choice = variants[Math.floor(Math.random() * variants.length)];
    }
    localStorage.setItem(key, choice.id);
    return choice;
  } catch {
    return variants[0];
  }
};

// ---------- stats ----------

export type Confidence = "low_sample" | "emerging_leader" | "likely_winner" | "strong_winner" | "trailing" | "tied";

export interface VariantStats {
  id: string;
  copy: string;
  impressions: number;
  conversions: number;
  rate: number; // 0..1
  confidence: Confidence;
  isLeader: boolean;
  liftVsRunnerUp: number; // relative lift (0..n), e.g. 0.25 = +25%
}

const MIN_SAMPLE = 20;       // below this: low_sample
const STRONG_SAMPLE = 50;    // strong winner needs at least this many impressions
const EMERGING_LIFT = 0.10;  // ≥10% relative lift over runner-up
const LIKELY_LIFT = 0.20;    // ≥20%
const STRONG_LIFT = 0.30;    // ≥30%

const classify = (
  v: { impressions: number; rate: number },
  isLeader: boolean,
  liftVsRunnerUp: number,
): Confidence => {
  if (v.impressions < MIN_SAMPLE) return "low_sample";
  if (!isLeader) return "trailing";
  if (liftVsRunnerUp <= 0) return "tied";
  if (v.impressions >= STRONG_SAMPLE && liftVsRunnerUp >= STRONG_LIFT) return "strong_winner";
  if (liftVsRunnerUp >= LIKELY_LIFT) return "likely_winner";
  if (liftVsRunnerUp >= EMERGING_LIFT) return "emerging_leader";
  return "tied";
};

/**
 * Compute per-variant impressions/conversions from the event log + confidence.
 * `impressionEvent` and `conversionEvent` are the analytics event names;
 * each event payload is expected to include `{ testKey, variant }`.
 */
export const computeVariantStats = (
  testKey: string,
  variants: VariantDef[],
  impressionEvent: string,
  conversionEvent: string,
): VariantStats[] => {
  const log = getEventLog();
  const raw = variants.map(v => {
    const impressions = log.filter(
      l => l.event === impressionEvent && l.properties?.testKey === testKey && l.properties?.variant === v.id,
    ).length;
    const conversions = log.filter(
      l => l.event === conversionEvent && l.properties?.testKey === testKey && l.properties?.variant === v.id,
    ).length;
    return {
      id: v.id,
      copy: v.copy,
      impressions,
      conversions,
      rate: impressions > 0 ? conversions / impressions : 0,
    };
  });

  // Identify leader (highest rate among variants with any impressions)
  const eligible = raw.filter(v => v.impressions > 0);
  const sortedByRate = [...eligible].sort((a, b) => b.rate - a.rate);
  const leader = sortedByRate[0];
  const runnerUp = sortedByRate[1];

  return raw.map(v => {
    const isLeader = !!leader && v.id === leader.id && v.impressions >= MIN_SAMPLE / 2;
    const lift = isLeader && runnerUp && runnerUp.rate > 0
      ? (v.rate - runnerUp.rate) / runnerUp.rate
      : isLeader && runnerUp && runnerUp.rate === 0 && v.rate > 0
        ? 1
        : 0;
    return {
      ...v,
      isLeader,
      liftVsRunnerUp: lift,
      confidence: classify(v, isLeader, lift),
    };
  });
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low_sample: "Low sample",
  emerging_leader: "Emerging leader",
  likely_winner: "Likely winner",
  strong_winner: "Strong winner",
  trailing: "Trailing",
  tied: "Tied",
};

// ---------- history & auto-promotion ----------

export interface HistoryEntry {
  testKey: string;
  testName: string;
  variantId: string;
  copy: string;
  rate: number;
  impressions: number;
  conversions: number;
  liftVsRunnerUp: number;
  promotedAt: string; // ISO
}

export const getHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const writeHistory = (h: HistoryEntry[]) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-50))); } catch { /* ignore */ }
};

export const clearHistory = () => {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
};

/**
 * Inspect a test's stats; if a variant is a strong winner and is not already
 * the promoted one, promote it (80/20 split) and append to history.
 * Returns the new history entry if a promotion happened, else null.
 */
export const maybeAutoPromote = (
  testKey: string,
  testName: string,
  stats: VariantStats[],
): HistoryEntry | null => {
  const winner = stats.find(s => s.confidence === "strong_winner");
  if (!winner) return null;
  const promoted = getPromotedVariant(testKey);
  if (promoted === winner.id) return null;

  setPromotedVariant(testKey, winner.id);
  const entry: HistoryEntry = {
    testKey,
    testName,
    variantId: winner.id,
    copy: winner.copy,
    rate: winner.rate,
    impressions: winner.impressions,
    conversions: winner.conversions,
    liftVsRunnerUp: winner.liftVsRunnerUp,
    promotedAt: new Date().toISOString(),
  };
  const hist = getHistory();
  hist.push(entry);
  writeHistory(hist);
  return entry;
};

// ---------- test definitions ----------

export const REFERRAL_HEADLINE_TEST = "referral_headline";
export const REFERRAL_HEADLINE_NAME = "Referral Headline";
export const REFERRAL_HEADLINE_VARIANTS: VariantDef[] = [
  { id: "A", copy: "Know someone ready to level up too?" },
  { id: "B", copy: "Build discipline together." },
  { id: "C", copy: "Growth is easier with allies." },
];

export const SHARE_HEADLINE_TEST = "share_headline";
export const SHARE_HEADLINE_NAME = "Share Headline";
export const SHARE_HEADLINE_VARIANTS: VariantDef[] = [
  { id: "A", copy: "Becoming better, one day at a time." },
  { id: "B", copy: "This week I showed up." },
  { id: "C", copy: "Progress compounds." },
];

// ---------- suggested next experiments ----------

export interface SuggestedTest {
  id: string;
  area: string;       // e.g. "Referral", "Share", "Onboarding"
  hypothesis: string; // what we expect to learn
  variants: string[]; // human-readable variant labels
  effort: "low" | "medium" | "high";
}

export const SUGGESTED_TESTS: SuggestedTest[] = [
  {
    id: "reward_amount",
    area: "Referral",
    hypothesis: "A larger reward increases invites sent without hurting redemption quality.",
    variants: ["+250 XP", "+500 XP"],
    effort: "low",
  },
  {
    id: "prompt_timing",
    area: "Referral",
    hypothesis: "Prompting later (after 5 wins) raises emotional commitment and CTR vs after 3 wins.",
    variants: ["After 3 habits", "After 5 habits"],
    effort: "low",
  },
  {
    id: "share_timing",
    area: "Share",
    hypothesis: "Earlier share prompts (day 5) capture momentum before weekend drop-off.",
    variants: ["Day 7 recap", "Day 5 recap"],
    effort: "medium",
  },
  {
    id: "share_format",
    area: "Share",
    hypothesis: "Identity-led card (\"Becoming X\") outperforms metric-led card (\"7-day streak\").",
    variants: ["Identity headline", "Metric headline"],
    effort: "medium",
  },
  {
    id: "onboarding_length",
    area: "Onboarding",
    hypothesis: "A 4-step onboarding converts higher than 6-step without hurting D1 retention.",
    variants: ["6 steps", "4 steps"],
    effort: "high",
  },
];
