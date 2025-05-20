// settings.js - Handles saving and loading OpenAI API settings

// Default settings
const DEFAULT_SETTINGS = {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1', // Now includes /v1
    model: 'gpt-4o',
    temperature: 0.7,
    systemPrompt: 'You are a translator for the constructed Draconic language. Translate between English and Draconic following the dictionary and grammar rules. Provide only the translated text without explanations.',
    streamingEnabled: true
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
    // Debug current settings
    console.log("Current settings:", Settings.get());
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
    document.getElementById('streaming-enabled').checked = currentSettings.streamingEnabled !== false; // Default to true if not set
    
    // Handle the model selection, including custom model option
    const modelSelect = document.getElementById('model');
    const customModelContainer = document.getElementById('custom-model-container');
    const customModelInput = document.getElementById('custom-model');
    
    // Show/hide custom model input based on selection
    function toggleCustomModelInput() {
        if (modelSelect.value === 'custom') {
            customModelContainer.style.display = 'block';
            customModelContainer.classList.add('active');
            customModelInput.focus();
        } else {
            customModelContainer.style.display = 'none';
            customModelContainer.classList.remove('active');
        }
    }
    
    // Set the right model value and handle custom model
    if (currentSettings.model && !['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'].includes(currentSettings.model)) {
        modelSelect.value = 'custom';
        customModelInput.value = currentSettings.model;
    } else {
        modelSelect.value = currentSettings.model;
    }
    
    // Always show custom model field if custom is selected
    toggleCustomModelInput();
    
    // Add event listener for model select changes
    modelSelect.addEventListener('change', toggleCustomModelInput);
    
    // Add placeholder text that changes based on previous custom models
    if (customModelInput.value) {
        customModelInput.placeholder = `Enter model name (e.g., ${customModelInput.value})`;
    }
    
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
        
        // Get the model value (handle custom model case)
        let modelValue = document.getElementById('model').value;
        if (modelValue === 'custom') {
            const customModelValue = document.getElementById('custom-model').value.trim();
            if (customModelValue) {
                modelValue = customModelValue;
            } else {
                // If custom is selected but no value provided, show error
                const connectionStatus = document.getElementById('connection-status');
                connectionStatus.textContent = 'Please enter a custom model name! This is required when using the custom model option.';
                connectionStatus.className = 'error';
                document.getElementById('custom-model').focus();
                return;
            }
        }
        
        const newSettings = {
            apiKey: document.getElementById('api-key').value.trim(),
            baseUrl: document.getElementById('base-url').value.trim() || DEFAULT_SETTINGS.baseUrl,
            model: modelValue,
            temperature: parseFloat(document.getElementById('temperature').value),
            systemPrompt: document.getElementById('system-prompt').value.trim(),
            streamingEnabled: document.getElementById('streaming-enabled').checked
        };
        
        Settings.save(newSettings);
        
        // Debug saved settings
        console.log("Settings saved:", newSettings);
        
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
            // Get the model value (handle custom model case)
            let modelValue = document.getElementById('model').value;
            if (modelValue === 'custom') {
                const customModelValue = document.getElementById('custom-model').value.trim();
                if (customModelValue) {
                    modelValue = customModelValue;
                } else {
                    connectionStatus.textContent = 'Please enter a custom model name! This is required when using a custom model.';
                    connectionStatus.className = 'error';
                    document.getElementById('custom-model').focus();
                    return;
                }
            }
            
            // baseUrl should now directly point to the base of API operations (e.g., https://api.openai.com/v1)
            const endpoint = baseUrl; 
            const response = await fetch(`${endpoint}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelValue,
                    messages: [
                        { role: 'system', content: 'You are a test assistant.' },
                        { role: 'user', content: 'Respond with OK if you can read this.' }
                    ]
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
