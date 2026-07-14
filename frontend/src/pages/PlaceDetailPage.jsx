import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_STYLES } from '../components/PlaceCard';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200',
  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200',
  'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=1200',
];

function PlaceDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [place,   setPlace]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [liked,   setLiked]   = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [imgSrc,  setImgSrc]  = useState('');

  // Fetch place by filtering from getAll — simple approach without a dedicated endpoint
  useEffect(() => {
    setLoading(true);
    api.places.getAll()
      .then((data) => {
        const found = Array.isArray(data) ? data.find((p) => String(p.id) === String(id)) : null;
        if (!found) throw new Error('ไม่พบข้อมูลสถานที่นี้');
        setPlace(found);
        setImgSrc(found.image_url || FALLBACK_IMAGES[found.id % FALLBACK_IMAGES.length]);
        // Fire view signal
        if (user) {
          api.signals.log({ place_id: found.id, signal_type: 'view' }).catch(() => {});
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  const handleSignal = async (type) => {
    if (type === 'share') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('📋 คัดลอกลิงก์สถานที่ท่องเที่ยวไปยังคลิปบอร์ดแล้ว!');
      } catch {
        alert('ไม่สามารถคัดลอกลิงก์ได้');
      }
      if (user && place) {
        api.signals.log({ place_id: place.id, signal_type: 'share' }).catch(() => {});
      }
      return;
    }
    if (!place) return;
    if (type === 'like') setLiked((v) => !v);
    if (type === 'save') setSaved((v) => !v);
    if (!user) return; // Silent local state change for guests
    try {
      await api.signals.log({ place_id: place.id, signal_type: type });
    } catch { /* silent */ }
  };

  const categories = place
    ? (Array.isArray(place.categories) ? place.categories : (place.categories || '').split(',').filter(Boolean))
    : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Loading */}
      {loading && (
        <div className="loading-screen">
          <div className="spinner" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="center-page">
          <div className="glass auth-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😞</div>
            <h2 style={{ marginBottom: 8 }}>{error}</h2>
            <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
              ← ย้อนกลับ
            </button>
          </div>
        </div>
      )}

      {/* Detail */}
      {!loading && !error && place && (
        <>
          {/* Hero image */}
          <div style={{ position: 'relative', width: '100%', height: '55vh', minHeight: 320, overflow: 'hidden' }}>
            <img
              src={imgSrc}
              alt={place.place_name}
              onError={() => setImgSrc(FALLBACK_IMAGES[place.id % FALLBACK_IMAGES.length])}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Gradient overlays */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 60%, var(--bg) 100%)',
            }} />
            {/* Back button */}
            <button
              className="btn btn-ghost"
              style={{ position: 'absolute', top: 80, left: 24, backdropFilter: 'blur(8px)', background: 'rgba(255, 255, 255, 0.85)', color: '#000', border: '1px solid rgba(0,0,0,0.1)' }}
              onClick={() => navigate(-1)}
            >
              ← ย้อนกลับ
            </button>
          </div>

          {/* Content */}
          <div className="container" style={{ padding: '0 24px 60px', marginTop: 24, position: 'relative' }}>
            <div className="fade-in">

              {/* Category pills */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {categories.map((cat) => {
                  const style = CATEGORY_STYLES[cat] || { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' };
                  return (
                    <span
                      key={cat}
                      className="category-pill"
                      style={{ color: style.color, borderColor: style.color, background: style.bg, padding: '5px 14px', fontSize: 13 }}
                    >
                      {cat}
                    </span>
                  );
                })}
              </div>

              <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
                {place.place_name}
              </h1>

              <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 24 }}>
                📍 {[place.subdistrict, place.district, place.province].filter(Boolean).join(', ')}
              </p>

              {/* Description */}
              {place.description && (
                <div
                  className="glass"
                  style={{ padding: '20px 24px', marginBottom: 24, lineHeight: 1.8 }}
                >
                  <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)' }}>
                    เกี่ยวกับสถานที่
                  </h2>
                  <p style={{ fontSize: 15, color: 'var(--text)' }}>{place.description}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="detail-actions-bar">
                <button
                  className={`detail-action-btn like-btn${liked ? ' active' : ''}`}
                  onClick={() => handleSignal('like')}
                  title="ถูกใจ"
                >
                  <div className="detail-action-icon-wrap">
                    {liked ? '❤️' : '🤍'}
                  </div>
                  <span className="detail-action-label">ถูกใจ</span>
                </button>

                <button
                  className={`detail-action-btn save-btn${saved ? ' active' : ''}`}
                  onClick={() => handleSignal('save')}
                  title="บันทึก"
                >
                  <div className="detail-action-icon-wrap">
                    {saved ? '🔖' : '📌'}
                  </div>
                  <span className="detail-action-label">บันทึก</span>
                </button>

                <button
                  className="detail-action-btn"
                  onClick={() => handleSignal('share')}
                  title="แชร์"
                >
                  <div className="detail-action-icon-wrap">
                    🔗
                  </div>
                  <span className="detail-action-label">แชร์</span>
                </button>
              </div>

              {/* Map link */}
              {place.latitude && place.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${place.latitude},${place.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ display: 'inline-flex' }}
                >
                  🗺️ ดูบน Google Maps
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PlaceDetailPage;
