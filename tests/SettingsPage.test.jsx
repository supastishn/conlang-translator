import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../src/pages/SettingsPage';

jest.mock('../src/context/SettingsContext', () => ({
  useSettings: jest.fn()
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    const { useSettings } = require('../src/context/SettingsContext');
    useSettings.mockReturnValue({
      settings: {
        providerType: 'gemini',
        model: 'gpt-4',
        streamingEnabled: true
      },
      saveSettings: jest.fn()
    });
  });

  test('saves settings', async () => {
    const { useSettings } = require('../src/context/SettingsContext');
    const { saveSettings } = useSettings();
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText('Include Explanation:'), {
      target: { checked: true }
    });
    fireEvent.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          includeExplanation: true
        })
      );
      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
    });
  });

  test('shows custom model field when selected', () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByLabelText('Select Model:'), {
      target: { value: 'custom' }
    });
    expect(screen.getByLabelText('Custom Model Name:')).toBeInTheDocument();
  });
});
