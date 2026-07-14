import { useEffect, useState, useMemo } from 'react';
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imgSrc, setImgSrc] = useState('');

  // Fetch place details
  useEffect(() => {
    setLoading(true);
    api.places.getAll()
      .then((data) => {
        const found = Array.isArray(data) ? data.find((p) => String(p.id) === String(id)) : null;
        if (!found) throw new Error('ไม่พบข้อมูลสถานที่นี้');
        setPlace(found);
        setImgSrc(found.image_url || FALLBACK_IMAGES[found.id % FALLBACK_IMAGES.length]);
        // Log view signal
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
    if (!user) return; // Local toggle for guests
    try {
      await api.signals.log({ place_id: place.id, signal_type: type });
    } catch { /* silent */ }
  };

  const categories = useMemo(() => {
    if (!place) return [];
    return Array.isArray(place.categories)
      ? place.categories
      : (place.categories || '').split(',').filter(Boolean);
  }, [place]);

  const fullAddress = useMemo(() => {
    if (!place) return '';
    return [place.subdistrict, place.district, place.province]
      .filter(Boolean)
      .join(', ');
  }, [place]);

  return (
    <div className="detail-page-wrapper">
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

      {/* Detail Content */}
      {!loading && !error && place && (
        <>
          {/* Section - 1. Hero Header */}
          <div className="detail-hero-section">
            <img
              src={imgSrc}
              alt={place.place_name}
              onError={() => setImgSrc(FALLBACK_IMAGES[place.id % FALLBACK_IMAGES.length])}
              className="detail-hero-img"
            />
            <div className="detail-hero-gradient" />
            
            {/* Back Button */}
            <button
              className="detail-hero-back-btn"
              onClick={() => navigate(-1)}
              title="ย้อนกลับ"
            >
              ←
            </button>

            {/* Location Tag */}
            {place.province && (
              <div className="detail-hero-loc-tag">
                <span>📍</span>
                <span>{place.province}</span>
              </div>
            )}
          </div>

          {/* Section - 2. Content Body */}
          <div className="detail-content-body">
            
            {/* 3. Title Section */}
            <div className="detail-title-section">
              <div className="detail-title-left">
                <h1 className="detail-title-text">{place.place_name}</h1>
                <div className="detail-title-categories">
                  {categories.map((cat) => {
                    const style = CATEGORY_STYLES[cat] || { color: '#727272', bg: '#F5F3F3' };
                    return (
                      <span
                        key={cat}
                        className="detail-category-pill"
                        style={{
                          color: style.color,
                          backgroundColor: style.bg,
                        }}
                      >
                        {cat}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* 5. Action Grid */}
              <div className="detail-action-grid">
                <button
                  className={`detail-action-btn-circle like${liked ? ' active' : ''}`}
                  onClick={() => handleSignal('like')}
                  title="ถูกใจ"
                >
                  <div className="detail-action-btn-circle-bg">
                    {liked ? '❤️' : '🤍'}
                  </div>
                  <span className="detail-action-btn-circle-text">ถูกใจ</span>
                </button>

                <button
                  className={`detail-action-btn-circle save${saved ? ' active' : ''}`}
                  onClick={() => handleSignal('save')}
                  title="บันทึก"
                >
                  <div className="detail-action-btn-circle-bg">
                    {saved ? '🔖' : '📌'}
                  </div>
                  <span className="detail-action-btn-circle-text">บันทึก</span>
                </button>

                <button
                  className="detail-action-btn-circle"
                  onClick={() => handleSignal('share')}
                  title="แชร์"
                >
                  <div className="detail-action-btn-circle-bg">
                    🔗
                  </div>
                  <span className="detail-action-btn-circle-text">แชร์</span>
                </button>
              </div>
            </div>

            {/* Separator */}
            <div className="detail-separator" />

            {/* Two Column Section */}
            <div className="detail-two-columns">
              
              {/* Left Column: Description & Info Grid */}
              <div className="detail-left-col">
                {place.description && (
                  <p className="detail-desc-text">{place.description}</p>
                )}

                {/* 7. Info Grid (Opening hours, admission fee, dress code, contact) */}
                {(() => {
                  const infoItems = [];

                  let openingHoursStr = '';
                  const op = place.opening_time;
                  const cl = place.closing_time;

                  if (op || cl) {
                    const opStr = Array.isArray(op) ? op[0] : op;
                    const clStr = Array.isArray(cl) ? cl[0] : cl;
                    if (opStr && clStr) {
                      openingHoursStr = `${String(opStr).substring(0, 5)} - ${String(clStr).substring(0, 5)} น.`;
                    } else if (opStr) {
                      openingHoursStr = `เปิดตั้งแต่ ${String(opStr).substring(0, 5)} น.`;
                    } else if (clStr) {
                      openingHoursStr = `ปิดเวลา ${String(clStr).substring(0, 5)} น.`;
                    }
                  } else if (place.opening_hours) {
                    openingHoursStr = place.opening_hours;
                  }

                  if (openingHoursStr) {
                    infoItems.push({
                      label: 'เวลาทำการ',
                      value: openingHoursStr,
                      icon: '🕒'
                    });
                  }

                  const fee = place.admission_fee || place.fee || place.price;
                  if (fee) {
                    infoItems.push({
                      label: 'ค่าเข้าชม',
                      value: fee,
                      icon: '🎟️'
                    });
                  }

                  const dress = place.dress_code || place.dress;
                  if (dress) {
                    infoItems.push({
                      label: 'การแต่งกาย',
                      value: dress,
                      icon: '👔'
                    });
                  }

                  const contact = place.phone || place.contact || place.telephone;
                  if (contact) {
                    infoItems.push({
                      label: 'เบอร์ติดต่อ',
                      value: contact,
                      icon: '📞'
                    });
                  }

                  if (infoItems.length === 0) return null;

                  return (
                    <div className="detail-info-grid">
                      {infoItems.map((item, idx) => (
                        <div key={idx} className="detail-info-card">
                          <div className="detail-info-icon-circle">
                            {item.icon}
                          </div>
                          <div className="detail-info-text">
                            <span className="detail-info-label">{item.label}</span>
                            <span className="detail-info-value">{item.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Map Section */}
              <div className="detail-right-col">
                <div className="detail-map-header">
                  <h3 className="detail-map-title">ตำแหน่ง</h3>
                  {place.latitude && place.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${place.latitude},${place.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="detail-map-link"
                    >
                      ดูเส้นทาง
                    </a>
                  )}
                </div>

                {/* Map Preview Card */}
                <div className="detail-map-preview-card">
                  {/* Clean SVG/CSS map background design */}
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} opacity="0.15">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0D330E" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    <circle cx="100" cy="80" r="50" fill="#0D330E" filter="blur(20px)" opacity="0.3" />
                    <circle cx="200" cy="180" r="60" fill="#0284C7" filter="blur(20px)" opacity="0.2" />
                  </svg>
                  <div className="detail-map-pin">📍</div>
                </div>

                {/* Address details */}
                {fullAddress && (
                  <p className="detail-address-text">{fullAddress}</p>
                )}

                {/* Navigate Button */}
                {place.latitude && place.longitude ? (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-navigate-btn"
                  >
                    นำทาง
                  </a>
                ) : (
                  <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(place.place_name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-navigate-btn"
                  >
                    ค้นหาบนแผนที่
                  </a>
                )}
              </div>

            </div>

          </div>
        </>
      )}
    </div>
  );
}

export default PlaceDetailPage;
