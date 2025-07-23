import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TranslatorPage from '../src/pages/TranslatorPage';

jest.mock('../src/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../src/context/SettingsContext', () => ({
  useSettings: jest.fn()
}));

jest.mock('../src/services/translator', () => ({
  translateText: jest.fn()
}));

describe('TranslatorPage', () => {
  beforeEach(() => {
    const { useAuth } = require('../src/context/AuthContext');
    const { useSettings } = require('../src/context/SettingsContext');
    useAuth.mockReturnValue({ user: null });
    useSettings.mockReturnValue({
      settings: { providerType: 'gemini', streamingEnabled: true }
    });
  });

  test('renders basic elements', () => {
    render(<TranslatorPage />);
    expect(screen.getByText('Source Language:')).toBeInTheDocument();
    expect(screen.getByText('Target Language:')).toBeInTheDocument();
    expect(screen.getByText('Translate')).toBeInTheDocument();
  });

  test('shows warning when API key is missing', () => {
    const { useSettings } = require('../src/context/SettingsContext');
    useSettings.mockReturnValue({
      settings: { providerType: 'openai' }
    });
    render(<TranslatorPage />);
    expect(screen.getByText(/OpenAI API key not set/)).toBeInTheDocument();
  });

  test('handles translation', async () => {
    const { translateText } = require('../src/services/translator');
    translateText.mockResolvedValue('<translation>Test output</translation>');

    render(<TranslatorPage />);
    fireEvent.change(screen.getByLabelText(/Source Language/), {
      target: { value: 'english' }
    });
    fireEvent.change(screen.getByPlaceholderText('Enter text here, or describe what to do with the image...'), {
      target: { value: 'Hello' }
    });
    fireEvent.click(screen.getByText('Translate'));

    await waitFor(() => {
      expect(translateText).toHaveBeenCalled();
      expect(screen.getByDisplayValue('Test output')).toBeInTheDocument();
    });
  });
});
