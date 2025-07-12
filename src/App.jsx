import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Translator from './pages/Translator';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import Guides from './pages/Guides';
import Account from './pages/Account';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Translator />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/login" element={<Auth initialForm="login" />} />
              <Route path="/register" element={<Auth initialForm="register" />} />
              <Route path="/account" element={<Account />} />
              <Route path="/openrouter-guide" element={<Guides initialGuide="openrouter" />} />
              <Route path="/google-aistudio-gemini-guide" element={<Guides initialGuide="gemini" />} />
            </Routes>
          </Layout>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
