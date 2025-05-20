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
});

// Read dictionary and grammar file content
async function getDraconicResources() {
    try {
        // Load grammar text
        const grammarResponse = await fetch('materials/grammar.txt');
        const grammarText = await grammarResponse.text();
        
        // Get the PDF file
        const dictionaryResponse = await fetch('materials/dictionary.pdf');
        const pdfData = await dictionaryResponse.arrayBuffer();
        
        // Load the PDF using PDF.js
        const pdf = await pdfjsLib.getDocument({data: pdfData}).promise;
        const totalPages = pdf.numPages;
        
        // Extract images from each page
        const imagePromises = [];
        for (let i = 1; i <= totalPages; i++) {
            imagePromises.push(getPageAsImage(pdf, i));
        }
        
        const pageImages = await Promise.all(imagePromises);
        
        return {
            dictionaryImages: pageImages,  // Array of base64 images
            grammar: grammarText
        };
    } catch (error) {
        console.error('Error loading Draconic resources:', error);
        return {
            dictionaryImages: [],
            grammar: "Error loading grammar"
        };
    }
}

// Function to render a PDF page as an image
async function getPageAsImage(pdf, pageNumber) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({scale: 1.5}); // Scale for readability
    
    // Create a canvas to render the page
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render the page onto the canvas
    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;
    
    // Convert canvas to base64 image - use full data URL format for OpenAI
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    console.log(`Rendered page ${pageNumber} as image`);
    return dataUrl;
}

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
            
            DICTIONARY:
            I will provide the dictionary as images of PDF pages. Please use these 
            to accurately translate the text.`
        });
        
        // Add dictionary pages as images if model supports vision
        const supportsVision = apiConfig.model.includes('vision') || apiConfig.model.includes('gpt-4');
        
        if (supportsVision) {
            // For vision models, we'll combine text and images in one message
            let combinedContent = [];
            
            // Add initial text
            combinedContent.push({
                type: "text",
                text: "Here are the dictionary pages to reference for translation:"
            });
            
            // Add all dictionary images
            resources.dictionaryImages.forEach((imgBase64, index) => {
                combinedContent.push({
                    type: "image_url",
                    image_url: {
                        url: imgBase64
                    }
                });
            });
            
            // Add this combined content as a single message
            messages.push({
                role: "user",
                content: combinedContent
            });
        } else {
            // For models that don't support images, we'll just mention this limitation
            messages.push({
                role: "user",
                content: "The dictionary images cannot be processed by this model. Please do your best translation based on the grammar rules."
            });
        }
        
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
