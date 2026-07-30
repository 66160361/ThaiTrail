import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Pages
import LoginPage           from './pages/LoginPage';
import OnboardingPage      from './pages/OnboardingPage';
import RecommendationsPage from './pages/RecommendationsPage';
import PlaceDetailPage     from './pages/PlaceDetailPage';
import ProfilePage         from './pages/ProfilePage';
import SettingsPage        from './pages/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Login (Google Sign-In) ── */}
          <Route path="/login" element={<LoginPage />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* ── Home / Recommendations & Browsing ── */}
          <Route path="/" element={<RecommendationsPage />} />

          {/* Profile page (Instagram styled) */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* Settings page */}
          <Route path="/settings" element={<SettingsPage />} />

          {/* ── Place detail ── */}
          <Route path="/places/:id" element={<PlaceDetailPage />} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
