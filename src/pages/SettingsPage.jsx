import { useState, useEffect } from 'react';
import { useSettings, DEFAULT_SETTINGS } from '../context/SettingsContext';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
  const { settings, saveSettings } = useSettings();
  const [formState, setFormState] = useState(settings);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [customModelName, setCustomModelName] = useState('');
  const [providerType, setProviderType] = useState(settings.providerType || 'gemini');

  useEffect(() => {
    setFormState(settings);
    const isCustom = settings.model && !['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'].includes(settings.model);
    if (isCustom) {
      setCustomModelName(settings.model);
    }
  }, [settings]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormState(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : (id === 'temperature' ? parseFloat(value) : value)
    }));
  };
  
  const handleSave = (e) => {
    e.preventDefault();
    let modelToSave = formState.model;
    if (formState.model === 'custom') {
      if (!customModelName.trim()) {
        setStatus({ message: 'Please enter a custom model name!', type: 'error' });
        return;
      }
      modelToSave = customModelName.trim();
    }
    
    let baseUrlValue = formState.baseUrl.trim() || DEFAULT_SETTINGS.baseUrl;
    if (baseUrlValue.endsWith('/')) {
        baseUrlValue = baseUrlValue.slice(0, -1);
    }

    saveSettings({ ...formState, providerType, model: modelToSave, baseUrl: baseUrlValue });
    setStatus({ message: 'Settings saved successfully!', type: 'success' });
    setTimeout(() => setStatus({ message: '', type: '' }), 3000);
  };
  
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      saveSettings(DEFAULT_SETTINGS);
    }
  };

  const handleTestConnection = async () => {
    setStatus({ message: 'Testing connection...', type: 'info' });
    
    const apiKey = formState.apiKey.trim();
    let baseUrl = formState.baseUrl.trim() || DEFAULT_SETTINGS.baseUrl;
    
    if (!apiKey) {
      setStatus({ message: 'API key is required!', type: 'error' });
      return;
    }
    
    let modelValue = formState.model;
    if (modelValue === 'custom') {
        modelValue = customModelName.trim();
        if (!modelValue) {
            setStatus({ message: 'Please enter a custom model name!', type: 'error' });
            return;
        }
    }

    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: modelValue,
          messages: [{ role: 'system', content: 'You are a test assistant.' }, { role: 'user', content: 'Respond with OK if you can read this.' }]
        })
      });
      const data = await response.json();
      if (response.ok && data.choices && data.choices.length > 0) {
        setStatus({ message: 'Connection successful!', type: 'success' });
      } else {
        setStatus({ message: 'Error: ' + (data.error?.message || 'Unknown API error'), type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Error: ' + error.message, type: 'error' });
    }
  };

  const isCustomModel = formState.model === 'custom';

  return (
    <div className="settings-container">
        <h2>OpenAI API Configuration</h2>
        <form id="api-settings-form" onSubmit={handleSave}>
            <div className="form-group">
              <label>Translation Method:</label>
              <div className="toggle-buttons">
                <button
                  type="button"
                  className={`method-button ${providerType === 'gemini' ? 'active' : ''}`}
                  onClick={() => setProviderType('gemini')}
                >
                  Gemini Function
                  <div className="button-description">(no API key needed)</div>
                </button>
                <button
                  type="button"
                  className={`method-button ${providerType === 'openai' ? 'active' : ''}`}
                  onClick={() => setProviderType('openai')}
                >
                  Client API Key
                </button>
              </div>
            </div>
            {providerType === 'openai' && (
              <>
                <div className="form-group">
                  <label htmlFor="apiKey">API Key:</label>
                  <input type="password" id="apiKey" placeholder="Enter your API key" value={formState.apiKey} onChange={handleChange} />
                  <div style={{marginTop: '4px'}}>
                    <small>Your API key is stored only on your device</small>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="baseUrl">Base URL:</label>
                  <input type="text" id="baseUrl" placeholder="https://api.openai.com/v1" value={formState.baseUrl} onChange={handleChange} />
                  <small>
                      Default (OpenAI, paid): <code>https://api.openai.com/v1</code>.<br />
                      For OpenRouter (free, ~50 RPD): <code>https://openrouter.ai/api/v1</code>. See the <Link to="/guide/openrouter">OpenRouter guide</Link>.<br />
                      For Google AI Studio Gemini (free, ~500 RPD): <code>https://generativelanguage.googleapis.com/v1beta/openai/</code>. See the <Link to="/guide/google-aistudio-gemini">Google AI Studio guide</Link>.
                  </small>
                </div>
                <div className="form-group">
                  <label htmlFor="model">Select Model:</label>
                  <select id="model" value={formState.model} onChange={handleChange}>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="custom">Use Custom Model Name ↓</option>
                  </select>
                </div>
                <div className="form-group" id="custom-model-container" style={{display: (isCustomModel ? 'block' : 'none')}}>
                  <label htmlFor="custom-model">Custom Model Name:</label>
                  <input type="text" id="custom-model" placeholder="Enter exact model name (e.g., gpt-4-1106-preview)" value={customModelName} onChange={e => setCustomModelName(e.target.value)} />
                  <small>Enter the exact model identifier as provided by your API provider.</small>
                </div>
              </>
            )}
            {providerType === 'gemini' && (
              <div className="form-group">
                <div className="info">
                  Using Gemini Function - no API key needed. Translations are processed server-side.
                </div>
              </div>
            )}
            
            <div className="form-actions">
                <button type="submit" id="save-settings">Save Settings</button>
                {providerType === 'openai' && (
                  <button type="button" id="test-connection" onClick={handleTestConnection}>Test Connection</button>
                )}
            </div>
        </form>
        
        {status.message && <div id="connection-status" className={status.type} style={{display: 'flex'}}>{status.message}</div>}
        
        <div className="advanced-settings">
            <h3>Advanced Settings</h3>
            <div className="form-group">
                <label htmlFor="streamingEnabled">Streaming Translation:</label>
                <div className="toggle-container">
                    <label className="switch">
                        <input type="checkbox" id="streamingEnabled" checked={formState.streamingEnabled} onChange={handleChange} />
                        <span className="slider round"></span>
                    </label>
                    <span className="toggle-label">Enable streaming (see translation appear in real-time)</span>
                </div>
                <small>When enabled, translations appear as they are generated. Disable for slower devices.</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="includeExplanation">Include Explanation:</label>
              <div className="toggle-container">
                <label className="switch">
                  <input type="checkbox" id="includeExplanation" checked={formState.includeExplanation} onChange={handleChange} />
                  <span className="slider round"></span>
                </label>
                <span className="toggle-label">Enable explanation (XML &lt;explanation&gt; tag)</span>
              </div>
              <small>When enabled, the LLM will provide an explanation under the translation.</small>
            </div>
            <div className="form-group">
                <label htmlFor="temperature">Temperature: <span id="temperature-value">{formState.temperature.toFixed(1)}</span></label>
                <input type="range" id="temperature" min="0" max="2" step="0.1" value={formState.temperature} onChange={handleChange} />
                <small>Higher values make output more random, lower values more deterministic.</small>
            </div>
            
            <div className="form-group">
                <label htmlFor="systemPrompt">System Prompt:</label>
                <textarea id="systemPrompt" rows="6" value={formState.systemPrompt} onChange={handleChange}></textarea>
            </div>


            <div className="form-group">
                <label htmlFor="draconicOutputType">Default Draconic Output Type (for English → Draconic):</label>
                <select id="draconicOutputType" value={formState.draconicOutputType} onChange={handleChange}>
                    <option value="normal">Normal Draconic Output</option>
                    <option value="simplified">Simplified Romanization</option>
                </select>
                <small>Controls the default output format when translating from English to Draconic. "Simplified Romanization" will append "(output simplified romanization)" to the system prompt for potentially simpler phonetic output.</small>
            </div>
            <div className="form-group">
              <label htmlFor="debugMode">Developer Debug Mode:</label>
              <div className="toggle-container">
                <label className="switch">
                  <input
                    type="checkbox"
                    id="debugMode"
                    checked={formState.debugMode}
                    onChange={handleChange}
                  />
                  <span className="slider round"></span>
                </label>
                <span className="toggle-label">Enable Eruda debug console (requires refresh)</span>
              </div>
              <small>Shows developer tools for debugging. Page refresh needed after toggling.</small>
            </div>

            <div className="form-group">
                <label htmlFor="dwlToEnglishType">Default DWL to English Translation Type:</label>
                <select id="dwlToEnglishType" value={formState.dwlToEnglishType} onChange={handleChange}>
                    <option value="natural">Natural English (Fluent, Corrected)</option>
                    <option value="raw">Raw English (Literal, Potentially Unnatural)</option>
                </select>
                <small>Controls how Diacritical Waluigi Language is translated to English. "Natural" aims for fluency, "Raw" for literalness.</small>
            </div>
            
            <div className="form-actions">
                <button type="button" id="reset-defaults" onClick={handleReset}>Reset to Defaults</button>
            </div>
        </div>
    </div>
  );
}
