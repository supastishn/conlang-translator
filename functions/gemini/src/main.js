import { Client } from 'node-appwrite';

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

      // --- NEW: Log API URL and request setup ---
      const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`;
      log(`Calling Gemini API at: ${url.replace(apiKey, '***')}`);
      
      const openaiPayload = {
        model: payload.settings.model,
        messages: [{ role: 'user', content: payload.sourceText }],
        temperature: payload.settings.temperature
      };

      if (payload.imageDataUrl) {
        // --- NEW: Log image processing ---
        log('Processing image attachment (type: ' + 
            payload.imageDataUrl.substring(5, payload.imageDataUrl.indexOf(';')) + ')');
        openaiPayload.messages[0].content = [
          { type: 'text', text: payload.sourceText },
          { 
            type: 'image_url',
            image_url: { url: payload.imageDataUrl, detail: 'auto' }
          }
        ];
      } else {
        log('Processing text-only request');
      }

      // --- NEW: Log final payload structure ---
      log('Sending to Gemini:', JSON.stringify({
        ...openaiPayload,
        messages: openaiPayload.messages.map(m => 
          m.content && Array.isArray(m.content) 
            ? {...m, content: m.content.map(c => c.type === 'image_url' ? {...c, image_url: '...truncated for logs...'} : c)}
            : m
        )
      }, null, 2));

      // --- NEW: Add timing to API calls ---
      const startTime = Date.now();
      const geminiResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(openaiPayload)
      });
      const duration = Date.now() - startTime;
      
      // --- NEW: Log response metadata ---
      log(`Gemini API response (${duration}ms): ${geminiResponse.status} ${geminiResponse.statusText}`);
      
      if (!geminiResponse.ok) {
        const errData = await geminiResponse.json();
        error(`Gemini API error: ${JSON.stringify(errData)}`);
        return res.json({
          error: errData.error?.message || 'Gemini API error'
        }, 500);
      }

      const data = await geminiResponse.json();
      // --- NEW: Log successful response ---
      log('Successfully received response from Gemini');
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
