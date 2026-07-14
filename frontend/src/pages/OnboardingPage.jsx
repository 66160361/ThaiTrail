import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [selected, setSelected] = useState([]);

  const toggleCategory = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (selected.length === 0) return;
    localStorage.setItem('guest_interests', JSON.stringify(selected));
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
            disabled={selected.length === 0}
            onClick={handleNext}
          >
            <span>ถัดไป</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <p className="cat-note">เลือกได้สูงสุด {CATEGORIES.length} หมวด</p>
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;
