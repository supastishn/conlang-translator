import { createContext, useContext, useState, useEffect } from 'react';

export const DEFAULT_SETTINGS = {
  providerType: 'gemini',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  temperature: 0.0,
  systemPrompt: 'You are an expert multilingual translator. Translate the text as requested, using the provided linguistic resources. Follow all output formatting instructions precisely.',
  streamingEnabled: true,
  draconicOutputType: 'normal',
  dwlToEnglishType: 'natural',
  includeExplanation: false,
  geminiOption: false,
  debugMode: false
};

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    const savedSettings = localStorage.getItem('draconicTranslatorSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = (newSettings) => {
    const settingsToSave = { ...settings, ...newSettings };
    localStorage.setItem('draconicTranslatorSettings', JSON.stringify(settingsToSave));
    setSettings(settingsToSave);
  };

  return (
    <SettingsContext.Provider value={{ settings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
