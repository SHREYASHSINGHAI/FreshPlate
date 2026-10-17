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
      status: 'fresh',
      source: 'Camera Import'
    };
  });
}
