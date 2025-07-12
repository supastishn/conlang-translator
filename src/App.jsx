import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TranslatorPage from './pages/TranslatorPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import AccountPage from './pages/AccountPage';
import GuidePage from './pages/GuidePage';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<TranslatorPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/login" element={<AuthPage type="login" />} />
              <Route path="/register" element={<AuthPage type="register" />} />
              <Route path="/guide/:guideType" element={<GuidePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
