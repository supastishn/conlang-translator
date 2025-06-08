import { Client, Users } from 'node-appwrite';
import fs from 'fs/promises';
import path from 'path';

// Helper function to load materials
const loadMaterial = async (filePath) => {
  try {
    const absolutePath = path.resolve(__dirname, '../materials', filePath);
    return await fs.readFile(absolutePath, 'utf-8');
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return `[Resource ${filePath} not available]`;
  }
};

const getSystemPrompt = async (sourceLang, targetLang) => {
  const basePrompt = "You are an expert multilingual translator. Translate the text as requested, using the provided linguistic resources. Provide only the translated text without explanations.";

  const resources = [];
  
  const needsDraconic = sourceLang === 'draconic' || targetLang === 'draconic';
  if (needsDraconic) {
    resources.push(
      `DRACONIC DICTIONARY:\n${await loadMaterial('csvs/WIP - Draconic Dictionary - Dictionary.csv')}`,
      `DRACONIC GRAMMAR:\n${await loadMaterial('grammar.txt')}`
    );
  }
  
  if (sourceLang === 'dwl' || targetLang === 'dwl') {
    resources.push(`DWL RESOURCES:\n${await loadMaterial('dwl.txt')}`);
  }
  
  if (sourceLang.includes('obwakimo') || targetLang.includes('obwakimo')) {
    resources.push(`OBWA KIMO:\n${await loadMaterial('conlangs/obwakimo.txt')}`);
  }
  
  if (sourceLang.includes('illuveterian') || targetLang.includes('illuveterian')) {
    resources.push(`ILLUVETERIAN:\n${await loadMaterial('conlangs/illuveterian.txt')}`);
  }

  return resources.length 
    ? `${basePrompt}\n\nLINGUISTIC RESOURCES:\n${resources.join('\n\n')}`
    : basePrompt;
};

export default async ({ req, res, log, error }) => {
  // You can use the Appwrite SDK to interact with other services
  // For this example, we're using the Users service
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const users = new Users(client);

  // Handle /ping
  if (req.path === "/ping") {
    return res.text("Pong");
  }

  // Handle translation
  if (req.method === 'POST' && req.path === '/translate') {
    try {
      const { sourceText, sourceLang, targetLang, imageDataUrl } = req.body;
      const { model = 'gemini-1.5-flash', temperature = 0.0 } = req.body.settings || {};

      if (!process.env.GEMINI_API_KEY) {
        return res.json({ error: 'GEMINI_API_KEY not configured' }, 500);
      }

      const systemPrompt = await getSystemPrompt(sourceLang, targetLang);
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sourceText }
      ];

      if (imageDataUrl) {
        messages[1] = { 
          ...messages[1],
          content: [
            { type: "text", text: sourceText || "Translate this image content" },
            { type: "image_url", image_url: { url: imageDataUrl } }
          ]
        };
      }

      // Call Gemini OpenAI-compatible endpoint
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
          },
          body: JSON.stringify({
            model,
            temperature,
            messages
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        return res.json({ error: data.error || 'Translation failed' }, 500);
      }

      return res.json({
        translation: data.choices[0]?.message?.content || ''
      });
    } catch (err) {
      error(err.message);
      return res.json({ error: 'Internal server error' }, 500);
    }
  }

  // Default Appwrite demo responses
  try {
    const response = await users.list();
    log(`Total users: ${response.total}`);
  } catch(err) {
    error("Could not list users: " + err.message);
  }

  return res.json({
    motto: "Build like a team of hundreds_",
    learn: "https://appwrite.io/docs",
    connect: "https://appwrite.io/discord",
    getInspired: "https://builtwith.appwrite.io",
  });
};
