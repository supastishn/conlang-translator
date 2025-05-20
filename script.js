// Configuration storage
let apiConfig = {
    apiUrl: localStorage.getItem('apiUrl') || 'https://api.openai.com/v1',
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('model') || 'gpt-4'
};

// DOM elements
const apiUrlInput = document.getElementById('api-url');
const apiKeyInput = document.getElementById('api-key');
const modelInput = document.getElementById('model');
const saveSettingsBtn = document.getElementById('save-settings');
const englishTextArea = document.getElementById('english-text');
const translateBtn = document.getElementById('translate-btn');
const draconicOutput = document.getElementById('draconic-output');
const loadingIndicator = document.getElementById('loading');

// Initialize the form with stored values
apiUrlInput.value = apiConfig.apiUrl;
apiKeyInput.value = apiConfig.apiKey;
modelInput.value = apiConfig.model;

// Save settings
saveSettingsBtn.addEventListener('click', () => {
    apiConfig.apiUrl = apiUrlInput.value.trim();
    apiConfig.apiKey = apiKeyInput.value.trim();
    apiConfig.model = modelInput.value.trim();
    
    localStorage.setItem('apiUrl', apiConfig.apiUrl);
    localStorage.setItem('apiKey', apiConfig.apiKey);
    localStorage.setItem('model', apiConfig.model);
    
    alert('Settings saved successfully!');
});

// Read dictionary and grammar file content
async function getDraconicResources() {
    try {
        // We'll use fetch to get the file contents
        const [dictionaryResponse, grammarResponse] = await Promise.all([
            fetch('materials/dictionary.pdf'),
            fetch('materials/grammar.txt')
        ]);
        
        // We can't directly read PDF content with fetch, so we'll just get the binary data
        const dictionaryBlob = await dictionaryResponse.blob();
        const grammarText = await grammarResponse.text();
        
        // For the PDF, we'll use a FileReader to convert to base64
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = function() {
                // Get base64 string (remove the data URL prefix)
                const base64PDF = reader.result.split(',')[1];
                
                resolve({
                    dictionary: base64PDF,  // Base64 encoded PDF
                    grammar: grammarText
                });
            };
            reader.readAsDataURL(dictionaryBlob);
        });
    } catch (error) {
        console.error('Error loading Draconic resources:', error);
        return {
            dictionary: "Error loading dictionary",
            grammar: "Error loading grammar"
        };
    }
}

// Function to translate text
async function translateToDraconic(englishText) {
    try {
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        
        // Get the Draconic resources
        const resources = await getDraconicResources();
        
        // Create system message with instructions and language resources
        const systemMessage = `You are a translator specializing in the Draconic language. 
        Translate the English text into accurate Draconic using the following language materials.
        
        GRAMMAR RULES:
        ${resources.grammar}
        
        DICTIONARY:
        The dictionary is provided in PDF form, but here are key words and phrases to use for this translation.
        Please use proper Draconic grammar and syntax as documented above.`;
        
        // Create the API request
        const response = await fetch(`${apiConfig.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: `Translate the following English text to Draconic: "${englishText}"`
                    }
                ],
                temperature: 0.7
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
    
    if (!apiConfig.apiKey) {
        alert('Please enter an API key in the settings.');
        return;
    }
    
    draconicOutput.textContent = 'Translating...';
    const translation = await translateToDraconic(englishText);
    draconicOutput.textContent = translation;
});
