import React, { useState } from 'react';
import { ShoppingListItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Plus, Check, Trash2, Circle, Eye } from 'lucide-react';

interface ShoppingListViewProps {
  shoppingList: ShoppingListItem[];
  addItems: (items: {name: string, category: string, quantity?: string}[]) => void;
  toggleItem: (id: string, completed: boolean) => void;
  removeItem: (id: string) => void;
  removeCompleted: () => void;
}

export default function ShoppingListView({ 
  shoppingList, 
  addItems, 
  toggleItem, 
  removeItem, 
  removeCompleted 
}: ShoppingListViewProps) {
  const { canEdit, isGuest } = useAuth();
  const [newItemName, setNewItemName] = useState('');
  
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !newItemName.trim()) return;
    
    addItems([{
      name: newItemName.trim(),
      category: 'Other' // Default category
    }]);
    setNewItemName('');
  };

  const completedCount = shoppingList.filter(i => i.completed).length;

  return (
    <div className="p-4 pb-24 max-w-3xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center">
              <ShoppingCart className="mr-2 text-emerald-600" size={24} />
              Shopping List
            </h2>
            {isGuest && (
              <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 mb-1">
                <Eye size={12} className="mr-1" />
                View Only
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {shoppingList.length} items ({completedCount} completed)
          </p>
        </div>
        {canEdit && completedCount > 0 && (
          <button
            onClick={removeCompleted}
            className="text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Clear Completed
          </button>
        )}
      </div>

      {canEdit ? (
        <form onSubmit={handleAdd} className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Add an item..."
              className="w-full pl-4 pr-12 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
            />
            <button
              type="submit"
              disabled={!newItemName.trim()}
              className="absolute right-2 top-2 p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-4 p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-800 flex items-center">
          <Eye size={16} className="mr-2 text-purple-600 shrink-0" />
          <span>You have <strong>Guest (View-Only)</strong> access. You can see the household grocery list, but adding, checking, or deleting items is disabled.</span>
        </div>
      )}

      {shoppingList.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-400">
            <ShoppingCart size={32} />
          </div>
          <h3 className="text-gray-900 font-medium mb-1">Your list is empty</h3>
          <p className="text-sm text-gray-500 max-w-[250px] mx-auto">
            Items missing from recipes or marked as consumed will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {shoppingList.map((item) => (
            <div 
              key={item.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                item.completed 
                  ? 'bg-gray-50 border-gray-100 opacity-60' 
                  : 'bg-white border-gray-100 shadow-sm hover:border-gray-200'
              }`}
            >
              <div 
                className={`flex items-center flex-1 ${canEdit ? 'cursor-pointer' : 'cursor-default'}`} 
                onClick={() => canEdit && toggleItem(item.id, !item.completed)}
              >
                <button 
                  disabled={!canEdit}
                  className={`mr-3 flex-shrink-0 transition-colors ${
                    item.completed 
                      ? 'text-emerald-500' 
                      : canEdit 
                        ? 'text-gray-300 hover:text-gray-400' 
                        : 'text-gray-300'
                  }`}
                >
                  {item.completed ? <Check size={24} /> : <Circle size={24} />}
                </button>
                <div>
                  <p className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center mt-0.5">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{item.category}</span>
                    {item.quantity && <span className="ml-2">• {item.quantity}</span>}
                  </p>
                </div>
              </div>
              
              {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
