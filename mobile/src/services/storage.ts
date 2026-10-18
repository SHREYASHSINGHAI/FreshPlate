import AsyncStorage from '@react-native-async-storage/async-storage';
import { PantryReviewItem, Recipe } from '../types';

const STORAGE_KEYS = {
  PANTRY_ITEMS: '@freshplate_pantry_inventory_v1',
  LAST_SYNC: '@freshplate_last_sync_time_v1',
  RECIPES: '@freshplate_recipes_inventory_v1',
  RECIPES_SYNC: '@freshplate_recipes_last_sync_v1'
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
 * Retrieves the timestamp of the last local pantry cache synchronization.
 */
export async function getLastSyncTimestamp(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  } catch {
    return null;
  }
}

/**
 * Loads cached recipe recommendations from local device storage (AsyncStorage)
 * so users can review generated cooking instructions offline.
 */
export async function loadCachedRecipes(): Promise<Recipe[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECIPES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Storage] Error loading cached recipes:', error);
    return [];
  }
}

/**
 * Persists generated recipes to local device storage.
 */
export async function saveCachedRecipes(recipes: Recipe[]): Promise<void> {
  try {
    const serialized = JSON.stringify(recipes);
    await AsyncStorage.setItem(STORAGE_KEYS.RECIPES, serialized);
    await AsyncStorage.setItem(STORAGE_KEYS.RECIPES_SYNC, new Date().toISOString());
  } catch (error) {
    console.error('[Storage] Error saving cached recipes:', error);
  }
}

/**
 * Retrieves the timestamp of the last offline recipes cache synchronization.
 */
export async function getCachedRecipesTimestamp(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.RECIPES_SYNC);
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
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.RECIPES,
      STORAGE_KEYS.RECIPES_SYNC
    ]);
  } catch (error) {
    console.error('[Storage] Error clearing cached pantry and recipes:', error);
  }
}



