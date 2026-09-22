import { useState, useEffect } from 'react';
import { ShoppingListItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const STORAGE_KEY = 'freshbites_shopping_list';

export function useShoppingList() {
  const { householdId } = useAuth();
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadList() {
      if (householdId) {
        try {
          const querySnapshot = await getDocs(collection(db, 'users', householdId, 'shopping_list'));
          const items: ShoppingListItem[] = [];
          querySnapshot.forEach((doc) => {
            items.push(doc.data() as ShoppingListItem);
          });
          items.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
          setShoppingList(items);
        } catch (error: any) {
          if (error?.message?.includes('offline')) {
            console.warn("Firestore sync skipped due to offline mode or iframe restrictions.");
          } else {
            console.error("Failed to load shopping list from Firestore", error);
          }
        }
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            parsed.sort((a: any, b: any) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
            setShoppingList(parsed);
          } catch (e) {
            console.error("Failed to parse shopping list", e);
          }
        } else {
          setShoppingList([]);
        }
      }
      setIsLoaded(true);
    }
    
    loadList();
  }, [householdId]);

  const saveLocally = (newList: ShoppingListItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  };

  const addItems = async (itemsToAdd: {name: string, category: string, quantity?: string}[]) => {
    const newItems: ShoppingListItem[] = itemsToAdd.map(item => ({
      ...item,
      id: Math.random().toString(36).substring(7),
      addedAt: new Date().toISOString(),
      completed: false
    }));

    const newList = [...newItems, ...shoppingList];
    setShoppingList(newList);

    if (householdId) {
      try {
        const batch = writeBatch(db);
        newItems.forEach(item => {
          const docRef = doc(db, 'users', householdId, 'shopping_list', item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
      } catch (error) {
        console.error("Error adding to shopping list in Firestore", error);
      }
    } else {
      saveLocally(newList);
    }
  };

  const toggleItem = async (id: string, completed: boolean) => {
    const newList = shoppingList.map(item => 
      item.id === id ? { ...item, completed } : item
    );
    setShoppingList(newList);

    if (householdId) {
      try {
        await setDoc(doc(db, 'users', householdId, 'shopping_list', id), { completed }, { merge: true });
      } catch (error) {
        console.error("Error updating shopping list item", error);
      }
    } else {
      saveLocally(newList);
    }
  };

  const removeItem = async (id: string) => {
    const newList = shoppingList.filter(i => i.id !== id);
    setShoppingList(newList);

    if (householdId) {
      try {
        await deleteDoc(doc(db, 'users', householdId, 'shopping_list', id));
      } catch (error) {
        console.error("Error deleting shopping list item", error);
      }
    } else {
      saveLocally(newList);
    }
  };

  const removeCompleted = async () => {
    const completedIds = shoppingList.filter(i => i.completed).map(i => i.id);
    const newList = shoppingList.filter(i => !i.completed);
    setShoppingList(newList);

    if (householdId) {
      try {
        const batch = writeBatch(db);
        completedIds.forEach(id => {
          const docRef = doc(db, 'users', householdId, 'shopping_list', id);
          batch.delete(docRef);
        });
        await batch.commit();
      } catch (error) {
        console.error("Error removing completed items", error);
      }
    } else {
      saveLocally(newList);
    }
  };

  return {
    shoppingList,
    isLoaded,
    addItems,
    toggleItem,
    removeItem,
    removeCompleted
  };
}
