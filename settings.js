// Configuration storage
let apiConfig = {
    apiUrl: localStorage.getItem('apiUrl') || 'https://api.openai.com/v1',
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('model') || 'gpt-4-vision-preview'
};

// DOM elements
const apiUrlInput = document.getElementById('api-url');
const apiKeyInput = document.getElementById('api-key');
const modelInput = document.getElementById('model');
const saveSettingsBtn = document.getElementById('save-settings');
const settingsStatus = document.getElementById('settings-status');

// Initialize the form with stored values
apiUrlInput.value = apiConfig.apiUrl;
apiKeyInput.value = apiConfig.apiKey;

// Set the selected model in the dropdown
const modelOptions = Array.from(modelInput.options);
const matchingOption = modelOptions.find(option => option.value === apiConfig.model);
if (matchingOption) {
    matchingOption.selected = true;
} else {
    // If the stored model isn't in our predefined list, add it
    const customOption = document.createElement('option');
    customOption.value = apiConfig.model;
    customOption.textContent = `${apiConfig.model} (custom)`;
    modelInput.appendChild(customOption);
    customOption.selected = true;
}

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
