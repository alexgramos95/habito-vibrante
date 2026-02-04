// Push notification configuration
// The VAPID public key is fetched from the backend if not available in env

import { supabase } from "@/integrations/supabase/client";

let cachedPublicKey: string | null = null;
let inflight: Promise<string | null> | null = null;

// Simple runtime support check (sync)
export const isPushSupported = (): boolean => {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

// Get VAPID public key - first check env, then fetch from backend (cached)
export async function getVapidPublicKey(): Promise<string | null> {
  // 1) env
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;

  // 2) cache
  if (cachedPublicKey) return cachedPublicKey;

  // 3) de-dupe concurrent calls
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-vapid-key");

      if (error) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn("[Push Config] Failed to fetch VAPID key:", error);
        }
        return null;
      }

      const key = data?.publicKey ?? null;
      if (key) cachedPublicKey = key;

      return key;
    } catch (err) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[Push Config] Failed to fetch VAPID key:", err);
      }
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

// Backwards compatible export (env-only). Avoid using this as source of truth.
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

/**
 * Async check: Push is "configured" if:
 * - browser supports push AND
 * - we can obtain a VAPID public key (env or backend)
 */
export async function isPushConfiguredAsync(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const key = await getVapidPublicKey();
  return Boolean(key);
}
