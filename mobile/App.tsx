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
  PantryReviewItem,
  Recipe,
  NetworkErrorInfo
} from './src/types';
import { PantryReviewScreen } from './src/components/PantryReviewScreen';
import { RecipeListScreen } from './src/components/RecipeListScreen';
import { SettingsScreen } from './src/components/SettingsScreen';
import { NetworkErrorBanner } from './src/components/NetworkErrorBanner';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import {
  loadCachedPantryItems,
  saveCachedPantryItems,
  getLastSyncTimestamp,
  loadCachedRecipes,
  saveCachedRecipes,
  getCachedRecipesTimestamp,
  clearCachedPantry
} from './src/services/storage';
import { mapScanResultToReviewItems } from './src/utils/pantry';

type AppScreen = 'scan' | 'review' | 'recipes' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('scan');
  const [mode, setMode] = useState<ScanMode>('receipt');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [networkError, setNetworkError] = useState<NetworkErrorInfo | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Review & Recipe State (backed by AsyncStorage)
  const [reviewItems, setReviewItems] = useState<PantryReviewItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesSyncTime, setRecipesSyncTime] = useState<string | null>(null);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState<boolean>(false);

  // Hydrate pantry inventory and previous recipes from local device cache on initial launch
  useEffect(() => {
    async function hydrateOfflineStorage() {
      try {
        const cachedItems = await loadCachedPantryItems();
        const syncTime = await getLastSyncTimestamp();
        if (cachedItems && cachedItems.length > 0) {
          setReviewItems(cachedItems);
          setLastSyncTime(syncTime);
        }

        const cachedRecipes = await loadCachedRecipes();
        const recSyncTime = await getCachedRecipesTimestamp();
        if (cachedRecipes && cachedRecipes.length > 0) {
          setRecipes(cachedRecipes);
          setRecipesSyncTime(recSyncTime);
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('[FreshPlate Mobile] Offline cache hydration notice:', err);
        }
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
    setRecipesSyncTime(null);
    setNetworkError(null);
    clearCachedPantry().catch((err) => {
      if (__DEV__) console.warn('[FreshPlate Mobile] Error clearing cached pantry:', err);
    });
  };

  const handleDeleteAccount = async () => {
    updateAndCachePantryItems([]);
    setScanResult(null);
    clearPhoto();
    setRecipes([]);
    setRecipesSyncTime(null);
    setNetworkError(null);
    await clearCachedPantry().catch((err) => {
      if (__DEV__) console.warn('[FreshPlate Mobile] Error clearing cached pantry:', err);
    });
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
        const now = new Date().toISOString();
        setRecipesSyncTime(now);
        saveCachedRecipes(result.recipes).catch((err) =>
          console.error('[FreshPlate Mobile] Failed to persist recipes to AsyncStorage:', err)
        );
        setCurrentScreen('recipes');
      } else {
        Alert.alert(
          'No Recipes Generated',
          'Gemini could not generate recipe suggestions for this combination of items. Please add more pantry items.'
        );
      }
    } catch (err: any) {
      if (__DEV__) {
        console.error('[FreshPlate App] Recipe generation error:', err);
      }
      Alert.alert(
        'Recipe Generation Notice',
        err.message || 'Unable to connect to the recipe server. Please check your network connection and tap Retry.',
        [
          { text: 'OK' },
          {
            text: 'Retry',
            onPress: () => handleGenerateRecipes(confirmedItems)
          }
        ]
      );
    } finally {
      setIsGeneratingRecipes(false);
    }
  };

  const appContent = (
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
                {recipes.length > 0 && (
                  <TouchableOpacity
                    style={styles.directRecipesBadge}
                    onPress={() => setCurrentScreen('recipes')}
                  >
                    <Text style={styles.directRecipesBadgeText}>
                      📖 Recipes ({recipes.length})
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.settingsIconBtn}
                  onPress={() => setCurrentScreen('settings')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.settingsIconText}>⚙️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.directReviewBadge}
                  onPress={() => setCurrentScreen('review')}
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

              {/* Low-confidence vision recognition feedback and retry controls */}
              {Boolean(
                (scanResult.quality && !scanResult.quality.isUsable) ||
                (Array.isArray(scanResult.items) && scanResult.items.some((i: any) => i.confidence === 'low')) ||
                (Array.isArray(scanResult.detectedItems) && scanResult.detectedItems.some((i: any) => i.spatialConfidence === 'low'))
              ) && (
                <View style={styles.lowConfidenceCard}>
                  <View style={styles.lowConfidenceHeader}>
                    <Text style={styles.lowConfidenceIcon}>⚠️</Text>
                    <Text style={styles.lowConfidenceTitle}>Low-Confidence Detection</Text>
                  </View>
                  <Text style={styles.lowConfidenceText}>
                    Some items could not be identified with high confidence due to lighting, angle, or fold. You can retake the photo or proceed to edit manually.
                  </Text>
                  <View style={styles.lowConfidenceActionRow}>
                    <TouchableOpacity
                      style={styles.retakeActionBtn}
                      onPress={takePhoto}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.retakeActionText}>📷 Retake Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.retryAnalysisActionBtn}
                      onPress={handleAnalyzePhoto}
                      disabled={isUploading}
                      activeOpacity={0.8}
                    >
                      {isUploading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.retryAnalysisActionText}>🔄 Re-analyze</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
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

      {/* Screen 3: Recipe List UI (Backed by Offline Storage) */}
      {currentScreen === 'recipes' && (
        <RecipeListScreen
          recipes={recipes}
          onBackToPantry={() => setCurrentScreen('review')}
          onRegenerate={() => handleGenerateRecipes(reviewItems)}
          isRegenerating={isGeneratingRecipes}
          recipesSyncTime={recipesSyncTime}
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
    </SafeAreaView>
  );

  return (
    <ErrorBoundary onReset={() => setCurrentScreen('scan')}>
      {appContent}
    </ErrorBoundary>
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
  directRecipesBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  directRecipesBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d'
  },
  lowConfidenceCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#fde68a',
    padding: 14,
    marginBottom: 16
  },
  lowConfidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  lowConfidenceIcon: {
    fontSize: 16
  },
  lowConfidenceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e'
  },
  lowConfidenceText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 18,
    marginBottom: 12
  },
  lowConfidenceActionRow: {
    flexDirection: 'row',
    gap: 10
  },
  retakeActionBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d97706',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  retakeActionText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '700'
  },
  retryAnalysisActionBtn: {
    flex: 1,
    backgroundColor: '#d97706',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  retryAnalysisActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  }
});
