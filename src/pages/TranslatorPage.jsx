import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { translateText } from '../services/translator';
import { Link } from 'react-router-dom';

const LANG_LABELS = {
  english: 'English',
  draconic: 'Draconic',
  dwl: 'Diacritical Waluigi Language',
  obwakimo: 'Obwa Kimo',
  illuveterian: 'Illuveterian',
  detect: 'Detect Language'
};

const xmlParser = new DOMParser();

function parseXmlString(xml) {
    try {
        const doc = xmlParser.parseFromString(`<root>${xml}</root>`, "application/xml");
        const parseError = doc.querySelector("parsererror");
        if (parseError) {
          console.error("XML parsing error:", parseError.textContent);
          return { translation: xml, explanation: "" };
        }
        return {
          translation: doc.querySelector("translation")?.textContent.trim() || "",
          explanation: doc.querySelector("explanation")?.textContent.trim() || ""
        };
    } catch (e) {
        console.error("XML parsing exception:", e);
        return { translation: xml, explanation: "Could not parse explanation." };
    }
}

export default function TranslatorPage() {
    const { user } = useAuth();
    const { settings } = useSettings();
  
    const [sourceLang, setSourceLang] = useState('english');
    const [targetLang, setTargetLang] = useState('draconic');
    const [sourceText, setSourceText] = useState('');
    const [targetText, setTargetText] = useState('');
    const [explanation, setExplanation] = useState('');
    const [imageDataUrl, setImageDataUrl] = useState(null);
    const [provider, setProvider] = useState(settings.providerType || 'gemini');
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState('');

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const imageUploadRef = useRef(null);
    
    const [history, setHistory] = useState([]);
    
    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('draconicTranslationHistory');
            if (storedHistory) setHistory(JSON.parse(storedHistory));
        } catch (e) {
            setHistory([]);
        }
    }, []);

    const addToHistory = (item) => {
        const newHistory = [item, ...history].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem('draconicTranslationHistory', JSON.stringify(newHistory));
    };
    
    const deleteHistoryItem = (id) => {
        const newHistory = history.filter(item => item.id !== id);
        setHistory(newHistory);
        localStorage.setItem('draconicTranslationHistory', JSON.stringify(newHistory));
    }
    
    const clearHistory = () => {
        if (window.confirm("Are you sure you want to clear all translation history?")) {
            setHistory([]);
            localStorage.removeItem('draconicTranslationHistory');
        }
    }
    
    const useHistoryItem = (item) => {
        setSourceLang(item.sourceLang);
        setTargetLang(item.targetLang);
        setSourceText(item.sourceText);
        setTargetText(item.translatedText);
        setExplanation('');
        setImageDataUrl(null);
    }

    const handleTranslate = async () => {
        if (!sourceText.trim() && !imageDataUrl) {
            setError('Please enter text or upload an image.');
            return;
        }
        if (provider === 'openai' && (!settings.apiKey || !settings.apiKey.trim())) {
            setError('OpenAI API key is not set in Settings.');
            return;
        }

        setIsTranslating(true);
        setError('');
        setTargetText('');
        setExplanation('');

        try {
            const result = await translateText({
                sourceText, sourceLang, targetLang, imageDataUrl, provider, settings,
                updateCallback: (partial) => {
                    const { translation } = parseXmlString(partial);
                    setTargetText(translation);
                }
            });
            const { translation, explanation: finalExplanation } = parseXmlString(result);
            setTargetText(translation);
            setExplanation(finalExplanation);
            addToHistory({ id: Date.now(), timestamp: new Date().toISOString(), sourceText, translatedText: translation, sourceLang, targetLang });
        } catch (err) {
            setError('Translation failed: ' + err.message);
        } finally {
            setIsTranslating(false);
        }
    };
    
    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Invalid file type. Please select a PNG, JPEG, GIF, or WEBP image.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        setError('File is too large. Maximum size is 20MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageDataUrl(event.target.result);
        setError('');
      };
      reader.readAsDataURL(file);
    };

    const clearImage = () => {
      setImageDataUrl(null);
      if (imageUploadRef.current) {
        imageUploadRef.current.value = '';
      }
    };
    
    const openCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraOpen(true);
        }
      } catch (err) {
        setError(`Camera error: ${err.message}`);
      }
    };

    // Camera stream memory leak fix
    const stopCameraStream = () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };

    const closeCamera = () => {
      stopCameraStream();
      setIsCameraOpen(false);
    };

    const captureImage = () => {
      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setImageDataUrl(canvas.toDataURL('image/webp'));
        closeCamera();
      }
    };

    // Cleanup camera stream on unmount
    useEffect(() => {
      return () => {
        stopCameraStream();
      };
    }, []);

    return (
        <>
            {error && <div className="error">{error}</div>}
            {provider === 'openai' && (!settings.apiKey || !settings.apiKey.trim()) &&
                <div className="warning">
                    OpenAI API key not set. Please configure in <Link to="/settings">Settings</Link>.
                </div>
            }

            <div className="language-selection-container" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label htmlFor="source-lang-select">Source Language:</label>
                    <select id="source-lang-select" value={sourceLang} onChange={e => setSourceLang(e.target.value)}>
                        {Object.entries(LANG_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label htmlFor="target-lang-select">Target Language:</label>
                    <select id="target-lang-select" value={targetLang} onChange={e => setTargetLang(e.target.value)}>
                        {Object.entries(LANG_LABELS).filter(([k]) => k !== 'detect').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                </div>
            </div>

            {user && (
              <div className="form-group provider-radio-group">
                <label>Translation Method:</label>
                <div className="radio-options">
                  <label>
                    <input 
                      type="radio" 
                      name="provider-radio" 
                      value="gemini" 
                      checked={provider === 'gemini'} 
                      onChange={e => setProvider(e.target.value)}
                    /> Gemini Function
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="provider-radio" 
                      value="openai" 
                      checked={provider === 'openai'} 
                      onChange={e => setProvider(e.target.value)}
                    /> Client API Key
                  </label>
                </div>
              </div>
            )}

            {provider === 'openai' && (!settings.apiKey || !settings.apiKey.trim()) && (
              <div className="warning">
                OpenAI API key not set. Please configure in <Link to="/settings">Settings</Link>.
              </div>
            )}

            <div className="translation-container">
                <div className="translation-box">
                    <h2 id="source-language-label">{LANG_LABELS[sourceLang]}</h2>
                    <div className="source-input-controls">
                        <textarea id="source-input" placeholder="Enter text here, or describe what to do with the image..." value={sourceText} onChange={e => setSourceText(e.target.value)}></textarea>
                        <div className="image-upload-container">
                          <div className="image-source-buttons">
                              <button className="button-like-label" onClick={() => imageUploadRef.current.click()}>Upload Image</button>
                              <input type="file" ref={imageUploadRef} accept="image/*" onChange={handleImageUpload} hidden/>
                              <button className="button-like-label" onClick={openCamera}>Use Camera</button>
                          </div>
                          {imageDataUrl && (
                            <div id="image-preview-container">
                              <img id="image-preview" src={imageDataUrl} alt="Preview" />
                              <button id="clear-image-btn" title="Clear selected image" onClick={clearImage}>&times;</button>
                            </div>
                          )}
                        </div>
                    </div>
                </div>
                <div className="translation-controls">
                    <button id="translate-btn" onClick={handleTranslate} disabled={isTranslating}>
                        {isTranslating ? 'Translating...' : 'Translate'}
                    </button>
                </div>
                <div className="translation-box">
                    <h2 id="target-language-label">{LANG_LABELS[targetLang]}</h2>
                    <textarea id="target-output" placeholder="Translation will appear here..." readOnly value={targetText} className={isTranslating && settings.streamingEnabled ? "streaming" : ""}></textarea>
                </div>
            </div>
            
            {(settings.includeExplanation && explanation) && (
                <div id="explanation-container" className="translation-box" style={{ margin: '2rem 0' }}>
                    <h2>Explanation</h2>
                    <textarea id="explanation-output" placeholder="Explanation will appear here..." readOnly value={explanation}></textarea>
                </div>
            )}
            
            <div className="translation-history">
                <h3>Translation History</h3>
                <div className="history-controls">
                    {history.length > 0 && <button className="clear-history-btn" onClick={clearHistory}>Clear All History</button>}
                </div>
                <div id="history-container">
                    {history.length === 0 ? (
                        <p className="empty-history">No translation history yet</p>
                    ) : (
                        history.map(item => (
                            <div key={item.id} className="history-item">
                                <div className="history-header">
                                    <span className="history-date">{new Date(item.timestamp).toLocaleString()}</span>
                                    <span className="history-direction">{LANG_LABELS[item.sourceLang]} → {LANG_LABELS[item.targetLang]}</span>
                                    <div className="history-actions">
                                        <button className="history-use-btn" onClick={() => useHistoryItem(item)}>Use Again</button>
                                        <button className="history-delete-btn" onClick={() => deleteHistoryItem(item.id)}>Delete</button>
                                    </div>
                                </div>
                                <div className="history-content">
                                    <p><strong>{LANG_LABELS[item.sourceLang]}:</strong> {item.sourceText}</p>
                                    <p><strong>{LANG_LABELS[item.targetLang]}:</strong> {item.translatedText}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {isCameraOpen && (
              <div id="camera-modal" className="modal">
                <div className="modal-content">
                  <video id="camera-video-feed" ref={videoRef} autoPlay playsInline></video>
                  <canvas id="camera-canvas" ref={canvasRef} className="hidden"></canvas>
                  <div className="modal-actions">
                    <button onClick={captureImage} className="button-like-label">Capture</button>
                    <button onClick={closeCamera} className="button-like-label secondary">Close</button>
                  </div>
                </div>
              </div>
            )}
        </>
    );
}
