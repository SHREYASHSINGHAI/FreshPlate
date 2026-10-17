import { geminiClient, PRIMARY_VISION_MODEL, FALLBACK_VISION_MODEL } from '../config/gemini';

export interface RawExtractedItem {
  name: string;
  category: string;
  quantity: string;
  shelfLifeDays: number;
}

export interface NormalizedIngredient {
  id: string;
  name: string;
  category: string;
  quantity: string;
  purchaseDate: string;
  estimatedExpiryDate: string;
  status: 'fresh' | 'expiring_soon' | 'expired';
  source: string;
}

/**
 * Executes a Gemini request with automatic exponential backoff and model fallback.
 */
async function callGeminiWithRetry(params: any, retries = 3): Promise<any> {
  const modelsToTry = [params.model || PRIMARY_VISION_MODEL, FALLBACK_VISION_MODEL];

  for (const model of modelsToTry) {
    for (let i = 0; i < retries; i++) {
      try {
        const attemptParams = { ...params, model };
        return await geminiClient.models.generateContent(attemptParams);
      } catch (error: any) {
        const isUnavailable =
          error?.status === 503 ||
          error?.message?.includes('503') ||
          error?.message?.includes('UNAVAILABLE') ||
          error?.status === 'UNAVAILABLE' ||
          error?.code === 503 ||
          error?.message?.includes('overloaded');

        if (isUnavailable && i < retries - 1) {
          const delayMs = Math.pow(2, i) * 1000;
          console.warn(`[GeminiVision] ${model} unavailable (503). Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        console.warn(`[GeminiVision] Model ${model} failed. Trying next model...`);
        break;
      }
    }
  }

  throw new Error('All AI vision models failed to process image. Please try again later.');
}

/**
 * Analyzes an image (buffer or base64) to extract grocery items, categories, and estimated shelf lives.
 */
export async function analyzeIngredientsFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<NormalizedIngredient[]> {
  const prompt = `
    You are an AI that parses grocery receipts and photos of open refrigerators/pantries.
    Identify the perishable grocery items, vegetables, and fruits visible in this image.
    If it's a receipt, extract the items listed. If it's a fridge/pantry photo, identify the visible fresh food items.
    
    For each item, estimate its typical shelf life in days in a standard refrigerator and calculate an estimated expiry date from today.
    Today's date is: ${new Date().toISOString()}
    
    Respond ONLY with a JSON array of objects. Do not include markdown formatting or backticks.
    Format of each object (must be valid JSON with no comments):
    {
      "name": "Item name",
      "category": "Category",
      "quantity": "Estimated quantity",
      "shelfLifeDays": 5
    }
  `;

  const response = await callGeminiWithRetry({
    model: PRIMARY_VISION_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType || 'image/jpeg'
            }
          },
          {
            text: prompt
          }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        description: 'A list of extracted grocery items',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            category: { type: 'STRING' },
            quantity: { type: 'STRING' },
            shelfLifeDays: { type: 'NUMBER' }
          },
          required: ['name', 'category', 'quantity', 'shelfLifeDays']
        }
      }
    }
  });

  let jsonStr = response.text || '[]';
  jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsedItems: RawExtractedItem[] = [];
  try {
    parsedItems = JSON.parse(jsonStr);
  } catch (parseError) {
    console.error('[GeminiVision] JSON parse failed on response text:', jsonStr);
    return [];
  }

  const today = new Date();
  return parsedItems.map((item) => {
    const expiryDate = new Date(today);
    expiryDate.setDate(today.getDate() + (item.shelfLifeDays || 5));

    return {
      id: Math.random().toString(36).substring(7),
      name: item.name,
      category: item.category || 'General',
      quantity: item.quantity || '1 unit',
      purchaseDate: today.toISOString(),
      estimatedExpiryDate: expiryDate.toISOString(),
      status: (item.shelfLifeDays <= 2 ? 'expiring_soon' : 'fresh') as 'fresh' | 'expiring_soon' | 'expired',
      source: 'Camera Import'
    };
  });
}

// ---------------------------------------------------------------------------
// 1. RECEIPT SCANNING: Schemas, Types, and Service Handler
// ---------------------------------------------------------------------------

export interface ImageQualityAssessment {
  isUsable: boolean;
  clarity: 'clear' | 'blurry' | 'motion_blurred' | 'partially_obscured';
  lighting: 'good' | 'low_light' | 'shadows' | 'overexposed';
  warning?: string;
  advice?: string;
}

export interface ReceiptItemOutput {
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
}

export interface ReceiptScanResponse {
  storeName?: string;
  transactionDate?: string;
  currency?: string;
  totalAmount?: number;
  quality: ImageQualityAssessment;
  count: number;
  items: ReceiptItemOutput[];
}

export const RECEIPT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  description: 'Structured grocery bill OCR extraction with quality evaluation',
  properties: {
    storeName: { type: 'STRING', description: 'Supermarket / grocery store name' },
    transactionDate: { type: 'STRING', description: 'Purchase date if visible (YYYY-MM-DD or string)' },
    currency: { type: 'STRING', description: 'Currency symbol or abbreviation ($, USD, EUR, INR)' },
    totalAmount: { type: 'NUMBER', description: 'Total receipt amount' },
    imageQuality: {
      type: 'OBJECT',
      properties: {
        isReadable: { type: 'BOOLEAN', description: 'True if receipt text is legible' },
        clarity: { type: 'STRING', description: 'clear, blurry, or partially_obscured' },
        lighting: { type: 'STRING', description: 'good, low_light, or overexposed' },
        warning: { type: 'STRING', description: 'Warning if image is degraded or text is faint' },
        advice: { type: 'STRING', description: 'Guidance if image needs retaking' }
      },
      required: ['isReadable', 'clarity', 'lighting']
    },
    items: {
      type: 'ARRAY',
      description: 'List of parsed grocery line items',
      items: {
        type: 'OBJECT',
        properties: {
          rawText: { type: 'STRING', description: 'Exact line item text as printed on the receipt' },
          normalizedName: { type: 'STRING', description: 'Standardized, recognizable food name' },
          category: { type: 'STRING', description: 'Vegetables, Fruits, Dairy & Eggs, Meat & Seafood, Bakery, Pantry Staples, Beverages, Snacks, Frozen, General' },
          quantity: { type: 'STRING', description: 'Quantity or volume with unit' },
          unitPrice: { type: 'NUMBER' },
          totalPrice: { type: 'NUMBER' },
          shelfLifeDays: { type: 'NUMBER', description: 'Estimated standard shelf life in days' },
          confidence: { type: 'STRING', description: 'high, medium, or low' }
        },
        required: ['rawText', 'normalizedName', 'category', 'quantity', 'shelfLifeDays', 'confidence']
      }
    }
  },
  required: ['imageQuality', 'items']
};

/**
 * Parses grocery bills with Gemini Vision, normalizing items and evaluating image quality.
 */
export async function scanReceiptFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ReceiptScanResponse> {
  // Pre-flight image size check
  if (!imageBase64 || imageBase64.length < 50) {
    throw new Error('Image data is too small or missing.');
  }

  const prompt = `
    You are an expert AI for grocery bill and receipt digitization in FreshPlate.
    Examine the attached photo of a supermarket receipt or grocery bill.

    INSTRUCTIONS:
    1. First, assess image quality:
       - Check if the receipt is legible, blurry, faded, crumpled, or taken in low-light.
       - Set "isReadable" to true if you can extract items; false if completely illegible.
       - If blurry or low-light, output helpful advice (e.g. "Flatten the receipt, use direct lighting, hold camera steady").
    2. Extract store details if visible (storeName, transactionDate, currency, totalAmount).
    3. Extract every edible grocery item:
       - "rawText": Exact text as printed on the bill (e.g., "ORG BNN 1.29 LB" or "TMT 500G" or "HMLK 1GAL").
       - "normalizedName": Standardized human-readable food name (e.g., "Organic Bananas", "Tomatoes", "Whole Milk").
       - "category": Standard grocery category (Vegetables, Fruits, Dairy & Eggs, Meat & Seafood, Bakery, Pantry Staples, Beverages, Snacks, Frozen, General).
       - "quantity": Clean quantity with unit (e.g. "1.29 lb", "500g", "2 units").
       - "unitPrice" and "totalPrice" if visible.
       - "shelfLifeDays": Realistic shelf life in days in a standard refrigerator/pantry from today.
       - "confidence": "high", "medium", or "low".

    Today's ISO date is: ${new Date().toISOString()}

    IMPORTANT: Do not return markdown, backticks, or comments. Adhere strictly to the JSON schema.
  `;

  try {
    const response = await callGeminiWithRetry({
      model: PRIMARY_VISION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType || 'image/jpeg'
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: RECEIPT_RESPONSE_SCHEMA
      }
    });

    let jsonStr = response.text || '{}';
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn('[GeminiVision] Receipt JSON parsing failed. Attempting fallback parse.');
      parsed = { imageQuality: { isReadable: false, clarity: 'blurry', lighting: 'low_light' }, items: [] };
    }

    const today = new Date();
    const rawItems: any[] = Array.isArray(parsed.items) ? parsed.items : [];

    const normalizedItems: ReceiptItemOutput[] = rawItems.map((item) => {
      const shelfLife = typeof item.shelfLifeDays === 'number' && item.shelfLifeDays > 0 ? item.shelfLifeDays : 5;
      const expiry = new Date(today);
      expiry.setDate(today.getDate() + shelfLife);

      return {
        id: Math.random().toString(36).substring(7),
        rawText: item.rawText || item.name || 'Unknown Item',
        normalizedName: item.normalizedName || item.name || 'Grocery Item',
        category: item.category || 'Pantry Staples',
        quantity: item.quantity || '1 unit',
        unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : undefined,
        totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : undefined,
        shelfLifeDays: shelfLife,
        purchaseDate: today.toISOString(),
        estimatedExpiryDate: expiry.toISOString(),
        status: shelfLife <= 2 ? 'expiring_soon' : 'fresh',
        confidence: ['high', 'medium', 'low'].includes(item.confidence) ? item.confidence : 'medium'
      };
    });

    const isReadable = parsed.imageQuality?.isReadable !== false;
    const clarity = parsed.imageQuality?.clarity || (normalizedItems.length > 0 ? 'clear' : 'blurry');
    const lighting = parsed.imageQuality?.lighting || 'good';

    return {
      storeName: parsed.storeName || undefined,
      transactionDate: parsed.transactionDate || undefined,
      currency: parsed.currency || undefined,
      totalAmount: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : undefined,
      quality: {
        isUsable: isReadable,
        clarity,
        lighting,
        warning: parsed.imageQuality?.warning || (clarity === 'blurry' || lighting === 'low_light' ? 'Receipt is blurry or poorly lit; some items may have been missed.' : undefined),
        advice: parsed.imageQuality?.advice || (clarity === 'blurry' || lighting === 'low_light' ? 'For best accuracy, lay receipt flat on a dark background under bright light.' : undefined)
      },
      count: normalizedItems.length,
      items: normalizedItems
    };
  } catch (err: any) {
    console.error('[GeminiVision] Error in scanReceiptFromImage:', err.message);
    // Graceful fallback for severe degradation or network issue
    return {
      quality: {
        isUsable: false,
        clarity: 'blurry',
        lighting: 'low_light',
        warning: 'Could not process receipt image due to visual degradation or server error.',
        advice: 'Please ensure good lighting, avoid glare, and hold your device steady.'
      },
      count: 0,
      items: []
    };
  }
}

// ---------------------------------------------------------------------------
// 2. FRIDGE SCANNING: Schemas, Types, and Service Handler
// ---------------------------------------------------------------------------

export interface FridgeItemOutput {
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
}

export interface FridgeScanResponse {
  quality: ImageQualityAssessment;
  fridgeOverview?: {
    fillLevel: 'empty' | 'sparsely_filled' | 'moderately_full' | 'packed';
    cleanlinessAssessment?: string;
  };
  count: number;
  detectedItems: FridgeItemOutput[];
}

export const FRIDGE_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  description: 'Refrigerator object detection structure with spatial placement and quality assessment',
  properties: {
    imageQuality: {
      type: 'OBJECT',
      properties: {
        isUsable: { type: 'BOOLEAN', description: 'True if food items in the fridge can be identified' },
        clarity: { type: 'STRING', description: 'clear, blurry, or motion_blurred' },
        lighting: { type: 'STRING', description: 'good, low_light, shadows, or glare' },
        warning: { type: 'STRING', description: 'Warning if lighting or blur impeded detection' },
        advice: { type: 'STRING', description: 'Advice to improve scan' }
      },
      required: ['isUsable', 'clarity', 'lighting']
    },
    fridgeOverview: {
      type: 'OBJECT',
      properties: {
        fillLevel: { type: 'STRING', description: 'empty, sparsely_filled, moderately_full, or packed' },
        cleanlinessAssessment: { type: 'STRING', description: 'Brief organization observation' }
      }
    },
    detectedItems: {
      type: 'ARRAY',
      description: 'Identified food and grocery items inside refrigerator',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Identified food item name (e.g., Whole Milk, Greek Yogurt, Spinach)' },
          category: { type: 'STRING', description: 'Vegetables, Fruits, Dairy & Eggs, Meat & Seafood, Condiments, Beverages, Leftovers, Bakery, Pantry Staples' },
          estimatedQuantity: { type: 'STRING', description: 'Estimated quantity or remaining volume (e.g. 1 carton (~50% full), 3 pieces, 1 jar)' },
          storageLocation: {
            type: 'STRING',
            description: 'top_shelf, middle_shelf, bottom_shelf, crisper_drawer, door_bin, freezer, unknown'
          },
          spatialConfidence: {
            type: 'STRING',
            description: 'Detection certainty: high, medium, or low'
          },
          shelfLifeDays: { type: 'NUMBER', description: 'Estimated remaining shelf life in days' },
          visualNotes: { type: 'STRING', description: 'Visual status cues (e.g. sealed, opened, ripe, fresh)' }
        },
        required: ['name', 'category', 'estimatedQuantity', 'storageLocation', 'spatialConfidence', 'shelfLifeDays']
      }
    }
  },
  required: ['imageQuality', 'detectedItems']
};

/**
 * Recognizes food items inside a refrigerator or pantry, locating shelf positions and estimating freshness.
 */
export async function scanFridgeFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<FridgeScanResponse> {
  // Pre-flight image size check
  if (!imageBase64 || imageBase64.length < 50) {
    throw new Error('Image data is too small or missing.');
  }

  const prompt = `
    You are an advanced AI vision system specialized in refrigerator, freezer, and pantry food inventorying.
    Analyze the attached photo of an open refrigerator or pantry.

    INSTRUCTIONS:
    1. First, assess the image quality:
       - Check if the fridge interior is clearly visible, or if it is too dark (e.g. fridge bulb off, deep shadows), blurry, or reflecting glare.
       - Set "isUsable" to true if food items are distinguishable; false if pitch-dark or completely blurry.
       - Provide helpful advice in "advice" if lighting or camera angle could be improved.
    2. Detect visible fresh foods, bottles, leftovers, and groceries:
       - "name": Clean item title (e.g., "Greek Yogurt", "Whole Milk", "Baby Spinach", "Cheddar Cheese").
       - "category": Standard category (Vegetables, Fruits, Dairy & Eggs, Meat & Seafood, Condiments, Beverages, Leftovers, Bakery, Pantry Staples).
       - "estimatedQuantity": Estimated quantity or remaining fullness (e.g., "1 bottle (~half full)", "3 pieces", "1 tub").
       - "storageLocation": Detect exact location inside the fridge:
         "top_shelf", "middle_shelf", "bottom_shelf", "crisper_drawer", "door_bin", "freezer", or "unknown".
       - "spatialConfidence": Confidence level ("high", "medium", or "low").
       - "shelfLifeDays": Estimated days remaining in standard refrigeration before spoilage.
       - "visualNotes": Notes like "opened carton", "unopened packaging", "ripe", "crisp".
    3. Fridge overview:
       - "fillLevel": "empty", "sparsely_filled", "moderately_full", or "packed".
       - "cleanlinessAssessment": Brief remark on food organization.

    Today's ISO date is: ${new Date().toISOString()}

    IMPORTANT: Do not return markdown, backticks, or comments. Adhere strictly to the JSON schema.
  `;

  try {
    const response = await callGeminiWithRetry({
      model: PRIMARY_VISION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType || 'image/jpeg'
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: FRIDGE_RESPONSE_SCHEMA
      }
    });

    let jsonStr = response.text || '{}';
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn('[GeminiVision] Fridge JSON parsing failed. Attempting fallback parse.');
      parsed = { imageQuality: { isUsable: false, clarity: 'blurry', lighting: 'low_light' }, detectedItems: [] };
    }

    const today = new Date();
    const rawItems: any[] = Array.isArray(parsed.detectedItems) ? parsed.detectedItems : [];

    const validLocations = new Set([
      'top_shelf',
      'middle_shelf',
      'bottom_shelf',
      'crisper_drawer',
      'door_bin',
      'freezer',
      'unknown'
    ]);

    const detectedItems: FridgeItemOutput[] = rawItems.map((item) => {
      const shelfLife = typeof item.shelfLifeDays === 'number' && item.shelfLifeDays > 0 ? item.shelfLifeDays : 5;
      const expiry = new Date(today);
      expiry.setDate(today.getDate() + shelfLife);

      const loc = String(item.storageLocation || '').toLowerCase().trim();
      const storageLocation = validLocations.has(loc) ? (loc as any) : 'unknown';

      return {
        id: Math.random().toString(36).substring(7),
        name: item.name || 'Identified Food Item',
        category: item.category || 'Vegetables',
        estimatedQuantity: item.estimatedQuantity || '1 unit',
        storageLocation,
        spatialConfidence: ['high', 'medium', 'low'].includes(item.spatialConfidence) ? item.spatialConfidence : 'medium',
        shelfLifeDays: shelfLife,
        purchaseDate: today.toISOString(),
        estimatedExpiryDate: expiry.toISOString(),
        status: shelfLife <= 2 ? 'expiring_soon' : 'fresh',
        visualNotes: item.visualNotes || undefined
      };
    });

    const isUsable = parsed.imageQuality?.isUsable !== false;
    const clarity = parsed.imageQuality?.clarity || (detectedItems.length > 0 ? 'clear' : 'blurry');
    const lighting = parsed.imageQuality?.lighting || 'good';

    return {
      quality: {
        isUsable,
        clarity,
        lighting,
        warning: parsed.imageQuality?.warning || (clarity === 'blurry' || lighting === 'low_light' ? 'Fridge photo is dark or blurry; some items in deeper corners may not be detected.' : undefined),
        advice: parsed.imageQuality?.advice || (clarity === 'blurry' || lighting === 'low_light' ? 'Try turning on room lights, opening fridge doors wide, and holding the camera steady.' : undefined)
      },
      fridgeOverview: parsed.fridgeOverview ? {
        fillLevel: parsed.fridgeOverview.fillLevel || 'moderately_full',
        cleanlinessAssessment: parsed.fridgeOverview.cleanlinessAssessment || undefined
      } : undefined,
      count: detectedItems.length,
      detectedItems
    };
  } catch (err: any) {
    console.error('[GeminiVision] Error in scanFridgeFromImage:', err.message);
    // Graceful fallback for severe degradation or network issue
    return {
      quality: {
        isUsable: false,
        clarity: 'blurry',
        lighting: 'low_light',
        warning: 'Unable to analyze fridge image due to poor lighting or blurriness.',
        advice: 'Please ensure the interior light is on and retake the photo without camera shake.'
      },
      count: 0,
      detectedItems: []
    };
  }
}

