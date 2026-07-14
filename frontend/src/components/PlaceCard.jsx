import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Category colors (consistent with the 8 Thai categories)
const CATEGORY_STYLES = {
  'ศาสนาและความเชื่อ':     { color: '#B8860B', bg: 'rgba(252,211,77,0.18)' },
  'ธรรมชาติและผจญภัย':    { color: '#0D7A3F', bg: 'rgba(52,211,153,0.15)' },
  'ทะเลและเกาะ':           { color: '#0369A1', bg: 'rgba(56,189,248,0.15)' },
  'สวนสัตว์':              { color: '#6D28D9', bg: 'rgba(167,139,250,0.15)' },
  'ถ่ายภาพ':               { color: '#BE185D', bg: 'rgba(244,114,182,0.15)' },
  'ประวัติศาสตร์และวัฒนธรรม': { color: '#C2410C', bg: 'rgba(251,146,60,0.15)' },
  'อาหารคาเฟ่และไลฟ์สไตล์': { color: '#B91C1C', bg: 'rgba(248,113,113,0.15)' },
  'ประเพณีและเทศกาล':      { color: '#7C3AED', bg: 'rgba(192,132,252,0.15)' },
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=800',
];

function PlaceCard({ place, showScore = false, onDismissed }) {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [liked,     setLiked]     = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [imgSrc,    setImgSrc]    = useState(
    place.image_url || FALLBACK_IMAGES[place.id % FALLBACK_IMAGES.length]
  );

  const signal = async (e, type) => {
    e.stopPropagation();
    if (!user) return; // no auth — ignore silently
    try {
      await api.signals.log({ place_id: place.id, signal_type: type });
      if (type === 'like')    setLiked((v) => !v);
      if (type === 'save')    setSaved((v) => !v);
      if (type === 'dismiss') {
        setDismissed(true);
        onDismissed?.(place.id);
      }
    } catch { /* silent */ }
  };

  const categories = Array.isArray(place.categories)
    ? place.categories
    : (place.categories || '').split(',').filter(Boolean);

  if (dismissed) return null;

  return (
    <article className="place-card fade-in" onClick={() => navigate(`/places/${place.id}`)}>
      {/* Image */}
      <div className="place-card-image">
        <img
          src={imgSrc}
          alt={place.place_name}
          onError={() => setImgSrc(FALLBACK_IMAGES[place.id % FALLBACK_IMAGES.length])}
          loading="lazy"
        />
        <div className="place-card-gradient" />

        {showScore && place.score != null && (
          <div className="place-card-score">⭐ {place.score.toFixed(1)}</div>
        )}

        {/* Action buttons (appear on hover via CSS) */}
        <div className="place-card-actions">
          <button
            className={`action-btn${liked ? ' liked' : ''}`}
            onClick={(e) => signal(e, 'like')}
            title={liked ? 'เลิกถูกใจ' : 'ถูกใจ'}
          >
            {liked ? '❤️' : '🤍'}
          </button>
          <button
            className={`action-btn${saved ? ' saved' : ''}`}
            onClick={(e) => signal(e, 'save')}
            title={saved ? 'เลิกบันทึก' : 'บันทึก'}
          >
            {saved ? '🔖' : '📌'}
          </button>
          <button
            className="action-btn"
            onClick={(e) => signal(e, 'dismiss')}
            title="ไม่สนใจ"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Text */}
      <div className="place-card-body">
        <div className="place-card-cats">
          {categories.slice(0, 2).map((cat) => {
            const style = CATEGORY_STYLES[cat] || { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' };
            return (
              <span
                key={cat}
                className="category-pill"
                style={{ color: style.color, borderColor: style.color, background: style.bg }}
              >
                {cat}
              </span>
            );
          })}
        </div>
        <h3 className="place-card-name">{place.place_name}</h3>
        <p className="place-card-location">
          📍 {[place.district, place.province].filter(Boolean).join(', ') || '—'}
        </p>
      </div>
    </article>
  );
}

export default PlaceCard;
export { CATEGORY_STYLES };
