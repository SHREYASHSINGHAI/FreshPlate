// Mock react-native before requiring modules for Node test environment
const mockReactNative = {
  Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
  Alert: { alert: () => {} },
  Linking: { openSettings: () => {} },
  StyleSheet: { create: (styles) => styles },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  SafeAreaView: 'SafeAreaView',
  ScrollView: 'ScrollView'
};

// Intercept module loader for react-native
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'react-native') {
    return mockReactNative;
  }
  return originalRequire.apply(this, arguments);
};

// Mock AsyncStorage in-memory for testing
const inMemoryStore = new Map();
const mockAsyncStorage = {
  getItem: async (key) => inMemoryStore.get(key) || null,
  setItem: async (key, val) => { inMemoryStore.set(key, val); },
  removeItem: async (key) => { inMemoryStore.delete(key); },
  multiRemove: async (keys) => { keys.forEach(k => inMemoryStore.delete(k)); }
};
Module.prototype.require = function (id) {
  if (id === 'react-native') return mockReactNative;
  if (id === '@react-native-async-storage/async-storage') return { default: mockAsyncStorage, ...mockAsyncStorage };
  if (id === 'expo-image-manipulator') return { manipulateAsync: async () => ({ uri: 'file://mock_compressed.jpg', width: 1600, height: 1200 }), SaveFormat: { JPEG: 'jpeg' } };
  if (id === 'expo-file-system') return { getInfoAsync: async () => ({ exists: true, size: 850 * 1024 }) };
  return originalRequire.apply(this, arguments);
};

// Now run the test suite
async function run() {
  console.log('=== STARTING FRESHPLATE MOBILE SYSTEMS ENGINEER TEST SUITE ===');
  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  const { parseNetworkError, ApiError } = require('./src/services/api');
  const { formatBytes, MAX_UPLOAD_SIZE_BYTES, TARGET_UPLOAD_SIZE_BYTES, compressImageForUpload } = require('./src/services/imageCompression');
  const {
    loadCachedPantryItems,
    saveCachedPantryItems,
    getLastSyncTimestamp,
    loadCachedRecipes,
    saveCachedRecipes,
    getCachedRecipesTimestamp,
    clearCachedPantry
  } = require('./src/services/storage');
  const { ErrorBoundary } = require('./src/components/ErrorBoundary');

  // 1. Image Compression Constraints (< 2MB)
  assert(
    'MAX_UPLOAD_SIZE_BYTES is capped at 2MB',
    MAX_UPLOAD_SIZE_BYTES === 2 * 1024 * 1024,
    `Size: ${MAX_UPLOAD_SIZE_BYTES}`
  );
  assert(
    'TARGET_UPLOAD_SIZE_BYTES provides 1.8MB safety margin',
    TARGET_UPLOAD_SIZE_BYTES === 1.8 * 1024 * 1024,
    `Size: ${TARGET_UPLOAD_SIZE_BYTES}`
  );
  assert(
    'formatBytes accurately formats bytes, KB, and MB',
    formatBytes(500) === '500 B' &&
      formatBytes(1024 * 500) === '500 KB' &&
      formatBytes(1024 * 1024 * 1.5) === '1.5 MB',
    formatBytes(1024 * 1024 * 1.5)
  );

  const compressionResult = await compressImageForUpload('file://test_raw_camera.jpg');
  assert(
    'compressImageForUpload compresses image strictly under 2MB',
    compressionResult && compressionResult.sizeBytes <= MAX_UPLOAD_SIZE_BYTES,
    `Compressed size: ${compressionResult?.sizeBytes}`
  );

  // 2. Network Error Taxonomy: Timeout Detection
  const abortError = new Error('The user aborted a request.');
  abortError.name = 'AbortError';
  const timeoutParsed = parseNetworkError(abortError);
  assert(
    'AbortError correctly classified as TIMEOUT with retry advice',
    timeoutParsed.code === 'TIMEOUT' &&
      timeoutParsed.isRetryable === true &&
      timeoutParsed.title.includes('Timed Out'),
    JSON.stringify(timeoutParsed)
  );

  // 3. Network Error Taxonomy: Offline Connection Failure
  const offlineError = new TypeError('Network request failed');
  const offlineParsed = parseNetworkError(offlineError);
  assert(
    'Network request failed correctly classified as OFFLINE with cached inventory note',
    offlineParsed.code === 'OFFLINE' &&
      offlineParsed.isRetryable === true &&
      offlineParsed.advice?.includes('offline'),
    JSON.stringify(offlineParsed)
  );

  // 4. Network Error Taxonomy: Blurry / Illegible Image (HTTP 422)
  const blurryApiError = new ApiError({
    code: 'BLURRY_IMAGE',
    statusCode: 422,
    message: 'Receipt image is too blurry, dark, or illegible to parse.',
    advice: 'Please flatten the receipt under direct lighting and hold steady.',
    quality: { isUsable: false, clarity: 'blurry', lighting: 'low_light' }
  });
  const blurryParsed = parseNetworkError(blurryApiError);
  assert(
    'HTTP 422 classified as BLURRY_IMAGE with lighting advice and retryable state',
    blurryParsed.code === 'BLURRY_IMAGE' &&
      blurryParsed.statusCode === 422 &&
      blurryParsed.advice?.includes('direct lighting'),
    JSON.stringify(blurryParsed)
  );

  // 5. Network Error Taxonomy: Rate Limit (HTTP 429)
  const rateLimitError = new ApiError({
    code: 'RATE_LIMITED',
    statusCode: 429,
    message: 'Too many requests. Quota limit reached.',
    advice: 'Please wait 30 seconds before retrying.'
  });
  const rateLimitParsed = parseNetworkError(rateLimitError);
  assert(
    'HTTP 429 classified as RATE_LIMITED with cooldown advice',
    rateLimitParsed.code === 'RATE_LIMITED' && rateLimitParsed.statusCode === 429,
    JSON.stringify(rateLimitParsed)
  );

  // 6. Network Error Taxonomy: Server Error (HTTP 503 / 500)
  const serverError = new ApiError({
    code: 'SERVER_ERROR',
    statusCode: 503,
    message: 'The AI model is currently experiencing high demand.',
    advice: 'Please tap Retry to attempt again.'
  });
  const serverParsed = parseNetworkError(serverError);
  assert(
    'HTTP 503 classified as SERVER_ERROR with retry CTA',
    serverParsed.code === 'SERVER_ERROR' && serverParsed.isRetryable === true,
    JSON.stringify(serverParsed)
  );

  // 7. Network Error Taxonomy: Payload Too Large (HTTP 413)
  const payloadError = new ApiError({
    code: 'PAYLOAD_TOO_LARGE',
    statusCode: 413,
    message: 'Image size exceeded maximum allowed limit.',
    advice: 'Automatic client compression will resize on retry.'
  });
  const payloadParsed = parseNetworkError(payloadError);
  assert(
    'HTTP 413 classified as PAYLOAD_TOO_LARGE with compression guidance',
    payloadParsed.code === 'PAYLOAD_TOO_LARGE' && payloadParsed.statusCode === 413,
    JSON.stringify(payloadParsed)
  );

  // 8. Offline Local Caching with AsyncStorage
  const testItems = [
    { id: 'offline_1', name: 'Almond Milk', group: 'Dairy', quantity: '1L', status: 'fresh' },
    { id: 'offline_2', name: 'Fresh Spinach', group: 'Produce', quantity: '200g', status: 'expiring_soon' },
    { id: 'offline_3', name: 'Oatmeal', group: 'Pantry', quantity: '500g', status: 'fresh' }
  ];

  await clearCachedPantry();
  await saveCachedPantryItems(testItems);
  const loaded = await loadCachedPantryItems();
  const syncTime = await getLastSyncTimestamp();

  assert(
    'AsyncStorage persists and reloads cached pantry inventory offline',
    Array.isArray(loaded) && loaded.length === 3 && loaded[0].name === 'Almond Milk',
    `Loaded count: ${loaded?.length}`
  );

  assert(
    'AsyncStorage records ISO sync timestamp on save',
    typeof syncTime === 'string' && syncTime.length > 0 && !isNaN(Date.parse(syncTime)),
    `Sync timestamp: ${syncTime}`
  );

  // 9. Offline Recipe Caching with AsyncStorage
  const testRecipes = [
    {
      title: 'Creamy Spinach Pasta',
      description: 'Quick skillet pasta using fresh spinach and pantry staples.',
      ingredients: ['Fresh Spinach', 'Pantry Pasta', 'Olive Oil'],
      instructions: ['Boil pasta', 'Sauté spinach', 'Toss together'],
      prepTime: '10 mins',
      cookTime: '15 mins',
      difficulty: 'Easy',
      matchesExpiring: true,
      usedIngredientIds: ['offline_2'],
      missingIngredients: ['Olive Oil']
    }
  ];

  await saveCachedRecipes(testRecipes);
  const loadedRecipes = await loadCachedRecipes();
  const recipeSync = await getCachedRecipesTimestamp();

  assert(
    'AsyncStorage persists and reloads cached recipes offline',
    Array.isArray(loadedRecipes) && loadedRecipes.length === 1 && loadedRecipes[0].title === 'Creamy Spinach Pasta',
    `Loaded recipes count: ${loadedRecipes?.length}`
  );

  assert(
    'AsyncStorage records recipe sync ISO timestamp on save',
    typeof recipeSync === 'string' && recipeSync.length > 0 && !isNaN(Date.parse(recipeSync)),
    `Recipe sync timestamp: ${recipeSync}`
  );

  // Clean up test items & recipes
  await clearCachedPantry();
  const afterClear = await loadCachedPantryItems();
  const afterClearRecipes = await loadCachedRecipes();
  assert(
    'clearCachedPantry successfully purges storage and offline recipes on account reset',
    afterClear.length === 0 && afterClearRecipes.length === 0,
    `Remaining pantry: ${afterClear.length}, recipes: ${afterClearRecipes.length}`
  );

  // 10. ErrorBoundary Resilience
  const testError = new Error('Test rendering crash in component tree');
  const derivedState = ErrorBoundary.getDerivedStateFromError(testError);
  assert(
    'ErrorBoundary.getDerivedStateFromError captures errors and enables recovery state',
    derivedState.hasError === true && derivedState.error === testError,
    `Derived state: ${JSON.stringify(derivedState)}`
  );

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
  process.exit(0);
}

run().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
