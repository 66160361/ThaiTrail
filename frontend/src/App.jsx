import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import ProtectedRoute from './routes/ProtectedRoute';
import BottomNav from './components/BottomNav';
import CookieConsentManager from './components/cookie/CookieConsentManager';

// Pages
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import RecommendationsPage from './pages/RecommendationsPage';
import PlaceDetailPage from './pages/PlaceDetailPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import SearchPage from './pages/SearchPage';
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import CookiePolicyPage from './pages/legal/CookiePolicyPage';

function App() {
  return (
    <AuthProvider>
      <CookieConsentProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public routes (ไม่ต้อง login) ── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />

            {/* ── Onboarding route (ต้อง login แต่ยังไม่จำเป็นต้อง onboarded) ── */}
            <Route path="/onboarding" element={
              <ProtectedRoute requireOnboarding={false}><OnboardingPage /></ProtectedRoute>
            } />

            {/* ── Protected routes (ต้อง login) ── */}
            <Route path="/" element={
              <ProtectedRoute><RecommendationsPage /></ProtectedRoute>
            } />
            <Route path="/search" element={
              <ProtectedRoute><SearchPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            } />
            <Route path="/places/:id" element={
              <ProtectedRoute><PlaceDetailPage /></ProtectedRoute>
            } />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <BottomNav />
          <CookieConsentManager />
        </BrowserRouter>
      </CookieConsentProvider>
    </AuthProvider>
  );
}

export default App;

