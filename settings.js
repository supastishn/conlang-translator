// Configuration storage
let apiConfig = {
    apiUrl: localStorage.getItem('apiUrl') || 'https://api.openai.com/v1',
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('model') || 'gpt-4-vision-preview'
};

// Debug saved config
console.log("Current model setting:", apiConfig.model);

// DOM elements
const apiUrlInput = document.getElementById('api-url');
const apiKeyInput = document.getElementById('api-key');
const modelInput = document.getElementById('model');
const saveSettingsBtn = document.getElementById('save-settings');
const settingsStatus = document.getElementById('settings-status');

// Initialize the form with stored values
apiUrlInput.value = apiConfig.apiUrl;
apiKeyInput.value = apiConfig.apiKey;

// Set the model input value
modelInput.value = apiConfig.model;

// Save settings
saveSettingsBtn.addEventListener('click', () => {
    apiConfig.apiUrl = apiUrlInput.value.trim();
    apiConfig.apiKey = apiKeyInput.value.trim();
    apiConfig.model = modelInput.value.trim();
    
    localStorage.setItem('apiUrl', apiConfig.apiUrl);
    localStorage.setItem('apiKey', apiConfig.apiKey);
    localStorage.setItem('model', apiConfig.model);
    
    // Show success message
    settingsStatus.textContent = 'Settings saved successfully!';
    settingsStatus.className = 'settings-status success';
    
    // Clear status message after 3 seconds
    setTimeout(() => {
        settingsStatus.className = 'settings-status';
    }, 3000);
});
// settings.js - Handles saving and loading OpenAI API settings

// Default settings
const DEFAULT_SETTINGS = {
    apiKey: '',
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4o',
    temperature: 0.7,
    systemPrompt: 'You are a translator for the constructed Draconic language. Translate English text to Draconic following the dictionary and grammar rules. Provide only the translated text without explanations.'
};

// Settings management
const Settings = {
    // Get current settings from localStorage or use defaults
    get: function() {
        const savedSettings = localStorage.getItem('draconicTranslatorSettings');
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
        return DEFAULT_SETTINGS;
    },
    
    // Save settings to localStorage
    save: function(settings) {
        localStorage.setItem('draconicTranslatorSettings', JSON.stringify(settings));
    },
    
    // Check if API key is configured
    hasApiKey: function() {
        return !!this.get().apiKey;
    },
    
    // Reset to default settings
    reset: function() {
        localStorage.setItem('draconicTranslatorSettings', JSON.stringify(DEFAULT_SETTINGS));
    }
};

// Initialize the settings page if on settings.html
document.addEventListener('DOMContentLoaded', function() {
    // Show API warning on translator page if API key not set
    const apiWarning = document.getElementById('api-warning');
    if (apiWarning) {
        apiWarning.classList.toggle('hidden', Settings.hasApiKey());
    }
    
    // Only run the following code on the settings page
    const settingsForm = document.getElementById('api-settings-form');
    if (!settingsForm) return;
    
    // Load current settings into the form
    const currentSettings = Settings.get();
    document.getElementById('api-key').value = currentSettings.apiKey;
    document.getElementById('base-url').value = currentSettings.baseUrl;
    document.getElementById('model').value = currentSettings.model;
    document.getElementById('temperature').value = currentSettings.temperature;
    document.getElementById('temperature-value').textContent = currentSettings.temperature;
    document.getElementById('system-prompt').value = currentSettings.systemPrompt;
    
    // Update temperature display when slider moves
    document.getElementById('temperature').addEventListener('input', function(e) {
        document.getElementById('temperature-value').textContent = e.target.value;
    });
    
    // Save settings when form is submitted
    settingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newSettings = {
            apiKey: document.getElementById('api-key').value.trim(),
            baseUrl: document.getElementById('base-url').value.trim() || DEFAULT_SETTINGS.baseUrl,
            model: document.getElementById('model').value,
            temperature: parseFloat(document.getElementById('temperature').value),
            systemPrompt: document.getElementById('system-prompt').value.trim()
        };
        
        Settings.save(newSettings);
        
        // Show success message
        const connectionStatus = document.getElementById('connection-status');
        connectionStatus.textContent = 'Settings saved successfully!';
        connectionStatus.className = 'success';
        
        setTimeout(() => {
            connectionStatus.classList.add('hidden');
        }, 3000);
    });
    
    // Test connection to OpenAI API
    document.getElementById('test-connection').addEventListener('click', async function() {
        const connectionStatus = document.getElementById('connection-status');
        connectionStatus.textContent = 'Testing connection...';
        connectionStatus.className = 'info';
        
        const apiKey = document.getElementById('api-key').value.trim();
        const baseUrl = document.getElementById('base-url').value.trim() || DEFAULT_SETTINGS.baseUrl;
        
        if (!apiKey) {
            connectionStatus.textContent = 'API key is required!';
            connectionStatus.className = 'error';
            return;
        }
        
        try {
            const endpoint = `${baseUrl}/v1/chat/completions`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: document.getElementById('model').value,
                    messages: [
                        { role: 'system', content: 'You are a test assistant.' },
                        { role: 'user', content: 'Respond with OK if you can read this.' }
                    ],
                    max_tokens: 10
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.choices && data.choices.length > 0) {
                connectionStatus.textContent = 'Connection successful!';
                connectionStatus.className = 'success';
            } else {
                connectionStatus.textContent = 'Error: ' + (data.error?.message || 'Unknown API error');
                connectionStatus.className = 'error';
            }
        } catch (error) {
            connectionStatus.textContent = 'Error: ' + error.message;
            connectionStatus.className = 'error';
        }
    });
    
    // Reset to defaults
    document.getElementById('reset-defaults').addEventListener('click', function() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            Settings.reset();
            location.reload();
        }
    });
});
