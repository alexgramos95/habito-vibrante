import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadState, saveState as saveToLocalStorage } from '@/data/storage';
import type { AppState } from '@/data/types';
import { useAuth, materializeOnboardingData } from '@/contexts/AuthContext';

interface DataContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
  isPro: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Default state for new users
const defaultState: AppState = {
  habits: [],
  dailyLogs: [],
  trackers: [],
  trackerEntries: [],
  reflections: [],
  futureSelf: [],
  investmentGoals: [],
  sleepEntries: [],
  triggers: [],
  gamification: {
    pontos: 0,
    nivel: 1,
    conquistas: [],
    consistencyScore: 0,
    currentStreak: 0,
    bestStreak: 0,
  },
  savings: [],
  shoppingItems: [],
  tobaccoConfig: { numCigarrosPorMaco: 20, precoPorMaco: 6.20, baselineDeclarado: 20 },
  cigaretteLogs: [],
  purchaseGoals: [],
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { session, subscriptionStatus, user, loading: authLoading } = useAuth();
  const [state, setStateInternal] = useState<AppState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  
  const isPro = subscriptionStatus.plan === 'pro';
  const hasInitializedRef = useRef(false);
  const lastProStatusRef = useRef<boolean | null>(null);
  
  // Track current upload promise to prevent race conditions
  const uploadPromiseRef = useRef<Promise<boolean> | null>(null);

  /**
   * Upload state to Supabase (PRO users only) - IMMEDIATE, NO DEBOUNCE
   */
  const uploadToCloud = useCallback(async (stateToUpload: AppState): Promise<boolean> => {
    if (!session?.access_token || !isPro) {
      console.log('[DATA] Upload skipped - not PRO or no session');
      return false;
    }
    
    try {
      console.log('[DATA] 🚀 Uploading to cloud...', {
        habits: stateToUpload.habits.length,
        trackers: stateToUpload.trackers.length,
        habitIds: stateToUpload.habits.map(h => h.id.slice(-8)),
      });
      
      setIsSyncing(true);
      
      const { data, error } = await supabase.functions.invoke('sync-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: 'upload',
          data: {
            habits: stateToUpload.habits,
            trackerEntries: stateToUpload.trackerEntries,
            trackers: stateToUpload.trackers,
            reflections: stateToUpload.reflections,
            futureSelfEntries: stateToUpload.futureSelf,
            investmentGoals: stateToUpload.investmentGoals,
            shoppingItems: stateToUpload.shoppingItems,
            gamification: stateToUpload.gamification,
          },
        },
      });

      if (error) {
        console.error('[DATA] ❌ Upload error:', error);
        setIsSyncing(false);
        return false;
      }

      setLastSyncedAt(new Date().toISOString());
      console.log('[DATA] ✅ Upload successful - habits count:', stateToUpload.habits.length);
      setIsSyncing(false);
      return true;
    } catch (err) {
      console.error('[DATA] ❌ Upload failed:', err);
      setIsSyncing(false);
      return false;
    }
  }, [session?.access_token, isPro]);

  /**
   * Download state from Supabase
   */
  const downloadFromCloud = useCallback(async (): Promise<AppState | null> => {
    if (!session?.access_token) return null;
    
    try {
      console.log('[DATA] Downloading from cloud...');
      const { data, error } = await supabase.functions.invoke('sync-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { action: 'download' },
      });

      if (error) {
        console.error('[DATA] Download error:', error);
        return null;
      }

      if (data?.data) {
        const cloudData = data.data;
        console.log('[DATA] Cloud data received:', { 
          habits: cloudData.habits?.length || 0,
          trackers: cloudData.trackers?.length || 0,
          synced_at: cloudData.synced_at 
        });

        // Convert cloud data to AppState format
        const cloudState: AppState = {
          ...defaultState,
          habits: cloudData.habits || [],
          trackers: cloudData.trackers || [],
          trackerEntries: cloudData.trackerEntries || [],
          reflections: cloudData.reflections || [],
          futureSelf: cloudData.futureSelfEntries || [],
          investmentGoals: cloudData.investmentGoals || [],
          shoppingItems: cloudData.shoppingItems || [],
          gamification: cloudData.gamification || defaultState.gamification,
        };

        setLastSyncedAt(cloudData.synced_at);
        return cloudState;
      }
      
      return null;
    } catch (err) {
      console.error('[DATA] Download failed:', err);
      return null;
    }
  }, [session?.access_token]);

  /**
   * For NON-PRO users only: Merge two states, preferring cloud for conflicts
   * PRO users should NEVER use this - they use cloud as single source of truth
   */
  const mergeStatesForNonPro = (local: AppState, cloud: AppState): AppState => {
    const mergeArrays = <T extends { id: string }>(arr1: T[], arr2: T[]): T[] => {
      const map = new Map<string, T>();
      arr1.forEach(item => map.set(item.id, item));
      arr2.forEach(item => map.set(item.id, item)); // Cloud wins on conflict
      return Array.from(map.values());
    };

    return {
      ...local,
      habits: mergeArrays(local.habits, cloud.habits),
      trackers: mergeArrays(local.trackers, cloud.trackers),
      trackerEntries: mergeArrays(local.trackerEntries, cloud.trackerEntries),
      reflections: mergeArrays(local.reflections, cloud.reflections),
      futureSelf: mergeArrays(local.futureSelf, cloud.futureSelf),
      investmentGoals: mergeArrays(local.investmentGoals, cloud.investmentGoals),
      shoppingItems: mergeArrays(local.shoppingItems, cloud.shoppingItems),
      dailyLogs: mergeArrays(local.dailyLogs, cloud.dailyLogs || []),
      gamification: cloud.gamification?.pontos > local.gamification.pontos 
        ? { ...local.gamification, ...cloud.gamification }
        : local.gamification,
    };
  };

  /**
   * Initialize data on mount and auth changes
   */
  useEffect(() => {
    const initializeData = async () => {
      // Don't initialize until auth is ready
      if (authLoading) {
        console.log('[DATA] Waiting for auth to load...');
        return;
      }
      
      if (!session?.access_token || !user) {
        // Not authenticated - use local only
        const localState = loadState();
        console.log('[DATA] Not authenticated - using local state:', { 
          habits: localState.habits.length, 
          trackers: localState.trackers.length 
        });
        setStateInternal(localState);
        setIsLoading(false);
        hasInitializedRef.current = false; // Reset so we re-initialize on next login
        lastProStatusRef.current = null;
        return;
      }

      // Wait for subscription status to be fully loaded (planStatus must be set)
      if (subscriptionStatus.planStatus === null) {
        console.log('[DATA] Waiting for subscription status to be loaded...');
        // Load local state temporarily while waiting
        if (!hasInitializedRef.current) {
          const localState = loadState();
          setStateInternal(localState);
          console.log('[DATA] Loaded local state temporarily while waiting for subscription');
        }
        return;
      }

      // Now we have the real subscription status
      const shouldReSync = !hasInitializedRef.current || 
        (lastProStatusRef.current !== null && lastProStatusRef.current !== isPro);
      
      if (!shouldReSync) {
        console.log('[DATA] Already initialized with correct PRO status, skipping');
        return;
      }

      console.log('[DATA] Initializing/re-syncing data, isPro:', isPro, 'planStatus:', subscriptionStatus.planStatus);
      setIsLoading(true);
      
      // Always load local state first (fast)
      const localState = loadState();
      console.log('[DATA] Local state loaded:', { 
        habits: localState.habits.length, 
        trackers: localState.trackers.length 
      });

      if (isPro) {
        // PRO users: Supabase is the SINGLE SOURCE OF TRUTH
        // NO merging with local - cloud data is definitive
        console.log('[DATA] PRO user - Supabase is SINGLE SOURCE OF TRUTH');
        const cloudState = await downloadFromCloud();
        
        const hasCloudData = cloudState && (cloudState.habits.length > 0 || cloudState.trackers.length > 0);
        
        // Materialize onboarding ONLY if PRO user has NO cloud data yet
        // This handles first-time PRO setup after onboarding
        materializeOnboardingData(user.id, { isPro: true, hasCloudData: Boolean(hasCloudData) });
        
        if (hasCloudData) {
          // Cloud has data - use it EXCLUSIVELY (no merge!)
          console.log('[DATA] PRO: Using cloud state exclusively:', {
            habits: cloudState.habits.length,
            trackers: cloudState.trackers.length
          });
          setStateInternal(cloudState);
          saveToLocalStorage(cloudState); // Cache locally for offline
        } else {
          // PRO with no cloud data - check localStorage (might have just materialized)
          const freshLocalState = loadState();
          if (freshLocalState.habits.length > 0 || freshLocalState.trackers.length > 0) {
            // First time PRO with local data - migrate local to cloud
            console.log('[DATA] PRO: First sync - uploading local data to cloud');
            setStateInternal(freshLocalState);
            await uploadToCloud(freshLocalState);
          } else {
            // No data anywhere - start fresh
            console.log('[DATA] PRO: No data found, starting fresh');
            setStateInternal(defaultState);
          }
        }
      } else {
        // Non-PRO user: localStorage is primary, can merge with cloud
        console.log('[DATA] Non-PRO user - localStorage is primary');
        
        // Materialize onboarding for non-PRO users
        materializeOnboardingData(user.id, null);
        
        // Re-load state after potential materialization
        const freshLocalState = loadState();
        const cloudState = await downloadFromCloud();
        
        if (cloudState && (cloudState.habits.length > 0 || cloudState.trackers.length > 0)) {
          const mergedState = mergeStatesForNonPro(freshLocalState, cloudState);
          setStateInternal(mergedState);
          saveToLocalStorage(mergedState);
          console.log('[DATA] Non-PRO: Merged cloud data with local');
        } else {
          setStateInternal(freshLocalState);
        }
      }

      setIsLoading(false);
      hasInitializedRef.current = true;
      lastProStatusRef.current = isPro;
    };

    initializeData();
  }, [session?.access_token, user?.id, isPro, subscriptionStatus.planStatus, authLoading]);

  /**
   * Custom setState that also syncs to cloud for PRO users - IMMEDIATE UPLOAD
   */
  const setState = useCallback((updater: React.SetStateAction<AppState>) => {
    setStateInternal(prevState => {
      const newState = typeof updater === 'function' ? updater(prevState) : updater;
      
      // Always save to localStorage (cache)
      saveToLocalStorage(newState);
      
      // Log state change for debugging
      console.log('[DATA] State changed:', {
        habits: newState.habits.length,
        isPro,
        hasSession: !!session?.access_token,
      });
      
      // If PRO, sync to cloud IMMEDIATELY (no debounce to prevent data loss)
      if (isPro && session?.access_token) {
        // Store promise to prevent race conditions
        uploadPromiseRef.current = uploadToCloud(newState);
      }
      
      return newState;
    });
  }, [isPro, session?.access_token, uploadToCloud]);

  /**
   * Manual sync trigger
   */
  const syncNow = useCallback(async () => {
    if (!session?.access_token) return;
    
    setIsSyncing(true);
    
    if (isPro) {
      // PRO: Upload current state to cloud (cloud is source of truth)
      console.log('[DATA] PRO syncNow: Uploading current state to cloud');
      await uploadToCloud(state);
    } else {
      // Non-PRO: download and merge
      const cloudState = await downloadFromCloud();
      if (cloudState) {
        const mergedState = mergeStatesForNonPro(state, cloudState);
        setStateInternal(mergedState);
        saveToLocalStorage(mergedState);
      }
    }
    
    setIsSyncing(false);
  }, [session?.access_token, isPro, state, downloadFromCloud, uploadToCloud]);

  return (
    <DataContext.Provider
      value={{
        state,
        setState,
        isLoading,
        isSyncing,
        lastSyncedAt,
        syncNow,
        isPro,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
