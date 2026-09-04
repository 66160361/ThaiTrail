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
    : (place.categories || '').split(',').map((cat) => cat.trim()).filter(Boolean);

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

  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const handleDoubleTap = (e) => {
    e.stopPropagation();
    if (!liked) {
      const nextLiked = interactionStorage.toggleLike(place);
      setLiked(nextLiked);
      setSaved(nextLiked);
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 900);
  };

  return (
    <article className="tt-card fade-in" onClick={handleCardClick}>
      {/* 1. IG-Style Post Header */}
      <div className="tt-card-ig-header">
        <div className="tt-card-ig-avatar">
          <span>📍</span>
        </div>
        <div className="tt-card-ig-userinfo">
          <span className="tt-card-ig-name">{place.place_name}</span>
          <span className="tt-card-ig-loc">{locationText}</span>
        </div>
        {categories[0] && (
          <span className="tt-card-ig-tag">{categories[0]}</span>
        )}
      </div>

      {/* 2. Top Image Section with Double Tap */}
      <div className="tt-card-image-wrapper" onDoubleClick={handleDoubleTap}>
        <img
          src={imgSrc}
          alt={place.place_name}
          onError={() => setImgSrc(FALLBACK_IMAGES[Math.abs(Number(place.id) || 0) % FALLBACK_IMAGES.length])}
          loading="lazy"
          className="tt-card-img"
        />

        {/* IG-style Heart Pop on Double Tap */}
        {showHeartBurst && (
          <div className="tt-card-heart-burst">
            <svg width="68" height="68" viewBox="0 0 24 24" fill="#E53E3E">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        )}
      </div>

      {/* 3. IG Action Bar (Heart / Share / Bookmark) */}
      <div className="tt-card-ig-actions" onClick={(e) => e.stopPropagation()}>
        <div className="tt-card-ig-actions-left">
          {/* Like Button */}
          <button
            className={`tt-ig-action-btn ${liked ? 'is-liked' : ''}`}
            onClick={(e) => signal(e, 'like')}
            title={liked ? 'เลิกถูกใจ' : 'ถูกใจ'}
            aria-label="Heart button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={liked ? '#E53E3E' : 'none'} stroke={liked ? '#E53E3E' : '#262626'} strokeWidth="1.8">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>

          {/* Share Button */}
          <button
            className="tt-ig-action-btn"
            onClick={async (e) => {
              e.stopPropagation();
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: place.place_name,
                    text: place.description || '',
                    url: `${window.location.origin}/places/${place.id}`,
                  });
                } catch { /* cancel */ }
              } else {
                navigator.clipboard.writeText(`${window.location.origin}/places/${place.id}`);
                alert('📋 คัดลอกลิงก์เรียบร้อยแล้ว');
              }
            }}
            title="แชร์"
            aria-label="Share button"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        {/* Bookmark Button on Right */}
        <button
          className={`tt-ig-action-btn ${saved ? 'is-saved' : ''}`}
          onClick={(e) => signal(e, 'save')}
          title={saved ? 'ยกเลิกการบันทึก' : 'บันทึก'}
          aria-label="Save button"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={saved ? '#0D330E' : 'none'} stroke={saved ? '#0D330E' : '#262626'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* 4. Card Caption & Badges */}
      <div className="tt-card-body">
        <p className="tt-card-desc">
          <strong className="tt-card-caption-title">{place.place_name}</strong>{' '}
          {place.description || 'สถานที่ท่องเที่ยวบรรยากาศสวยงาม เหมาะแก่การพักผ่อน'}
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
