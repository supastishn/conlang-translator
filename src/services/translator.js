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

async function scanDirectoryForCSVs(directoryPath) {
    // In a pure client-side setup without server directory listing, we must rely on a known list of files.
    // We'll use the index.json if available, otherwise a hardcoded list from the old project.
    try {
        const indexResponse = await fetch(`${getBaseUrl()}/materials/csvs/index.json`);
        if (indexResponse.ok) {
            const fileList = await indexResponse.json();
            return fileList.filter(filename => filename.toLowerCase().endsWith('.csv'));
        }
    } catch (e) {
        // Fallback to hardcoded list if index.json is not found
    }
    
    // Fallback list based on old project structure
    return [
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
            false // synchronous
        );

        if (execution.status === 'failed') {
          throw new Error(execution.stderr || 'Gemini function execution failed');
        }

        const response = JSON.parse(execution.response);
        return response.translation;
    } catch (error) {
        throw new Error('Gemini function call failed: ' + error.message);
    }
}

function isValidImageFormat(dataUrl) {
  return /^data:image\/(jpeg|png|gif|webp);base64,/.test(dataUrl);
}

export async function translateText({ sourceText, sourceLang, targetLang, imageDataUrl, provider, settings, updateCallback }) {
    if (imageDataUrl && !isValidImageFormat(imageDataUrl)) {
      throw new Error('Unsupported image format. Please use JPEG, PNG, GIF, or WEBP.');
    }

    const shouldUseGeminiFunction = provider === 'gemini';

    if (shouldUseGeminiFunction) {
        return await callGeminiFunction({ sourceText, sourceLang, targetLang, imageDataUrl, settings });
    }

    // OpenAI-compatible provider logic
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
    let userMessageContent;
    let userPromptText = sourceText || "Describe the image.";

    const dwlToEnglishInstruction = settings.dwlToEnglishType === 'raw'
        ? "Translate into raw English, preserving original phrasing and diacritic implications even if unnatural."
        : "Translate into natural, grammatically correct English, interpreting diacritics for fluent output.";

    if (sourceLang === LANG_LABELS.detect) {
        userPromptText = `First, identify if the input text is English, Draconic, Diacritical Waluigi Language, Obwa Kimo, or Illuveterian. Then, translate the identified text into ${LANG_LABELS[targetLang]}.`;
        if (targetLang === 'english') {
            userPromptText += ` If the identified source is Diacritical Waluigi Language, ${dwlToEnglishInstruction}`;
        }
        userPromptText += ` Input text:\n\n"${sourceText}"`;
    } else {
        userPromptText = `Translate the following ${LANG_LABELS[sourceLang]} text to ${LANG_LABELS[targetLang]}:\n\n"${sourceText}"`;
    }

    if (imageDataUrl) {
        userMessageContent = [{ type: "text", text: userPromptText }];
        userMessageContent.push({ type: "image_url", image_url: { url: imageDataUrl, detail: "auto" } });
    } else {
        userMessageContent = userPromptText;
    }

    const xmlInstr = settings.includeExplanation
      ? "\n\nWrap your response in XML exactly as:\n<translation>…</translation>\n<explanation>…</explanation>\nDo not include any other text."
      : "\n\nWrap your response in XML exactly as:\n<translation>…</translation>\nDo not include any other text.";
    
    if (Array.isArray(userMessageContent)) {
        userMessageContent[0].text += xmlInstr;
    } else {
        userMessageContent += xmlInstr;
    }
    
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
