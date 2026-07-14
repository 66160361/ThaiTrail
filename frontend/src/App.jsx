import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// Pages
import LoginPage           from './pages/LoginPage';
import OnboardingPage      from './pages/OnboardingPage';
import RecommendationsPage from './pages/RecommendationsPage';
import PlaceDetailPage     from './pages/PlaceDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* ── Login (Google Sign-In) ── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── TODO: เพิ่มระบบ auth ที่นี่ ── */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* ── Home / Recommendations & Browsing ── */}
        <Route path="/" element={<RecommendationsPage />} />

        {/* ── Place detail — public ── */}
        <Route path="/places/:id" element={<PlaceDetailPage />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
