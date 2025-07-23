import { Client, Functions } from 'appwrite';

const LANG_LABELS = {
    english: 'English',
    draconic: 'Draconic',
    dwl: 'Diacritical Waluigi Language',
    obwakimo: 'Obwa Kimo',
    illuveterian: 'Illuveterian',
    detect: 'Detect Language'
};

function getBaseUrl() {
    return window.location.origin;
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

async function callGeminiFunction({ sourceText, sourceLang, targetLang, imageDataUrl, settings }) {
  const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('draconic-translator');
  const functions = new Functions(client);

  try {
    const payload = {
      sourceText,
      sourceLang,
      targetLang,
      imageDataUrl,
      settings: {
        model: settings.model || 'gemini-1.5-flash',
        temperature: settings.temperature
      }
    };

    const execution = await functions.createExecution(
      'gemini',
      JSON.stringify(payload),
      false,
      '/',
      'POST'
    );

    if (execution.status === 'failed') {
      throw new Error(execution.stderr || 'Gemini function execution failed');
    }

    // Return raw response without checking if it's "ok"
    return execution.response;
  } catch (error) {
    throw new Error('Gemini function call failed: ' + error.message);
  }
}

function isValidImageFormat(dataUrl) {
  return /^data:image\/(jpeg|png|gif|webp);base64,/.test(dataUrl);
}

export async function translateText(options) {
  const { provider, ...config } = options;

  if (config.imageDataUrl && !isValidImageFormat(config.imageDataUrl)) {
    throw new Error('Unsupported image format. Please use JPEG, PNG, GIF, or WEBP.');
  }

  return provider === 'gemini'
    ? callGeminiFunction(config)
    : callOpenAiFunction(config);
}

async function callOpenAiFunction({ sourceText, sourceLang, targetLang, imageDataUrl, settings, updateCallback }) {
    let systemPromptCore = settings.systemPrompt;
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

    const xmlInstr = settings.includeExplanation
      ? "\n\nWrap your response in XML exactly as:\n<translation>…</translation>\n<explanation>…</explanation>\nDo not include any other text."
      : "\n\nWrap your response in XML exactly as:\n<translation>…</translation>\nDo not include any other text.";

    function getMessageContent(userPromptText, imageDataUrl, xmlInstr) {
      if (imageDataUrl) {
        return [
          { type: "text", text: userPromptText + xmlInstr },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "auto" } }
        ];
      }
      return userPromptText + xmlInstr;
    }

    let userMessageContent = getMessageContent(userPromptText, imageDataUrl, xmlInstr);
    
    const endpoint = `${settings.baseUrl}/chat/completions`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
    };

    const payload = {
        model: settings.model,
        messages: [
            { role: "system", content: finalSystemPrompt },
            { role: "user", content: userMessageContent }
        ],
        temperature: settings.temperature
    };

    if (settings.streamingEnabled && updateCallback) {
        payload.stream = true;
        const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
        if (!response.ok || !response.body) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || 'Streaming translation failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let rawXml = '';
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data.trim() === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(data);
                        rawXml += parsed.choices[0]?.delta?.content || '';
                        updateCallback(rawXml);
                    } catch (e) { /* Ignore invalid JSON chunks */ }
                }
            }
        }
        return rawXml;
    } else {
        const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Translation failed');
        }
        return data.choices[0].message.content;
    }
}
