import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Ingredient } from '../types';
import { useAuth } from '../context/AuthContext';
import { Users, Trash2, ArrowLeft, Package } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface UserProfile {
  id: string;
  email: string;
  createdAt?: any;
}

export default function AdminView() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userIngredients, setUserIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  // Hardcode the admin email to ensure strict access control
  const isAdmin = user?.email === 'shreyashsinghai2005@gmail.com';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  };

  const loadUserIngredients = async (userId: string) => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users', userId, 'ingredients'));
      const items: Ingredient[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ ...doc.data(), id: doc.id } as Ingredient);
      });
      setUserIngredients(items);
    } catch (error) {
      console.error("Error fetching user ingredients:", error);
    }
  };

  const handleDeleteIngredient = async (ingredientId: string) => {
    if (!selectedUser) return;
    try {
      await deleteDoc(doc(db, 'users', selectedUser.id, 'ingredients', ingredientId));
      setUserIngredients(prev => prev.filter(i => i.id !== ingredientId));
    } catch (error) {
      console.error("Error deleting ingredient:", error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
          <span className="text-2xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (selectedUser) {
    return (
      <div className="p-6 h-full flex flex-col bg-gray-50 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => setSelectedUser(null)}
            className="p-2 bg-white rounded-full shadow-sm mr-3 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 truncate max-w-[200px]">{selectedUser.email}</h2>
            <p className="text-xs text-gray-500">Managing User Pantry</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3 pb-24">
          {userIngredients.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              <Package size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">This user's pantry is empty.</p>
            </div>
          ) : (
            userIngredients.map(item => {
              const today = new Date();
              const expiry = parseISO(item.estimatedExpiryDate);
              const daysLeft = differenceInDays(expiry, today);
              
              return (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center group">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl bg-gray-50 w-10 h-10 rounded-xl flex items-center justify-center">
                      {item.category === 'produce' ? '🥬' : item.category === 'dairy' ? '🥛' : item.category === 'meat' ? '🥩' : '🥫'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                      <p className="text-xs text-gray-500">{item.quantity} • {daysLeft} days left</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteIngredient(item.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 animate-in fade-in duration-300 pb-24">
      <div className="mb-6 flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
          <Users size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Console</h2>
          <p className="text-sm text-gray-500">Manage all registered users and data.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No users found.</div>
        ) : (
          users.map(u => (
            <div 
              key={u.id}
              onClick={() => {
                setSelectedUser(u);
                loadUserIngredients(u.id);
              }}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm truncate max-w-[220px]">{u.email}</p>
                <p className="text-xs text-gray-400">ID: {u.id.slice(0, 8)}...</p>
              </div>
              <div className="text-blue-500 bg-blue-50 px-3 py-1 rounded-lg text-xs font-medium">
                View Pantry
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
