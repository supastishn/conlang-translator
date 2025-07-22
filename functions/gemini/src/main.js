import { Client } from 'node-appwrite';
import OpenAI from 'openai';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('draconic-translator')
    .setKey(req.headers['x-appwrite-key'] ?? '');

  // --- NEW: Log incoming request ---
  log(`Received ${req.method} request to ${req.path}`);
  log('Request headers:', JSON.stringify(req.headers, null, 2));

  if (req.method === 'POST' && req.path === '/') {
    try {
      // --- NEW: Log parsing process ---
      log('Parsing request payload...');
      const payload = typeof req.bodyRaw === 'string' ? JSON.parse(req.bodyRaw) : req.body;
      log(`Received valid payload for model: ${payload.settings?.model}`);

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        error('GEMINI_API_KEY environment variable is not set!');
        return res.json({ error: 'GEMINI_API_KEY not configured' }, 500);
      }

      // --- NEW: Initialize OpenAI client ---
      const openai = new OpenAI({
        apiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
      });

      // --- NEW: Build messages structure ---
      const messages = [];
      let userMessage = {
        role: 'user',
        content: [
          { type: 'text', text: payload.sourceText }
        ]
      };

      if (payload.imageDataUrl) {
        userMessage.content.push({
          type: 'image_url',
          image_url: {
            url: payload.imageDataUrl,
            detail: 'auto'
          }
        });
      }

      messages.push(userMessage);

      // --- NEW: Create Gemini request with OpenAI SDK ---
      log('Sending to Gemini with OpenAI SDK');
      const startTime = Date.now();
      
      const data = await openai.chat.completions.create({
        model: payload.settings.model,
        messages: messages,
        temperature: payload.settings.temperature
      });

      const duration = Date.now() - startTime;
      
      // --- Log successful response ---
      log(`Gemini response received in ${duration}ms`);
      return res.json(data);
      
    } catch (err) {
      // --- ENHANCED: Detailed error logging ---
      error(`Unhandled exception: ${err.message}`);
      error(`Stack trace: ${err.stack}`);
      error(`Request dump: ${JSON.stringify({
        headers: req.headers,
        body: req.bodyRaw?.substring(0, 500) + (req.bodyRaw?.length > 500 ? '...' : ''),
      })}`);
      return res.json({ error: 'Internal server error' }, 500);
    }
  }

  // --- NEW: Log unmatched routes ---
  error(`404: No handler for ${req.method} ${req.path}`);
  return res.json({ error: 'Route not found' }, 404);
};
