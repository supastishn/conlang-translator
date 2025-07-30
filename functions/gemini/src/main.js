import { Client } from 'node-appwrite';
import OpenAI from 'openai';

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
      
      // Initialize OpenAI client with Gemini endpoint
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        error('GEMINI_API_KEY environment variable is not set!');
        return res.json({ error: 'GEMINI_API_KEY not configured' }, 500);
      }

      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      });

      // Prepare messages
      const messages = [];
      if (payload.sourceText) {
        messages.push({
          role: 'user',
          content: payload.sourceText
        });
      }

      log('Sending to Google Gemini using OpenAI SDK');
      const startTime = Date.now();
      
      // Create chat completion with Gemini
      const completion = await openai.chat.completions.create({
        model: payload.settings.model || 'gemini-1.5-flash',
        temperature: payload.settings.temperature,
        messages
      });

      const duration = Date.now() - startTime;
      const responseText = completion.choices[0].message?.content || '';
      log(`Gemini response received in ${duration}ms: ${responseText.substring(0, 75)}...`);

      // Return response in OpenAI-like format
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
