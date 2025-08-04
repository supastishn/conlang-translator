import { createRoot } from 'react-dom/client';
import eruda from 'eruda';
import App from './App.jsx';
import '../styles.css';

// Always initialize Eruda for debugging access in all environments.
eruda.init();
console.log('Eruda debug console initialized');

createRoot(document.getElementById('root')).render(<App />);
