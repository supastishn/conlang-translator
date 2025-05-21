# THE DEVELOPER OF THIS PROGRAM IS AGAINST THE GENOCIDE IN GAZA.
[Learn More](https://www.amnesty.org/en/wp-content/uploads/2024/12/MDE1586682024ENGLISH.pdf)

# Conlang Translator

A versatile web-based translation tool designed for constructed languages (conlangs) and natural languages, powered by Large Language Models (LLMs). This translator supports text and image input, camera capture, and offers a high degree of customization.

**Live Demo:** [https://supastishn.github.io/conlang-translator/](https://supastishn.github.io/conlang-translator/)

## Features

*   **Multi-Language Support:** Translate between English, Draconic, Diacritical Waluigi Language (DWL), and Obwa Kimo.
*   **Language Detection:** Automatically detect the source language from the input text.
*   **Text Translation:** Standard text-to-text translation.
*   **Image Input:** Upload images for analysis or to translate text within them (requires a multimodal LLM).
*   **Camera Capture:** Use your device's camera to capture images for translation.
*   **Customizable API:**
    *   Supports OpenAI API compatible endpoints.
    *   Guides provided for OpenRouter (free tier models available) and Google AI Studio (Gemini models with free tier).
    *   Configure API key, base URL, and model selection.
*   **Advanced Settings:**
    *   Adjust LLM temperature.
    *   Customize the system prompt.
    *   Enable/disable real-time streaming of translations.
    *   Specific output options for Draconic (Normal vs. Simplified Romanization).
    *   Specific translation style for DWL to English (Natural vs. Raw).
*   **Translation History:** Stores your last 10 translations locally for quick reference and reuse.
*   **Responsive Design:** Usable on desktop and mobile devices.
*   **Developer Friendly:** Includes Eruda console for debugging on localhost.

## Supported Languages

*   English
*   Draconic (custom conlang, resources in `materials/`)
*   Diacritical Waluigi Language (DWL) (custom conlang, resources in `materials/`)
*   Obwa Kimo (custom conlang, resources in `materials/conlangs/`)
*   Detect Language (attempts to identify from the above)

## Setup

1.  **Clone the Repository (Optional):**
    If you want to run it locally or modify it:
    ```bash
    git clone https://github.com/supastishn/conlang-translator.git
    cd conlang-translator
    ```
    Then open `index.html` in your browser.

2.  **Configure API Access:**
    *   Navigate to the **Settings** page in the translator.
    *   **API Key:** Enter your API key.
        *   For **OpenRouter**: Follow the [OpenRouter Guide](openrouter-guide.html) (linked in the app).
        *   For **Google AI Studio (Gemini)**: Follow the [Google AI Studio Guide](google-aistudio-gemini-guide.html) (linked in the app).
        *   For **OpenAI**: Use your OpenAI API key.
    *   **Base URL:**
        *   OpenAI (default): `https://api.openai.com/v1`
        *   OpenRouter: `https://openrouter.ai/api/v1`
        *   Google AI Studio Gemini: `https://generativelanguage.googleapis.com/v1beta/openai/`
    *   **Model Selection:**
        *   Choose a pre-listed model (e.g., `gpt-4o`).
        *   Or, select "Use Custom Model Name ↓" and enter the exact model identifier (e.g., `deepseek/deepseek-r1:free` for OpenRouter, or `gemini/gemini-2.5-flash-preview-05-20` for Google AI Studio).
        *   **Important:** For image features, ensure you select a multimodal model (e.g., GPT-4o, Gemini Flash/Pro with vision capabilities).
    *   Click **Save Settings**.
    *   Click **Test Connection** to verify your setup.

## How to Use

1.  **Select Languages:**
    *   Choose your **Source Language** and **Target Language** from the dropdowns.
    *   If "Detect Language" is chosen for the source, the AI will attempt to identify it.
2.  **Input Text:**
    *   Type or paste text into the source text area.
3.  **Input Image (Optional):**
    *   Click **Upload Image** to select an image file (PNG, JPEG, GIF, WEBP).
    *   Or, click **Use Camera** to capture an image with your device's camera.
    *   A preview of the image will appear. You can add text in the source text area to provide instructions related to the image (e.g., "Translate the text in this sign," "Describe this scene").
    *   Click the "X" button on the image preview to clear it.
4.  **Translate:**
    *   Click the **Translate** button.
    *   The translation will appear in the target text area. If streaming is enabled, it will appear word by word.
5.  **Special Options:**
    *   If translating *to Draconic*, an option for "Draconic Output Type" (Normal/Simplified) will appear.
    *   If translating *from DWL to English*, an option for "DWL to English Translation Type" (Natural/Raw) will appear.
6.  **Translation History:**
    *   Recent translations are saved at the bottom of the page.
    *   You can "Use Again" to populate the fields or "Delete" individual entries.
    *   A "Clear All History" button is available.

## Customization

### Adding a New Language

1.  **Prepare Resources:** Create a `.txt` file (e.g., `newlang.txt`) in the `materials/conlangs/` directory. This file should contain grammar rules, vocabulary, and any other information the LLM needs to understand and translate the language.
2.  **Update `translator.js`:**
    *   Add a new language constant (e.g., `const LANG_NEWLANG = 'newlang';`).
    *   Add it to `LANG_LABELS` (e.g., `[LANG_NEWLANG]: 'New Language',`).
    *   Create a new `loadNewLangResources` function, similar to `loadDWLResources` or `loadObwaKimoResources`, to fetch your `newlang.txt` file.
    *   In `translateText`, update the `needsNewLang` logic and add a section to append its resources to `resourcesForPrompt`.
    *   Update the "Detect Language" prompt in `translateText` to include your new language.
    *   Update placeholders in `updateUIForLanguageSelection` if necessary.
3.  **Update `index.html`:**
    *   Add your new language as an `<option>` in both the `#source-lang-select` and `#target-lang-select` dropdowns.

### Modifying Prompts

*   The main system prompt can be changed in **Settings > Advanced Settings > System Prompt**.
*   Language-specific instructions and resource loading are handled in `translator.js` within the `translateText` function.

## Technology Stack

*   HTML5
*   CSS3 (Vanilla)
*   JavaScript (Vanilla)
*   OpenAI API (or compatible) for LLM access
*   Eruda (for mobile/local debugging)

## Contributing

Contributions are welcome! If you have suggestions for improvements, new features, or bug fixes, please feel free to:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourFeature`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/YourFeature`).
6.  Open a Pull Request.

## License

This project is open source and available under the [UNLICENSE](UNLICENSE). Feel free to use, modify, and distribute it as you see fit.
