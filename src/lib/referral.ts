// Referral system — local-first link generation, tracking, and XP rewards.
// Inviter XP is granted optimistically on send; referee XP is granted on
// signup when a ?ref=CODE is present in the URL.

import { track } from "@/hooks/useAnalytics";

const CODE_KEY = "become-referral-code";        // this user's own invite code
const PENDING_KEY = "become-referral-pending";  // ref code captured from URL (referee side)
const REDEEMED_KEY = "become-referral-redeemed"; // bool — referee XP already granted
const SENT_KEY = "become-referral-sent";        // count of invites sent (inviter side)
const CLAIMED_KEY = "become-referral-claimed";  // count of inviter XP rewards already claimed
const PROMPT_SEEN_KEY = "become-referral-prompt-seen"; // dedupe first-3-completions prompt

export const REFERRAL_XP_REWARD = 250;

const randomCode = () =>
  Array.from({ length: 6 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
  ).join("");

export const getReferralCode = (): string => {
  try {
    let code = localStorage.getItem(CODE_KEY);
    if (!code) {
      code = randomCode();
      localStorage.setItem(CODE_KEY, code);
    }
    return code;
  } catch {
    return randomCode();
  }
};

export const buildReferralLink = (): string => {
  const code = getReferralCode();
  const base = typeof window !== "undefined" ? window.location.origin : "https://become.pt";
  return `${base}/?ref=${code}`;
};

export const getInviteMessage = (): string => {
  const link = buildReferralLink();
  return `I'm building discipline with Become. Join me — we both get +${REFERRAL_XP_REWARD} XP.\n${link}`;
};

// ---------- Referee side (URL ?ref=) ----------
export const captureRefFromUrl = (): string | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^[A-Z0-9]{4,12}$/i.test(ref)) {
      const existing = localStorage.getItem(PENDING_KEY);
      if (!existing) {
        localStorage.setItem(PENDING_KEY, ref.toUpperCase());
        track("referral_link_visited" as any, { code: ref.toUpperCase() });
      }
      return ref.toUpperCase();
    }
  } catch { /* ignore */ }
  return null;
};

export const getPendingRef = (): string | null => {
  try { return localStorage.getItem(PENDING_KEY); } catch { return null; }
};

/** Returns true if XP should be granted (first time only). */
export const consumePendingRefForReward = (): { code: string } | null => {
  try {
    const code = localStorage.getItem(PENDING_KEY);
    const already = localStorage.getItem(REDEEMED_KEY);
    if (!code || already === "1") return null;
    localStorage.setItem(REDEEMED_KEY, "1");
    track("referral_redeemed" as any, { code });
    return { code };
  } catch { return null; }
};

// ---------- Inviter side ----------
export const getInvitesSent = (): number => {
  try { return parseInt(localStorage.getItem(SENT_KEY) || "0", 10) || 0; } catch { return 0; }
};
export const incInvitesSent = (channel: string, extra?: Record<string, any>) => {
  try {
    const n = getInvitesSent() + 1;
    localStorage.setItem(SENT_KEY, String(n));
    track("referral_invite_sent" as any, { channel, total: n, ...(extra || {}) });
  } catch { /* ignore */ }
};

export const getInviterRewardsClaimed = (): number => {
  try { return parseInt(localStorage.getItem(CLAIMED_KEY) || "0", 10) || 0; } catch { return 0; }
};
export const markInviterRewardClaimed = () => {
  try {
    const n = getInviterRewardsClaimed() + 1;
    localStorage.setItem(CLAIMED_KEY, String(n));
  } catch { /* ignore */ }
};

// ---------- First-3 prompt dedupe ----------
export const hasSeenReferralPrompt = (): boolean => {
  try { return localStorage.getItem(PROMPT_SEEN_KEY) === "1"; } catch { return false; }
};
export const markReferralPromptSeen = () => {
  try { localStorage.setItem(PROMPT_SEEN_KEY, "1"); } catch { /* ignore */ }
};

// ---------- Share helpers ----------
export const nativeShare = async (payload: { title?: string; text: string; url?: string }): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share(payload);
      return true;
    }
  } catch { /* user cancel or no support */ }
  try {
    await navigator.clipboard.writeText(`${payload.text}${payload.url ? "\n" + payload.url : ""}`);
    return true;
  } catch {
    return false;
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};
