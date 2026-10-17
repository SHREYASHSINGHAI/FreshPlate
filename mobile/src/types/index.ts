export type ScanMode = 'pantry' | 'receipt' | 'fridge';

export type PantryGroup = 'Dairy' | 'Produce' | 'Pantry';

export interface PantryReviewItem {
  id: string;
  name: string;
  group: PantryGroup;
  quantity: string;
  status: 'fresh' | 'expiring_soon' | 'expired';
  isCustom?: boolean;
}

export type RecipeFilterMode = 'strict' | 'shopping' | 'all';

export interface Recipe {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  difficulty: string;
  matchesExpiring: boolean;
  usedIngredientIds: string[];
  missingIngredients: string[];
}

export interface GenerateRecipesResponse {
  success: boolean;
  cached?: boolean;
  recipes: Recipe[];
  error?: string;
}

export interface NormalizedIngredient {
  id: string;
  name: string;
  category: string;
  quantity: string;
  purchaseDate: string;
  estimatedExpiryDate: string;
  status: 'fresh' | 'expiring_soon' | 'expired';
  source?: string;
  storageLocation?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface ImageQualityMetrics {
  isUsable: boolean;
  clarity: 'clear' | 'blurry' | 'motion_blurred' | 'partially_obscured';
  lighting: 'good' | 'low_light' | 'shadows' | 'overexposed';
  warning?: string;
  advice?: string;
}

export interface AnalyzeIngredientsResponse {
  success: boolean;
  count: number;
  ingredients: NormalizedIngredient[];
  error?: string;
  quality?: ImageQualityMetrics;
}

export interface ReceiptScanResponse {
  success: boolean;
  storeName?: string;
  transactionDate?: string;
  currency?: string;
  totalAmount?: number;
  quality?: ImageQualityMetrics;
  count: number;
  items: Array<{
    id: string;
    rawText: string;
    normalizedName: string;
    category: string;
    quantity: string;
    unitPrice?: number;
    totalPrice?: number;
    shelfLifeDays: number;
    purchaseDate: string;
    estimatedExpiryDate: string;
    status: 'fresh' | 'expiring_soon' | 'expired';
    confidence: 'high' | 'medium' | 'low';
  }>;
  error?: string;
  advice?: string;
}

export interface FridgeScanResponse {
  success: boolean;
  quality?: ImageQualityMetrics;
  fridgeOverview?: {
    fillLevel: 'empty' | 'sparsely_filled' | 'moderately_full' | 'packed';
    cleanlinessAssessment?: string;
  };
  count: number;
  detectedItems: Array<{
    id: string;
    name: string;
    category: string;
    estimatedQuantity: string;
    storageLocation: 'top_shelf' | 'middle_shelf' | 'bottom_shelf' | 'crisper_drawer' | 'door_bin' | 'freezer' | 'unknown';
    spatialConfidence: 'high' | 'medium' | 'low';
    shelfLifeDays: number;
    purchaseDate: string;
    estimatedExpiryDate: string;
    status: 'fresh' | 'expiring_soon' | 'expired';
    visualNotes?: string;
  }>;
  error?: string;
  advice?: string;
}

/**
 * Mobile Systems Network Error taxonomy for fine-grained user feedback & recovery
 */
export type NetworkErrorCode =
  | 'OFFLINE'
  | 'TIMEOUT'
  | 'BLURRY_IMAGE'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNKNOWN';

export interface NetworkErrorInfo {
  code: NetworkErrorCode;
  title: string;
  message: string;
  advice?: string;
  isRetryable: boolean;
  statusCode?: number;
  quality?: ImageQualityMetrics;
}

export interface CompressionResult {
  uri: string;
  sizeBytes: number;
  originalSizeBytes?: number;
  compressionRatio: number;
  width?: number;
  height?: number;
}
