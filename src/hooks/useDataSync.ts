import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadState, saveState } from '@/data/storage';
import type { AppState } from '@/data/types';

const SYNC_KEY = 'become-last-sync';

/**
 * Hook for syncing data between localStorage and cloud.
 * Downloads cloud data on login (for all users).
 * Uploads data to cloud (for PRO users only).
 */
export const useDataSync = () => {
  const isSyncingRef = useRef(false);

  /**
   * Download data from cloud and merge with local state.
   * Works for ALL users (FREE, trial, and PRO).
   */
  const downloadFromCloud = useCallback(async (accessToken: string): Promise<boolean> => {
    if (isSyncingRef.current) return false;
    isSyncingRef.current = true;

    try {
      console.log('[SYNC] Downloading data from cloud...');
      
      const { data, error } = await supabase.functions.invoke('sync-data', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: { action: 'download' },
      });

      if (error) {
        console.error('[SYNC] Download error:', error);
        return false;
      }

      if (data?.data) {
        console.log('[SYNC] Cloud data received, merging with local...');
        const cloudData = data.data;
        const localState = loadState();
        
        // Merge cloud data with local state (cloud takes priority for matching IDs)
        const mergedState: AppState = {
          ...localState,
          habits: mergeArrays(localState.habits, cloudData.habits || [], 'id'),
          trackers: mergeArrays(localState.trackers, cloudData.trackers || [], 'id'),
          trackerEntries: mergeArrays(localState.trackerEntries, cloudData.trackerEntries || [], 'id'),
          reflections: mergeArrays(localState.reflections, cloudData.reflections || [], 'id'),
          futureSelf: mergeArrays(localState.futureSelf, cloudData.futureSelfEntries || [], 'id'),
          investmentGoals: mergeArrays(localState.investmentGoals, cloudData.investmentGoals || [], 'id'),
          shoppingItems: mergeArrays(localState.shoppingItems, cloudData.shoppingItems || [], 'id'),
          gamification: cloudData.gamification?.pontos > localState.gamification.pontos 
            ? { ...localState.gamification, ...cloudData.gamification }
            : localState.gamification,
        };

        saveState(mergedState);
        localStorage.setItem(SYNC_KEY, new Date().toISOString());
        console.log('[SYNC] Data merged and saved successfully');
        return true;
      } else {
        console.log('[SYNC] No cloud data found');
        return false;
      }
    } catch (err) {
      console.error('[SYNC] Download failed:', err);
      return false;
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  /**
   * Upload local data to cloud.
   * Only works for PRO users.
   */
  const uploadToCloud = useCallback(async (accessToken: string): Promise<boolean> => {
    if (isSyncingRef.current) return false;
    isSyncingRef.current = true;

    try {
      console.log('[SYNC] Uploading data to cloud...');
      const state = loadState();

      const { data, error } = await supabase.functions.invoke('sync-data', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          action: 'upload',
          data: {
            habits: state.habits,
            trackerEntries: state.trackerEntries,
            trackers: state.trackers,
            reflections: state.reflections,
            futureSelfEntries: state.futureSelf,
            investmentGoals: state.investmentGoals,
            shoppingItems: state.shoppingItems,
            gamification: state.gamification,
          },
        },
      });

      if (error) {
        console.error('[SYNC] Upload error:', error);
        return false;
      }

      if (data?.success) {
        localStorage.setItem(SYNC_KEY, new Date().toISOString());
        console.log('[SYNC] Data uploaded successfully');
        return true;
      }

      return false;
    } catch (err) {
      console.error('[SYNC] Upload failed:', err);
      return false;
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  return { downloadFromCloud, uploadToCloud };
};

/**
 * Merge two arrays by ID, with source2 taking priority for duplicates.
 */
function mergeArrays<T extends { id: string }>(
  source1: T[],
  source2: T[],
  idKey: keyof T = 'id'
): T[] {
  const map = new Map<string, T>();
  
  // Add all items from source1
  for (const item of source1) {
    map.set(item[idKey] as string, item);
  }
  
  // Override/add items from source2 (cloud data takes priority)
  for (const item of source2) {
    map.set(item[idKey] as string, item);
  }
  
  return Array.from(map.values());
}
