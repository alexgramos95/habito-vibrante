import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getVapidPublicKey, VAPID_PUBLIC_KEY } from "@/config/push";

export type NotificationMode = 'background' | 'in-app' | 'unsupported' | 'denied';

export interface PushNotificationState {
  isSupported: boolean;
  isPushSupported: boolean;
  isIOSPWA: boolean;
  isIOSBrowser: boolean;
  isInstalled: boolean;
  permission: NotificationPermission;
  mode: NotificationMode;
  isSubscribed: boolean;
}

// Convert base64 URL to Uint8Array for push subscription
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Detect iOS
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Detect if running as installed PWA
function isInstalledPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

// Detect if push is supported
function isPushNotificationSupported(): boolean {
  return 'PushManager' in window && 'serviceWorker' in navigator;
}

export function usePushNotifications(userId: string | undefined) {
  const { toast } = useToast();
  const vapidKeyRef = useRef<string | null>(VAPID_PUBLIC_KEY || null);
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isPushSupported: false,
    isIOSPWA: false,
    isIOSBrowser: false,
    isInstalled: false,
    permission: 'default',
    mode: 'unsupported',
    isSubscribed: false,
  });

  // Load VAPID key from backend if not in env
  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) {
      getVapidPublicKey().then(key => {
        if (key) {
          vapidKeyRef.current = key;
          console.log('[Push] VAPID key loaded from backend');
        }
      });
    }
  }, []);

  // Initialize state
  useEffect(() => {
    const isIOSDevice = isIOS();
    const installed = isInstalledPWA();
    const notifSupported = 'Notification' in window;
    const pushSupported = isPushNotificationSupported();
    
    // iOS Safari doesn't support push unless installed as PWA (iOS 16.4+)
    const isIOSPWAContext = isIOSDevice && installed;
    const isIOSBrowserContext = isIOSDevice && !installed;

    // Determine notification mode
    let mode: NotificationMode = 'unsupported';
    
    if (notifSupported) {
      const permission = Notification.permission;
      
      if (permission === 'denied') {
        mode = 'denied';
      } else if (pushSupported && (!isIOSDevice || isIOSPWAContext)) {
        // Push supported and either not iOS or iOS PWA
        mode = 'background';
      } else if (notifSupported) {
        // Fallback to in-app notifications
        mode = 'in-app';
      }

      setState({
        isSupported: notifSupported,
        isPushSupported: pushSupported,
        isIOSPWA: isIOSPWAContext,
        isIOSBrowser: isIOSBrowserContext,
        isInstalled: installed,
        permission,
        mode,
        isSubscribed: false, // Will be updated when we check subscriptions
      });
    }
  }, []);

  // Check if user has an existing push subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!userId || !state.isPushSupported) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await (registration as any).pushManager.getSubscription();
        
        if (subscription) {
          // Verify it exists in database
          const { data } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', userId)
            .eq('endpoint', subscription.endpoint)
            .single();

          setState(prev => ({
            ...prev,
            isSubscribed: !!data,
            mode: data ? 'background' : prev.mode,
          }));
        }
      } catch (error) {
        console.error('[Push] Error checking subscription:', error);
      }
    };

    checkSubscription();
  }, [userId, state.isPushSupported]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      
      setState(prev => ({ ...prev, permission }));

      if (permission === 'granted') {
        toast({
          title: "Notifications enabled",
          description: "You'll receive reminders for your habits.",
        });
      } else if (permission === 'denied') {
        setState(prev => ({ ...prev, mode: 'denied' }));
        toast({
          title: "Notifications blocked",
          description: "Enable notifications in your browser settings.",
          variant: "destructive",
        });
      }

      return permission;
    } catch (error) {
      console.error('[Push] Error requesting permission:', error);
      return 'denied';
    }
  }, [state.isSupported, toast]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      console.error('[Push] No user ID for subscription');
      return false;
    }

    if (!state.isPushSupported) {
      console.log('[Push] Push not supported, using in-app mode');
      return false;
    }

    // Get VAPID key - try env first, then fetch from backend
    let vapidKey = vapidKeyRef.current;
    if (!vapidKey) {
      vapidKey = await getVapidPublicKey();
      if (vapidKey) {
        vapidKeyRef.current = vapidKey;
      }
    }

    if (!vapidKey) {
      console.error('[Push] VAPID public key not configured');
      toast({
        title: "Configuration error",
        description: "Push notifications are not configured. Please contact support.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // First ensure we have permission
      if (Notification.permission !== 'granted') {
        const permission = await requestPermission();
        if (permission !== 'granted') return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const pm = (registration as any).pushManager;
      
      // Check for existing subscription
      let subscription = await pm.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        const applicationServerKey = urlBase64ToUint8Array(vapidKey);
        subscription = await pm.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      }

      // Extract keys
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Failed to get subscription keys');
      }

      // Convert to base64url (Web Push standard format)
      const p256dhArray = new Uint8Array(p256dh);
      const authArray = new Uint8Array(auth);
      
      // Use base64url encoding (URL-safe)
      const arrayToBase64Url = (arr: Uint8Array): string => {
        const base64 = btoa(String.fromCharCode.apply(null, Array.from(arr)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };
      
      const p256dhBase64 = arrayToBase64Url(p256dhArray);
      const authBase64 = arrayToBase64Url(authArray);

      // Save to database - first try to delete existing, then insert
      // This avoids upsert issues with the composite unique constraint
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);

      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: p256dhBase64,
          auth: authBase64,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('[Push] Error saving subscription:', error);
        throw error;
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        mode: 'background',
      }));

      console.log('[Push] Successfully subscribed to push notifications');
      return true;

    } catch (error) {
      console.error('[Push] Error subscribing to push:', error);
      toast({
        title: "Push subscription failed",
        description: "Background notifications won't work. Using in-app reminders.",
        variant: "destructive",
      });
      
      setState(prev => ({
        ...prev,
        mode: 'in-app',
      }));
      
      return false;
    }
  }, [userId, state.isPushSupported, requestPermission, toast]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint);
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        mode: state.isSupported ? 'in-app' : 'unsupported',
      }));

      return true;
    } catch (error) {
      console.error('[Push] Error unsubscribing:', error);
      return false;
    }
  }, [userId, state.isSupported]);

  // Get status text for UI
  const getStatusText = useCallback((): string => {
    switch (state.mode) {
      case 'background':
        return 'Active (background)';
      case 'in-app':
        return 'Active (app open only)';
      case 'denied':
        return 'Blocked';
      case 'unsupported':
        return 'Not supported';
      default:
        return 'Unknown';
    }
  }, [state.mode]);

  return {
    ...state,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    getStatusText,
  };
}
