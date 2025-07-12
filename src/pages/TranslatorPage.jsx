import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Layout from '../components/Layout';

const LANG_LABELS = {
  english: 'English',
  draconic: 'Draconic',
  dwl: 'Diacritical Waluigi Language',
  obwakimo: 'Obwa Kimo',
  illuveterian: 'Illuveterian',
  detect: 'Detect Language'
};

export default function TranslatorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, saveSettings } = useSettings();
  
  const [sourceLang, setSourceLang] = useState('english');
  const [targetLang, setTargetLang] = useState('draconic');
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [explanationText, setExplanationText] = useState('');
  const [imageData, setImageData] = useState(null);
  const [provider, setProvider] = useState('openai');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loaded, setLoaded] = useState(false);
  
  const imageUploadRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const storedHistory = localStorage.getItem('draconicTranslationHistory');
    setHistory(storedHistory ? JSON.parse(storedHistory) : []);
    setLoaded(true);
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    
    if (!file || !validTypes.includes(file.type)) return;
    if (file.size > 20 * 1024 * 1024) return;
    
    const reader = new FileReader();
    reader.onload = (e) => setImageData(e.target.result);
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setCameraOpen(true);
    } catch (err) {
      alert(`Camera error: ${err.message}`);
    }
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setImageData(canvas.toDataURL('image/webp'));
    setCameraOpen(false);
    videoRef.current.srcObject.getTracks().forEach(track => track.stop());
  };

  const translate = () => {
    // Implementation would connect to translation services
    setTargetText(`Translated: ${sourceText}`);
    const newItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      sourceText,
      translatedText: `Translated: ${sourceText}`,
      sourceLang,
      targetLang
    };
    
    const newHistory = [newItem, ...history.slice(0, 9)];
    setHistory(newHistory);
    localStorage.setItem('draconicTranslationHistory', JSON.stringify(newHistory));
  };

  const clearImage = () => setImageData(null);
  const deleteHistoryItem = (id) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('draconicTranslationHistory', JSON.stringify(updated));
  };

  const clearAllHistory = () => {
    if (window.confirm('Clear all history?')) {
      setHistory([]);
      localStorage.removeItem('draconicTranslationHistory');
    }
  };

  if (!loaded) return <div>Loading...</div>;

  return (
    <Layout>
      <div id="api-warning" className={`warning ${settings.apiKey ? 'hidden' : ''}`}>
        ⚠️ Client-side API keys deprecated. Use Gemini provider.
      </div>

      <div className="language-selection-container">
        {/* Language selection dropdowns */}
        <div className="form-group">
          <label>Source Language:</label>
          <select 
            value={sourceLang} 
            onChange={e => setSourceLang(e.target.value)}
          >
            {Object.entries(LANG_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Target Language:</label>
          <select 
            value={targetLang} 
            onChange={e => setTargetLang(e.target.value)}
          >
            {Object.entries(LANG_LABELS)
              .filter(([key]) => key !== 'detect')
              .map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Provider selection */}
      {user && settings.geminiOption && (
        <div className="form-group provider-radio-group">
          <label>Translation Provider:</label>
          <div className="radio-options">
            <label>
              <input 
                type="radio" 
                name="provider" 
                checked={provider === 'openai'} 
                onChange={() => setProvider('openai')}
              /> OpenAI
            </label>
            <label>
              <input 
                type="radio" 
                name="provider" 
                checked={provider === 'gemini'} 
                onChange={() => setProvider('gemini')}
              /> Gemini
            </label>
          </div>
        </div>
      )}

      {/* Translation boxes */}
      <div className="translation-container">
        <div className="translation-box">
          <h2>{LANG_LABELS[sourceLang]}</h2>
          <textarea
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            placeholder="Enter text or describe image..."
          />
          
          <div className="image-upload-container">
            <div className="image-source-buttons">
              <button className="button-like-label" onClick={() => imageUploadRef.current.click()}>
                Upload Image
              </button>
              <input 
                type="file" 
                ref={imageUploadRef}
                accept="image/*" 
                onChange={handleImageUpload}
                hidden
              />
              <button className="button-like-label" onClick={openCamera}>
                Use Camera
              </button>
            </div>
            
            {imageData && (
              <div className="image-preview">
                <img src={imageData} alt="Preview" />
                <button className="clear-image" onClick={clearImage}>×</button>
              </div>
            )}
          </div>
        </div>

        <div className="translation-controls">
          <button id="translate-btn" onClick={translate}>Translate</button>
        </div>

        <div className="translation-box">
          <h2>{LANG_LABELS[targetLang]}</h2>
          <textarea 
            value={targetText}
            readOnly
            placeholder="Translation will appear here..."
          />
        </div>
      </div>

      {/* Translation history */}
      <div className="translation-history">
        <h3>Translation History</h3>
        <div className="history-controls">
          <button className="clear-history-btn" onClick={clearAllHistory}>
            Clear All
          </button>
        </div>
        
        <div className="history-container">
          {history.length === 0 ? (
            <p className="empty-history">No history yet</p>
          ) : (
            history.map(item => (
              <div key={item.id} className="history-item">
                <div className="history-header">
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                  <button onClick={() => deleteHistoryItem(item.id)}>Delete</button>
                </div>
                <p><b>Source:</b> {item.sourceText}</p>
                <p><b>Translation:</b> {item.translatedText}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Camera modal */}
      {cameraOpen && (
        <div className="modal">
          <div className="modal-content">
            <video ref={videoRef} autoPlay playsInline></video>
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            <div className="modal-actions">
              <button onClick={captureImage}>Capture</button>
              <button className="secondary" onClick={() => setCameraOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
