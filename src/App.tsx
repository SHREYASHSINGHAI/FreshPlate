/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShoppingBasket, ChefHat, PlusCircle, LogIn, LogOut, ShieldAlert, AlertCircle, ShoppingCart, Activity } from 'lucide-react';
import { useInventory } from './hooks/useInventory';
import { useShoppingList } from './hooks/useShoppingList';
import InventoryView from './views/InventoryView';
import ImportView from './views/ImportView';
import RecipesView from './views/RecipesView';
import AdminView from './views/AdminView';
import ShoppingListView from './views/ShoppingListView';
import DashboardView from './views/DashboardView';
import AuthModal from './components/AuthModal';
import { Ingredient } from './types';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, login, logout } = useAuth();
  const { inventory, isLoaded, addIngredients, removeIngredient, removeIngredients } = useInventory();
  const { shoppingList, addItems: addToShoppingList, toggleItem, removeItem, removeCompleted } = useShoppingList();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'recipes' | 'import' | 'admin' | 'shopping' | 'dashboard'>('inventory');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsInIframe(window !== window.top);
  }, []);

  const isAdmin = user?.email === 'shreyashsinghai2005@gmail.com';

  if (!isLoaded) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-emerald-600">Loading...</div>;

  const handleImportComplete = (newItems: Ingredient[]) => {
    addIngredients(newItems);
    setActiveTab('inventory');
  };

  const handleRecipeCooked = (usedIngredientIds: string[]) => {
    removeIngredients(usedIngredientIds, 'consumed');
  };

  return (
    <div className="h-[100dvh] bg-white md:bg-gray-100 flex justify-center font-sans overflow-hidden">
      <div className="w-full max-w-md bg-white h-full relative shadow-2xl flex flex-col">
        
        {/* Header */}
        <header className="px-4 py-4 bg-white border-b border-gray-100 flex-shrink-0 z-10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-700 text-lg">🌱</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">FreshPlate</h1>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              {user ? (
                <div>
                  <button 
                    onClick={() => setShowProfileMenu(!showProfileMenu)} 
                    className="flex items-center focus:outline-none"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-full border border-gray-200 shadow-sm" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
                
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20 animate-in slide-in-from-top-2 fade-in duration-200">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setActiveTab('dashboard');
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors border-b border-gray-50"
                      >
                        <Activity size={16} className="mr-2 text-indigo-500" />
                        Dashboard
                      </button>

                      {isAdmin && (
                        <button 
                          onClick={() => {
                            setActiveTab('admin');
                            setShowProfileMenu(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 flex items-center transition-colors border-b border-gray-50"
                        >
                          <ShieldAlert size={16} className="mr-2" />
                          Admin Console
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          logout();
                          setShowProfileMenu(false);
                        }} 
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                      >
                        <LogOut size={16} className="mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button 
                onClick={login} 
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center px-3 py-1.5 bg-emerald-50 rounded-lg transition-colors"
              >
                <LogIn size={16} className="mr-1.5" />
                Sign In
              </button>
            )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-white hide-scrollbar">
          {isInIframe && !user && (
            <div className="m-4 bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <div className="flex items-start">
                <AlertCircle className="text-amber-500 mt-0.5 mr-3 flex-shrink-0" size={20} />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800">Popup Blocked in Editor</h4>
                  <p className="text-sm text-amber-700 mt-1 mb-3">
                    To sign in with Google or connect Gmail, you must open this app in a new tab.
                  </p>
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Open App in New Tab
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && <InventoryView inventory={inventory} removeIngredient={removeIngredient} onAddToShoppingList={addToShoppingList} />}
          {activeTab === 'import' && <ImportView onImportComplete={handleImportComplete} />}
          {activeTab === 'recipes' && <RecipesView inventory={inventory} onCook={handleRecipeCooked} onAddMissingIngredients={addToShoppingList} />}
          {activeTab === 'shopping' && <ShoppingListView shoppingList={shoppingList} addItems={addToShoppingList} toggleItem={toggleItem} removeItem={removeItem} removeCompleted={removeCompleted} />}
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'admin' && <AdminView />}
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-gray-200 px-4 py-3 flex justify-between items-center z-20 flex-shrink-0 pb-safe">
          <NavItem 
            icon={<ShoppingBasket size={24} />} 
            label="Pantry" 
            isActive={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
          />
          <NavItem 
            icon={<PlusCircle size={24} />} 
            label="Import" 
            isActive={activeTab === 'import'} 
            onClick={() => setActiveTab('import')} 
          />
          <NavItem 
            icon={<ChefHat size={24} />} 
            label="Recipes" 
            isActive={activeTab === 'recipes'} 
            onClick={() => setActiveTab('recipes')} 
          />
          <NavItem 
            icon={<ShoppingCart size={24} />} 
            label="Cart" 
            isActive={activeTab === 'shopping'} 
            onClick={() => setActiveTab('shopping')} 
          />
          <NavItem 
            icon={<Activity size={24} />} 
            label="Dash" 
            isActive={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
        </nav>

        {/* In-App Authentication Modal */}
        <AuthModal />
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-14 space-y-1 transition-colors ${
        isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold tracking-wide">{label}</span>
    </button>
  );
}
