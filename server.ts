import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
dotenv.config();
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBS7uDMan3jrCJWSPi3uUupKAToLfB2OJc",
  authDomain: "freshplate-10d10.firebaseapp.com",
  databaseURL: "https://freshplate-10d10-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "freshplate-10d10",
  storageBucket: "freshplate-10d10.firebasestorage.app",
  messagingSenderId: "32026376878",
  appId: "1:32026376878:web:bb27be1eee6f43a64f8b3f",
  measurementId: "G-T4SMGJKHFR"
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

const recipeCache = new Map<string, any>();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

const generateContentWithRetry = async (params: any, retries = 3) => {
  const modelsToTry = [params.model || "gemini-2.5-flash", "gemini-2.5-pro"];
  
  for (const model of modelsToTry) {
    for (let i = 0; i < retries; i++) {
      try {
        const attemptParams = { ...params, model };
        return await ai.models.generateContent(attemptParams);
      } catch (error: any) {
        const isUnavailable = error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE") || error?.status === "UNAVAILABLE" || error?.code === 503 || error?.message?.includes("overloaded");
        
        if (isUnavailable && i < retries - 1) {
          console.warn(`${model} unavailable (503), retrying in ${Math.pow(2, i)} seconds...`);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          continue;
        }
        
        console.warn(`${model} failed. ${modelsToTry.indexOf(model) < modelsToTry.length - 1 ? 'Falling back to next model...' : 'No models left.'}`);
        break;
      }
    }
  }
  throw new Error("All AI models failed to generate content. Please try again later.");
};

// Production Rate Limiters
const imageUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Image processing rate limit reached. Please wait a few minutes before scanning another photo." }
});

const recipeGenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Recipe generation rate limit reached. Please wait a few minutes before generating more recipes." }
});

const orderParseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Order parsing rate limit reached. Please wait a few minutes before parsing more orders." }
});

const joinHouseholdLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts to join household. Please wait 15 minutes before trying another code." }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 10mb payload limit to support high-res camera photos
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // API to securely validate 5-minute invite codes and join a household
  app.post("/api/join-household", joinHouseholdLimiter, async (req, res) => {
    try {
      const { code, userUid } = req.body;
      if (!code || !userUid) {
        return res.status(400).json({ error: "Code and user ID are required" });
      }

      const inviteCode = code.trim().toUpperCase();
      const inviteRef = doc(db, "invites", inviteCode);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        return res.status(404).json({ error: "Invalid invite code" });
      }

      const inviteData = inviteSnap.data();
      const expiresAtMs = typeof inviteData.expiresAt === 'number' 
        ? inviteData.expiresAt 
        : new Date(inviteData.expiresAt).getTime();

      // Check 5-minute validity window
      if (Date.now() > expiresAtMs) {
        return res.status(410).json({ error: "This invite code has expired (valid for 5 minutes). Please ask the host to regenerate a new code." });
      }

      const targetUid = inviteData.targetUid || inviteData.householdOwnerId;
      if (!targetUid) {
        return res.status(400).json({ error: "Invalid household target for this invite" });
      }

      if (targetUid === userUid) {
        return res.status(400).json({ error: "You cannot join your own household" });
      }

      const assignedRole = inviteData.role === "guest" ? "guest" : "family";

      // Link user to the target household and store their role
      await setDoc(doc(db, "users", userUid), { 
        linkedHousehold: targetUid,
        householdRole: assignedRole
      }, { merge: true });

      // Add user to the target household's sharedWith list and members array
      const memberEntry = {
        uid: userUid,
        role: assignedRole,
        joinedAt: Date.now()
      };

      await setDoc(doc(db, "users", targetUid), { 
        sharedWith: arrayUnion(userUid),
        householdMembers: arrayUnion(memberEntry)
      }, { merge: true });

      return res.json({ 
        success: true, 
        role: assignedRole,
        message: assignedRole === "guest" 
          ? "Successfully joined as a Guest (view-only access)" 
          : "Successfully joined as a Family Member (full access)" 
      });
    } catch (error: any) {
      console.error("Error joining household:", error);
      return res.status(500).json({ error: error?.message || "Failed to join household" });
    }
  });

  // API to parse order text from delivery apps
  app.post("/api/parse-order", orderParseLimiter, async (req, res) => {
    try {
      const { text, source } = req.body;
      
      const prompt = `
        You are an AI that parses order receipts from fast delivery apps like Blinkit, Zepto, and Instamart.
        
        GUARDRAIL: You must ONLY process grocery, food, and supermarket delivery receipts. 
        If this receipt is for electronics, clothing, rides (Uber/Ola), flights, or any non-grocery personal items, you MUST return an empty array: []

        Extract the vegetables, fruits, and other perishable grocery items from the following text.
        For each item, estimate its typical shelf life in days in a standard refrigerator and calculate an estimated expiry date from today.
        Today's date is: ${new Date().toISOString()}
        
        Respond ONLY with a JSON array of objects. Do not include markdown formatting or backticks.
        Format of each object (must be valid JSON with no comments):
        {
          "name": "Item name",
          "category": "Category",
          "quantity": "Quantity as string",
          "shelfLifeDays": 5
        }
        
        Order Text:
        ${text}
      `;

      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            description: "A list of extracted grocery items",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                category: { type: "STRING" },
                quantity: { type: "STRING" },
                shelfLifeDays: { type: "NUMBER" }
              },
              required: ["name", "category", "quantity", "shelfLifeDays"]
            }
          }
        }
      });

      let jsonStr = response.text || "[]";
      // Remove any markdown formatting if present
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const parsedItems = JSON.parse(jsonStr);
      
      // Transform into our Ingredient type
      const today = new Date();
      const ingredients = parsedItems.map((item: any) => {
        const expiryDate = new Date(today);
        expiryDate.setDate(today.getDate() + (item.shelfLifeDays || 5));
        
        return {
          id: Math.random().toString(36).substring(7),
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          purchaseDate: today.toISOString(),
          estimatedExpiryDate: expiryDate.toISOString(),
          status: 'fresh',
          source: source || 'Imported'
        };
      });

      res.json({ ingredients });
    } catch (error) {
      console.error("Error parsing order:", error);
      const isUnavailable = error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE");
      if (isUnavailable) {
        res.status(503).json({ error: "The AI model is currently experiencing high demand. Please try again in a few seconds." });
      } else {
        res.status(500).json({ error: "Failed to parse order" });
      }
    }
  });

  // API to parse image (receipt or fridge photo)
  app.post("/api/parse-image", imageUploadLimiter, async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      
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

      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  data: imageBase64,
                  mimeType
                }
              },
              {
                text: prompt
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            description: "A list of extracted grocery items",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                category: { type: "STRING" },
                quantity: { type: "STRING" },
                shelfLifeDays: { type: "NUMBER" }
              },
              required: ["name", "category", "quantity", "shelfLifeDays"]
            }
          }
        }
      });

      let jsonStr = response.text || "[]";
      // Remove any markdown formatting if present
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const parsedItems = JSON.parse(jsonStr);
      
      // Transform into our Ingredient type
      const today = new Date();
      const ingredients = parsedItems.map((item: any) => {
        const expiryDate = new Date(today);
        expiryDate.setDate(today.getDate() + (item.shelfLifeDays || 5));
        
        return {
          id: Math.random().toString(36).substring(7),
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          purchaseDate: today.toISOString(),
          estimatedExpiryDate: expiryDate.toISOString(),
          status: 'fresh',
          source: 'Camera Import'
        };
      });

      res.json({ ingredients });
    } catch (error) {
      console.error("Error parsing image:", error);
      const isUnavailable = error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE");
      if (isUnavailable) {
        res.status(503).json({ error: "The AI model is currently experiencing high demand. Please try again in a few seconds." });
      } else {
        res.status(500).json({ error: "Failed to parse image" });
      }
    }
  });

  // API to generate recipes based on ingredients
  app.post("/api/generate-recipes", recipeGenLimiter, async (req, res) => {
    try {
      const { ingredients, cuisine, language, adults, children } = req.body; // array of Ingredient
      
      // 1. SMART CACHING LOGIC
      let cacheRef: any = null;
      try {
        const cacheKeyData = JSON.stringify({
          i: (ingredients || []).map((i: any) => i.name.toLowerCase().trim()).sort(),
          c: cuisine || 'Any',
          l: language || 'English',
          a: adults || 2,
          ch: children || 0
        });
        const cacheHash = crypto.createHash('sha256').update(cacheKeyData).digest('hex');
        cacheRef = doc(db, "recipe_cache", cacheHash);
        const cacheSnap = await getDoc(cacheRef);
        
        if (cacheSnap.exists()) {
          console.log("Serving recipes from Firestore cache!");
          const data = cacheSnap.data() as any;
          return res.json({ recipes: data.recipes, cached: true });
        }
      } catch (cacheErr) {
        console.warn("Cache check failed, proceeding to API", cacheErr);
      }

      // Separate expiring soon / stale from fresh
      const expiringItems = ingredients.filter((i: any) => i.status === 'expiring_soon' || i.status === 'stale');
      const freshItems = ingredients.filter((i: any) => i.status === 'fresh');
      
      const cuisineInstruction = cuisine && cuisine !== 'Any' ? `The recipes MUST be in the style of ${cuisine} cuisine.` : '';
      
      let audienceInstruction = '';
      if (adults !== undefined && children !== undefined) {
        audienceInstruction = `The recipes MUST be scaled and portioned appropriately for ${adults} adult(s) and ${children} child(ren).`;
        if (children > 0) {
          audienceInstruction += ' Since children are eating, keep spice levels moderate or suggest ways to adjust it for them.';
        }
      }

      let langInstruction = '';
      if (language === 'Hindi') {
        langInstruction = 'The cooking instructions MUST be written in Hindi (using Devanagari script).';
      } else if (language === 'Hinglish') {
        langInstruction = 'The cooking instructions MUST be written in Hinglish (a conversational mix of Hindi and English written in Latin script).';
      } else {
        langInstruction = 'The cooking instructions MUST be written in English.';
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

      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            description: "A list of recipe suggestions",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING", description: "Recipe Name" },
                description: { type: "STRING", description: "Short description of the dish" },
                ingredients: { type: "ARRAY", items: { type: "STRING" } },
                instructions: { type: "ARRAY", items: { type: "STRING" } },
                prepTime: { type: "STRING" },
                cookTime: { type: "STRING" },
                difficulty: { type: "STRING" },
                matchesExpiring: { type: "BOOLEAN" },
                usedIngredientIds: { type: "ARRAY", items: { type: "STRING" } },
                missingIngredients: { type: "ARRAY", items: { type: "STRING" } }
              },
              required: ["title", "description", "ingredients", "instructions", "prepTime", "cookTime", "difficulty", "matchesExpiring", "usedIngredientIds", "missingIngredients"]
            }
          }
        }
      });

      let jsonStr = response.text || "[]";
      // Remove any markdown formatting if present
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const recipes = JSON.parse(jsonStr);
      
      // Add IDs
      recipes.forEach((r: any) => r.id = Math.random().toString(36).substring(7));

      try {
        if (cacheRef) {
          await setDoc(cacheRef, { recipes });
          console.log("Saved new recipes to Firestore cache!");
        }
      } catch (cacheErr) {
        console.warn("Failed to save to cache", cacheErr);
      }

      res.json({ recipes });
    } catch (error) {
      console.error("Error generating recipes:", error);
      const isUnavailable = error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE");
      if (isUnavailable) {
        res.status(503).json({ error: "The AI model is currently experiencing high demand. Please try again in a few seconds." });
      } else {
        res.status(500).json({ error: "Failed to generate recipes" });
      }
    }
  });

  // API to fetch and parse receipts from Gmail
  app.post("/api/fetch-gmail-receipts", orderParseLimiter, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid authorization header" });
      }
      
      const token = authHeader.split(" ")[1];
      const { google } = await import("googleapis");
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: token });
      
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Search for recent emails from common delivery services
      const query = "from:(blinkit OR zepto OR instamart OR amazon fresh OR swiggy OR zomato) subject:(order OR receipt) newer_than:7d";
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 5
      });
      
      const messages = response.data.messages || [];
      if (messages.length === 0) {
        return res.json({ ingredients: [] });
      }
      
      let allText = "";
      
      for (const msg of messages) {
        if (!msg.id) continue;
        const msgDetails = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });
        
        const payload = msgDetails.data.payload;
        let textPart = "";
        
        if (payload?.parts) {
          const part = payload.parts.find(p => p.mimeType === 'text/plain');
          if (part?.body?.data) {
            textPart = Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        } else if (payload?.body?.data) {
          textPart = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
        
        // Also get subject to figure out source
        const subject = payload?.headers?.find(h => h.name?.toLowerCase() === 'subject')?.value || "";
        const from = payload?.headers?.find(h => h.name?.toLowerCase() === 'from')?.value || "";
        
        allText += `\n--- Email from ${from} (Subject: ${subject}) ---\n${textPart.substring(0, 2000)}\n`;
      }
      
      if (!allText.trim()) {
        return res.json({ ingredients: [] });
      }
      
      const prompt = `
        You are an AI that parses order receipts from fast delivery apps like Blinkit, Zepto, Instamart, Swiggy Instamart, etc.
        I am giving you the text of recent emails.

        GUARDRAIL: You must ONLY process grocery, food, and supermarket delivery receipts. 
        If an email is a receipt for electronics, clothing, rides (Uber/Ola), flights, or any non-grocery personal items, ignore it completely.
        If NO grocery items are found in any of the emails, you MUST return an empty array: []

        Extract the vegetables, fruits, and other perishable grocery items from the emails.
        For each item, estimate its typical shelf life in days in a standard refrigerator and calculate an estimated expiry date from today.
        Today's date is: ${new Date().toISOString()}
        
        Respond ONLY with a JSON array of objects. Do not include markdown formatting or backticks.
        Format of each object (must be valid JSON with no comments):
        {
          "name": "Item name",
          "category": "Category",
          "quantity": "Quantity as string",
          "shelfLifeDays": 5,
          "source": "Best guess of the platform"
        }
        
        Email Text:
        ${allText}
      `;

      const aiResponse = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            description: "A list of extracted grocery items",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                category: { type: "STRING" },
                quantity: { type: "STRING" },
                shelfLifeDays: { type: "NUMBER" }
              },
              required: ["name", "category", "quantity", "shelfLifeDays"]
            }
          }
        }
      });

      let jsonStr = aiResponse.text || "[]";
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const parsedItems = JSON.parse(jsonStr);
      
      const today = new Date();
      const ingredients = parsedItems.map((item: any) => {
        const expiryDate = new Date(today);
        expiryDate.setDate(today.getDate() + (item.shelfLifeDays || 5));
        
        return {
          id: Math.random().toString(36).substring(7),
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          purchaseDate: today.toISOString(),
          estimatedExpiryDate: expiryDate.toISOString(),
          status: 'fresh',
          source: item.source || 'Gmail Import'
        };
      });

      res.json({ ingredients });
    } catch (error: any) {
      console.error("Error fetching gmail receipts:", error);
      
      const isAuthError = 
        error?.message?.toLowerCase().includes("invalid authentication") || 
        error?.code === 401 ||
        error?.response?.status === 401;

      if (isAuthError) {
        return res.status(401).json({ error: "Session expired or invalid. Please reconnect your Gmail." });
      }
      
      const isUnavailable = error?.status === 503 || error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE");
      if (isUnavailable) {
        return res.status(503).json({ error: "The AI model is currently experiencing high demand. Please try again in a few seconds." });
      }
      res.status(500).json({ error: error?.message || "Failed to fetch from Gmail" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
