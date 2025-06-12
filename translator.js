/*
// translator.js - Handles translation functionality
*/

/* global Client, Functions */

/********************************/
/* NEW SDK INITIALIZATION CHECK */
/********************************/
// Verify Appwrite SDK is loaded
let sdkLoadedResolve;
const sdkLoadedPromise = new Promise(resolve => {
  sdkLoadedResolve = resolve;
});

if (typeof Appwrite === 'undefined') {
  const sdkCheck = setInterval(() => {
    if (typeof Appwrite !== 'undefined') {
      clearInterval(sdkCheck);
      sdkLoadedResolve();
    }
  }, 100);
} else {
  sdkLoadedResolve();
}

// Language constants
const LANG_ENGLISH = 'english';
const LANG_DRACONIC = 'draconic';
const LANG_DWL = 'dwl'; // Diacritical Waluigi Language
const LANG_OBWA_KIMO = 'obwakimo'; // Obwa Kimo
const LANG_ILLUVETERIAN = 'illuveterian';
const LANG_DETECT = 'detect'; // Detect language option

// Provider constants
const PROVIDER_OPENAI = 'openai';
const PROVIDER_GEMINI = 'gemini';

const LANG_LABELS = {
    [LANG_ENGLISH]: 'English',
    [LANG_DRACONIC]: 'Draconic',
    [LANG_DWL]: 'Diacritical Waluigi Language',
    [LANG_OBWA_KIMO]: 'Obwa Kimo',
    [LANG_ILLUVETERIAN]: 'Illuveterian',
    [LANG_DETECT]: 'Detect Language'
};

// Translation history storage
const TranslationHistory = {
    get: function() {
        const history = localStorage.getItem('draconicTranslationHistory');
        return history ? JSON.parse(history) : [];
    },
    
    add: function(sourceText, translatedText, sourceLang, targetLang) {
        const history = this.get();
        history.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            sourceText: sourceText,
            translatedText: translatedText,
            sourceLang: sourceLang,
            targetLang: targetLang
        });
        
        // Keep only the last 10 translations
        if (history.length > 10) {
            history.pop();
        }
        
        localStorage.setItem('draconicTranslationHistory', JSON.stringify(history));
        return history;
    },
    
    delete: function(id) {
        const history = this.get();
        const filteredHistory = history.filter(item => item.id !== id);
        localStorage.setItem('draconicTranslationHistory', JSON.stringify(filteredHistory));
        return filteredHistory;
    },
    
    clear: function() {
        localStorage.removeItem('draconicTranslationHistory');
    }
};

// Load Diacritical Waluigi Language resources
async function loadDWLResources() {
    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/materials/dwl.txt`);
        if (!response.ok) {
            console.warn(`Could not load dwl.txt: ${response.status} ${response.statusText}`);
            // If the user hasn't added the file yet, this is expected.
            // Return a specific message or empty string.
            return '[DWL resources file (dwl.txt) not found or could not be loaded]';
        }
        const dwlText = await response.text();
        return dwlText;
    } catch (error) {
        console.error('Error loading DWL resources:', error);
        return '[DWL resources could not be loaded due to an error]';
    }
}

// Load Obwa Kimo resources
async function loadObwaKimoResources() {
    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/materials/conlangs/obwakimo.txt`);
        if (!response.ok) {
            console.warn(`Could not load obwakimo.txt: ${response.status} ${response.statusText}`);
            return '[Obwa Kimo resources file (obwakimo.txt) not found or could not be loaded]';
        }
        const obwaKimoText = await response.text();
        return obwaKimoText;
    } catch (error) {
        console.error('Error loading Obwa Kimo resources:', error);
        return '[Obwa Kimo resources could not be loaded due to an error]';
    }
}

// Load Illuveterian resources
async function loadIlluveterianResources() {
    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/materials/conlangs/illuveterian.txt`);
        if (!response.ok) {
            console.warn(`Could not load illuveterian.txt: ${response.status} ${response.statusText}`);
            return '[Illuveterian resources file not found]';
        }
        return await response.text();
    } catch (error) {
        console.error('Error loading Illuveterian resources:', error);
        return '[Error loading Illuveterian resources]';
    }
}


/**
 * Protected API call for authenticated users.
 * Uses Appwrite session for authentication.
 */
const protectedAPICall = async (payload) => {
    const user = await window.authService.getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    // You may need to get a session token or JWT depending on your backend setup.
    // For demonstration, we'll assume a session secret or JWT is available as user.$id or user.secret.
    // Adjust as needed for your Appwrite backend.
    const sessionToken = user.secret || user.$id || '';
    const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Translation request failed');
    }
    return response.json();
};

/**
 * Call Gemini function via Appwrite Functions SDK.
 * Requires Appwrite JS SDK loaded and initialized.
 */
async function callGeminiFunction({sourceText, sourceLang, targetLang, imageDataUrl}) {
    // WAIT FOR SDK TO BE FULLY LOADED
    try {
        await sdkLoadedPromise;
    } catch (e) {
        throw new Error('Failed to load Appwrite SDK: ' + e.message);
    }
    
    if (typeof window.Appwrite === 'undefined') {
        throw new Error('Appwrite SDK not loaded after initialization');
    }
    const client = new window.Appwrite.Client()
        .setEndpoint('https://fra.cloud.appwrite.io/v1') // Updated endpoint
        .setProject('draconic-translator'); // Updated project ID

    const functions = new window.Appwrite.Functions(client);

    try {
        const payload = {
            sourceText,
            sourceLang,
            targetLang,
            imageDataUrl
        };

        const execution = await functions.createExecution(
            'gemini', // Your function ID
            JSON.stringify(payload),
            false // synchronous execution
        );

        const response = JSON.parse(execution.response);
        return response.translation;
    } catch (error) {
        throw new Error('Gemini function call failed: ' + error.message);
    }
}

// OpenAI API integration (now using protectedAPICall or Gemini)
async function translateText(sourceText, sourceLang, targetLang, imageDataUrl = null, updateCallback = null) {
    const settings = Settings.get();
    const includeExplanation = settings.includeExplanation === true;    // <<< NEW

    // Provider selection, with URL param override for Gemini
    const providerRadios = document.getElementsByName('provider-radio');
    let provider = PROVIDER_OPENAI;

    for (const radio of providerRadios) {
        if (radio.checked) {
            provider = radio.value;
            break;
        }
    }

    if (provider === PROVIDER_GEMINI) {
        // Call Gemini function via Appwrite
        return await callGeminiFunction({
            sourceText,
            sourceLang,
            targetLang,
            imageDataUrl
        });
    }

    // ... (all prompt/resource logic remains unchanged) ...

    // Prepare system prompt content
    let systemPromptCore = settings.systemPrompt;
    let resourcesForPrompt = "";

    // Determine which resources are needed
    const needsDraconic = (sourceLang === LANG_DRACONIC || targetLang === LANG_DRACONIC);
    const needsDWL = (sourceLang === LANG_DWL || targetLang === LANG_DWL);
    const needsObwaKimo = (sourceLang === LANG_OBWA_KIMO || targetLang === LANG_OBWA_KIMO);
    const needsIlluveterian = (sourceLang === LANG_ILLUVETERIAN || targetLang === LANG_ILLUVETERIAN);

    if (needsDraconic) {
        const dictionaryPrompt = await loadDraconicDictionary();
        const grammarPrompt = await loadDraconicGrammar();
        resourcesForPrompt += `\n\nDRACONIC RESOURCES:\nDictionary:\n${dictionaryPrompt}\nGrammar:\n${grammarPrompt}`;
    }
    if (needsDWL) {
        const dwlPromptText = await loadDWLResources();
        resourcesForPrompt += `\n\nDIACRITICAL WALUIGI LANGUAGE RESOURCES:\n${dwlPromptText}`;
    }
    if (needsObwaKimo) {
        const obwaKimoPromptText = await loadObwaKimoResources();
        resourcesForPrompt += `\n\nOBWA KIMO RESOURCES:\n${obwaKimoPromptText}`;
    }
    if (needsIlluveterian) {
        const illuveterianText = await loadIlluveterianResources();
        resourcesForPrompt += `\n\nILLUVETERIAN RESOURCES:\n${illuveterianText}`;
    }

    let finalSystemPrompt = systemPromptCore + resourcesForPrompt;

    // Build the user prompt and message content
    let userPromptText = sourceText || "Describe the image."; // Default prompt if sourceText is empty with an image
    let userMessageContent;

    const dwlToEnglishInstruction = settings.dwlToEnglishType === 'raw'
        ? "Translate into raw English, preserving original phrasing and diacritic implications even if unnatural."
        : "Translate into natural, grammatically correct English, interpreting diacritics for fluent output.";

    if (imageDataUrl) {
        let imageRelatedPrompt = "";
        if (sourceLang === LANG_DETECT) {
            imageRelatedPrompt = `Analyze the provided image. Identify the language of any text present (options: English, Draconic, Diacritical Waluigi Language, Obwa Kimo). Then, translate that text into ${LANG_LABELS[targetLang]}.`;
        } else {
            imageRelatedPrompt = `Analyze the provided image. Translate any ${LANG_LABELS[sourceLang]} text found in the image to ${LANG_LABELS[targetLang]}.`;
        }
        if (targetLang === LANG_ENGLISH && (sourceLang === LANG_DWL || sourceLang === LANG_DETECT)) {
             imageRelatedPrompt += ` If the source is Diacritical Waluigi Language, ${dwlToEnglishInstruction}`;
        }
        // Combine with user's text input if available
        userPromptText = `${imageRelatedPrompt} ${sourceText ? `Additional instructions or text to consider: "${sourceText}"` : ''}`.trim();

        userMessageContent = [
            { type: "text", text: userPromptText }
        ];
        if (imageDataUrl.startsWith("data:image/png;") || imageDataUrl.startsWith("data:image/jpeg;") || imageDataUrl.startsWith("data:image/gif;") || imageDataUrl.startsWith("data:image/webp;")) {
            userMessageContent.push({ type: "image_url", image_url: { url: imageDataUrl, detail: "auto" } });
        } else {
            console.warn("Image data URL might not be in a supported format for the API.");
            userMessageContent.push({ type: "image_url", image_url: { url: imageDataUrl, detail: "auto" } });
        }
    } else {
        if (sourceLang === LANG_DETECT) {
            userPromptText = `First, identify if the input text is English, Draconic, Diacritical Waluigi Language, Obwa Kimo, or Illuveterian. Then, translate the identified text into ${LANG_LABELS[targetLang]}.`;
            if (targetLang === LANG_ENGLISH) {
                userPromptText += ` If the identified source is Diacritical Waluigi Language, ${dwlToEnglishInstruction}`;
            }
            userPromptText += ` Input text:\n\n"${sourceText}"`;
        } else {
            userPromptText = `Translate the following ${LANG_LABELS[sourceLang]} text to ${LANG_LABELS[targetLang]}:\n\n"${sourceText}"`;
        }
        userMessageContent = userPromptText;
    }

    if (!imageDataUrl) {
        if (targetLang === LANG_DRACONIC && settings.draconicOutputType === 'simplified') {
            userPromptText += " (When generating Draconic, output simplified romanization)";
            if (Array.isArray(userMessageContent)) {
                userMessageContent[0].text = userPromptText;
            } else {
                userMessageContent = userPromptText;
            }
        } else if (sourceLang === LANG_DWL && targetLang === LANG_ENGLISH && settings.dwlToEnglishType) {
             const specificDwlInstruction = ` (${dwlToEnglishInstruction})`;
             if (Array.isArray(userMessageContent)) {
                userMessageContent[0].text += specificDwlInstruction;
             } else {
                userMessageContent += specificDwlInstruction;
             }
        }
    }

    const xmlInstr = includeExplanation
      ? "\n\nWrap your response in XML exactly as:\n<translation>…</translation>\n<explanation>…</explanation>\nDo not include any other text."
      : "\n\nWrap your response in XML exactly as:\n<translation>…</translation>\nDo not include any other text.";
    if (Array.isArray(userMessageContent)) {
      userMessageContent[0].text += xmlInstr;
    } else {
      userMessageContent += xmlInstr;
    }

    // Use protected API call for translation
    try {
        const response = await protectedAPICall({
            sourceText,
            sourceLang,
            targetLang,
            imageDataUrl,
            settings: {
                model: settings.model,
                temperature: settings.temperature
            }
        });

        // If streaming is needed, you may need to adapt this to your backend's streaming support.
        // For now, just return the translation.
        return response.translation || '';
    } catch (error) {
        throw error;
    }
}

// Get the absolute base URL for the application
function getBaseUrl() {
    // Get the base URL from the current page's URL
    const baseUrl = window.location.href.split('/').slice(0, -1).join('/');
    return baseUrl;
}

// Scan directory for CSV files
async function scanDirectoryForCSVs(directoryPath) {
    try {
        const baseUrl = getBaseUrl();
        const fullDirectoryPath = `${baseUrl}/${directoryPath}`;
        
        // First try to fetch a directory listing if available
        try {
            const indexResponse = await fetch(`${fullDirectoryPath}/index.json`);
            if (indexResponse.ok) {
                const fileList = await indexResponse.json();
                return fileList.filter(filename => filename.toLowerCase().endsWith('.csv'));
            }
        } catch (indexError) {
            console.log('No index.json found, will scan for files individually');
        }
        
        // If no index is available, try to fetch files based on common patterns
        const possibleFiles = [];
        
        // Try to determine which files exist by making HEAD requests
        const commonPrefixes = ['', 'dictionary-', 'dict-', 'lang-', 'draconic-'];
        const commonCategories = [
            'all', 'main', 'dictionary', 'common', 'nouns', 'verbs', 'adjectives', 
            'adverbs', 'pronouns', 'determiners', 'conjunctions', 'prepositions', 
            'phrases', 'common_words', 'vocabulary', 'expressions', 'grammar'
        ];
        
        for (const prefix of commonPrefixes) {
            for (const category of commonCategories) {
                possibleFiles.push(`${prefix}${category}.csv`);
            }
        }
        
        // Check for any CSV files that match our patterns
        const filePromises = possibleFiles.map(async filename => {
            try {
                const response = await fetch(`${fullDirectoryPath}/${filename}`, { method: 'HEAD' });
                return response.ok ? filename : null;
            } catch (e) {
                return null;
            }
        });
        
        const results = await Promise.all(filePromises);
        const existingFiles = results.filter(filename => filename !== null);
        
        if (existingFiles.length > 0) {
            return existingFiles;
        }
        
        // If no files found with common patterns, try wildcard approach
        // This can be expanded based on server capabilities
        console.warn('No CSV files found with common naming patterns');
        return [];
    } catch (error) {
        console.error('Error scanning directory:', error);
        return [];
    }
}

// Load dictionary from all CSVs in the directory
async function loadDraconicDictionary() {
    try {
        const baseUrl = getBaseUrl();
        
        // Dynamically scan for CSV files
        const csvFiles = await scanDirectoryForCSVs('materials/csvs');
        console.log(`Found ${csvFiles.length} CSV files:`, csvFiles);
        
        // Load all CSV files and combine them
        let allDictionaryData = '';
        
        for (const file of csvFiles) {
            try {
                const response = await fetch(`${baseUrl}/materials/csvs/${file}`);
                if (response.ok) {
                    const csvText = await response.text();
                    // Add a header for each file to identify the source
                    allDictionaryData += `\n### ${file} ###\n${csvText}\n`;
                } else {
                    console.warn(`Could not load ${file}: ${response.status}`);
                }
            } catch (fileError) {
                console.warn(`Error loading ${file}:`, fileError);
            }
        }
        
        // If no files were loaded, try to scan at the root level
        if (!allDictionaryData.trim()) {
            console.warn('No CSV files found in materials/csvs, looking for CSVs in materials directory...');
            
            // Try to find any CSV files in the materials directory
            const rootCsvFiles = await scanDirectoryForCSVs('materials');
            console.log(`Found ${rootCsvFiles.length} CSV files in materials directory:`, rootCsvFiles);
            
            for (const file of rootCsvFiles) {
                try {
                    const response = await fetch(`${baseUrl}/materials/${file}`);
                    if (response.ok) {
                        const csvText = await response.text();
                        allDictionaryData += `\n### ${file} ###\n${csvText}\n`;
                    }
                } catch (fileError) {
                    console.warn(`Error loading ${file} from materials directory:`, fileError);
                }
            }
            
            // As a last resort, try the original dictionary.csv file
            if (!allDictionaryData.trim()) {
                console.warn('No CSV files found in materials directory either, trying dictionary.csv fallback...');
                const fallbackResponse = await fetch(`${baseUrl}/materials/dictionary.csv`);
                if (fallbackResponse.ok) {
                    const fallbackText = await fallbackResponse.text();
                    allDictionaryData = fallbackText;
                    console.log('Loaded dictionary from fallback location');
                } else {
                    throw new Error('No dictionary files could be loaded');
                }
            }
        }
        
        return allDictionaryData;
    } catch (error) {
        console.error('Error loading dictionary files:', error);
        return '[Dictionary files could not be loaded]';
    }
}

// Load grammar rules
async function loadDraconicGrammar() {
    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/materials/grammar.txt`);
        const grammarText = await response.text();
        
        // Return the full grammar rules
        return grammarText;
    } catch (error) {
        console.error('Error loading grammar:', error);
        return '[Grammar rules could not be loaded]';
    }
}

// Update the translation history display
function updateHistoryDisplay() {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;
    
    const history = TranslationHistory.get();
    
    // Clear existing content
    historyContainer.innerHTML = '';
    
    // Add Clear All History button if we have history items
    if (history.length > 0) {
        const historyHeader = document.createElement('div');
        historyHeader.className = 'history-controls';
        historyHeader.innerHTML = `
            <button id="clear-all-history" class="clear-history-btn">Clear All History</button>
        `;
        historyContainer.appendChild(historyHeader);
        
        // Add event listener to Clear All button
        document.getElementById('clear-all-history').addEventListener('click', function() {
            if (confirm('Are you sure you want to delete all translation history?')) {
                TranslationHistory.clear();
                updateHistoryDisplay();
            }
        });
    }
    
    if (history.length === 0) {
        historyContainer.innerHTML += '<p class="empty-history">No translation history yet</p>';
        return;
    }
    
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleString();
        const directionLabel = `${LANG_LABELS[item.sourceLang]} → ${LANG_LABELS[item.targetLang]}`;
        
        historyItem.innerHTML = `
            <div class="history-header">
                <span class="history-date">${formattedDate}</span>
                <span class="history-direction">${directionLabel}</span>
                <div class="history-actions">
                    <button class="history-use-btn" data-id="${item.id}">Use Again</button>
                    <button class="history-delete-btn" data-id="${item.id}">Delete</button>
                </div>
            </div>
            <div class="history-content">
                <p><strong>${LANG_LABELS[item.sourceLang]}:</strong> ${item.sourceText}</p>
                <p><strong>${LANG_LABELS[item.targetLang]}:</strong> ${item.translatedText}</p>
            </div>
        `;
        
        historyContainer.appendChild(historyItem);
    });
    
    // Add event listeners to "Use Again" buttons
    document.querySelectorAll('.history-use-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const historyItem = history.find(item => item.id === id);
            
            if (historyItem) {
                // Set the language dropdowns
                document.getElementById('source-lang-select').value = historyItem.sourceLang;
                document.getElementById('target-lang-select').value = historyItem.targetLang;
                
                // Trigger change events to update UI
                document.getElementById('source-lang-select').dispatchEvent(new Event('change'));
                document.getElementById('target-lang-select').dispatchEvent(new Event('change'));

                // Set the input/output values
                document.getElementById('source-input').value = historyItem.sourceText;
                document.getElementById('target-output').value = historyItem.translatedText;
            }
        });
    });
    
    // Add event listeners to "Delete" buttons
    document.querySelectorAll('.history-delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            
            if (confirm('Delete this history item?')) {
                TranslationHistory.delete(id);
                updateHistoryDisplay();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Only run on the translator page
    const translateBtn = document.getElementById('translate-btn');
    if (!translateBtn) return;

    // --- AUTH UI LOGIC ---
    const authContainer = document.querySelector('.auth-container');
    
    // Update provider UI whenever auth state changes
    if (window.authService && window.authService.onAuthStateChanged) {
        window.authService.onAuthStateChanged(() => {
            window.initializeAuth && window.initializeAuth();
            updateProviderUI();
        });
    }
    // Initial call
    updateAuthUI();

    const sourceLangSelect = document.getElementById('source-lang-select');
    const targetLangSelect = document.getElementById('target-lang-select');
    const sourceLanguageLabelEl = document.getElementById('source-language-label');
    const targetLanguageLabelEl = document.getElementById('target-language-label');
    const sourceInputEl = document.getElementById('source-input');
    const targetOutputEl = document.getElementById('target-output');
    const dwlInputWarningEl = document.getElementById('dwl-input-warning');
    // NEW: Explanation elements
    const explanationContainer = document.getElementById('explanation-container');
    const explanationOutputEl = document.getElementById('explanation-output');

    // Provider radio group
    const providerRadioGroup = document.querySelector('.provider-radio-group');
    // Show/hide provider radio group based on Gemini option and auth
    async function updateProviderUI() {
        const providerRadioGroup = document.querySelector('.provider-radio-group');
        if (!providerRadioGroup) return;
        
        const settings = Settings.get();
        let showProviderSelection = false;
        
        if (settings.geminiOption && window.authService && 
            typeof window.authService.getCurrentUser === 'function') {
            try {
                const user = await window.authService.getCurrentUser();
                showProviderSelection = !!user;
            } catch (e) {
                showProviderSelection = false;
            }
        }
        
        providerRadioGroup.style.display = showProviderSelection ? 'block' : 'none';
        
        if (showProviderSelection) {
            // Check URL for enableGemini param
            const geminiParam = new URLSearchParams(window.location.search).get('enableGemini');
            
            if (geminiParam === 'true') {
                document.getElementById('gemini-radio').checked = true;
            } else {
                document.getElementById('openai-radio').checked = true;
            }
        }
    }
    if (providerRadioGroup) {
        updateProviderUI();
        // Optionally, listen for login/logout events to update UI
        if (window.authService && window.authService.onAuthStateChanged) {
            window.authService.onAuthStateChanged(updateProviderUI);
        }
    }

    // Image upload elements
    const imageUploadInput = document.getElementById('image-upload-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const clearImageBtn = document.getElementById('clear-image-btn');
    let currentImageDataUrl = null;

    // NEW: Include Explanation main page toggle
    const includeExplanationMainCheckbox = document.getElementById('include-explanation-main');
    if (includeExplanationMainCheckbox) {
      // initialize from Settings
      includeExplanationMainCheckbox.checked = Settings.get().includeExplanation === true;

      // helper to show/hide the explanation container
      function updateExplanationVisibility() {
        if (!explanationContainer) return;
        if (includeExplanationMainCheckbox.checked) {
          explanationContainer.classList.remove('hidden');
        } else {
          explanationContainer.classList.add('hidden');
        }
      }

      // set initial visibility
      updateExplanationVisibility();

      // save on toggle & update visibility immediately
      includeExplanationMainCheckbox.addEventListener('change', () => {
        const s = Settings.get();
        s.includeExplanation = includeExplanationMainCheckbox.checked;
        Settings.save(s);
        updateExplanationVisibility();
      });
    }

    // Camera elements
    const useCameraBtn = document.getElementById('use-camera-btn');
    const cameraModal = document.getElementById('camera-modal');
    const cameraVideoFeed = document.getElementById('camera-video-feed');
    const cameraCanvas = document.getElementById('camera-canvas');
    const captureImageBtn = document.getElementById('capture-image-btn');
    const closeCameraBtn = document.getElementById('close-camera-btn');
    let currentStream = null;
    
    const draconicOutputTypeContainer = document.getElementById('draconic-output-type-container');
    const draconicOutputTypeSelectIndex = document.getElementById('draconic-output-type-select-index');
    const dwlToEnglishTypeContainer = document.getElementById('dwl-to-english-type-container');
    const dwlToEnglishTypeSelectIndex = document.getElementById('dwl-to-english-type-select-index');

    // Function to update UI elements based on current language selections
    function updateUIForLanguageSelection() {
        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;
        const currentSettings = Settings.get();

        sourceLanguageLabelEl.textContent = LANG_LABELS[sourceLang];
        targetLanguageLabelEl.textContent = LANG_LABELS[targetLang];
        
        if (sourceLang === LANG_DETECT) {
            sourceInputEl.placeholder = `Enter text in any real language (English, Arabic)...`;
        } else {
            sourceInputEl.placeholder = `Enter ${LANG_LABELS[sourceLang]} text (or describe image task)...`;
        }
        targetOutputEl.placeholder = `${LANG_LABELS[targetLang]} translation will appear here...`;

        // Show/hide Draconic output type selector
        if (targetLang === LANG_DRACONIC) {
            draconicOutputTypeContainer.classList.remove('hidden');
            if (draconicOutputTypeSelectIndex) {
                draconicOutputTypeSelectIndex.value = currentSettings.draconicOutputType || 'normal';
            }
        } else {
            draconicOutputTypeContainer.classList.add('hidden');
        }

        // Show/hide DWL input warning
        if (dwlInputWarningEl) {
            if (sourceLang === LANG_DWL) {
                dwlInputWarningEl.classList.remove('hidden');
            } else {
                dwlInputWarningEl.classList.add('hidden');
            }
        }

        // Show/hide DWL to English type selector
        if (dwlToEnglishTypeContainer && dwlToEnglishTypeSelectIndex) {
            if (sourceLang === LANG_DWL && targetLang === LANG_ENGLISH) {
                dwlToEnglishTypeContainer.classList.remove('hidden');
                dwlToEnglishTypeSelectIndex.value = currentSettings.dwlToEnglishType || 'natural';
            } else {
                dwlToEnglishTypeContainer.classList.add('hidden');
            }
        }
    }
    
    let previousSourceLang = sourceLangSelect.value;
    let previousTargetLang = targetLangSelect.value;

    // Function to enable/disable options in dropdowns based on current selections
    function updateLanguageDropdownInteractivity() {
        const currentSourceVal = sourceLangSelect.value;
        const currentTargetVal = targetLangSelect.value;

        // Enable all options first
        Array.from(sourceLangSelect.options).forEach(opt => opt.disabled = false);
        Array.from(targetLangSelect.options).forEach(opt => opt.disabled = false);

        // No disabling logic needed here anymore for conflicting options,
        // as selecting a conflicting option should trigger a swap via the change handlers.
    }

    function handleSourceLangChange() {
        const newSourceValue = sourceLangSelect.value;
        let currentTargetValue = targetLangSelect.value; // Target's value before any swap

        if (newSourceValue === currentTargetValue && newSourceValue !== LANG_DETECT) {
            // Attempt to set target to what source *was* (previousSourceLang)
            let swapped = false;
            if (previousSourceLang && previousSourceLang !== LANG_DETECT && previousSourceLang !== newSourceValue) {
                // Check if previousSourceLang is a valid and available option for targetLangSelect
                const targetOptionForSwap = Array.from(targetLangSelect.options).find(opt => opt.value === previousSourceLang);
                if (targetOptionForSwap) { // previousSourceLang is a listed target language
                    targetLangSelect.value = previousSourceLang;
                    swapped = true;
                }
            }

            if (!swapped) {
                // Fallback: if previousSourceLang was not suitable (e.g., 'detect', same as newSourceValue, or not a target option)
                // Pick the first available, different language for the target.
                const newTargetOption = Array.from(targetLangSelect.options).find(opt => opt.value !== newSourceValue);
                if (newTargetOption) {
                    targetLangSelect.value = newTargetOption.value;
                }
            }
        }
        // previousSourceLang is updated by the focus listener for the next interaction.
        updateLanguageDropdownInteractivity();
        updateUIForLanguageSelection(); // Update labels, placeholders etc.
    }

    function handleTargetLangChange() {
        const newTargetValue = targetLangSelect.value;
        let currentSourceValue = sourceLangSelect.value; // Source's value before any swap

        if (newTargetValue === currentSourceValue && currentSourceValue !== LANG_DETECT) {
            // Attempt to set source to what target *was* (previousTargetLang)
            // previousTargetLang cannot be LANG_DETECT.
            let swapped = false;
            if (previousTargetLang && previousTargetLang !== newTargetValue) {
                 // Check if previousTargetLang is a valid and available option for sourceLangSelect
                const sourceOptionForSwap = Array.from(sourceLangSelect.options).find(opt => opt.value === previousTargetLang);
                if (sourceOptionForSwap) { // previousTargetLang is a listed source language
                    sourceLangSelect.value = previousTargetLang;
                    swapped = true;
                }
            }
            
            if (!swapped) {
                // Fallback: if previousTargetLang was not suitable (e.g. same as newTargetValue)
                // Pick the first available, different language for the source.
                const newSourceOption = Array.from(sourceLangSelect.options).find(opt => opt.value !== newTargetValue);
                if (newSourceOption) {
                    sourceLangSelect.value = newSourceOption.value;
                }
            }
        }
        // previousTargetLang is updated by the focus listener for the next interaction.
        updateLanguageDropdownInteractivity();
        updateUIForLanguageSelection(); // Update labels, placeholders etc.
    }

    // Initial UI setup
    sourceLangSelect.value = LANG_ENGLISH; // Default source
    targetLangSelect.value = LANG_DRACONIC; // Default target
    
    // Initialize previous values after setting defaults
    previousSourceLang = sourceLangSelect.value;
    previousTargetLang = targetLangSelect.value;

    updateLanguageDropdownInteractivity(); // Set initial disabled states
    updateUIForLanguageSelection(); // Set initial labels, placeholders

    // Event listeners for language dropdowns
    sourceLangSelect.addEventListener('focus', function() { previousSourceLang = this.value; });
    targetLangSelect.addEventListener('focus', function() { previousTargetLang = this.value; });

    sourceLangSelect.addEventListener('change', handleSourceLangChange);
    targetLangSelect.addEventListener('change', handleTargetLangChange);
    
    // Event listener for Draconic output type select on index.html
    if (draconicOutputTypeSelectIndex) {
        draconicOutputTypeSelectIndex.addEventListener('change', function() {
            const newOutputType = this.value;
            const currentSettings = Settings.get();
            currentSettings.draconicOutputType = newOutputType;
            Settings.save(currentSettings);
            // No need to call updateUIForLanguageSelection here as it doesn't affect other UI elements directly
        });
    }

    // Event listener for DWL to English type select on index.html
    if (dwlToEnglishTypeSelectIndex) {
        dwlToEnglishTypeSelectIndex.addEventListener('change', function() {
            const newDwlToEnglishType = this.value;
            const currentSettings = Settings.get();
            currentSettings.dwlToEnglishType = newDwlToEnglishType;
            Settings.save(currentSettings);
            // No need to call updateUIForLanguageSelection here as it doesn't affect other UI elements directly
        });
    }
    
    // Update history display on page load
    updateHistoryDisplay();

    // --- Camera Logic ---
    async function openCamera() {
        if (!cameraModal || !cameraVideoFeed) return;
        cameraModal.classList.remove('hidden');
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
            cameraVideoFeed.srcObject = currentStream;
            // Ensure video plays, especially on mobile
            cameraVideoFeed.play().catch(err => console.error("Error playing video:", err));
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access the camera. Please ensure permissions are granted and no other app is using it. Error: " + err.message);
            closeCamera(); // Close modal if camera access fails
        }
    }

    function closeCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        currentStream = null;
        if (cameraVideoFeed) cameraVideoFeed.srcObject = null;
        if (cameraModal) cameraModal.classList.add('hidden');
    }

    function captureImageFromCamera() {
        if (!cameraVideoFeed || !cameraCanvas || !imagePreview || !imagePreviewContainer) return;

        // Set canvas dimensions to video dimensions
        const videoWidth = cameraVideoFeed.videoWidth;
        const videoHeight = cameraVideoFeed.videoHeight;
        cameraCanvas.width = videoWidth;
        cameraCanvas.height = videoHeight;

        const context = cameraCanvas.getContext('2d');
        context.drawImage(cameraVideoFeed, 0, 0, videoWidth, videoHeight);
        
        currentImageDataUrl = cameraCanvas.toDataURL('image/webp'); // Use webp for good compression/quality
        imagePreview.src = currentImageDataUrl;
        imagePreviewContainer.classList.remove('hidden');
        sourceInputEl.placeholder = "Describe what to do with the captured image, or add text related to it...";
        
        closeCamera();
    }

    if (useCameraBtn) {
        useCameraBtn.addEventListener('click', openCamera);
    }
    if (captureImageBtn) {
        captureImageBtn.addEventListener('click', captureImageFromCamera);
    }
    if (closeCameraBtn) {
        closeCameraBtn.addEventListener('click', closeCamera);
    }

    // --- Image File Upload Logic ---
    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                // Basic validation for image type (client-side)
                const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
                if (!validTypes.includes(file.type)) {
                    alert('Invalid file type. Please select a PNG, JPEG, GIF, or WEBP image.');
                    imageUploadInput.value = ''; // Reset file input
                    return;
                }

                // Basic validation for image size (client-side, e.g., 20MB limit like OpenAI)
                const maxSizeMB = 20;
                if (file.size > maxSizeMB * 1024 * 1024) {
                    alert(`File is too large. Maximum size is ${maxSizeMB}MB.`);
                    imageUploadInput.value = ''; // Reset file input
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    currentImageDataUrl = e.target.result;
                    imagePreview.src = currentImageDataUrl;
                    imagePreviewContainer.classList.remove('hidden');
                    sourceInputEl.placeholder = "Describe what to do with the image, or add text related to it...";
                }
                reader.readAsDataURL(file);
            }
        });
    }

    if (clearImageBtn) {
        clearImageBtn.addEventListener('click', function() {
            currentImageDataUrl = null;
            imagePreview.src = '#';
            imagePreviewContainer.classList.add('hidden');
            imageUploadInput.value = ''; // Reset the file input
            // Restore original placeholder based on language selection
            updateUIForLanguageSelection(); 
        });
    }
    
    // Set up the translate button click handler
    translateBtn.addEventListener('click', async function() {
        console.log("Translate button clicked");

        const sourceText = sourceInputEl.value.trim();
        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;

        console.log("Source text:", sourceText);
        console.log("Source lang:", sourceLang);
        console.log("Target lang:", targetLang);
        
        if (!sourceText && !currentImageDataUrl) {
            alert('Please enter some text or upload an image to translate/analyze.');
            return;
        }
        
        // Check if API key is set
        if (!Settings.hasApiKey()) {
            console.log("Translate cancelled: API key not configured");
            document.getElementById('api-warning').classList.remove('hidden');
            return;
        }
        
        // Show loading state
        translateBtn.disabled = true;
        translateBtn.textContent = 'Translating...';
        targetOutputEl.value = 'Translating...';

        // NEW: Explanation loading state
        if (explanationContainer) explanationContainer.classList.add('hidden');
        if (explanationOutputEl) explanationOutputEl.value = '';

        // Get settings to check if streaming is enabled
        const settings = Settings.get();
        
        // This check should ideally not be hit if handleLanguageChange works correctly,
        // but it's a good safeguard. LANG_DETECT as source is fine with any target.
        if (sourceLang === targetLang && sourceLang !== LANG_DETECT) {
            alert('Source and target languages cannot be the same. Please select different languages.');
            translateBtn.disabled = false;
            translateBtn.textContent = 'Translate';
            targetOutputEl.value = ''; // Clear the "Translating..." message
            // Re-validate dropdowns to fix any inconsistent state if possible
            updateLanguageDropdownInteractivity();
            updateUIForLanguageSelection();
            return;
        }

        // Helper to parse XML
        function parseXmlString(xml) {
          // wrap in a dummy root so DOMParser ignores “extra content”
          const wrapped = `<root>${xml}</root>`;
          const doc = new DOMParser().parseFromString(wrapped, "application/xml");
          return {
            translation: doc.querySelector("translation")?.textContent.trim() || "",
            explanation: doc.querySelector("explanation")?.textContent.trim() || ""
          };
        }

        try {
            const textToLog = sourceText || (currentImageDataUrl ? "[Image Input]" : "[No Text Input]");

            let rawXml = "";
            if (settings.streamingEnabled !== false) {
                // Use streaming translation with callback to update UI
                targetOutputEl.classList.add('streaming');
                // Accumulate the stream into rawXml
                let lastPartial = "";
                console.log("Calling translateText..."); // ADD THIS
                rawXml = await translateText(sourceText, sourceLang, targetLang, currentImageDataUrl, function(partialTranslation) {
                    lastPartial = partialTranslation;
                    targetOutputEl.value = partialTranslation;
                });
                // Make sure we have the final translation
                targetOutputEl.value = rawXml;
                targetOutputEl.classList.remove('streaming');
            } else {
                // Use regular translation
                console.log("Calling translateText..."); // ADD THIS
                rawXml = await translateText(sourceText, sourceLang, targetLang, currentImageDataUrl);
                targetOutputEl.value = rawXml;
            }

            // Parse XML and update translation/explanation boxes
            const { translation, explanation } = parseXmlString(rawXml);

            // always show the translation:
            targetOutputEl.value = translation;

            // show or hide the explanation box based on setting:
            if (settings.includeExplanation) {
                if (explanationContainer) explanationContainer.classList.remove('hidden');
                if (explanationOutputEl) explanationOutputEl.value = explanation;
            } else {
                if (explanationContainer) explanationContainer.classList.add('hidden');
            }
            
            // Add to history
            TranslationHistory.add(textToLog, targetOutputEl.value, sourceLang, targetLang);
            updateHistoryDisplay();
            
        } catch (error) {
            console.error('Translation error:', error); // ENHANCE THIS
            targetOutputEl.value = 'Error: ' + error.message;
            targetOutputEl.classList.remove('streaming');
            if (explanationContainer) explanationContainer.classList.add('hidden');
            if (explanationOutputEl) explanationOutputEl.value = '';
        } finally {
            // Reset button state
            translateBtn.disabled = false;
            translateBtn.textContent = 'Translate';
            console.log("Translation process completed"); // ADD THIS
        }
    });
});
