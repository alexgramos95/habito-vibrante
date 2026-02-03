// Push notification configuration
// The VAPID public key should be set in your environment or here as a fallback.
// Generate VAPID keys using: npx web-push generate-vapid-keys

// This is a placeholder - you need to set VITE_VAPID_PUBLIC_KEY in your environment
// or replace this with your actual VAPID public key
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Check if push notifications are properly configured
export const isPushConfigured = (): boolean => {
  return Boolean(VAPID_PUBLIC_KEY);
};
