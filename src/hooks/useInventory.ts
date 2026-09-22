import { useState, useEffect } from 'react';
import { Ingredient, FreshnessStatus } from '../types';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, increment } from 'firebase/firestore';

const STORAGE_KEY = 'freshbites_inventory';

export function useInventory() {
  const { householdId } = useAuth();
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadInventory() {
      if (householdId) {
        try {
          const querySnapshot = await getDocs(collection(db, 'users', householdId, 'ingredients'));
          const items: Ingredient[] = [];
          querySnapshot.forEach((doc) => {
            items.push(doc.data() as Ingredient);
          });
          setInventory(updateStatuses(items));
        } catch (error: any) {
          if (error?.message?.includes('offline')) {
            console.warn("Firestore sync skipped due to offline mode or iframe restrictions.");
          } else {
            console.error("Failed to load inventory from Firestore", error);
          }
        }
      } else {
        // Fallback to local storage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setInventory(updateStatuses(parsed));
          } catch (e) {
            console.error("Failed to parse inventory", e);
          }
        } else {
          setInventory([]);
        }
      }
      setIsLoaded(true);
    }
    
    loadInventory();
  }, [householdId]);

  const updateStatuses = (items: Ingredient[]): Ingredient[] => {
    const today = new Date();
    return items.map(item => {
      const expiry = parseISO(item.estimatedExpiryDate);
      const daysLeft = differenceInCalendarDays(expiry, today);
      
      let status: FreshnessStatus = 'fresh';
      if (daysLeft <= 0) {
        status = 'stale';
      } else if (daysLeft <= 2) {
        status = 'expiring_soon';
      }
      
      return { ...item, status };
    });
  };

  const saveInventoryLocally = (newInventory: Ingredient[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newInventory));
  };

  const logStats = async (consumed: number, wasted: number) => {
    if (!householdId) return;
    try {
      await setDoc(doc(db, 'users', householdId, 'stats', 'summary'), {
        consumedCount: increment(consumed),
        wastedCount: increment(wasted)
      }, { merge: true });
    } catch (error) {
      console.error("Error logging stats", error);
    }
  };

  const addIngredients = async (newItems: Ingredient[]) => {
    const updatedWithStatus = updateStatuses(newItems);
    const newInventory = [...inventory, ...updatedWithStatus];
    setInventory(newInventory);

    if (householdId) {
      try {
        const batch = writeBatch(db);
        updatedWithStatus.forEach(item => {
          const docRef = doc(db, 'users', householdId, 'ingredients', item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
      } catch (error) {
        console.error("Error adding ingredients to Firestore", error);
      }
    } else {
      saveInventoryLocally(newInventory);
    }
  };

  const removeIngredient = async (id: string, reason?: 'consumed' | 'wasted') => {
    const newInventory = inventory.filter(i => i.id !== id);
    setInventory(newInventory);

    if (householdId) {
      try {
        await deleteDoc(doc(db, 'users', householdId, 'ingredients', id));
        if (reason === 'consumed') await logStats(1, 0);
        if (reason === 'wasted') await logStats(0, 1);
      } catch (error) {
        console.error("Error deleting ingredient from Firestore", error);
      }
    } else {
      saveInventoryLocally(newInventory);
    }
  };

  const removeIngredients = async (ids: string[], reason?: 'consumed' | 'wasted') => {
    const newInventory = inventory.filter(i => !ids.includes(i.id));
    setInventory(newInventory);

    if (householdId) {
      try {
        const batch = writeBatch(db);
        ids.forEach(id => {
          const docRef = doc(db, 'users', householdId, 'ingredients', id);
          batch.delete(docRef);
        });
        await batch.commit();
        if (reason === 'consumed') await logStats(ids.length, 0);
        if (reason === 'wasted') await logStats(0, ids.length);
      } catch (error) {
        console.error("Error deleting ingredients from Firestore", error);
      }
    } else {
      saveInventoryLocally(newInventory);
    }
  };

  const clearInventory = async () => {
    setInventory([]);
    if (householdId) {
      try {
        const batch = writeBatch(db);
        inventory.forEach(item => {
          const docRef = doc(db, 'users', householdId, 'ingredients', item.id);
          batch.delete(docRef);
        });
        await batch.commit();
      } catch (error) {
        console.error("Error clearing inventory from Firestore", error);
      }
    } else {
      saveInventoryLocally([]);
    }
  };

  return {
    inventory,
    isLoaded,
    addIngredients,
    removeIngredient,
    removeIngredients,
    clearInventory,
  };
}
