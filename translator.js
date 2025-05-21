// translator.js - Handles translation functionality

// Language constants
const LANG_ENGLISH = 'english';
const LANG_DRACONIC = 'draconic';
const LANG_DWL = 'dwl'; // Diacritical Waluigi Language
const LANG_OBWA_KIMO = 'obwakimo'; // Obwa Kimo
const LANG_DETECT = 'detect'; // Detect language option

const LANG_LABELS = {
    [LANG_ENGLISH]: 'English',
    [LANG_DRACONIC]: 'Draconic',
    [LANG_DWL]: 'Diacritical Waluigi Language',
    [LANG_OBWA_KIMO]: 'Obwa Kimo',
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


// OpenAI API integration
async function translateText(sourceText, sourceLang, targetLang, updateCallback = null) {
    const settings = Settings.get();
    
    if (!settings.apiKey) {
        throw new Error('API key not configured. Please set your API key in Settings.');
    }
    
    let endpoint = settings.baseUrl; 
    if (endpoint.endsWith('/')) {
        endpoint = endpoint.slice(0, -1);
    }
    
    const useStreaming = settings.streamingEnabled !== false && updateCallback !== null;

    // Prepare system prompt content
    let systemPromptCore = settings.systemPrompt;
    let resourcesForPrompt = "";

    // Determine which resources are needed
    const needsDraconic = (sourceLang === LANG_DRACONIC || targetLang === LANG_DRACONIC || sourceLang === LANG_DETECT);
    const needsDWL = (sourceLang === LANG_DWL || targetLang === LANG_DWL || sourceLang === LANG_DETECT);
    const needsObwaKimo = (sourceLang === LANG_OBWA_KIMO || targetLang === LANG_OBWA_KIMO || sourceLang === LANG_DETECT);

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
    
    let finalSystemPrompt = systemPromptCore + resourcesForPrompt;

    // Build the user prompt
    let userPrompt;
    const dwlToEnglishInstruction = settings.dwlToEnglishType === 'raw'
        ? "Translate into raw English, preserving original phrasing and diacritic implications even if unnatural."
        : "Translate into natural, grammatically correct English, interpreting diacritics for fluent output.";

    if (sourceLang === LANG_DETECT) {
        userPrompt = `First, identify if the input text is English, Draconic, Diacritical Waluigi Language, or Obwa Kimo. Then, translate the identified text into ${LANG_LABELS[targetLang]}.`;
        if (targetLang === LANG_ENGLISH) { // This specific instruction is for DWL -> English
            userPrompt += ` If the identified source is Diacritical Waluigi Language, ${dwlToEnglishInstruction}`;
        }
        // Add similar specific instructions for Obwa Kimo if needed in the future, e.g., Obwa Kimo -> English raw/natural.
        userPrompt += ` Input text:\n\n"${sourceText}"`;
    } else {
        userPrompt = `Translate the following ${LANG_LABELS[sourceLang]} text to ${LANG_LABELS[targetLang]}:\n\n"${sourceText}"`;
    }

    if (targetLang === LANG_DRACONIC && settings.draconicOutputType === 'simplified') {
        userPrompt += " (When generating Draconic, output simplified romanization)";
    } else if (sourceLang === LANG_DWL && targetLang === LANG_ENGLISH) {
        userPrompt += ` (${dwlToEnglishInstruction})`;
    }
    
    const requestBody = {
        model: settings.model,
        messages: [
            { role: 'system', content: finalSystemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: settings.temperature
    };
    
    // Add streaming if enabled
    if (useStreaming) {
        requestBody.stream = true;
    }
    
    // Make the request
    const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Translation request failed');
    }
    
    // Handle streaming response
    if (useStreaming) {
        let fullText = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Decode the chunk
                const chunk = decoder.decode(value);
                
                // Process the SSE format
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                                const content = data.choices[0].delta.content;
                                fullText += content;
                                updateCallback(fullText);
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e, line);
                        }
                    }
                }
            }
            
            return fullText;
        } catch (error) {
            console.error('Error reading stream:', error);
            throw new Error('Streaming error: ' + error.message);
        }
    } else {
        // Handle regular (non-streaming) response
        const data = await response.json();
        return data.choices[0].message.content.trim();
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

// Initialize the translator when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only run on the translator page
    const translateBtn = document.getElementById('translate-btn');
    if (!translateBtn) return;

    const sourceLangSelect = document.getElementById('source-lang-select');
    const targetLangSelect = document.getElementById('target-lang-select');
    const sourceLanguageLabelEl = document.getElementById('source-language-label');
    const targetLanguageLabelEl = document.getElementById('target-language-label');
    const sourceInputEl = document.getElementById('source-input');
    const targetOutputEl = document.getElementById('target-output');
    const dwlInputWarningEl = document.getElementById('dwl-input-warning');
    
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
            sourceInputEl.placeholder = `Enter text in English, Draconic, DWL, or Obwa Kimo...`;
        } else {
            sourceInputEl.placeholder = `Enter ${LANG_LABELS[sourceLang]} text here...`;
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
    
    // Set up the translate button click handler
    translateBtn.addEventListener('click', async function() {
        const sourceText = sourceInputEl.value.trim();
        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;
        
        if (!sourceText) {
            alert('Please enter some text to translate');
            return;
        }
        
        // Check if API key is set
        if (!Settings.hasApiKey()) {
            document.getElementById('api-warning').classList.remove('hidden');
            return;
        }
        
        // Show loading state
        translateBtn.disabled = true;
        translateBtn.textContent = 'Translating...';
        targetOutputEl.value = 'Translating...';
        
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

        try {
            if (settings.streamingEnabled !== false) {
                // Use streaming translation with callback to update UI
                targetOutputEl.classList.add('streaming');
                const translation = await translateText(sourceText, sourceLang, targetLang, function(partialTranslation) {
                    targetOutputEl.value = partialTranslation;
                });
                
                // Make sure we have the final translation
                targetOutputEl.value = translation;
                targetOutputEl.classList.remove('streaming');
            } else {
                // Use regular translation
                const translation = await translateText(sourceText, sourceLang, targetLang);
                targetOutputEl.value = translation;
            }
            
            // Add to history
            TranslationHistory.add(sourceText, targetOutputEl.value, sourceLang, targetLang);
            updateHistoryDisplay();
            
        } catch (error) {
            targetOutputEl.value = 'Error: ' + error.message;
            targetOutputEl.classList.remove('streaming');
            console.error('Translation error:', error);
        } finally {
            // Reset button state
            translateBtn.disabled = false;
            translateBtn.textContent = 'Translate';
        }
    });
});
