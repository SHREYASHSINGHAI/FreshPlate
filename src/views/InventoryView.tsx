import React, { useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../context/AuthContext';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Trash2, AlertTriangle, CheckCircle, Clock, ShoppingCart, Eye } from 'lucide-react';

export default function InventoryView({ inventory, removeIngredient, onAddToShoppingList }: any) {
  const { canEdit, isGuest } = useAuth();

  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4 text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">🛒</span>
        </div>
        <p className="text-lg font-medium text-gray-800">Your pantry is empty</p>
        <p className="text-sm mt-1">Import a receipt from your recent delivery to start tracking.</p>
      </div>
    );
  }

  // Sort: stale first, then expiring, then fresh
  const sortedInventory = [...inventory].sort((a, b) => {
    const statusWeight = { stale: 0, expiring_soon: 1, fresh: 2 };
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status];
    }
    return new Date(a.estimatedExpiryDate).getTime() - new Date(b.estimatedExpiryDate).getTime();
  });

  return (
    <div className="space-y-4 pb-24 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Your Pantry</h2>
          <p className="text-xs text-gray-500 mt-0.5">{inventory.length} items in household</p>
        </div>
        {isGuest && (
          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
            <Eye size={12} className="mr-1" />
            Guest (View Only)
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {sortedInventory.map((item) => (
          <InventoryCard 
            key={item.id} 
            item={item} 
            canEdit={canEdit}
            onRemove={() => removeIngredient(item.id, 'wasted')} 
            onAddToShoppingList={() => {
              if (onAddToShoppingList) {
                onAddToShoppingList([{ name: item.name, category: item.category }]);
                removeIngredient(item.id, 'consumed');
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function InventoryCard({ item, canEdit, onRemove, onAddToShoppingList }: any) {
  const daysLeft = differenceInCalendarDays(parseISO(item.estimatedExpiryDate), new Date());
  
  let statusColor = "bg-green-50 text-green-700 border-green-200";
  let Icon = CheckCircle;
  let statusText = `${daysLeft} days left`;

  if (item.status === 'stale') {
    statusColor = "bg-red-50 text-red-700 border-red-200";
    Icon = AlertTriangle;
    statusText = "Stale / Expired";
  } else if (item.status === 'expiring_soon') {
    statusColor = "bg-orange-50 text-orange-700 border-orange-200";
    Icon = Clock;
    statusText = `Expiring (${daysLeft} days)`;
  }

  return (
    <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${statusColor}`}>
      <div className="flex items-start space-x-3">
        <div className="mt-1">
          <Icon size={20} className={item.status === 'stale' ? 'text-red-500' : item.status === 'expiring_soon' ? 'text-orange-500' : 'text-green-500'} />
        </div>
        <div>
          <h3 className="font-semibold capitalize text-base">{item.name}</h3>
          <div className="flex items-center space-x-2 text-sm opacity-80 mt-0.5">
            <span>{item.quantity}</span>
            <span>•</span>
            <span>{item.source}</span>
          </div>
          <p className="text-xs font-medium mt-1">{statusText}</p>
        </div>
      </div>
      {canEdit && (
        <div className="flex items-center space-x-1">
          <button 
            onClick={onAddToShoppingList}
            className="p-2 hover:bg-black/10 rounded-full transition-colors tooltip-trigger"
            title="Consume & Add to Shopping List"
            aria-label="Add to shopping list"
          >
            <ShoppingCart size={18} />
          </button>
          <button 
            onClick={onRemove}
            className="p-2 hover:bg-black/10 text-red-600 rounded-full transition-colors"
            title="Remove completely"
            aria-label="Remove item"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
