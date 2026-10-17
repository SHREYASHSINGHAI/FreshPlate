import crypto from 'crypto';
import { geminiClient, PRIMARY_VISION_MODEL, FALLBACK_VISION_MODEL } from '../config/gemini';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBS7uDMan3jrCJWSPi3uUupKAToLfB2OJc",
  authDomain: "freshplate-10d10.firebaseapp.com",
  projectId: "freshplate-10d10",
  storageBucket: "freshplate-10d10.firebasestorage.app",
  messagingSenderId: "32026376878",
  appId: "1:32026376878:web:bb27be1eee6f43a64f8b3f"
};

const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(fbApp);

async function callGemini(params: any, retries = 3): Promise<any> {
  const models = [params.model || PRIMARY_VISION_MODEL, FALLBACK_VISION_MODEL];
  for (const model of models) {
    for (let i = 0; i < retries; i++) {
      try {
        return await geminiClient.models.generateContent({ ...params, model });
      } catch (err: any) {
        if (i < retries - 1 && (err?.status === 503 || err?.message?.includes('503'))) {
          await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
          continue;
        }
        break;
      }
    }
  }
  throw new Error('All AI models failed to generate recipes.');
}

export async function generateRecipesService(params: {
  ingredients: any[];
  cuisine?: string;
  language?: string;
  adults?: number;
  children?: number;
}) {
  const { ingredients, cuisine = 'Any', language = 'English', adults = 2, children = 0 } = params;

  // 1. Check SHA-256 Cache in Firestore
  let cacheRef: any = null;
  try {
    const cacheKeyData = JSON.stringify({
      i: (ingredients || []).map((i: any) => i.name.toLowerCase().trim()).sort(),
      c: cuisine,
      l: language,
      a: adults,
      ch: children
    });
    const cacheHash = crypto.createHash('sha256').update(cacheKeyData).digest('hex');
    cacheRef = doc(db, 'recipe_cache', cacheHash);
    const cacheSnap = await getDoc(cacheRef);

    if (cacheSnap.exists()) {
      const data = cacheSnap.data() as any;
      return { recipes: data?.recipes || [], cached: true };
    }
  } catch (cacheErr) {
    console.warn('[RecipeService] Cache check skipped:', cacheErr);
  }

  // 2. Separate expiring vs fresh items
  const expiringItems = (ingredients || []).filter(
    (i: any) => i.status === 'expiring_soon' || i.status === 'stale'
  );
  const freshItems = (ingredients || []).filter((i: any) => i.status === 'fresh');

  const cuisineInstruction = cuisine !== 'Any' ? `The recipes MUST be in the style of ${cuisine} cuisine.` : '';
  
  let audienceInstruction = `The recipes MUST be scaled and portioned appropriately for ${adults} adult(s) and ${children} child(ren).`;
  if (children > 0) {
    audienceInstruction += ' Since children are eating, keep spice levels moderate or suggest ways to adjust it for them.';
  }

  let langInstruction = 'The cooking instructions MUST be written in English.';
  if (language === 'Hindi') {
    langInstruction = 'The cooking instructions MUST be written in Hindi (using Devanagari script).';
  } else if (language === 'Hinglish') {
    langInstruction = 'The cooking instructions MUST be written in Hinglish (a conversational mix of Hindi and English in Latin script).';
  }

  const prompt = `
    You are a culinary expert AI. I have the following ingredients in my pantry.
    
    Items expiring soon (PRIORITIZE THESE):
    ${expiringItems.map((i: any) => `${i.id}:${i.name}(${i.quantity})`).join(', ')}
    
    Other fresh items:
    ${freshItems.map((i: any) => `${i.id}:${i.name}(${i.quantity})`).join(', ')}
    
    Generate 2 diverse recipe suggestions that make heavy use of the expiring items to save them from going bad.
    ${cuisineInstruction}
    ${audienceInstruction}
    ${langInstruction}
    You can assume standard basic pantry staples (salt, pepper, oil) and common Indian home masalas (turmeric, coriander powder, cumin, red chili powder, garam masala, mustard seeds, etc.) are available.
    
    Respond ONLY with a JSON array of objects. Do not include markdown formatting or backticks.
    Format of each object (must be valid JSON with no comments):
    {
      "title": "Recipe Name",
      "description": "Short description of the dish",
      "ingredients": ["Ingredient 1", "Ingredient 2"],
      "instructions": ["Step 1", "Step 2"],
      "prepTime": "10 mins",
      "cookTime": "20 mins",
      "difficulty": "Easy",
      "matchesExpiring": true,
      "usedIngredientIds": ["ID1", "ID2"],
      "missingIngredients": ["Missing Item 1"]
    }
    
    Important Guidelines:
    - "usedIngredientIds": Include the IDs (the string before the colon) of the pantry items you used for this recipe.
    - "missingIngredients": Any main ingredients needed for the recipe that are NOT in the provided pantry items above. Do not include basic staples like salt, oil, or water.
  `;

  const response = await callGemini({
    model: PRIMARY_VISION_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        description: 'A list of recipe suggestions',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            ingredients: { type: 'ARRAY', items: { type: 'STRING' } },
            instructions: { type: 'ARRAY', items: { type: 'STRING' } },
            prepTime: { type: 'STRING' },
            cookTime: { type: 'STRING' },
            difficulty: { type: 'STRING' },
            matchesExpiring: { type: 'BOOLEAN' },
            usedIngredientIds: { type: 'ARRAY', items: { type: 'STRING' } },
            missingIngredients: { type: 'ARRAY', items: { type: 'STRING' } }
          },
          required: [
            'title',
            'description',
            'ingredients',
            'instructions',
            'prepTime',
            'cookTime',
            'difficulty',
            'matchesExpiring',
            'usedIngredientIds',
            'missingIngredients'
          ]
        }
      }
    }
  });

  let jsonStr = response.text || '[]';
  jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
  const recipes = JSON.parse(jsonStr);

  // Save to Firestore Cache asynchronously
  if (cacheRef) {
    setDoc(cacheRef, { recipes, createdAt: new Date().toISOString() }).catch((err) => {
      console.warn('[RecipeService] Failed to cache recipe in Firestore:', err);
    });
  }

  return { recipes, cached: false };
}
