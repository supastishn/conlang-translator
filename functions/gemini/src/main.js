import { Client } from 'node-appwrite';
import OpenAI from 'openai';

const LANG_LABELS = {
    english: 'English',
    draconic: 'Draconic',
    dwl: 'Diacritical Waluigi Language',
    obwakimo: 'Obwa Kimo',
    illuveterian: 'Illuveterian',
    detect: 'Detect Language'
};

function getBaseUrl() {
    return 'https://supastishn.github.io/conlang-translator';
}

async function loadResource(path) {
    try {
        const response = await fetch(`${getBaseUrl()}${path}`);
        if (!response.ok) {
            console.warn(`Could not load ${path}: ${response.status} ${response.statusText}`);
            return `[Resource file (${path}) not found or could not be loaded]`;
        }
        return await response.text();
    } catch (error) {
        console.error(`Error loading resource ${path}:`, error);
        return `[Resource ${path} could not be loaded due to an error]`;
    }
}

const scanner = async (path) => {
  try {
    const res = await fetch(`${getBaseUrl()}/materials/csvs/index.json`);
    return res.ok ? (await res.json()).filter(f => f.endsWith('.csv')) : null;
  } catch {
    return null;
  }
};

async function scanDirectoryForCSVs() {
  return (await scanner()) || [
    'WIP - Draconic Dictionary - Common Phrases.csv',
    'WIP - Draconic Dictionary - Dictionary.csv',
    'WIP - Draconic Dictionary - Noun Forms.csv',
    'WIP - Draconic Dictionary - Phonology.csv',
    'WIP - Draconic Dictionary - Pronouns & Determiners.csv',
    'WIP - Draconic Dictionary - Verb Conjugation.csv'
  ];
}

async function loadDraconicDictionary() {
    const csvFiles = await scanDirectoryForCSVs('/materials/csvs');
    let allDictionaryData = '';
    for (const file of csvFiles) {
        const csvText = await loadResource(`/materials/csvs/${file}`);
        allDictionaryData += `\n### ${file} ###\n${csvText}\n`;
    }
    return allDictionaryData;
}

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
      
      const { sourceText, sourceLang, targetLang, settings } = payload;
      
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

      // Load resources similar to client-side
      let systemPromptCore = settings.systemPrompt || 'You are an expert multilingual translator. Translate the text as requested, using the provided linguistic resources. Follow all output formatting instructions precisely.';
      let resourcesForPrompt = "";

      const needsDraconic = (sourceLang === 'draconic' || targetLang === 'draconic');
      if (needsDraconic) {
          const dictionaryPrompt = await loadDraconicDictionary();
          const grammarPrompt = await loadResource('/materials/grammar.txt');
          resourcesForPrompt += `\n\nDRACONIC RESOURCES:\nDictionary:\n${dictionaryPrompt}\nGrammar:\n${grammarPrompt}`;
      }
      if (sourceLang === 'dwl' || targetLang === 'dwl') {
          resourcesForPrompt += `\n\nDIACRITICAL WALUIGI LANGUAGE RESOURCES:\n${await loadResource('/materials/dwl.txt')}`;
      }
      if (sourceLang === 'obwakimo' || targetLang === 'obwakimo') {
          resourcesForPrompt += `\n\nOBWA KIMO RESOURCES:\n${await loadResource('/materials/conlangs/obwakimo.txt')}`;
      }
      if (sourceLang === 'illuveterian' || targetLang === 'illuveterian') {
          resourcesForPrompt += `\n\nILLUVETERIAN RESOURCES:\n${await loadResource('/materials/conlangs/illuveterian.txt')}`;
      }

      let finalSystemPrompt = systemPromptCore + resourcesForPrompt;
      
      // Build XML instruction
      const xmlInstr = settings.includeExplanation
        ? "\n\nWrap your response in XML exactly as:\n<translation>…</translation>\n<explanation>…</explanation>\nDo not include any other text."
        : "\n\nWrap your response in XML exactly as:\n<translation>…</translation>\nDo not include any other text.";

      // Create user prompt
      let userPromptText = sourceText || "Describe the image.";
      
      if (sourceLang === 'detect') {
        userPromptText = `Identify the language and translate to ${LANG_LABELS[targetLang]}`;
        if (targetLang === 'english') {
          userPromptText += settings.dwlToEnglishType === 'raw'
            ? " (preserve original phrasing)"
            : " (use natural English)";
        }
      } else {
        userPromptText = `Translate from ${LANG_LABELS[sourceLang]} to ${LANG_LABELS[targetLang]}`;
      }
      
      userPromptText += `:\n\n${sourceText}${xmlInstr}`;

      // Prepare messages
      const messages = [
        { role: 'system', content: finalSystemPrompt },
        { role: 'user', content: userPromptText }
      ];

      log('Sending to Google Gemini using OpenAI SDK');
      const startTime = Date.now();
      
      // Create chat completion with Gemini
      const completion = await openai.chat.completions.create({
        model: 'gemini-1.5-flash',
        temperature: settings.temperature,
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
