import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// Pages
import LoginPage           from './pages/LoginPage';
import OnboardingPage      from './pages/OnboardingPage';
import RecommendationsPage from './pages/RecommendationsPage';
import CategoryPage        from './pages/CategoryPage';
import PlaceDetailPage     from './pages/PlaceDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* ── Login (stub — ระบบ login อยู่ระหว่างพัฒนา) ── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── TODO: เพิ่มระบบ auth ที่นี่ ── */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* ── Recommendations (TODO: ต้องการ auth จริง) ── */}
        <Route path="/" element={<RecommendationsPage />} />

        {/* ── Browse — public ── */}
        <Route path="/browse"             element={<CategoryPage />} />
        <Route path="/browse/:categoryId" element={<CategoryPage />} />

        {/* ── Place detail — public ── */}
        <Route path="/places/:id" element={<PlaceDetailPage />} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/browse" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
