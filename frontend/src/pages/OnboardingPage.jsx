import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import categoryHero from '../../images/category_hero.png';

const CATEGORIES = [
  { id: 1, icon: '⛩️', name: 'ศาสนาและความเชื่อ' },
  { id: 2, icon: '🌿', name: 'ธรรมชาติและผจญภัย' },
  { id: 3, icon: '🌊', name: 'ทะเลและเกาะ' },
  { id: 4, icon: '🐘', name: 'สวนสัตว์' },
  { id: 5, icon: '📸', name: 'ถ่ายภาพ' },
  { id: 6, icon: '🏛️', name: 'ประวัติศาสตร์\nและวัฒนธรรม' },
  { id: 7, icon: '🍜', name: 'อาหาร คาเฟ่\nและไลฟ์สไตล์' },
  { id: 8, icon: '🎉', name: 'ประเพณี\nและเทศกาล' },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, markOnboarded, logout } = useAuth();

  const [selected, setSelected] = useState(() => {
    try {
      let stored = null;
      if (user && user.id) {
        if (Array.isArray(user.interests) && user.interests.length > 0) {
          stored = JSON.stringify(user.interests);
        } else {
          stored = localStorage.getItem(`thaitrail_user_interests_${user.id}`);
        }
      }

      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((item) => {
        if (typeof item === 'number') return item;
        const num = Number(item);
        if (!isNaN(num) && num > 0) return num;

        const normItem = String(item).replace(/\s+/g, '').toLowerCase();
        const found = CATEGORIES.find((cat) => {
          const normCat = cat.name.replace(/\s+/g, '').toLowerCase();
          return normCat.includes(normItem) || normItem.includes(normCat);
        });
        return found ? found.id : null;
      }).filter(Boolean);
    } catch {
      return [];
    }
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const toggleCategory = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    if (selected.length === 0 || saving) return;
    setSaveError('');
    setSaving(true);

    // Always save to localStorage first
    if (user?.id) {
      localStorage.setItem(`thaitrail_user_interests_${user.id}`, JSON.stringify(selected));
    }
    localStorage.setItem('thaitrail_user_interests', JSON.stringify(selected));

    // Always try to save to backend (session must be active)
    try {
      await api.user.setInterests({ category_ids: selected });
      if (markOnboarded) markOnboarded();
    } catch (err) {
      // If 401, session is lost — clear cache and redirect to login
      if (err?.status === 401) {
        await logout();
        alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
        navigate('/login', { replace: true });
        return;
      }
      setSaveError(err?.message || 'บันทึกความสนใจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      return;
    } finally {
      setSaving(false);
    }

    sessionStorage.removeItem('active_tab');
    sessionStorage.removeItem('scroll_pos');
    navigate('/', { replace: true });
  };

  return (
    <div className="cat-page">
      {/* ── Hero section ── */}
      <div className="cat-hero">
        <img src={categoryHero} alt="" className="cat-hero-bg" />
        <div className="cat-hero-gradient" />

        <div className="cat-hero-content">
          <h1 className="cat-heading">คุณชอบเที่ยวแบบไหน?</h1>
          <p className="cat-subheading">
            เลือกสิ่งที่คุณสนใจมากที่สุด เพื่อให้เราแนะนำสถานที่ที่ตรงใจคุณ
          </p>
        </div>

        {/* Counter badge */}
        <div className="cat-counter">
          <span className="cat-counter-star">⭐</span>
          <span>เลือกแล้ว {selected.length} จาก {CATEGORIES.length} หมวด</span>
        </div>
      </div>

      {/* ── Category grid ── */}
      <div className="cat-body">
        <div className="cat-grid">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`cat-card${selected.includes(cat.id) ? ' is-active' : ''}`}
              onClick={() => toggleCategory(cat.id)}
              aria-pressed={selected.includes(cat.id)}
            >
              <span className="cat-card-icon">{cat.icon}</span>
              <span className="cat-card-label">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="cat-actions">
          <button
            className="cat-next-btn"
            disabled={selected.length === 0 || saving}
            onClick={handleNext}
          >
            <span>{saving ? 'กำลังบันทึก...' : 'ถัดไป'}</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <p className="cat-note">เลือกได้สูงสุด {CATEGORIES.length} หมวด</p>
          {saveError && (
            <p className="cat-note" style={{ color: '#BA1A1A', marginTop: 8 }}>
              {saveError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;
