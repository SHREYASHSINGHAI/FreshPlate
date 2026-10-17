import AsyncStorage from '@react-native-async-storage/async-storage';
import { PantryReviewItem, Recipe } from '../types';

const STORAGE_KEYS = {
  PANTRY_ITEMS: '@freshplate_pantry_inventory_v1',
  CACHED_RECIPES: '@freshplate_cached_recipes_v1',
  LAST_SYNC: '@freshplate_last_sync_time_v1'
} as const;

/**
 * Loads cached pantry inventory from local device storage (AsyncStorage)
 * allowing users to view and modify their pantry even with zero network connectivity.
 */
export async function loadCachedPantryItems(): Promise<PantryReviewItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PANTRY_ITEMS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Storage] Error loading cached pantry items:', error);
    return [];
  }
}

/**
 * Persists the current pantry inventory to device storage.
 */
export async function saveCachedPantryItems(items: PantryReviewItem[]): Promise<void> {
  try {
    const serialized = JSON.stringify(items);
    await AsyncStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, serialized);
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (error) {
    console.error('[Storage] Error saving cached pantry items:', error);
  }
}

/**
 * Loads previously generated recipes cached locally on the device.
 */
export async function loadCachedRecipes(): Promise<Recipe[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_RECIPES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Storage] Error loading cached recipes:', error);
    return [];
  }
}

/**
 * Persists recipes locally so users can access cooking steps offline.
 */
export async function saveCachedRecipes(recipes: Recipe[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_RECIPES, JSON.stringify(recipes));
  } catch (error) {
    console.error('[Storage] Error saving cached recipes:', error);
  }
}

/**
 * Retrieves the timestamp of the last local cache synchronization.
 */
export async function getLastSyncTimestamp(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  } catch {
    return null;
  }
}

/**
 * Clears local pantry and recipe cache (e.g. for user account data reset).
 */
export async function clearCachedPantry(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PANTRY_ITEMS,
      STORAGE_KEYS.CACHED_RECIPES,
      STORAGE_KEYS.LAST_SYNC
    ]);
  } catch (error) {
    console.error('[Storage] Error clearing cached pantry:', error);
  }
}

/**
 * Helper to inspect local offline storage health & metrics.
 */
export async function getStorageMetadata(): Promise<{
  itemCount: number;
  lastSync: string | null;
  isOfflineReady: boolean;
}> {
  const items = await loadCachedPantryItems();
  const lastSync = await getLastSyncTimestamp();
  return {
    itemCount: items.length,
    lastSync,
    isOfflineReady: items.length > 0
  };
}
