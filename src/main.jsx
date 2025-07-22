import { createRoot } from 'react-dom/client';
import eruda from 'eruda';
import App from './App.jsx';
import '../styles.css';

const storedSettings = JSON.parse(
  localStorage.getItem('draconicTranslatorSettings') || '{}'
);

if (import.meta.env.DEV || storedSettings.debugMode) {
  eruda.init();
  console.log('Eruda debug console initialized');
} else {
  console.log('Eruda disabled in production');
}

createRoot(document.getElementById('root')).render(<App />);
