// translator.js - Handles translation functionality

// Translation history storage
const TranslationHistory = {
    get: function() {
        const history = localStorage.getItem('draconicTranslationHistory');
        return history ? JSON.parse(history) : [];
    },
    
    add: function(source, target, direction) {
        const history = this.get();
        history.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            source: source,
            target: target,
            direction: direction // 'e2d' for English to Draconic, 'd2e' for Draconic to English
        });
        
        // Keep only the last 10 translations
        if (history.length > 10) {
            history.pop();
        }
        
        localStorage.setItem('draconicTranslationHistory', JSON.stringify(history));
        return history;
    },
    
    clear: function() {
        localStorage.removeItem('draconicTranslationHistory');
    }
};

// OpenAI API integration
async function translateText(sourceText, direction = 'e2d', updateCallback = null) {
    const settings = Settings.get();
    
    if (!settings.apiKey) {
        throw new Error('API key not configured. Please set your OpenAI API key in Settings.');
    }
    
    const endpoint = `${settings.baseUrl}/v1`;
    
    // Load dictionary and grammar information to provide context
    const dictionaryPrompt = await loadDraconicDictionary();
    const grammarPrompt = await loadDraconicGrammar();
    
    // Check if streaming is enabled
    const useStreaming = settings.streamingEnabled !== false && updateCallback !== null;
    
    // Build the user prompt based on direction
    let userPrompt;
    if (direction === 'e2d') {
        userPrompt = `Translate the following English text to Draconic:\n\n"${sourceText}"`;
    } else {
        userPrompt = `Translate the following Draconic text to English:\n\n"${sourceText}"`;
    }
    
    // Common request parameters
    const requestBody = {
        model: settings.model,
        messages: [
            { 
                role: 'system', 
                content: `${settings.systemPrompt}\n\nDRACONIC DICTIONARY:\n${dictionaryPrompt}\n\nDRACONIC GRAMMAR:\n${grammarPrompt}`
            },
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
    
    if (history.length === 0) {
        historyContainer.innerHTML = '<p class="empty-history">No translation history yet</p>';
        return;
    }
    
    historyContainer.innerHTML = '';
    
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleString();
        
        historyItem.innerHTML = `
            <div class="history-header">
                <span class="history-date">${formattedDate}</span>
                <button class="history-use-btn" data-id="${item.id}">Use Again</button>
            </div>
            <div class="history-content">
                <p><strong>English:</strong> ${item.english}</p>
                <p><strong>Draconic:</strong> ${item.draconic}</p>
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
                // Set the direction toggle to match the history item
                const directionToggle = document.getElementById('direction-toggle');
                directionToggle.checked = historyItem.direction === 'd2e';
                
                // Trigger the change event to update labels
                directionToggle.dispatchEvent(new Event('change'));
                
                // Set the input/output values
                document.getElementById('source-input').value = historyItem.source;
                document.getElementById('target-output').value = historyItem.target;
            }
        });
    });
}

// Initialize the translator when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only run on the translator page
    const translateBtn = document.getElementById('translate-btn');
    if (!translateBtn) return;
    
    // Set up the direction toggle
    const directionToggle = document.getElementById('direction-toggle');
    const directionLabel = document.getElementById('direction-label');
    const sourceLanguage = document.getElementById('source-language');
    const targetLanguage = document.getElementById('target-language');
    const sourceInput = document.getElementById('source-input');
    const targetOutput = document.getElementById('target-output');
    
    // Function to update UI based on translation direction
    function updateTranslationDirection() {
        const isReversed = directionToggle.checked;
        
        if (isReversed) {
            // Draconic to English
            directionLabel.textContent = 'Draconic → English';
            sourceLanguage.textContent = 'Draconic';
            targetLanguage.textContent = 'English';
            sourceInput.placeholder = 'Enter Draconic text here...';
            targetOutput.placeholder = 'English translation will appear here...';
        } else {
            // English to Draconic
            directionLabel.textContent = 'English → Draconic';
            sourceLanguage.textContent = 'English';
            targetLanguage.textContent = 'Draconic';
            sourceInput.placeholder = 'Enter English text here...';
            targetOutput.placeholder = 'Draconic translation will appear here...';
        }
    }
    
    // Initialize direction
    updateTranslationDirection();
    
    // Handle direction toggle changes
    directionToggle.addEventListener('change', updateTranslationDirection);
    
    // Update history display on page load
    updateHistoryDisplay();
    
    // Set up the translate button click handler
    translateBtn.addEventListener('click', async function() {
        const sourceInput = document.getElementById('source-input').value.trim();
        const targetOutput = document.getElementById('target-output');
        const direction = document.getElementById('direction-toggle').checked ? 'd2e' : 'e2d';
        
        if (!sourceInput) {
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
        targetOutput.value = 'Translating...';
        
        // Get settings to check if streaming is enabled
        const settings = Settings.get();
        
        try {
            if (settings.streamingEnabled !== false) {
                // Use streaming translation with callback to update UI
                targetOutput.classList.add('streaming');
                const translation = await translateText(sourceInput, direction, function(partialTranslation) {
                    targetOutput.value = partialTranslation;
                });
                
                // Make sure we have the final translation
                targetOutput.value = translation;
                targetOutput.classList.remove('streaming');
            } else {
                // Use regular translation
                const translation = await translateText(sourceInput, direction);
                targetOutput.value = translation;
            }
            
            // Add to history with direction info
            TranslationHistory.add(sourceInput, targetOutput.value, direction);
            updateHistoryDisplay();
            
        } catch (error) {
            draconicOutput.value = 'Error: ' + error.message;
            draconicOutput.classList.remove('streaming');
            console.error('Translation error:', error);
        } finally {
            // Reset button state
            translateBtn.disabled = false;
            translateBtn.textContent = 'Translate →';
        }
    });
});
