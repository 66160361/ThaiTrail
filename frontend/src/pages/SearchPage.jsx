import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Navbar from '../components/Navbar';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200',
  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200',
  'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=1200',
];

const CATEGORY_TILES = [
  { id: 'ศาสนาและความเชื่อ', label: 'ศาสนา', icon: '🛕' },
  { id: 'ธรรมชาติและผจญภัย', label: 'ธรรมชาติ', icon: '🌄' },
  { id: 'ทะเลและเกาะ', label: 'ทะเล', icon: '🌊' },
  { id: 'สวนสัตว์', label: 'สัตว์ป่า', icon: '🐘' },
  { id: 'ประวัติศาสตร์และวัฒนธรรม', label: 'ประวัติศาสตร์', icon: '🏛️' },
  { id: 'อาหารคาเฟ่และไลฟ์สไตล์', label: 'อาหาร', icon: '🍜' },
  { id: 'ประเพณีและเทศกาล', label: 'เทศกาล', icon: '🎉' },
  { id: 'ถ่ายภาพ', label: 'ถ่ายภาพ', icon: '📷' },
];

const DISTANCE_OPTIONS = [
  { id: 'any', label: 'ไม่จำกัด', max: null },
  { id: '5', label: '5 กม.', max: 5 },
  { id: '10', label: '10 กม.', max: 10 },
  { id: '25', label: '25 กม.', max: 25 },
  { id: '50', label: '50 กม.+', max: 50 },
];

const PAGE_SIZE = 5;

function toCategoryArray(place) {
  return Array.isArray(place.categories)
    ? place.categories
    : (place.categories || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function toTimeMinutes(value) {
  if (!value) return null;
  const stringValue = String(value).trim();
  const match = stringValue.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getFirstTime(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.length > 0 ? rawValue[0] : null;
  }
  if (typeof rawValue === 'string' && rawValue.trim()) {
    const items = rawValue.split(',').map((item) => item.trim()).filter(Boolean);
    return items.length > 0 ? items[0] : null;
  }
  return null;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatTime(value) {
  if (!value || value === 'null' || value === 'NULL') return null;

  const time = getFirstTime(value);

  if (!time || time === 'null' || time === 'NULL') {
    return null;
  }

  return time;
}

function SearchPage() {
  const navigate = useNavigate();
  const resultsRef = useRef(null);

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [distanceId, setDistanceId] = useState('any');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    let isMounted = true;

    setLoading(true);
    api.places.getAll()
      .then((res) => {
        const data = Array.isArray(res) ? res : (res.data || []);
        if (isMounted) setPlaces(data);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'ไม่สามารถโหลดข้อมูลสถานที่ได้');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.log("Geolocation error:", error);
      }
    );
  }, []);

  const provinceOptions = useMemo(() => {
    return Array.from(new Set(places.map((place) => (place.province || '').trim()).filter(Boolean))).sort();
  }, [places]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredPlaces = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const selectedDistance = DISTANCE_OPTIONS.find((item) => item.id === distanceId);

    return places.filter((place) => {
      const categories = toCategoryArray(place);

      // 1. กรองตามหมวดหมู่
      if (selectedCategory && !categories.includes(selectedCategory)) {
        return false;
      }

      // 2. กรองตามจังหวัด
      if (selectedProvince && place.province !== selectedProvince) {
        return false;
      }

      // 3. กรองตามคำค้นหา (Query)
      if (normalizedQuery) {
        const searchable = [
          place.place_name,
          place.province,
          place.district,
          place.subdistrict,
          place.description,
          categories.join(' '),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchable.includes(normalizedQuery)) {
          return false;
        }
      }

      // 4. กรองตามสถานะเปิด/ปิด
      if (openNowOnly) {
        const opening = toTimeMinutes(getFirstTime(place.opening_time));
        const closing = toTimeMinutes(getFirstTime(place.closing_time));

        if (opening === null || closing === null) {
          return false;
        }

        if (closing >= opening) {
          if (nowMinutes < opening || nowMinutes > closing) {
            return false;
          }
        } else {
          const isOpenOvernight = nowMinutes >= opening || nowMinutes <= closing;
          if (!isOpenOvernight) {
            return false;
          }
        }
      }

// 5. กรองตามระยะทาง (Distance Filter)
if (selectedDistance?.max) {
  // ถ้าระบบดึงตำแหน่งผู้ใช้ไม่ได้ ให้ตัดออกไปก่อน
  if (!userLocation) return false;

  // ดึงพิกัดสถานที่
  const rawLat = place.latitude ?? place.lat;
  const rawLng = place.longitude ?? place.lng;

  const lat = Number(rawLat);
  const lng = Number(rawLng);

  // ถ้าสถานที่ไหนไม่มีพิกัด ให้คัดออก
  if (!rawLat || !rawLng || isNaN(lat) || isNaN(lng)) {
    return false;
  }

  // คำนวณระยะทาง
  const distance = calculateDistance(
    userLocation.lat,
    userLocation.lng,
    lat,
    lng
  );

  // 💡 แยกเงื่อนไขกรณี 50 กม.+ กับระยะอื่นๆ
  if (selectedDistance.id === '50') {
    // 50 กม.+ หมายถึง ต้องมีระยะทาง >= 50 กม. ขึ้นไป
    if (distance <= 50) {
      return false; // ตัวที่น้อยกว่า 50 กม. ให้คัดออก
    }
  } else {
    // กรณี 5, 10, 25 กม. หมายถึง ระยะทางต้องไม่เกินค่า max
    if (distance > selectedDistance.max) {
      return false; // ตัวที่เกินระยะ max ให้คัดออก
    }
  }
}

      return true;
    });
  }, [
    places,
    selectedCategory,
    selectedProvince,
    normalizedQuery,
    openNowOnly,
    distanceId,
    userLocation,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredPlaces.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const pagedPlaces = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPlaces.slice(start, start + PAGE_SIZE);
  }, [filteredPlaces, page]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 3;
    const start = Math.max(1, Math.min(page - 1, totalPages - maxButtons + 1));
    const end = Math.min(totalPages, start + maxButtons - 1);
    const pages = [];
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  const clearAllFilters = () => {
    setQuery('');
    setSelectedCategory('');
    setSelectedProvince('');
    setDistanceId('any');
    setOpenNowOnly(false);
    setPage(1);
  };

  const applyFilters = () => {
    setPage(1);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onCategoryClick = (categoryId) => {
    setSelectedCategory((prev) => (prev === categoryId ? '' : categoryId));
    setPage(1);
  };

  return (
    <div className="search-v2-page" style={{ paddingTop: '72px' }}>
      <Navbar />
      <div className="search-v2-container">
        <section className="search-v2-topbar fade-in">
          <span className="search-v2-icon">⌕</span>
          <input
            className="search-v2-top-input"
            type="search"
            placeholder="ค้นหาสถานที่ท่องเที่ยว กิจกรรม หรือจังหวัด..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </section>

        <div className="search-v2-layout fade-in-2">
          <aside className="search-v2-sidebar">
            <div className="search-v2-filter-head">
              <h3>ตัวกรอง</h3>
              <button className="search-v2-clear-btn" onClick={clearAllFilters}>
                ล้างทั้งหมด
              </button>
            </div>

            <div className="search-v2-filter-block">
              <p className="search-v2-label">◉ จังหวัด</p>
              <div className="search-v2-select-wrap">
                <select
                  className="search-v2-select"
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">เลือกจังหวัด</option>
                  {provinceOptions.map((province) => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
                <span className="search-v2-select-arrow">⌄</span>
              </div>
            </div>

            <div className="search-v2-filter-block">
              <p className="search-v2-label">◎ ระยะทางจากตำแหน่งปัจจุบัน</p>
              <div className="search-v2-chip-wrap">
                {DISTANCE_OPTIONS.map((distance) => (
                  <button
                    key={distance.id}
                    className={`search-v2-chip${distanceId === distance.id ? ' active' : ''}`}
                    onClick={() => {
                      setDistanceId(distance.id);
                      setPage(1); // Reset หน้ารายการกลับไปที่หน้า 1 เสมอเมื่อเปลี่ยนระยะทาง
                    }}
                    title={distance.max === null ? 'แสดงทุกระยะ' : `สูงสุด ${distance.max} กม.`}
                  >
                    {distance.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="search-v2-filter-block">
              <p className="search-v2-label">◉ เปิดให้บริการ</p>
              <label className="search-v2-switch-row">
                <span>เปิดอยู่ตอนนี้</span>
                <button
                  type="button"
                  className={`search-v2-switch${openNowOnly ? ' active' : ''}`}
                  onClick={() => {
                    setOpenNowOnly((prev) => !prev);
                    setPage(1);
                  }}
                  aria-pressed={openNowOnly}
                >
                  <span className="search-v2-switch-dot" />
                </button>
              </label>
            </div>

            <button className="search-v2-submit-btn" onClick={applyFilters}>
              ดูผลลัพธ์ ({filteredPlaces.length})
            </button>
          </aside>

          <main className="search-v2-content" ref={resultsRef}>
            <section>
              <h2 className="search-v2-section-title">ค้นหาตามหมวดหมู่</h2>
              <div className="search-v2-category-grid">
                {CATEGORY_TILES.map((tile) => (
                  <button
                    key={tile.id}
                    className={`search-v2-category-tile${selectedCategory === tile.id ? ' active' : ''}`}
                    onClick={() => onCategoryClick(tile.id)}
                  >
                    <span className="search-v2-category-icon">{tile.icon}</span>
                    <span className="search-v2-category-label">{tile.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="search-v2-result-section">
              <h2 className="search-v2-result-title">ผลลัพธ์ ({filteredPlaces.length})</h2>

              {loading && (
                <div className="search-v2-loading-wrap">
                  <div className="spinner" />
                </div>
              )}

              {!loading && error && (
                <div className="alert-error" style={{ marginTop: 12 }}>{error}</div>
              )}

              {!loading && !error && pagedPlaces.length === 0 && (
                <div className="empty-state" style={{ background: '#fff', borderRadius: 20, border: '1px solid var(--border)' }}>
                  <span className="empty-icon">🔍</span>
                  <h2 className="empty-title">ไม่พบสถานที่</h2>
                  <p className="empty-sub">ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองใหม่</p>
                </div>
              )}

              {!loading && !error && pagedPlaces.length > 0 && (
                <div className="search-v2-result-list">
                  {pagedPlaces.map((place) => {
                    const categories = toCategoryArray(place);

                    const image =
                      place.image_url ||
                      FALLBACK_IMAGES[place.id % FALLBACK_IMAGES.length];

                    const openingTime = formatTime(place.opening_time);
                    const closingTime = formatTime(place.closing_time);

                    const timeText =
                      openingTime && closingTime
                        ? `${openingTime} - ${closingTime}`
                        : '-';

                    return (
                      <article key={place.id} className="modern-place-card">
                        <div className="modern-card-image">
                          <img src={image} alt={place.place_name} loading="lazy" />
                          <button className="favorite-btn">♡</button>
                        </div>

                        <div className="modern-card-content">
                          <h3 className="modern-title">{place.place_name}</h3>
                          <div className="modern-card-top">
                            <span className="category-pill">
                              {categories[0] || 'ท่องเที่ยว'}
                            </span>
                          </div>

                          <div className="modern-location">📍 {place.province || '-'}</div>

                          <p className="modern-description">
                            {place.description ||
                              'สถานที่ท่องเที่ยวที่น่าสนใจ เหมาะสำหรับการพักผ่อน ถ่ายรูป และท่องเที่ยว'}
                          </p>

                          <div className="modern-bottom">
                            <div className="modern-info">
                              <span>🕒 {timeText}</span>
                            </div>

                            <button
                              className="detail-button"
                              onClick={() => navigate(`/places/${place.id}`)}
                            >
                              ดูรายละเอียด
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {!loading && !error && totalPages > 1 && (
                <div className="search-v2-pagination">
                  <button
                    className="search-v2-page-btn"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    ‹
                  </button>

                  {pageNumbers.map((pageNum) => (
                    <button
                      key={pageNum}
                      className={`search-v2-page-btn${pageNum === page ? ' active' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    className="search-v2-page-btn"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                  >
                    ›
                  </button>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default SearchPage;