// translator.js - Handles translation functionality

// Translation history storage
const TranslationHistory = {
    get: function() {
        const history = localStorage.getItem('draconicTranslationHistory');
        return history ? JSON.parse(history) : [];
    },
    
    add: function(english, draconic) {
        const history = this.get();
        history.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            english: english,
            draconic: draconic
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
async function translateToDraconic(englishText, updateCallback = null) {
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
    
    // Common request parameters
    const requestBody = {
        model: settings.model,
        messages: [
            { 
                role: 'system', 
                content: `${settings.systemPrompt}\n\nDRACONIC DICTIONARY:\n${dictionaryPrompt}\n\nDRACONIC GRAMMAR:\n${grammarPrompt}`
            },
            { role: 'user', content: `Translate the following English text to Draconic:\n\n"${englishText}"` }
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

// Load dictionary from CSV
async function loadDraconicDictionary() {
    try {
        const response = await fetch('materials/dictionary.csv');
        const csvText = await response.text();
        
        // Return the full dictionary
        return csvText;
    } catch (error) {
        console.error('Error loading dictionary:', error);
        return '[Dictionary could not be loaded]';
    }
}

// Load grammar rules
async function loadDraconicGrammar() {
    try {
        const response = await fetch('materials/grammar.txt');
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
                document.getElementById('english-input').value = historyItem.english;
                document.getElementById('draconic-output').value = historyItem.draconic;
            }
        });
    });
}

// Initialize the translator when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only run on the translator page
    const translateBtn = document.getElementById('translate-btn');
    if (!translateBtn) return;
    
    // Update history display on page load
    updateHistoryDisplay();
    
    // Set up the translate button click handler
    translateBtn.addEventListener('click', async function() {
        const englishInput = document.getElementById('english-input').value.trim();
        const draconicOutput = document.getElementById('draconic-output');
        
        if (!englishInput) {
            alert('Please enter some English text to translate');
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
        draconicOutput.value = 'Translating...';
        
        // Get settings to check if streaming is enabled
        const settings = Settings.get();
        
        try {
            if (settings.streamingEnabled !== false) {
                // Use streaming translation with callback to update UI
                draconicOutput.classList.add('streaming');
                const translation = await translateToDraconic(englishInput, function(partialTranslation) {
                    draconicOutput.value = partialTranslation;
                });
                
                // Make sure we have the final translation
                draconicOutput.value = translation;
                draconicOutput.classList.remove('streaming');
            } else {
                // Use regular translation
                const translation = await translateToDraconic(englishInput);
                draconicOutput.value = translation;
            }
            
            // Add to history
            TranslationHistory.add(englishInput, draconicOutput.value);
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
