import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TranslatorPage from './pages/TranslatorPage';
import SettingsPage from './pages/SettingsPage';
import AccountPage from './pages/AccountPage';
import AuthPage from './pages/AuthPage';
import GuidePage from './pages/GuidePage';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import viteSvg from '/vite.svg';
import reactSvg from '/src/assets/react.svg';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout viteSvg={viteSvg} reactSvg={reactSvg} />}>
              <Route path="/" element={<TranslatorPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/login" element={<AuthPage type="login" />} />
              <Route path="/register" element={<AuthPage type="register" />} />
              <Route path="/guide/:guideType" element={<GuidePage />} />
            </Route>
          </Routes>
        </HashRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
