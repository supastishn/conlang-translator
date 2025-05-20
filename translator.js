// Configuration storage
let apiConfig = {
    apiUrl: localStorage.getItem('apiUrl') || 'https://api.openai.com/v1',
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('model') || 'gpt-4'
};

// DOM elements
const englishTextArea = document.getElementById('english-text');
const translateBtn = document.getElementById('translate-btn');
const draconicOutput = document.getElementById('draconic-output');
const loadingIndicator = document.getElementById('loading');
const apiStatus = document.getElementById('api-status');

// Check API configuration status
function checkApiStatus() {
    if (!apiConfig.apiKey) {
        apiStatus.textContent = 'API key not configured. Please set up your API key in Settings.';
        apiStatus.className = 'api-status';
        translateBtn.disabled = true;
    } else {
        apiStatus.textContent = 'API configured. Ready to translate.';
        apiStatus.className = 'api-status configured';
        translateBtn.disabled = false;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    checkApiStatus();
    
    // Set a default text for testing
    if (!englishTextArea.value) {
        englishTextArea.value = "Hello brave dragon, how are you today?";
    }
    
    // Image preview logic and toggle button listener removed
});

// Read dictionary and grammar file content
async function getDraconicResources() {
    try {
        // Load grammar text
        const grammarResponse = await fetch('materials/grammar.txt');
        const grammarText = await grammarResponse.text();
        
        // Load dictionary CSV
        const dictionaryCsvResponse = await fetch('materials/dictionary.csv');
        const dictionaryCsvText = await dictionaryCsvResponse.text();
        
        return {
            dictionaryCsv: dictionaryCsvText,
            grammar: grammarText
        };
    } catch (error) {
        console.error('Error loading Draconic resources:', error);
        return {
            dictionaryCsv: "Error loading dictionary CSV.",
            grammar: "Error loading grammar."
        };
    }
}

// PDF-related function getPageAsImage removed as it's no longer needed.

// Function to translate text
async function translateToDraconic(englishText) {
    try {
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        
        // Get the Draconic resources
        const resources = await getDraconicResources();
        
        // Build messages array with text and images
        const messages = [];
        
        // System message
        messages.push({
            role: "system",
            content: `You are a translator specializing in the Draconic language. 
            Translate the English text into accurate Draconic using the following materials.
            
            GRAMMAR RULES:
            ${resources.grammar}
            
            DICTIONARY (CSV format):
            Below is the content of the dictionary in CSV format. Use this for word lookups, definitions, and grammatical forms.
            --- BEGIN DICTIONARY CSV ---
            ${resources.dictionaryCsv}
            --- END DICTIONARY CSV ---
            `
        });
        
        // The dictionary (CSV text) is now part of the system message.
        // Vision model checks and separate user messages for dictionary images are no longer needed.
        // Image preview logic (displayImagePreviews call) is removed.
        
        // Add the actual translation request
        messages.push({
            role: "user",
            content: `Translate the following English text to Draconic: "${englishText}"`
        });
        
        // Create the API request
        const response = await fetch(`${apiConfig.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('Translation error:', error);
        return `Error: ${error.message}`;
    } finally {
        // Hide loading indicator
        loadingIndicator.classList.add('hidden');
    }
}

// Translation event listener
translateBtn.addEventListener('click', async () => {
    const englishText = englishTextArea.value.trim();
    
    if (!englishText) {
        alert('Please enter some English text to translate.');
        return;
    }
    
    draconicOutput.textContent = 'Translating...';
    const translation = await translateToDraconic(englishText);
    draconicOutput.textContent = translation;
});

// Listen for API config changes
window.addEventListener('storage', function(e) {
    if (e.key === 'apiKey' || e.key === 'apiUrl' || e.key === 'model') {
        apiConfig = {
            apiUrl: localStorage.getItem('apiUrl') || 'https://api.openai.com/v1',
            apiKey: localStorage.getItem('apiKey') || '',
            model: localStorage.getItem('model') || 'gpt-4'
        };
        checkApiStatus();
    }
});
