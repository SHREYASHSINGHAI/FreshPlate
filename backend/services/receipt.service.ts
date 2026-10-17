import { geminiClient, FAST_TEXT_MODEL } from '../config/gemini';
import { google } from 'googleapis';

export async function parseOrderTextService(text: string, source: string) {
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

  const response = await geminiClient.models.generateContent({
    model: FAST_TEXT_MODEL,
    contents: prompt,
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
  const parsedItems = JSON.parse(jsonStr);

  const today = new Date();
  return parsedItems.map((item: any) => {
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
      source: source || 'Order Parse'
    };
  });
}

export async function fetchGmailReceiptsService(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const query = 'from:(blinkit OR zepto OR instamart OR amazon fresh OR swiggy OR zomato) subject:(order OR receipt) newer_than:7d';

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 5
  });

  const messages = response.data.messages || [];
  if (messages.length === 0) {
    return [];
  }

  let allText = '';
  for (const msg of messages) {
    if (!msg.id) continue;
    const msgDetails = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full'
    });

    const payload = msgDetails.data.payload;
    let textPart = '';

    if (payload?.parts) {
      const part = payload.parts.find((p) => p.mimeType === 'text/plain');
      if (part?.body?.data) {
        textPart = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    } else if (payload?.body?.data) {
      textPart = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    const subject = payload?.headers?.find((h) => h.name?.toLowerCase() === 'subject')?.value || '';
    const from = payload?.headers?.find((h) => h.name?.toLowerCase() === 'from')?.value || '';

    allText += `\n--- Email from ${from} (Subject: ${subject}) ---\n${textPart.substring(0, 2000)}\n`;
  }

  if (!allText.trim()) return [];
  return await parseOrderTextService(allText, 'Gmail Receipt');
}
