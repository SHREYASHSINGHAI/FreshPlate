import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Recipe, RecipeFilterMode } from '../types';

interface RecipeListScreenProps {
  recipes: Recipe[];
  onBackToPantry: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  recipesSyncTime?: string | null;
}

export function RecipeListScreen({
  recipes,
  onBackToPantry,
  onRegenerate,
  isRegenerating = false,
  recipesSyncTime
}: RecipeListScreenProps) {
  const [filterMode, setFilterMode] = useState<RecipeFilterMode>('strict');
  const [expandedRecipeIndex, setExpandedRecipeIndex] = useState<number | null>(0);
  const [savedShoppingItems, setSavedShoppingItems] = useState<Record<string, boolean>>({});

  // Filter recipes according to Strict Mode vs Shopping Mode
  const filteredRecipes = useMemo(() => {
    if (filterMode === 'strict') {
      // Strict Mode: Only recipes with 0 missing ingredients
      return recipes.filter(
        (r) => !r.missingIngredients || r.missingIngredients.length === 0
      );
    }
    if (filterMode === 'shopping') {
      // Shopping Mode: Recipes requiring 1 to 2 missing ingredients
      return recipes.filter(
        (r) =>
          r.missingIngredients &&
          r.missingIngredients.length > 0 &&
          r.missingIngredients.length <= 2
      );
    }
    // All Recipes
    return recipes;
  }, [recipes, filterMode]);

  const strictCount = useMemo(
    () =>
      recipes.filter(
        (r) => !r.missingIngredients || r.missingIngredients.length === 0
      ).length,
    [recipes]
  );

  const shoppingCount = useMemo(
    () =>
      recipes.filter(
        (r) =>
          r.missingIngredients &&
          r.missingIngredients.length > 0 &&
          r.missingIngredients.length <= 2
      ).length,
    [recipes]
  );

  const toggleExpand = (index: number) => {
    setExpandedRecipeIndex(expandedRecipeIndex === index ? null : index);
  };

  const handleAddMissingToShoppingList = (ingredientName: string) => {
    setSavedShoppingItems((prev) => ({
      ...prev,
      [ingredientName]: !prev[ingredientName]
    }));
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={onBackToPantry} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Edit Pantry</Text>
          </TouchableOpacity>
          {onRegenerate && (
            <TouchableOpacity
              onPress={onRegenerate}
              style={[styles.regenerateBtn, isRegenerating && styles.btnDisabled]}
              disabled={isRegenerating}
            >
              <Text style={styles.regenerateText}>
                {isRegenerating ? 'Generating...' : '↻ New Recipes'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.title}>AI Recipe Matches</Text>
        <Text style={styles.subtitle}>
          Personalized recipes curated from your confirmed pantry items
        </Text>

        {recipesSyncTime && (
          <View style={styles.offlineRecipeBadge}>
            <Text style={styles.offlineRecipeDot}>●</Text>
            <Text style={styles.offlineRecipeText}>
              Available Offline • Synced {new Date(recipesSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}

        {/* Filter Mode Toggle Pills */}
        <View style={styles.filterPillContainer}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              filterMode === 'strict' && styles.filterPillActive
            ]}
            onPress={() => setFilterMode('strict')}
          >
            <Text
              style={[
                styles.filterPillText,
                filterMode === 'strict' && styles.filterPillTextActive
              ]}
            >
              🔒 Strict Mode ({strictCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              filterMode === 'shopping' && styles.filterPillActive
            ]}
            onPress={() => setFilterMode('shopping')}
          >
            <Text
              style={[
                styles.filterPillText,
                filterMode === 'shopping' && styles.filterPillTextActive
              ]}
            >
              🛒 Shopping Mode ({shoppingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              filterMode === 'all' && styles.filterPillActive
            ]}
            onPress={() => setFilterMode('all')}
          >
            <Text
              style={[
                styles.filterPillText,
                filterMode === 'all' && styles.filterPillTextActive
              ]}
            >
              All ({recipes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Description Tag */}
        <View style={styles.filterExplainer}>
          <Text style={styles.filterExplainerText}>
            {filterMode === 'strict'
              ? '✨ 100% Pantry Match: Uses only what is in your fridge & pantry (plus salt, oil & spices).'
              : filterMode === 'shopping'
              ? '🛍️ Up to 2 Missing Items: Delicious recipes requiring just 1 or 2 small grocery items.'
              : '📖 Showing all generated suggestions.'}
          </Text>
        </View>
      </View>

      {/* Recipe List */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredRecipes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              {filterMode === 'strict' ? '🔒' : '🛒'}
            </Text>
            <Text style={styles.emptyTitle}>
              {filterMode === 'strict'
                ? 'No 100% Strict Matches'
                : 'No Shopping Mode Recipes'}
            </Text>
            <Text style={styles.emptyText}>
              {filterMode === 'strict'
                ? 'All generated recipes need at least one ingredient not currently in your pantry. Switch to Shopping Mode to explore recipes needing 1-2 items!'
                : 'No recipes found requiring 1-2 missing ingredients. Try switching to Strict Mode or All Recipes.'}
            </Text>
            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={() =>
                setFilterMode(filterMode === 'strict' ? 'shopping' : 'all')
              }
            >
              <Text style={styles.switchModeText}>
                {filterMode === 'strict'
                  ? 'Switch to Shopping Mode (1-2 items) ➔'
                  : 'Show All Recipes ➔'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredRecipes.map((recipe, index) => {
            const isExpanded = expandedRecipeIndex === index;
            const missingCount = recipe.missingIngredients?.length || 0;
            const hasExpiring = recipe.matchesExpiring;

            return (
              <View key={`${recipe.title}_${index}`} style={styles.recipeCard}>
                {/* Expiring Badge Header */}
                {hasExpiring && (
                  <View style={styles.expiringBanner}>
                    <Text style={styles.expiringBannerText}>
                      ⚡ Saves Expiring Pantry Ingredients!
                    </Text>
                  </View>
                )}

                {/* Main Card Content */}
                <View style={styles.cardPadding}>
                  <View style={styles.cardHeader}>
                    <View style={styles.titleWrap}>
                      <Text style={styles.recipeTitle}>{recipe.title}</Text>
                      <Text style={styles.recipeDescription}>
                        {recipe.description}
                      </Text>
                    </View>
                  </View>

                  {/* Metadata Chips */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>⏱ {recipe.prepTime} prep</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>🔥 {recipe.cookTime} cook</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>
                        📊 {recipe.difficulty || 'Easy'}
                      </Text>
                    </View>
                    {missingCount === 0 ? (
                      <View style={[styles.metaChip, styles.chipStrict]}>
                        <Text style={styles.chipStrictText}>✓ Ready to Cook</Text>
                      </View>
                    ) : (
                      <View style={[styles.metaChip, styles.chipMissing]}>
                        <Text style={styles.chipMissingText}>
                          🛒 +{missingCount} needed
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Missing Ingredients Section (Shopping Mode) */}
                  {missingCount > 0 && (
                    <View style={styles.missingSection}>
                      <Text style={styles.missingSectionTitle}>
                        Missing from Pantry ({missingCount}):
                      </Text>
                      <View style={styles.missingTagsRow}>
                        {recipe.missingIngredients.map((item, mIdx) => {
                          const isSaved = !!savedShoppingItems[item];
                          return (
                            <TouchableOpacity
                              key={mIdx}
                              style={[
                                styles.missingTag,
                                isSaved && styles.missingTagSaved
                              ]}
                              onPress={() => handleAddMissingToShoppingList(item)}
                            >
                              <Text
                                style={[
                                  styles.missingTagText,
                                  isSaved && styles.missingTagTextSaved
                                ]}
                              >
                                {isSaved ? '✓ Added' : '+ Add'} {item}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Used Pantry Ingredients Tags */}
                  <View style={styles.ingredientsSummarySection}>
                    <Text style={styles.ingredientsSummaryTitle}>
                      Ingredients Used:
                    </Text>
                    <View style={styles.usedTagsRow}>
                      {recipe.ingredients.slice(0, 5).map((ing, iIdx) => (
                        <View key={iIdx} style={styles.usedTag}>
                          <Text style={styles.usedTagText}>• {ing}</Text>
                        </View>
                      ))}
                      {recipe.ingredients.length > 5 && (
                        <View style={styles.usedTagMore}>
                          <Text style={styles.usedTagMoreText}>
                            +{recipe.ingredients.length - 5} more
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Expand / Collapse Accordion Toggle */}
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => toggleExpand(index)}
                  >
                    <Text style={styles.expandButtonText}>
                      {isExpanded ? 'Hide Cooking Steps ▲' : 'View Full Cooking Steps ▼'}
                    </Text>
                  </TouchableOpacity>

                  {/* Expanded Step-by-Step Instructions */}
                  {isExpanded && (
                    <View style={styles.instructionsContainer}>
                      <Text style={styles.instructionsHeading}>
                        Cooking Instructions:
                      </Text>
                      {recipe.instructions.map((step, sIdx) => (
                        <View key={sIdx} style={styles.stepRow}>
                          <View style={styles.stepNumberBadge}>
                            <Text style={styles.stepNumberText}>{sIdx + 1}</Text>
                          </View>
                          <Text style={styles.stepText}>{step}</Text>
                        </View>
                      ))}

                      {/* Full Ingredients List */}
                      <View style={styles.fullIngredientsBox}>
                        <Text style={styles.fullIngredientsTitle}>
                          Complete Ingredient List:
                        </Text>
                        {recipe.ingredients.map((ing, fIdx) => (
                          <Text key={fIdx} style={styles.fullIngredientItem}>
                            • {ing}
                          </Text>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  backButton: {
    paddingVertical: 4
  },
  backButtonText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '700'
  },
  regenerateBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14
  },
  btnDisabled: {
    opacity: 0.5
  },
  regenerateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14
  },
  filterPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 4,
    gap: 4
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10
  },
  filterPillActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b'
  },
  filterPillTextActive: {
    color: '#0f172a',
    fontWeight: '700'
  },
  filterExplainer: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  filterExplainerText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16
  },
  scrollArea: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16
  },
  recipeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  expiringBanner: {
    backgroundColor: '#fef2f2',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca'
  },
  expiringBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626'
  },
  cardPadding: {
    padding: 18
  },
  cardHeader: {
    marginBottom: 12
  },
  titleWrap: {
    flex: 1
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4
  },
  recipeDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14
  },
  metaChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  chipStrict: {
    backgroundColor: '#d1fae5'
  },
  chipStrictText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46'
  },
  chipMissing: {
    backgroundColor: '#ffedd5'
  },
  chipMissingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c2410c'
  },
  missingSection: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14
  },
  missingSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9a3412',
    marginBottom: 6
  },
  missingTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  missingTag: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fb923c',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  missingTagSaved: {
    backgroundColor: '#10b981',
    borderColor: '#059669'
  },
  missingTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c2410c'
  },
  missingTagTextSaved: {
    color: '#ffffff'
  },
  ingredientsSummarySection: {
    marginBottom: 14
  },
  ingredientsSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6
  },
  usedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  usedTag: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  usedTagText: {
    fontSize: 11,
    color: '#475569'
  },
  usedTagMore: {
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  usedTagMoreText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  },
  expandButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center'
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155'
  },
  instructionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  instructionsHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff'
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18
  },
  fullIngredientsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  fullIngredientsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6
  },
  fullIngredientItem: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 3
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 32,
    alignItems: 'center',
    marginTop: 20
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20
  },
  switchModeButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14
  },
  switchModeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  },
  offlineRecipeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 4,
    gap: 6
  },
  offlineRecipeDot: {
    fontSize: 10,
    color: '#10b981'
  },
  offlineRecipeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46'
  }
});
