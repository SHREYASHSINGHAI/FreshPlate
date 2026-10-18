import { PantryGroup, PantryReviewItem, ScanMode } from '../types';

/**
 * Classifies an ingredient into a standard pantry group ('Dairy', 'Produce', or 'Pantry')
 * using keyword heuristics against its name and raw category metadata.
 */
export function detectPantryGroup(name: string, rawCategory?: string): PantryGroup {
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

/**
 * Maps unstructured or multi-modal Gemini Vision scan results (receipt items,
 * fridge objects, or ingredients) into standardized PantryReviewItem records.
 */
export function mapScanResultToReviewItems(scanResult: any, mode: ScanMode): PantryReviewItem[] {
  if (!scanResult) return [];

  if (mode === 'receipt' && Array.isArray(scanResult.items)) {
    return scanResult.items.map((item: any, idx: number) => ({
      id: item.id || `receipt_item_${idx}`,
      name: item.normalizedName || item.rawText,
      quantity: item.quantity || '1 unit',
      group: detectPantryGroup(item.normalizedName || item.rawText, item.category),
      status: item.status || 'fresh',
      confidence: item.confidence || 'high'
    }));
  }

  if (mode === 'fridge' && Array.isArray(scanResult.detectedItems)) {
    return scanResult.detectedItems.map((item: any, idx: number) => ({
      id: item.id || `fridge_item_${idx}`,
      name: item.name,
      quantity: item.estimatedQuantity || '1 portion',
      group: detectPantryGroup(item.name, item.category),
      status: item.status || 'fresh',
      confidence: item.spatialConfidence || 'high'
    }));
  }

  if (Array.isArray(scanResult.ingredients)) {
    return scanResult.ingredients.map((item: any, idx: number) => ({
      id: item.id || `pantry_item_${idx}`,
      name: item.name,
      quantity: item.quantity || '1 portion',
      group: detectPantryGroup(item.name, item.category),
      status: item.status || 'fresh',
      confidence: item.confidence || 'high'
    }));
  }

  return [];
}
