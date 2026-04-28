// Acquisition source detection — captured once at first visit, sticky forever.
// Reads UTM params, ?ref= referral codes, and document.referrer to bucket
// users into channels. The chosen source is stamped on every key event so
// the Insights dashboard can compute per-source quality metrics.

import { track } from "@/hooks/useAnalytics";

export type AcquisitionSource =
  | "direct"
  | "instagram"
  | "tiktok"
  | "twitter"
  | "reddit"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "referral"
  | "organic_search"
  | "paid_ads"
  | "email"
  | "other";

const SOURCE_KEY = "become-acquisition-source";
const SOURCE_META_KEY = "become-acquisition-meta";
const CAPTURED_KEY = "become-acquisition-captured";

export interface AcquisitionMeta {
  source: AcquisitionSource;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  ref?: string;
  capturedAt: string;
}

const SEARCH_HOSTS = [
  "google.", "bing.", "duckduckgo.", "yahoo.", "ecosia.", "brave.com", "qwant.",
  "baidu.", "yandex.",
];

const SOCIAL_MAP: Array<{ match: (h: string) => boolean; source: AcquisitionSource }> = [
  { match: h => h.includes("instagram.") || h === "l.instagram.com", source: "instagram" },
  { match: h => h.includes("tiktok.") || h === "vm.tiktok.com", source: "tiktok" },
  { match: h => h.includes("twitter.") || h === "t.co" || h.includes("x.com"), source: "twitter" },
  { match: h => h.includes("reddit.") || h === "out.reddit.com", source: "reddit" },
  { match: h => h.includes("facebook.") || h === "l.facebook.com" || h === "lm.facebook.com", source: "facebook" },
  { match: h => h.includes("youtube.") || h === "youtu.be", source: "youtube" },
  { match: h => h.includes("linkedin.") || h === "lnkd.in", source: "linkedin" },
];

const normalize = (s: string) => s.trim().toLowerCase();

const classifyUtm = (utmSource?: string, utmMedium?: string): AcquisitionSource | null => {
  const s = utmSource ? normalize(utmSource) : "";
  const m = utmMedium ? normalize(utmMedium) : "";

  if (m === "cpc" || m === "ppc" || m === "paid" || m === "paid_social" || m === "ads" || s === "google_ads" || s === "facebook_ads" || s === "tiktok_ads" || s === "meta_ads") {
    return "paid_ads";
  }
  if (m === "email" || s === "newsletter" || s === "mailchimp" || s === "klaviyo") return "email";
  if (s.includes("instagram") || s === "ig") return "instagram";
  if (s.includes("tiktok") || s === "tt") return "tiktok";
  if (s.includes("twitter") || s === "x" || s === "t.co") return "twitter";
  if (s.includes("reddit")) return "reddit";
  if (s.includes("facebook") || s === "fb") return "facebook";
  if (s.includes("youtube") || s === "yt") return "youtube";
  if (s.includes("linkedin")) return "linkedin";
  if (m === "referral") return "referral";
  if (m === "organic" || m === "search") return "organic_search";
  return null;
};

const classifyReferrer = (referrer: string): AcquisitionSource | null => {
  if (!referrer) return null;
  let host = "";
  try { host = new URL(referrer).hostname.toLowerCase(); } catch { return null; }
  // Same-origin → not a real acquisition signal
  if (typeof window !== "undefined" && host === window.location.hostname) return null;
  for (const m of SOCIAL_MAP) if (m.match(host)) return m.source;
  if (SEARCH_HOSTS.some(h => host.includes(h))) return "organic_search";
  return "other";
};

export const detectSource = (): AcquisitionMeta => {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const utm_source = params.get("utm_source") || undefined;
  const utm_medium = params.get("utm_medium") || undefined;
  const utm_campaign = params.get("utm_campaign") || undefined;
  const ref = params.get("ref") || undefined;
  const referrer = (typeof document !== "undefined" ? document.referrer : "") || undefined;

  let source: AcquisitionSource = "direct";
  if (ref) {
    source = "referral";
  } else {
    const fromUtm = classifyUtm(utm_source, utm_medium);
    if (fromUtm) {
      source = fromUtm;
    } else if (referrer) {
      source = classifyReferrer(referrer) || "other";
    } else {
      source = "direct";
    }
  }

  return {
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    referrer,
    ref: ref || undefined,
    capturedAt: new Date().toISOString(),
  };
};

/** Captures acquisition meta on first visit; sticky forever. Idempotent. */
export const captureAcquisitionSource = (): AcquisitionMeta | null => {
  try {
    if (localStorage.getItem(CAPTURED_KEY) === "1") {
      const raw = localStorage.getItem(SOURCE_META_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    const meta = detectSource();
    localStorage.setItem(SOURCE_KEY, meta.source);
    localStorage.setItem(SOURCE_META_KEY, JSON.stringify(meta));
    localStorage.setItem(CAPTURED_KEY, "1");
    track("acquisition_captured" as any, {
      source: meta.source,
      utm_source: meta.utm_source,
      utm_medium: meta.utm_medium,
      utm_campaign: meta.utm_campaign,
      referrer_host: meta.referrer ? safeHost(meta.referrer) : undefined,
    });
    return meta;
  } catch {
    return null;
  }
};

const safeHost = (u: string) => { try { return new URL(u).hostname; } catch { return undefined; } };

export const getAcquisitionSource = (): AcquisitionSource => {
  try { return (localStorage.getItem(SOURCE_KEY) as AcquisitionSource) || "direct"; } catch { return "direct"; }
};

export const getAcquisitionMeta = (): AcquisitionMeta | null => {
  try {
    const raw = localStorage.getItem(SOURCE_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const SOURCE_LABEL: Record<AcquisitionSource, string> = {
  direct: "Direct",
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter / X",
  reddit: "Reddit",
  facebook: "Facebook",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  referral: "Referral",
  organic_search: "Organic search",
  paid_ads: "Paid ads",
  email: "Email",
  other: "Other",
};

export const ALL_SOURCES: AcquisitionSource[] = [
  "direct", "instagram", "tiktok", "twitter", "reddit",
  "facebook", "youtube", "linkedin", "referral",
  "organic_search", "paid_ads", "email", "other",
];
