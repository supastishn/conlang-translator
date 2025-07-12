import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { SettingsContext } from '../context/SettingsContext';

const LANG_LABELS = {
  english: 'English',
  draconic: 'Draconic',
  dwl: 'Diacritical Waluigi Language',
  obwakimo: 'Obwa Kimo',
  illuveterian: 'Illuveterian',
  detect: 'Detect Language'
};

export default function TranslatorPage() {
  // Contexts
  const { user } = useContext(AuthContext);
  const { settings } = useContext(SettingsContext);
  
  // State
  const [sourceLang, setSourceLang] = useState('english');
  const [targetLang, setTargetLang] = useState('draconic');
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [explanationText, setExplanationText] = useState('');
  const [imageData, setImageData] = useState(null);
  const [history, setHistory] = useState([]);
  const [provider, setProvider] = useState('openai');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Load translation history
  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('draconicTranslationHistory') || '[]');
    setHistory(savedHistory);
  }, []);

  // Handle DWL warning
  useEffect(() => {
    setDwlWarning(sourceLang === 'dwl' || sourceLang === 'detect');
  }, [sourceLang]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    
    if (!file) return;
    
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please use PNG, JPEG, GIF, or WEBP.');
      return;
    }
    
    if (file.size > 20 * 1024 * 1024) {
      alert('File is too large. Maximum size is 20MB.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageData(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      videoRef.current.srcObject = stream;
      setCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert(`Could not access the camera: ${err.message}`);
    }
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const image = canvas.toDataURL('image/webp');
    setImageData(image);
    setCameraOpen(false);
    
    // Stop video stream
    const stream = video.srcObject;
    stream.getTracks().forEach(track => track.stop());
  };

  const handleTranslate = async () => {
    if (!sourceText.trim() && !imageData) {
      alert('Please enter text or upload an image');
      return;
    }

    // Implement actual translation logic here using fetch/API
    const translation = `Translated: ${sourceText}`;

    setTargetText(translation);
    
    // Add to history
    const newHistory = [{
      id: Date.now(),
      timestamp: new Date().toISOString(),
      sourceText,
      translatedText: translation,
      sourceLang,
      targetLang
    }, ...history.slice(0, 9)];
    
    setHistory(newHistory);
    localStorage.setItem('draconicTranslationHistory', JSON.stringify(newHistory));
  };

  const updateHistoryDisplay = () => {
    return history.map(item => (
      <div key={item.id} className="history-item">
        <div className="history-header">
          <span className="history-date">{new Date(item.timestamp).toLocaleString()}</span>
          <span className="history-direction">{item.sourceLang} → {item.targetLang}</span>
          <div className="history-actions">
            <button className="history-use-btn" onClick={() => {
              setSourceText(item.sourceText);
              setTargetText(item.translatedText);
              setSourceLang(item.sourceLang);
              setTargetLang(item.targetLang);
            }}>Use Again</button>
            <button className="history-delete-btn" onClick={() => {
              const updatedHistory = history.filter(h => h.id !== item.id);
              setHistory(updatedHistory);
              localStorage.setItem('draconicTranslationHistory', JSON.stringify(updatedHistory));
            }}>Delete</button>
          </div>
        </div>
        <div className="history-content">
          <p><strong>{item.sourceLang}:</strong> {item.sourceText}</p>
          <p><strong>{item.targetLang}:</strong> {item.translatedText}</p>
        </div>
      </div>
    ));
  };

  const langLabels = {
    english: 'English',
    draconic: 'Draconic',
    dwl: 'Diacritical Waluigi Language',
    obwakimo: 'Obwa Kimo',
    illuveterian: 'Illuveterian',
    detect: 'Detect Language'
  };

  return (
    <div className="container">
      <div id="api-warning" className={`warning ${settings.apiKey ? 'hidden' : ''}`}>
        ⚠️ Client-side API keys deprecated for security. Use Gemini provider only.
      </div>

      {dwlWarning && (
        <div id="dwl-input-warning" className="warning">
          Diacritical Waluigi Language is hard for AI to translate. Results may vary significantly.
        </div>
      )}

      <div className="language-selection-container">
        <div className="form-group">
          <label for="source-lang-select">Source Language:</label>
          <select 
            id="source-lang-select"
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
          >
            <option value="detect">Detect Language</option>
            <option value="english">English</option>
            <option value="draconic">Draconic</option>
            <option value="dwl">Diacritical Waluigi Language</option>
            <option value="obwakimo">Obwa Kimo</option>
            <option value="illuveterian">Illuveterian</option>
          </select>
        </div>
        <div className="form-group">
          <label for="target-lang-select">Target Language:</label>
          <select 
            id="target-lang-select"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            <option value="draconic">Draconic</option>
            <option value="english">English</option>
            <option value="dwl">Diacritical Waluigi Language</option>
            <option value="obwakimo">Obwa Kimo</option>
            <option value="illuveterian">Illuveterian</option>
          </select>
        </div>
      </div>
      
      {user && settings.geminiOption && (
        <div className="form-group provider-radio-group">
          <label>Translation Provider:</label>
          <div className="radio-options">
            <label>
              <input 
                type="radio" 
                name="provider-radio" 
                value="openai" 
                checked={provider === 'openai'}
                onChange={() => setProvider('openai')}
              />
              OpenAI
            </label>
            <label>
              <input 
                type="radio" 
                name="provider-radio" 
                value="gemini" 
                checked={provider === 'gemini'}
                onChange={() => setProvider('gemini')}
              />
              Gemini function
            </label>
          </div>
        </div>
      )}
      
      <div id="draconic-output-type-container" className={`form-group ${targetLang === 'draconic' ? '' : 'hidden'}`}>
        <label for="draconic-output-type-select-index">Draconic Output Type:</label>
        <select id="draconic-output-type-select-index">
          <option value="normal">Normal Draconic Output</option>
          <option value="simplified">Simplified Romanization</option>
        </select>
        <small>Controls the default output format for English to Draconic translations</small>
      </div>
      
      <div id="dwl-to-english-type-container" className={`form-group ${sourceLang === 'dwl' && targetLang === 'english' ? '' : 'hidden'}`}>
        <label for="dwl-to-english-type-select-index">DWL to English Translation Type:</label>
        <select id="dwl-to-english-type-select-index">
          <option value="natural">Natural English (Fluent, Corrected)</option>
          <option value="raw">Raw English (Literal, Potentially Unnatural)</option>
        </select>
        <small>Controls how Diacritical Waluigi Language is translated to English</small>
      </div>
      
      <div className="form-group">
        <label for="include-explanation-main">Include Explanation:</label>
        <div className="toggle-container">
          <label className="switch">
            <input 
              type="checkbox" 
              id="include-explanation-main" 
              checked={settings.includeExplanation}
              onChange={(e) => {}}
            />
            <span className="slider round"></span>
          </label>
          <span className="toggle-label">Enable explanation (XML &lt;explanation&gt; tag)</span>
        </div>
        <small>Adds an explanation section under the translation</small>
      </div>
      
      <div className="translation-container">
        <div className="translation-box">
          <h2 id="source-language-label">{langLabels[sourceLang]}</h2>
          <textarea 
            id="source-input"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={sourceLang === 'detect' 
              ? "Enter text in any real language..." 
              : `Enter ${langLabels[sourceLang]} text...`}
          />
          <div className="image-upload-container">
            <div className="image-source-buttons">
              <label for="image-upload-input" className="button-like-label">Upload Image</label>
              <input 
                type="file" 
                id="image-upload-input" 
                ref={imageUploadRef}
                accept="image/png, image/jpeg, image/gif, image/webp"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <button type="button" id="use-camera-btn" className="button-like-label" onClick={openCamera}>
                Use Camera
              </button>
            </div>
            {imageData && (
              <div id="image-preview-container" className="image-preview">
                <img id="image-preview" src={imageData} alt="Preview" />
                <button id="clear-image-btn" onClick={() => setImageData(null)}>×</button>
              </div>
            )}
          </div>
        </div>
        
        <div className="translation-controls">
          <button id="translate-btn" onClick={handleTranslate}>Translate</button>
        </div>
        
        <div className="translation-box">
          <h2 id="target-language-label">{langLabels[targetLang]}</h2>
          <textarea 
            id="target-output"
            value={targetText}
            readOnly
            placeholder={`${langLabels[targetLang]} translation will appear here...`}
          />
        </div>
      </div>
      
      <div id="explanation-container" className={`translation-box ${settings.includeExplanation ? '' : 'hidden'}`}>
        <h2>Explanation</h2>
        <textarea 
          id="explanation-output"
          value={explanationText}
          readOnly
          placeholder="Explanation will appear here..."
        />
      </div>
      
      <div className="translation-history">
        <h3>Translation History (last 10)</h3>
        <div className="history-controls">
          <button 
            id="clear-all-history" 
            className="clear-history-btn"
            onClick={() => {
              if (confirm('Delete ALL translation history?')) {
                setHistory([]);
                localStorage.removeItem('draconicTranslationHistory');
              }
            }}
          >
            Clear All History
          </button>
        </div>
        <div id="history-container">
          {history.length > 0 ? (
            updateHistoryDisplay()
          ) : (
            <p className="empty-history">No translation history yet</p>
          )}
        </div>
      </div>
      
      {cameraOpen && (
        <div id="camera-modal" className="modal">
          <div className="modal-content">
            <video id="camera-video-feed" ref={videoRef} autoPlay playsInline></video>
            <canvas id="camera-canvas" ref={canvasRef} style={{ display: 'none' }}></canvas>
            <div className="modal-actions">
              <button id="capture-image-btn" className="button-like-label" onClick={captureImage}>
                Capture
              </button>
              <button id="close-camera-btn" className="button-like-label secondary" onClick={() => setCameraOpen(false)}>
                Close Camera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslatorPage;
