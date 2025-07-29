import { Client } from 'node-appwrite';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('draconic-translator')
    .setKey(req.headers['x-appwrite-key'] ?? '');

  log(`Received ${req.method} request to ${req.path}`);

  // Only allow logged-in users
  try {
    const authHeader = req.headers['x-appwrite-user-id'] ? true : false;
    if (!authHeader) {
      return res.json({ error: 'Access restricted to logged-in users only.' }, 401);
    }
  } catch (e) {
    console.error(e);
    return res.json({ error: 'Authentication required' }, 401);
  }

  if (req.method === 'POST' && req.path === '/') {
    try {
      log('Parsing request payload...');
      const payload = typeof req.bodyRaw === 'string' ? JSON.parse(req.bodyRaw) : req.body;
      log(`Received request for provider: ${payload.provider}`);

      // Initialize GoogleGenerativeAI
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        error('GEMINI_API_KEY environment variable is not set!');
        return res.json({ error: 'GEMINI_API_KEY not configured' }, 500);
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: payload.settings.model || 'gemini-1.5-flash',
        generationConfig: { temperature: payload.settings.temperature }
      });

      // Build prompt parts
      const parts = [];
      if (payload.sourceText) {
        parts.push({ text: payload.sourceText });
      }
      if (payload.imageDataUrl) {
        // Extract base64 and MIME type from data URL
        const matches = payload.imageDataUrl.match(/^data:(.+?);base64,(.*)$/);
        if (!matches || matches.length !== 3) {
          throw new Error('Invalid image data URL format');
        }
        const mimeType = matches[1];
        const base64Data = matches[2];
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }

      log('Sending to Google Gemini');
      const startTime = Date.now();
      const result = await model.generateContent({
        contents: [{ role: 'user', parts }]
      });
      const responseText = result.response.text();
      const duration = Date.now() - startTime;
      log(`Gemini response received in ${duration}ms: ${responseText.substring(0, 75)}...`);

      // Return response in OpenAI-like format for compatibility
      return res.json({ 
        choices: [ 
          { 
            message: { 
              content: responseText 
            } 
          } 
        ] 
      });

    } catch (err) {
      // Enhanced error logging
      error(`Unhandled exception: ${err.message}`);
      error(`Stack trace: ${err.stack}`);
      error(`Request dump: ${JSON.stringify({
        headers: Object.keys(req.headers),
        body: req.bodyRaw?.substring(0, 500) + (req.bodyRaw?.length > 500 ? '...' : ''),
      })}`);
      return res.json({ error: 'Internal server error: ' + err.message }, 500);
    }
  }

  error(`404: No handler for ${req.method} ${req.path}`);
  return res.json({ error: 'Route not found' }, 404);
};
