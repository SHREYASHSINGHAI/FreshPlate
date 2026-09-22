import React, { useState } from 'react';
import { ChefHat, Loader2, Sparkles, Clock, AlertTriangle, Eye, CheckCircle2 } from 'lucide-react';
import { Ingredient, Recipe } from '../types';
import { useAuth } from '../context/AuthContext';

export default function RecipesView({ 
  inventory, 
  onCook,
  onAddMissingIngredients
}: { 
  inventory: Ingredient[], 
  onCook: (idsOrNames: string[], recipe?: Recipe) => void,
  onAddMissingIngredients?: (items: {name: string, category: string}[]) => void
}) {
  const { canEdit, isGuest } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cuisine, setCuisine] = useState('Any');
  const [language, setLanguage] = useState('English');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const generateRecipes = async () => {
    if (inventory.length === 0) return;
    
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: inventory, cuisine, language, adults, children }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate recipes');
      }
      
      const data = await res.json();
      setRecipes(data.recipes);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while generating recipes.');
    } finally {
      setIsLoading(false);
    }
  };

  const expiringCount = inventory.filter(i => i.status === 'expiring_soon' || i.status === 'stale').length;

  return (
    <div className="p-4 space-y-6 pb-24 relative">
      {toastMessage && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 border border-gray-700 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Zero Waste Recipes</h2>
        <p className="text-sm text-gray-500 mt-1">
          Discover meals tailored to what you have, prioritizing items that need to be eaten soon.
        </p>
      </div>

      {inventory.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-2xl text-center border border-gray-100">
          <p className="text-gray-500 text-sm">Add items to your pantry to get recipe suggestions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Cuisine</label>
            <div className="flex flex-wrap gap-2">
              {['Any', 'Indian', 'Indian-Chinese', 'Italian'].map((c) => (
                <button
                  key={c}
                  onClick={() => setCuisine(c)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    cuisine === c
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Adults</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setAdults(Math.max(1, adults - 1))}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                  aria-label="Decrease adults"
                >
                  -
                </button>
                <span className="font-medium text-gray-900 w-4 text-center">{adults}</span>
                <button
                  onClick={() => setAdults(adults + 1)}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                  aria-label="Increase adults"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Children</label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setChildren(Math.max(0, children - 1))}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                  aria-label="Decrease children"
                >
                  -
                </button>
                <span className="font-medium text-gray-900 w-4 text-center">{children}</span>
                <button
                  onClick={() => setChildren(children + 1)}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                  aria-label="Increase children"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions Language</label>
            <div className="flex flex-wrap gap-2">
              {['English', 'Hindi', 'Hinglish'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    language === l
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-900">
                {expiringCount} {expiringCount === 1 ? 'item needs' : 'items need'} attention
              </p>
              <p className="text-xs text-orange-700 mt-0.5">We'll prioritize these in suggestions</p>
            </div>
            <button
              onClick={generateRecipes}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center shadow-sm"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
              Generate
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {recipes.map(recipe => {
              const isSelected = selectedRecipeId === recipe.id;
              return (
                <div 
                  key={recipe.id} 
                  onClick={() => setSelectedRecipeId(isSelected ? null : recipe.id)}
                  className={`border rounded-2xl p-5 shadow-sm overflow-hidden relative cursor-pointer transition-all ${
                    isSelected ? 'bg-emerald-50/30 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {recipe.matchesExpiring && (
                    <div className="absolute top-0 right-0 bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-1 rounded-bl-xl uppercase tracking-wider flex items-center z-10">
                      <AlertTriangle size={10} className="mr-1" /> Saves Food
                    </div>
                  )}
                  
                  <h3 className="font-semibold text-lg text-gray-900 pr-16 leading-tight">{recipe.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{recipe.description}</p>
                  
                  <div className="flex items-center space-x-4 mt-3 text-xs font-medium text-gray-600 bg-gray-50 p-2 rounded-lg inline-flex">
                    <div className="flex items-center"><Clock size={14} className="mr-1 opacity-70" /> {recipe.prepTime} prep</div>
                    <div className="flex items-center"><ChefHat size={14} className="mr-1 opacity-70" /> {recipe.cookTime} cook</div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Ingredients</h4>
                    <ul className="text-sm text-gray-700 space-y-1 mb-4">
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-emerald-500 mr-2 mt-0.5">•</span>
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                      <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center">
                          <AlertTriangle size={14} className="mr-1" />
                          Missing Ingredients
                        </h4>
                        <ul className="text-sm text-amber-800 space-y-1 mb-3">
                          {recipe.missingIngredients.map((ing, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-amber-500 mr-2 mt-0.5">•</span>
                              <span>{ing}</span>
                            </li>
                          ))}
                        </ul>
                        {canEdit && onAddMissingIngredients && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddMissingIngredients(
                                recipe.missingIngredients!.map(item => ({ name: item, category: 'From Recipe' }))
                              );
                              setToastMessage("Added missing ingredients to your Shopping List!");
                              setTimeout(() => setToastMessage(null), 3000);
                            }}
                            className="text-xs font-medium text-amber-700 bg-amber-100/50 hover:bg-amber-200/50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Add to Shopping List
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Instructions</h4>
                    <ol className="text-sm text-gray-700 space-y-2">
                      {recipe.instructions.map((step, idx) => (
                        <li key={idx} className="flex">
                          <span className="font-medium text-gray-400 mr-2">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {isSelected && (
                    <div className="mt-6 pt-4 border-t border-emerald-100 flex justify-end">
                      {canEdit ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const identifiers = (recipe.usedIngredientIds && recipe.usedIngredientIds.length > 0)
                              ? recipe.usedIngredientIds
                              : recipe.ingredients;
                            onCook(identifiers, recipe);
                            setRecipes(recipes.filter(r => r.id !== recipe.id));
                            setSelectedRecipeId(null);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center"
                        >
                          <ChefHat size={16} className="mr-2" />
                          I cooked this! (Remove ingredients)
                        </button>
                      ) : (
                        <div className="flex items-center text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                          <Eye size={14} className="mr-1.5 text-purple-600" />
                          Guest mode: viewing only (pantry deductions disabled)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
