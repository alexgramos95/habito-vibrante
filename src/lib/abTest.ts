// Lightweight A/B variant assignment + winner computation.
// Variants are sticky per browser so a user always sees the same copy.

import { getEventLog } from "@/hooks/useAnalytics";

const STORAGE_PREFIX = "become-ab:";

export interface VariantDef {
  id: string;
  copy: string;
}

/** Sticky pick — first call assigns, subsequent calls return the same id. */
export const pickVariant = (testKey: string, variants: VariantDef[]): VariantDef => {
  try {
    const key = STORAGE_PREFIX + testKey;
    const existing = localStorage.getItem(key);
    if (existing) {
      const found = variants.find(v => v.id === existing);
      if (found) return found;
    }
    const choice = variants[Math.floor(Math.random() * variants.length)];
    localStorage.setItem(key, choice.id);
    return choice;
  } catch {
    return variants[0];
  }
};

export interface VariantStats {
  id: string;
  copy: string;
  impressions: number;
  conversions: number;
  rate: number; // 0..1
}

/**
 * Compute per-variant impressions/conversions from the event log.
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
  return variants.map(v => {
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
};

// ---------- Test definitions (single source of truth) ----------
export const REFERRAL_HEADLINE_TEST = "referral_headline";
export const REFERRAL_HEADLINE_VARIANTS: VariantDef[] = [
  { id: "A", copy: "Know someone ready to level up too?" },
  { id: "B", copy: "Build discipline together." },
  { id: "C", copy: "Growth is easier with allies." },
];

export const SHARE_HEADLINE_TEST = "share_headline";
export const SHARE_HEADLINE_VARIANTS: VariantDef[] = [
  { id: "A", copy: "Becoming better, one day at a time." },
  { id: "B", copy: "This week I showed up." },
  { id: "C", copy: "Progress compounds." },
];
