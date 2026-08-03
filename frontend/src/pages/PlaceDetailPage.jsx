import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_STYLES } from '../components/PlaceCard';
import PlaceCard from '../components/PlaceCard';
import PlaceMap from '../components/PlaceMap';
import Navbar from '../components/Navbar';
import { interactionStorage } from '../services/interactionStorage';


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
  const [relatedPlaces, setRelatedPlaces] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryErrors, setGalleryErrors] = useState({});
  const [lightboxIdx, setLightboxIdx] = useState(null); // null = ปิด
  const [gallerySlideIdx, setGallerySlideIdx] = useState(0);



  // Fetch place details
  useEffect(() => {
    setLoading(true);
    api.places.getAll()
      .then((data) => {
        const found = Array.isArray(data) ? data.find((p) => String(p.id) === String(id)) : null;
        if (!found) throw new Error('ไม่พบข้อมูลสถานที่นี้');
        setPlace(found);
        setImgSrc(found.image_url || FALLBACK_IMAGES[found.id % FALLBACK_IMAGES.length]);

        if (user) {
          api.signals.log({ place_id: found.id, signal_type: 'view' }).catch(() => { });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, user]);

  // ดึงรูปภาพทั้งหมดจาก place_images
  useEffect(() => {
    if (!place) return;
    api.places.getImages(place.id)
      .then((urls) => {
        if (Array.isArray(urls) && urls.length > 0) {
          setGalleryImages(urls);
        } else if (place.image_url) {
          setGalleryImages([place.image_url]);
        }
      })
      .catch(() => {
        if (place.image_url) setGalleryImages([place.image_url]);
      });
  }, [place]);

  // Fetch current user liked/saved interactions on load (local + backend)
  useEffect(() => {
    if (!id) return;

    // Check local storage state first so it displays instantly
    setLiked(interactionStorage.isLiked(id));
    setSaved(interactionStorage.isSaved(id));

    if (user) {
      api.user.getInteractions()
        .then((res) => {
          if (res.success) {
            const isLikedBackend = Array.isArray(res.liked) && res.liked.includes(Number(id));
            const isSavedBackend = Array.isArray(res.saved) && res.saved.includes(Number(id));
            setLiked(isLikedBackend || interactionStorage.isLiked(id));
            setSaved(isSavedBackend || interactionStorage.isSaved(id));
          }
        })
        .catch(() => { });
    }
  }, [id, user]);


  useEffect(() => {
    if (!place) return;

    // ดึง category_ids อันแรกจาก place
    const firstCategoryId = place.category_ids
      ? String(place.category_ids).split(',')[0]
      : null;

    if (!firstCategoryId) return;

    api.places.getAll({ category_id: firstCategoryId })
      .then((data) => {
        if (!Array.isArray(data)) return;
        // กรองสถานที่ตัวเองออก และแสดงสูงสุด 8 สถานที่
        const filtered = data
          .filter((p) => String(p.id) !== String(place.id))
          .slice(0, 8);
        setRelatedPlaces(filtered);
      })
      .catch(() => { });
  }, [place]);

  const handleSignal = async (type) => {
    if (type === 'share') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('📋 คัดลอกลิงก์สถานที่ท่องเที่ยวไปยังคลิปบอร์ดแล้ว!');
      } catch {
        alert('ไม่สามารถคัดลอกลิงก์ได้');
      }
      if (user && place) {
        api.signals.log({ place_id: place.id, signal_type: 'share' }).catch(() => { });
      }
      return;
    }
    if (!place) return;
    if (type === 'like') {
      const nextLiked = interactionStorage.toggleLike(place);
      setLiked(nextLiked);
    }
    if (type === 'save') {
      const nextSaved = interactionStorage.toggleSave(place);
      setSaved(nextSaved);
    }
    if (user && type !== 'like' && type !== 'save') {
      try {
        await api.signals.log({ place_id: place.id, signal_type: type });
      } catch { /* silent */ }
    }
  };

  const categories = useMemo(() => {
    if (!place) return [];
    return Array.isArray(place.categories)
      ? place.categories
      : (place.categories || '').split(',').filter(Boolean);
  }, [place]);

  const fullAddress = useMemo(() => {
    if (!place) return '';
    const parts = [];
    if (place.subdistrict) {
      const prefix = place.province === 'กรุงเทพมหานคร' ? 'แขวง' : 'ต.';
      parts.push(`${prefix}${place.subdistrict}`);
    }
    if (place.district) {
      const prefix = place.province === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.';
      parts.push(`${prefix}${place.district}`);
    }
    if (place.province) {
      const prefix = place.province === 'กรุงเทพมหานคร' ? '' : 'จ.';
      parts.push(`${prefix}${place.province}`);
    }
    return parts.join(' ');
  }, [place]);

  return (
    <div className="detail-page-wrapper">
      <Navbar />
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
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
                </div>

                {/* Map — แสดงแผนที่จริงถ้ามีพิกัด */}
                {place.latitude && place.longitude ? (
                  <PlaceMap
                    lat={Number(place.latitude)}
                    lng={Number(place.longitude)}
                    name={place.place_name}
                  />
                ) : (
                  <div className="detail-map-preview-card detail-map-no-coords">
                    <div className="detail-map-pin">📍</div>
                    <p className="detail-map-no-coords-text">ไม่มีข้อมูลพิกัด</p>
                  </div>
                )}

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

            {/* Separator */}
            {galleryImages.length > 0 && <div className="detail-separator" style={{ margin: '36px 0 28px' }} />}

            {/* Photo Gallery Section (อยู่ใต้รายละเอียดใน card แบบ Slider + ปุ่มซ้ายขวา) */}
            {galleryImages.length > 0 && (
              <section className="detail-gallery-section">
                <div className="detail-gallery-section-header">
                  <div className="detail-gallery-header-left">
                    <h3 className="detail-gallery-section-title">แกลเลอรีภาพถ่าย</h3>
                    <span className="detail-gallery-section-count">{galleryImages.length} รูป</span>
                  </div>

                  {/* ปุ่มกดเลื่อนซ้าย - ขวา */}
                  {galleryImages.length > 3 && (
                    <div className="detail-gallery-nav-buttons">
                      <button
                        className="detail-gallery-arrow-btn"
                        onClick={() => setGallerySlideIdx((prev) => (prev > 0 ? prev - 1 : Math.max(0, galleryImages.length - 3)))}
                        title="รูปก่อนหน้า"
                        aria-label="รูปก่อนหน้า"
                      >
                        ‹
                      </button>
                      <button
                        className="detail-gallery-arrow-btn"
                        onClick={() => setGallerySlideIdx((prev) => (prev < Math.max(0, galleryImages.length - 3) ? prev + 1 : 0))}
                        title="รูปถัดไป"
                        aria-label="รูปถัดไป"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>

                <div className="detail-gallery-slider-viewport">
                  <div
                    className="detail-gallery-slider-track"
                    style={{
                      transform: `translateX(-${gallerySlideIdx * (100 / Math.min(3, galleryImages.length))}%)`,
                    }}
                  >
                    {galleryImages.map((url, i) => (
                      <div key={i} className="detail-gallery-slide-item">
                        <button
                          className="detail-gallery-item"
                          onClick={() => setLightboxIdx(i)}
                          aria-label={`ดูรูปที่ ${i + 1}`}
                        >
                          <img
                            src={galleryErrors[i] ? FALLBACK_IMAGES[place.id % FALLBACK_IMAGES.length] : url}
                            alt={`${place.place_name} ${i + 1}`}
                            onError={() => setGalleryErrors((p) => ({ ...p, [i]: true }))}
                            loading="lazy"
                          />
                          <div className="detail-gallery-item-overlay">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}


          </div>



          {/* Lightbox */}
          {lightboxIdx !== null && (
            <div
              className="detail-lightbox-overlay"
              onClick={() => setLightboxIdx(null)}
            >
              <button
                className="detail-lightbox-close"
                onClick={() => setLightboxIdx(null)}
                aria-label="ปิด"
              >
                ×
              </button>
              <button
                className="detail-lightbox-arrow detail-lightbox-arrow-left"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i - 1 + galleryImages.length) % galleryImages.length); }}
                aria-label="ก่อนหน้า"
              >❮</button>
              <img
                src={galleryErrors[lightboxIdx] ? FALLBACK_IMAGES[place.id % FALLBACK_IMAGES.length] : galleryImages[lightboxIdx]}
                alt={`${place.place_name} ${lightboxIdx + 1}`}
                className="detail-lightbox-img"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="detail-lightbox-arrow detail-lightbox-arrow-right"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => (i + 1) % galleryImages.length); }}
                aria-label="ถัดไป"
              >❯</button>
              <div className="detail-lightbox-counter">{lightboxIdx + 1} / {galleryImages.length}</div>
            </div>
          )}

          {/* Related Places Section */}
          {relatedPlaces.length > 0 && (
            <section className="detail-related-section">
              <div className="detail-related-header">
                <h2 className="detail-related-title">สถานที่ที่เกี่ยวข้อง</h2>
                <p className="detail-related-subtitle">
                  สถานที่ในหมวดหมู่เดียวกันที่คุณอาจชอบ
                </p>
              </div>
              <div className="detail-related-grid">
                {relatedPlaces.map((p) => (
                  <PlaceCard key={p.id} place={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default PlaceDetailPage;
