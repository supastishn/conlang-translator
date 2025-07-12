import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const LANG_LABELS = {
  english: 'English',
  draconic: 'Draconic',
  dwl: 'Diacritical Waluigi Language',
  obwakimo: 'Obwa Kimo',
  illuveterian: 'Illuveterian',
  detect: 'Detect Language'
};

export default function TranslatorPage() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [sourceLang, setSourceLang] = useState('english');
  const [targetLang, setTargetLang] = useState('draconic');
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [explanationText, setExplanationText] = useState('');
  const [imageData, setImageData] = useState(null);
  const [provider, setProvider] = useState('openai');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const imageUploadRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Load translation history from localStorage
    const stored = localStorage.getItem('draconicTranslationHistory');
    setHistory(stored ? JSON.parse(stored) : []);
  }, []);

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
    reader.onload = (e) => setImageData(e.target.result);
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOpen(true);
    } catch (err) {
      alert(`Could not access the camera: ${err.message}`);
    }
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/webp');
    setImageData(image);
    setCameraOpen(false);
    // Stop video stream
    const stream = video.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const handleTranslate = () => {
    if (!sourceText.trim() && !imageData) {
      alert('Please enter text or upload an image');
      return;
    }
    // Dummy translation logic for now
    const translation = `Translated: ${sourceText}`;
    setTargetText(translation);
    setHistory(prev => {
      const newHistory = [
        {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          sourceText,
          translatedText: translation,
          sourceLang,
          targetLang
        },
        ...prev
      ].slice(0, 10);
      localStorage.setItem('draconicTranslationHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const handleUseAgain = (item) => {
    setSourceText(item.sourceText);
    setTargetText(item.translatedText);
    setSourceLang(item.sourceLang);
    setTargetLang(item.targetLang);
  };

  const handleDeleteHistory = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('draconicTranslationHistory', JSON.stringify(updated));
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Delete ALL translation history?')) {
      setHistory([]);
      localStorage.removeItem('draconicTranslationHistory');
    }
  };

  return (
    <div className="container">
      <header style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>English to Draconic Translator</h1>
        {/* Navigation would go here */}
      </header>
      <main>
        <div id="api-warning" className={`warning ${settings.apiKey ? 'hidden' : ''}`}>
          ⚠️ Client-side API keys deprecated. Use Gemini provider.
        </div>
        <div className="language-selection-container" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="source-lang-select">Source Language:</label>
            <select id="source-lang-select" value={sourceLang} onChange={e => setSourceLang(e.target.value)}>
              {Object.entries(LANG_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="target-lang-select">Target Language:</label>
            <select id="target-lang-select" value={targetLang} onChange={e => setTargetLang(e.target.value)}>
              {Object.entries(LANG_LABELS).filter(([key]) => key !== 'detect').map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        {user && settings.geminiOption && (
          <div className="form-group provider-radio-group" style={{ display: 'block' }}>
            <label>Translation Provider:</label>
            <div className="radio-options">
              <label>
                <input type="radio" name="provider-radio" value="openai" checked={provider === 'openai'} onChange={() => setProvider('openai')} />
                OpenAI
              </label>
              <label>
                <input type="radio" name="provider-radio" value="gemini" checked={provider === 'gemini'} onChange={() => setProvider('gemini')} />
                Gemini function
              </label>
            </div>
          </div>
        )}
        <div id="draconic-output-type-container" className={`form-group ${targetLang === 'draconic' ? '' : 'hidden'}`}>
          <label htmlFor="draconic-output-type-select-index">Draconic Output Type:</label>
          <select id="draconic-output-type-select-index">
            <option value="normal">Normal Draconic Output</option>
            <option value="simplified">Simplified Romanization</option>
          </select>
          <small>Controls the default output format for English to Draconic translations</small>
        </div>
        <div id="dwl-to-english-type-container" className={`form-group ${(sourceLang === 'dwl' && targetLang === 'english') ? '' : 'hidden'}`}>
          <label htmlFor="dwl-to-english-type-select-index">DWL to English Translation Type:</label>
          <select id="dwl-to-english-type-select-index">
            <option value="natural">Natural English (Fluent, Corrected)</option>
            <option value="raw">Raw English (Literal, Potentially Unnatural)</option>
          </select>
          <small>Controls how Diacritical Waluigi Language is translated to English</small>
        </div>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="include-explanation-main">Include Explanation:</label>
          <div className="toggle-container">
            <label className="switch">
              <input type="checkbox" id="include-explanation-main" checked={settings.includeExplanation} readOnly />
              <span className="slider round"></span>
            </label>
            <span className="toggle-label">Show explanation under translation</span>
          </div>
          <small>Default pulled from your Settings page.</small>
        </div>
        <div className="translation-container">
          <div className="translation-box">
            <h2 id="source-language-label">{LANG_LABELS[sourceLang]}</h2>
            <div className="source-input-controls">
              <textarea id="source-input" value={sourceText} onChange={e => setSourceText(e.target.value)} placeholder="Enter text here, or describe what to do with the image..." />
              <div className="image-upload-container">
                <div className="image-source-buttons">
                  <label htmlFor="image-upload-input" className="button-like-label">Upload Image</label>
                  <input type="file" id="image-upload-input" ref={imageUploadRef} accept="image/png, image/jpeg, image/gif, image/webp" style={{ display: 'none' }} onChange={handleImageUpload} />
                  <button type="button" id="use-camera-btn" className="button-like-label" onClick={openCamera}>Use Camera</button>
                </div>
                {imageData && (
                  <div id="image-preview-container" className="image-preview">
                    <img id="image-preview" src={imageData} alt="Preview" />
                    <button id="clear-image-btn" onClick={() => setImageData(null)}>×</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="translation-controls">
            <button id="translate-btn" onClick={handleTranslate}>Translate</button>
          </div>
          <div className="translation-box">
            <h2 id="target-language-label">{LANG_LABELS[targetLang]}</h2>
            <textarea id="target-output" value={targetText} readOnly placeholder="Draconic translation will appear here..." />
          </div>
        </div>
        <div id="explanation-container" className={`translation-box ${settings.includeExplanation ? '' : 'hidden'}`} style={{ marginBottom: '2rem' }}>
          <h2>Explanation</h2>
          <textarea id="explanation-output" value={explanationText} readOnly placeholder="Explanation will appear here..." />
        </div>
        <div className="translation-history">
          <h3>Translation History (can be deleted)</h3>
          <div className="history-controls">
            <button id="clear-all-history" className="clear-history-btn" onClick={handleClearAllHistory}>Clear All History</button>
          </div>
          <div id="history-container">
            {history.length > 0 ? (
              history.map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-header">
                    <span className="history-date">{new Date(item.timestamp).toLocaleString()}</span>
                    <span className="history-direction">{LANG_LABELS[item.sourceLang]} → {LANG_LABELS[item.targetLang]}</span>
                    <div className="history-actions">
                      <button className="history-use-btn" onClick={() => handleUseAgain(item)}>Use Again</button>
                      <button className="history-delete-btn" onClick={() => handleDeleteHistory(item.id)}>Delete</button>
                    </div>
                  </div>
                  <div className="history-content">
                    <p><strong>{LANG_LABELS[item.sourceLang]}:</strong> {item.sourceText}</p>
                    <p><strong>{LANG_LABELS[item.targetLang]}:</strong> {item.translatedText}</p>
                  </div>
                </div>
              ))
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
                <button id="capture-image-btn" className="button-like-label" onClick={captureImage}>Capture</button>
                <button id="close-camera-btn" className="button-like-label secondary" onClick={() => setCameraOpen(false)}>Close Camera</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <footer>
        <p>Draconic Translator - Using OpenAI API for constructed language translation</p>
        <div className="footer-links">
          <a href="https://github.com/supastishn/conlang-translator" target="_blank" rel="noopener noreferrer">See the source code</a> | 
          <a href="https://supastishn.github.io" target="_blank" rel="noopener noreferrer">See more fun stuff</a>
        </div>
      </footer>
    </div>
  );
}
