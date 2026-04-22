import { supabase } from "@/integrations/supabase/client";

export const AUTH_RECOVERY_EVENT = "become:auth-recovery";

const AUTH_STORAGE_PATTERNS = [
  /^sb-.*-auth-token$/,
  /^sb-.*-auth-token-code-verifier$/,
  /^supabase\.auth\.token$/,
];

const AUTH_ERROR_SNIPPETS = [
  "invalid credentials",
  "authentication required",
  "jwt expired",
  "session_not_found",
  "session not found",
];

export const isRecoverableAuthError = (rawMessage: string | null | undefined): boolean => {
  const message = (rawMessage || "").toLowerCase();
  return AUTH_ERROR_SNIPPETS.some((snippet) => message.includes(snippet));
};

const clearAuthStorage = (storage: Storage | undefined) => {
  if (!storage) return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && AUTH_STORAGE_PATTERNS.some((pattern) => pattern.test(key))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
};

export const recoverInvalidSession = async (reason: string) => {
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error && !isRecoverableAuthError(error.message)) {
      console.warn("[AUTH] Local sign-out returned an unexpected error:", error.message);
    }
  } catch (error) {
    console.warn("[AUTH] Local sign-out request failed during recovery:", error);
  }

  if (typeof window === "undefined") return;

  clearAuthStorage(window.localStorage);
  clearAuthStorage(window.sessionStorage);
  window.dispatchEvent(new CustomEvent(AUTH_RECOVERY_EVENT, { detail: { reason } }));
};