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

      const content = [];
      content.push({
        text: `Translate this from ${payload.sourceLang} to ${payload.targetLang}:\n\n${payload.sourceText}`
      });

      if (payload.imageDataUrl) {
        const [header, base64Data] = payload.imageDataUrl.split(';base64,');
        const mimeType = header.replace('data:', '');

        content.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${payload.settings.model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: content
            }],
            generationConfig: {
              temperature: payload.settings.temperature
            }
          })
        }
      );

      const geminiData = await geminiResponse.json();
      if (!geminiResponse.ok) {
        return res.json({
          error: geminiData.error?.message || 'Gemini API error'
        }, 500);
      }

      const textParts = geminiData.candidates?.[0]?.content?.parts
        .filter(part => part.text)
        .map(part => part.text);

      const translation = textParts?.join('\n') || 'No translation returned';

      return res.text(translation);
    } catch (err) {
      error(err.message);
      return res.json({ error: 'Internal server error' }, 500);
    }
  }

  return res.json({ error: 'Route not found' }, 404);
};
