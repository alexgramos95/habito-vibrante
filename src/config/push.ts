// Push notification configuration
// The VAPID public key is fetched from the backend if not available in env

import { supabase } from "@/integrations/supabase/client";

let cachedPublicKey: string | null = null;

// Get VAPID public key - first check env, then fetch from backend
export async function getVapidPublicKey(): Promise<string | null> {
  // First check env variable
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) {
    return envKey;
  }

  // Use cached key if available
  if (cachedPublicKey) {
    return cachedPublicKey;
  }

  // Fetch from backend
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-key');
    
    if (error) {
      console.error('[Push Config] Error fetching VAPID key:', error);
      return null;
    }

    if (data?.publicKey) {
      cachedPublicKey = data.publicKey;
      console.log('[Push Config] VAPID key loaded from backend');
      return cachedPublicKey;
    }

    return null;
  } catch (error) {
    console.error('[Push Config] Error fetching VAPID key:', error);
    return null;
  }
}

// Synchronous check - use env var only
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Check if push notifications are properly configured
export const isPushConfigured = (): boolean => {
  return Boolean(VAPID_PUBLIC_KEY);
};
