import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { resolvePlaceImage, FALLBACK_IMAGES } from '../services/placeImageResolver';
import { interactionStorage } from '../services/interactionStorage';

// Category color themes according to spec
export const CATEGORY_STYLES = {
  'ศาสนาและความเชื่อ': { color: '#B8860B', bg: 'rgba(252,211,77,0.18)' },
  'ธรรมชาติและผจญภัย': { color: '#0D7A3F', bg: 'rgba(52,211,153,0.15)' },
  'ทะเลและเกาะ': { color: '#0369A1', bg: 'rgba(56,189,248,0.15)' },
  'สวนสัตว์': { color: '#6D28D9', bg: 'rgba(167,139,250,0.15)' },
  'ถ่ายภาพ': { color: '#BE185D', bg: 'rgba(244,114,182,0.15)' },
  'ประวัติศาสตร์และวัฒนธรรม': { color: '#C2410C', bg: 'rgba(251,146,60,0.15)' },
  'อาหารคาเฟ่และไลฟ์สไตล์': { color: '#B91C1C', bg: 'rgba(248,113,113,0.15)' },
  'ประเพณีและเทศกาล': { color: '#7C3AED', bg: 'rgba(192,132,252,0.15)' },
};

const CATEGORY_TAG_STYLES = [
  { bg: 'rgba(174, 238, 203, 0.3)', border: '1px solid rgba(44, 105, 78, 0.1)', color: '#2C694E' },
  { bg: 'rgba(255, 159, 28, 0.1)', border: '1px solid rgba(255, 202, 28, 0.1)', color: '#895100' },
  { bg: 'rgba(147, 197, 253, 0.25)', border: '1px solid rgba(30, 64, 175, 0.1)', color: '#1E40AF' },
  { bg: 'rgba(243, 232, 255, 0.6)', border: '1px solid rgba(109, 40, 217, 0.1)', color: '#6D28D9' },
];

function PlaceCard({ place, showScore = false, onDismissed }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [liked, setLiked] = useState(() => interactionStorage.isLiked(place.id));
  const [saved, setSaved] = useState(() => interactionStorage.isSaved(place.id));
  const [imgSrc, setImgSrc] = useState(() => resolvePlaceImage(place, FALLBACK_IMAGES));

  const signal = async (e, type) => {
    e.stopPropagation();
    if (type === 'like' || type === 'save') {
      const nextLiked = interactionStorage.toggleLike(place);
      setLiked(nextLiked);
      setSaved(nextLiked);
    }
    if (user && type !== 'like' && type !== 'save') {
      try {
        await api.signals.log({ place_id: place.id, signal_type: type });
      } catch { /* silent */ }
    }
  };

  const rawCats = Array.isArray(place.categories)
    ? place.categories
    : (place.categories || '').split(',').filter(Boolean);

  // Shorten category names for clean badges
  const categories = rawCats.slice(0, 2).map(c => {
    return c.replace('และผจญภัย', '')
            .replace('และเกาะ', '')
            .replace('และศาสนา', '')
            .replace('และวัฒนธรรม', '')
            .replace('คาเฟ่และไลฟ์สไตล์', '')
            .replace('และเทศกาล', '');
  });

  const locationText = place.province || place.district || 'ประเทศไทย';

  const handleCardClick = () => {
    sessionStorage.setItem('scroll_pos', window.scrollY);
    navigate(`/places/${place.id}`);
  };

  return (
    <article className="tt-card fade-in" onClick={handleCardClick}>
      {/* Top Image Section */}
      <div className="tt-card-image-wrapper">
        <img
          src={imgSrc}
          alt={place.place_name}
          onError={() => setImgSrc(FALLBACK_IMAGES[Math.abs(Number(place.id) || 0) % FALLBACK_IMAGES.length])}
          loading="lazy"
          className="tt-card-img"
        />

        {/* Top-Right Heart Button */}
        <button
          className={`tt-card-heart-btn ${liked ? 'is-liked' : ''}`}
          onClick={(e) => signal(e, 'like')}
          title={liked ? 'เลิกถูกใจ' : 'ถูกใจ'}
          aria-label="Heart button"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? '#E53E3E' : 'none'} stroke={liked ? '#E53E3E' : '#000000'} strokeWidth="1.8">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>

        {/* Bottom-Left Location Floating Tag */}
        <div className="tt-card-location-tag">
          <svg width="14" height="15" viewBox="0 0 24 24" fill="#FF9F1C" style={{ flexShrink: 0 }}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span className="tt-card-location-text">{locationText}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="tt-card-body">
        <h3 className="tt-card-title">{place.place_name}</h3>
        <p className="tt-card-desc">
          {place.description || 'สถานที่ท่องเที่ยวบรรยากาศสวยงาม เหมาะแก่การพักผ่อนและสัมผัสความสวยงามของธรรมชาติ'}
        </p>

        {/* Category Badges */}
        <div className="tt-card-badges">
          {categories.map((cat, idx) => {
            const rawCat = rawCats[idx] || '';
            const catStyle = CATEGORY_STYLES[rawCat.trim()];
            const fallback = CATEGORY_TAG_STYLES[idx % CATEGORY_TAG_STYLES.length];
            return (
              <span
                key={cat + idx}
                className="tt-card-badge"
                style={{
                  background: catStyle ? catStyle.bg : fallback.bg,
                  border: catStyle ? `1px solid ${catStyle.color}22` : fallback.border,
                  color: catStyle ? catStyle.color : fallback.color,
                }}
              >
                {cat}
              </span>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default PlaceCard;
