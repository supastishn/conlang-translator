import { Client } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('draconic-translator')
    .setKey(req.headers['x-appwrite-key'] ?? '');

  if (req.method === 'POST' && req.path === '/') {
    try {
      const payload = typeof req.bodyRaw === 'string' ? JSON.parse(req.bodyRaw) : req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({ error: 'GEMINI_API_KEY not configured' }, 500);
      }

      // Use Gemini OpenAI-compatible endpoint
      const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`;
      const openaiPayload = {
        model: payload.settings.model,
        messages: [{ role: 'user', content: payload.sourceText }],
        temperature: payload.settings.temperature
      };

      if (payload.imageDataUrl) {
        openaiPayload.messages[0].content = [
          { type: 'text', text: payload.sourceText },
          { 
            type: 'image_url',
            image_url: { url: payload.imageDataUrl, detail: 'auto' }
          }
        ];
      }

      const geminiResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(openaiPayload)
      });

      if (!geminiResponse.ok) {
        const errData = await geminiResponse.json();
        return res.json({
          error: errData.error?.message || 'Gemini API error'
        }, 500);
      }

      const data = await geminiResponse.json();
      return res.json(data);
    } catch (err) {
      error(err.message);
      return res.json({ error: 'Internal server error' }, 500);
    }
  }

  return res.json({ error: 'Route not found' }, 404);
};
