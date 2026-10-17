import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { useImageCapture } from './src/hooks/useImageCapture';
import {
  uploadPhotoForAnalysis,
  uploadReceiptPhoto,
  uploadFridgePhoto,
  generateRecipesFromPantry,
  parseNetworkError
} from './src/services/api';
import {
  ScanMode,
  PantryGroup,
  PantryReviewItem,
  Recipe,
  NetworkErrorInfo
} from './src/types';
import { PantryReviewScreen } from './src/components/PantryReviewScreen';
import { RecipeListScreen } from './src/components/RecipeListScreen';
import { AccountPrivacySettingsModal } from './src/components/AccountPrivacySettingsModal';
import { SettingsScreen } from './src/components/SettingsScreen';
import { NetworkErrorBanner } from './src/components/NetworkErrorBanner';
import {
  loadCachedPantryItems,
  saveCachedPantryItems,
  getLastSyncTimestamp,
  clearCachedPantry
} from './src/services/storage';

type AppScreen = 'scan' | 'review' | 'recipes' | 'settings';

// Default sample pantry items for instant demo review
const SAMPLE_PANTRY_ITEMS: PantryReviewItem[] = [
  {
    id: 'sample_1',
    name: 'Greek Yogurt',
    group: 'Dairy',
    quantity: '500g',
    status: 'expiring_soon'
  },
  {
    id: 'sample_2',
    name: 'Cheddar Cheese',
    group: 'Dairy',
    quantity: '200g',
    status: 'fresh'
  },
  {
    id: 'sample_3',
    name: 'Eggs',
    group: 'Dairy',
    quantity: '6 pcs',
    status: 'fresh'
  },
  {
    id: 'sample_4',
    name: 'Ripe Tomatoes',
    group: 'Produce',
    quantity: '4 pcs',
    status: 'expiring_soon'
  },
  {
    id: 'sample_5',
    name: 'Baby Spinach',
    group: 'Produce',
    quantity: '1 bag (200g)',
    status: 'expiring_soon'
  },
  {
    id: 'sample_6',
    name: 'Yellow Onions',
    group: 'Produce',
    quantity: '3 pcs',
    status: 'fresh'
  },
  {
    id: 'sample_7',
    name: 'Garlic Bulbs',
    group: 'Produce',
    quantity: '1 head',
    status: 'fresh'
  },
  {
    id: 'sample_8',
    name: 'Basmati Rice',
    group: 'Pantry',
    quantity: '1 kg',
    status: 'fresh'
  },
  {
    id: 'sample_9',
    name: 'Olive Oil',
    group: 'Pantry',
    quantity: '500 ml',
    status: 'fresh'
  },
  {
    id: 'sample_10',
    name: 'Canned Chickpeas',
    group: 'Pantry',
    quantity: '1 can (400g)',
    status: 'fresh'
  }
];

function detectPantryGroup(name: string, rawCategory?: string): PantryGroup {
  const text = `${name} ${rawCategory || ''}`.toLowerCase();
  const dairyKeywords = [
    'milk', 'yogurt', 'curd', 'cheese', 'paneer', 'butter', 'cream', 'ghee',
    'cheddar', 'mozzarella', 'kefir', 'dairy', 'egg'
  ];
  const produceKeywords = [
    'tomato', 'onion', 'potato', 'spinach', 'garlic', 'ginger', 'apple', 'banana',
    'lemon', 'lime', 'pepper', 'carrot', 'coriander', 'cilantro', 'chili', 'lettuce',
    'cucumber', 'vegetable', 'fruit', 'herb', 'mushroom', 'avocado', 'produce', 'greens'
  ];

  if (dairyKeywords.some((k) => text.includes(k))) return 'Dairy';
  if (produceKeywords.some((k) => text.includes(k))) return 'Produce';
  return 'Pantry';
}

function mapScanResultToReviewItems(scanResult: any, mode: ScanMode): PantryReviewItem[] {
  if (!scanResult) return [];

  if (mode === 'receipt' && Array.isArray(scanResult.items)) {
    return scanResult.items.map((item: any, idx: number) => ({
      id: item.id || `receipt_item_${idx}`,
      name: item.normalizedName || item.rawText,
      quantity: item.quantity || '1 unit',
      group: detectPantryGroup(item.normalizedName || item.rawText, item.category),
      status: item.status || 'fresh'
    }));
  }

  if (mode === 'fridge' && Array.isArray(scanResult.detectedItems)) {
    return scanResult.detectedItems.map((item: any, idx: number) => ({
      id: item.id || `fridge_item_${idx}`,
      name: item.name,
      quantity: item.estimatedQuantity || '1 portion',
      group: detectPantryGroup(item.name, item.category),
      status: item.status || 'fresh'
    }));
  }

  if (Array.isArray(scanResult.ingredients)) {
    return scanResult.ingredients.map((item: any, idx: number) => ({
      id: item.id || `pantry_item_${idx}`,
      name: item.name,
      quantity: item.quantity || '1 portion',
      group: detectPantryGroup(item.name, item.category),
      status: item.status || 'fresh'
    }));
  }

  return [];
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('scan');
  const [mode, setMode] = useState<ScanMode>('receipt');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [networkError, setNetworkError] = useState<NetworkErrorInfo | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Review & Recipe State (backed by AsyncStorage)
  const [reviewItems, setReviewItems] = useState<PantryReviewItem[]>(SAMPLE_PANTRY_ITEMS);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Hydrate pantry inventory from local device cache on initial launch
  useEffect(() => {
    async function hydrateOfflineStorage() {
      try {
        const cached = await loadCachedPantryItems();
        const syncTime = await getLastSyncTimestamp();
        if (cached && cached.length > 0) {
          setReviewItems(cached);
          setLastSyncTime(syncTime);
          console.log(`[FreshPlate Mobile] Restored ${cached.length} pantry items from offline cache.`);
        } else {
          // Initialize sample items for instant offline demo
          await saveCachedPantryItems(SAMPLE_PANTRY_ITEMS);
          setReviewItems(SAMPLE_PANTRY_ITEMS);
          setLastSyncTime(new Date().toISOString());
        }
      } catch (err) {
        console.warn('[FreshPlate Mobile] Offline cache hydration notice:', err);
      }
    }
    hydrateOfflineStorage();
  }, []);

  // Synchronously update state and asynchronously persist to AsyncStorage
  const updateAndCachePantryItems = (items: PantryReviewItem[]) => {
    setReviewItems(items);
    const now = new Date().toISOString();
    setLastSyncTime(now);
    saveCachedPantryItems(items).catch((err) =>
      console.error('[FreshPlate Mobile] Failed to persist pantry items to AsyncStorage:', err)
    );
  };

  const {
    photoUri,
    isLoading: isPicking,
    error: pickerError,
    takePhoto,
    pickFromGallery,
    clearPhoto
  } = useImageCapture();

  const handleModeChange = (newMode: ScanMode) => {
    setMode(newMode);
    setScanResult(null);
    setNetworkError(null);
    clearPhoto();
  };

  const handleAnalyzePhoto = async () => {
    if (!photoUri) return;

    setIsUploading(true);
    setNetworkError(null);
    setScanResult(null);

    try {
      let response: any;
      if (mode === 'receipt') {
        response = await uploadReceiptPhoto(photoUri);
      } else if (mode === 'fridge') {
        response = await uploadFridgePhoto(photoUri);
      } else {
        response = await uploadPhotoForAnalysis(photoUri);
      }

      setScanResult(response);

      // Automatically map recognized items and save to offline cache
      const mapped = mapScanResultToReviewItems(response, mode);
      if (mapped.length > 0) {
        updateAndCachePantryItems(mapped);
      }
    } catch (err: any) {
      console.error('[FreshPlate App] Analysis error:', err);
      const parsed = parseNetworkError(err);
      setNetworkError(parsed);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGoToReview = () => {
    if (scanResult) {
      const mapped = mapScanResultToReviewItems(scanResult, mode);
      if (mapped.length > 0) {
        updateAndCachePantryItems(mapped);
      }
    }
    setCurrentScreen('review');
  };

  const handleStartSampleReview = () => {
    updateAndCachePantryItems(SAMPLE_PANTRY_ITEMS);
    setCurrentScreen('review');
  };

  const handleReset = () => {
    clearPhoto();
    setScanResult(null);
    setNetworkError(null);
  };

  const handleClearPantryData = () => {
    updateAndCachePantryItems([]);
    setScanResult(null);
    clearPhoto();
    setRecipes([]);
    setNetworkError(null);
    clearCachedPantry().catch((err) =>
      console.warn('[FreshPlate Mobile] Error clearing cached pantry:', err)
    );
  };

  const handleDeleteAccount = async () => {
    updateAndCachePantryItems([]);
    setScanResult(null);
    clearPhoto();
    setRecipes([]);
    setNetworkError(null);
    await clearCachedPantry().catch((err) =>
      console.warn('[FreshPlate Mobile] Error clearing cached pantry:', err)
    );
    setCurrentScreen('scan');
  };

  // Triggered when user confirms items on PantryReviewScreen
  const handleGenerateRecipes = async (confirmedItems: PantryReviewItem[]) => {
    setReviewItems(confirmedItems);
    setIsGeneratingRecipes(true);

    try {
      const result = await generateRecipesFromPantry(confirmedItems, {
        cuisine: 'Any',
        language: 'English',
        adults: 2,
        children: 0
      });

      if (result.recipes && result.recipes.length > 0) {
        setRecipes(result.recipes);
        setCurrentScreen('recipes');
      } else {
        Alert.alert(
          'No Recipes Generated',
          'Gemini could not generate recipe suggestions for this combination of items. Please add more pantry items.'
        );
      }
    } catch (err: any) {
      console.error('[FreshPlate App] Recipe generation error:', err);
      Alert.alert(
        'Recipe Generation Notice',
        err.message || 'Unable to connect to the recipe server. Please check your backend connection.',
        [
          { text: 'OK' },
          {
            text: 'View Offline Demo Recipes',
            onPress: () => {
              // Graceful fallback for offline demo testing
              setRecipes([
                {
                  title: 'Mediterranean Shakshuka with Feta',
                  description: 'A comforting, savory skillet dish featuring poached eggs in a spiced tomato, onion, and garlic sauce.',
                  ingredients: ['Eggs (4 pcs)', 'Ripe Tomatoes (4 pcs)', 'Yellow Onions (1 pc)', 'Garlic Bulbs (2 cloves)', 'Olive Oil (2 tbsp)', 'Salt & Pepper to taste'],
                  instructions: [
                    'Heat olive oil in a skillet over medium heat. Sauté diced onions and minced garlic until fragrant.',
                    'Add chopped ripe tomatoes and simmer for 10 minutes until a rich sauce forms.',
                    'Make small wells in the sauce and crack the eggs directly into them.',
                    'Cover and cook for 5-7 minutes until egg whites are set and yolks remain runny.',
                    'Garnish with fresh herbs and serve hot with crusty bread.'
                  ],
                  prepTime: '10 mins',
                  cookTime: '15 mins',
                  difficulty: 'Easy',
                  matchesExpiring: true,
                  usedIngredientIds: ['sample_3', 'sample_4', 'sample_6', 'sample_7', 'sample_9'],
                  missingIngredients: [] // Strict mode match!
                },
                {
                  title: 'Creamy Garlic & Spinach Pasta Bowl',
                  description: 'Silky pasta coated in a Greek yogurt and garlic sauce tossed with fresh baby spinach.',
                  ingredients: ['Greek Yogurt (1 cup)', 'Baby Spinach (200g)', 'Garlic Bulbs (3 cloves)', 'Olive Oil (1 tbsp)', 'Pasta (250g)', 'Grated Cheddar (50g)'],
                  instructions: [
                    'Boil pasta in salted water according to package directions.',
                    'In a pan, warm olive oil and sauté minced garlic until aromatic.',
                    'Fold in baby spinach until wilted, then take off heat and stir in Greek yogurt.',
                    'Toss warm pasta with the creamy yogurt sauce and top with grated cheddar.'
                  ],
                  prepTime: '8 mins',
                  cookTime: '12 mins',
                  difficulty: 'Easy',
                  matchesExpiring: true,
                  usedIngredientIds: ['sample_1', 'sample_2', 'sample_5', 'sample_7', 'sample_9'],
                  missingIngredients: ['Pasta (Penne or Spaghetti)'] // Shopping mode match (+1 item)
                },
                {
                  title: 'Crispy Spiced Chickpea & Veggie Bowl',
                  description: 'Roasted chickpeas paired with sautéed spinach, onions, and garlic served over fluffy basmati rice.',
                  ingredients: ['Canned Chickpeas (1 can)', 'Basmati Rice (1 cup)', 'Baby Spinach (100g)', 'Yellow Onions (1 pc)', 'Garlic (2 cloves)', 'Olive Oil (2 tbsp)', 'Bell Pepper (1 pc)'],
                  instructions: [
                    'Cook basmati rice until light and fluffy.',
                    'Rinse and dry chickpeas. Sauté in olive oil with salt, pepper, and cumin until crispy.',
                    'Sauté onions, garlic, and sliced bell pepper, then fold in spinach at the end.',
                    'Assemble bowls with rice, spiced chickpeas, and sautéed greens.'
                  ],
                  prepTime: '12 mins',
                  cookTime: '20 mins',
                  difficulty: 'Medium',
                  matchesExpiring: true,
                  usedIngredientIds: ['sample_5', 'sample_6', 'sample_7', 'sample_8', 'sample_9', 'sample_10'],
                  missingIngredients: ['Bell Pepper', 'Cumin powder'] // Shopping mode match (+2 items)
                }
              ]);
              setCurrentScreen('recipes');
            }
          }
        ]
      );
    } finally {
      setIsGeneratingRecipes(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Screen 1: Scan Home Screen */}
      {currentScreen === 'scan' && (
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.appTitle}>FreshPlate Mobile</Text>
              <View style={styles.headerRightActions}>
                <TouchableOpacity
                  style={styles.settingsIconBtn}
                  onPress={() => setCurrentScreen('settings')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.settingsIconText}>⚙️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.directReviewBadge}
                  onPress={handleStartSampleReview}
                >
                  <Text style={styles.directReviewBadgeText}>Pantry Review ➔</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.subtitle}>AI-Powered Food Waste & Pantry Assistant</Text>

            {/* Offline Cache Status Chip */}
            <View style={styles.offlineStatusChip}>
              <View style={styles.offlineDot} />
              <Text style={styles.offlineStatusText}>
                {reviewItems.length} items saved locally (Offline Ready)
                {lastSyncTime ? ` • Synced ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </Text>
            </View>
          </View>

          {/* Mode Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, mode === 'receipt' && styles.tabButtonActive]}
              onPress={() => handleModeChange('receipt')}
            >
              <Text style={[styles.tabText, mode === 'receipt' && styles.tabTextActive]}>
                Receipt Scan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, mode === 'fridge' && styles.tabButtonActive]}
              onPress={() => handleModeChange('fridge')}
            >
              <Text style={[styles.tabText, mode === 'fridge' && styles.tabTextActive]}>
                Fridge Scan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, mode === 'pantry' && styles.tabButtonActive]}
              onPress={() => handleModeChange('pantry')}
            >
              <Text style={[styles.tabText, mode === 'pantry' && styles.tabTextActive]}>
                Fast Pantry
              </Text>
            </TouchableOpacity>
          </View>

          {/* Instructions banner */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              {mode === 'receipt'
                ? '🧾 Scan Grocery Receipt'
                : mode === 'fridge'
                ? '🥗 Scan Refrigerator / Pantry'
                : '⚡ Fast Grocery Ingestion'}
            </Text>
            <Text style={styles.infoText}>
              {mode === 'receipt'
                ? 'Snap a photo of your supermarket paper bill. Gemini Vision will normalize item names and extract quantities.'
                : mode === 'fridge'
                ? 'Capture your open fridge shelves. Gemini Vision will identify items and their storage zones.'
                : 'Quickly scan fresh fruits, vegetables, and pantry staples into your active inventory.'}
            </Text>
          </View>

          {/* Capture / Library Buttons */}
          {!photoUri && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cameraButton]}
                onPress={takePhoto}
                disabled={isPicking}
              >
                <Text style={styles.buttonEmoji}>📷</Text>
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.galleryButton]}
                onPress={pickFromGallery}
                disabled={isPicking}
              >
                <Text style={styles.buttonEmoji}>🖼️</Text>
                <Text style={styles.actionButtonText}>From Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {pickerError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{pickerError}</Text>
            </View>
          )}

          {/* Captured Photo Preview Card */}
          {photoUri && (
            <View style={styles.previewCard}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />

              <View style={styles.previewControls}>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={handleReset}
                  disabled={isUploading}
                >
                  <Text style={styles.retakeText}>Retake Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.analyzeButton, isUploading && styles.buttonDisabled]}
                  onPress={handleAnalyzePhoto}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.analyzeText}>Analyzing Vision...</Text>
                    </View>
                  ) : (
                    <Text style={styles.analyzeText}>Analyze with Gemini</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Error Feedback with Interactive Retry & Retake Banners */}
          {networkError && (
            <NetworkErrorBanner
              error={networkError}
              onRetry={handleAnalyzePhoto}
              onRetake={() => {
                setNetworkError(null);
                clearPhoto();
                takePhoto();
              }}
              onDismiss={() => setNetworkError(null)}
              isRetrying={isUploading}
            />
          )}

          {/* Results Container with Direct "Proceed to Review" CTA */}
          {scanResult && (
            <View style={styles.resultsContainer}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>Recognized Items</Text>
                <Text style={styles.resultsBadge}>
                  {scanResult.count ||
                    scanResult.items?.length ||
                    scanResult.detectedItems?.length ||
                    0}{' '}
                  items
                </Text>
              </View>

              {/* Transition to Pantry Review Screen */}
              <TouchableOpacity
                style={styles.proceedToReviewBtn}
                onPress={handleGoToReview}
              >
                <Text style={styles.proceedToReviewText}>
                  Review & Confirm Pantry Items ➔
                </Text>
              </TouchableOpacity>

              {/* Quality diagnostics banner */}
              {scanResult.quality && (
                <View
                  style={[
                    styles.qualityCard,
                    !scanResult.quality.isUsable
                      ? styles.qualityCardWarning
                      : styles.qualityCardSuccess
                  ]}
                >
                  <Text style={styles.qualityTitle}>
                    {scanResult.quality.isUsable
                      ? '✓ Good Quality Scan'
                      : '⚠️ Image Quality Notice'}
                  </Text>
                  {scanResult.quality.warning && (
                    <Text style={styles.qualitySubtext}>
                      {scanResult.quality.warning}
                    </Text>
                  )}
                  {scanResult.quality.advice && (
                    <Text style={styles.qualityAdvice}>
                      💡 Tip: {scanResult.quality.advice}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Quick Demo Review Card */}
          <View style={styles.demoReviewCard}>
            <Text style={styles.demoReviewTitle}>✨ Try Interactive Pantry Review</Text>
            <Text style={styles.demoReviewText}>
              Review items categorized by Dairy, Produce, and Pantry, edit quantities, add missing ingredients, and generate recipes with Strict vs. Shopping mode filters.
            </Text>
            <TouchableOpacity
              style={styles.demoReviewBtn}
              onPress={handleStartSampleReview}
            >
              <Text style={styles.demoReviewBtnText}>
                Open Pantry Review Screen ➔
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Screen 2: Pantry Review Screen (Backed by Offline Cache) */}
      {currentScreen === 'review' && (
        <PantryReviewScreen
          initialItems={reviewItems}
          onGenerateRecipes={handleGenerateRecipes}
          onBackToScan={() => setCurrentScreen('scan')}
          isGenerating={isGeneratingRecipes}
          onItemsChange={updateAndCachePantryItems}
          lastSyncTime={lastSyncTime}
        />
      )}

      {/* Screen 3: Recipe List UI */}
      {currentScreen === 'recipes' && (
        <RecipeListScreen
          recipes={recipes}
          onBackToPantry={() => setCurrentScreen('review')}
          onRegenerate={() => handleGenerateRecipes(reviewItems)}
          isRegenerating={isGeneratingRecipes}
        />
      )}

      {/* Screen 4: Settings & Account Screen (Apple 5.1.1(v) & Google Play Compliance) */}
      {currentScreen === 'settings' && (
        <SettingsScreen
          onBack={() => setCurrentScreen('scan')}
          onClearPantryData={handleClearPantryData}
          onDeleteAccount={handleDeleteAccount}
          cachedItemCount={reviewItems.length}
          lastSyncTime={lastSyncTime}
        />
      )}

      {/* Account Deletion & Privacy Settings Modal */}
      <AccountPrivacySettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onClearPantryData={handleClearPantryData}
        onDeleteAccount={handleDeleteAccount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  container: {
    padding: 20,
    paddingBottom: 40
  },
  header: {
    marginBottom: 20
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  settingsIconBtn: {
    backgroundColor: '#f1f5f9',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  settingsIconText: {
    fontSize: 16
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5
  },
  directReviewBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  directReviewBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669'
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4
  },
  offlineStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981'
  },
  offlineStatusText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  tabTextActive: {
    color: '#0f172a'
  },
  infoBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 4
  },
  infoText: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3
  },
  cameraButton: {
    backgroundColor: '#10b981'
  },
  galleryButton: {
    backgroundColor: '#3b82f6'
  },
  buttonEmoji: {
    fontSize: 18,
    marginRight: 8
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff'
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  previewImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#0f172a'
  },
  previewControls: {
    flexDirection: 'row',
    padding: 14,
    gap: 12
  },
  retakeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9'
  },
  retakeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  },
  analyzeButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#10b981'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  analyzeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  errorHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c'
  },
  resultsContainer: {
    marginTop: 8
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  resultsBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  proceedToReviewBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  proceedToReviewText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff'
  },
  qualityCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1
  },
  qualityCardSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0'
  },
  qualityCardWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a'
  },
  qualityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b'
  },
  qualitySubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3
  },
  qualityAdvice: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '600',
    marginTop: 4
  },
  demoReviewCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 18,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  demoReviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6
  },
  demoReviewText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 14
  },
  demoReviewBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  demoReviewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155'
  }
});
