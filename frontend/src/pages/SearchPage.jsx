import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { interactionStorage } from '../services/interactionStorage';
import { resolvePlaceImage, FALLBACK_IMAGES } from '../services/placeImageResolver';

const CATEGORY_CHECKBOXES = [
  { id: '', label: 'ทั้งหมด' },
  { id: 'ศาสนาและความเชื่อ', label: 'ศาสนาและความเชื่อ' },
  { id: 'ธรรมชาติและผจญภัย', label: 'ธรรมชาติและผจญภัย' },
  { id: 'ทะเลและเกาะ', label: 'ทะเลและเกาะ' },
  { id: 'สวนสัตว์', label: 'สวนสัตว์' },
  { id: 'ถ่ายภาพ', label: 'ถ่ายภาพ' },
  { id: 'ประวัติศาสตร์และวัฒนธรรม', label: 'ประวัติศาสตร์และวัฒนธรรม' },
  { id: 'อาหารคาเฟ่และไลฟ์สไตล์', label: 'อาหาร คาเฟ่และไลฟ์สไตล์' },
  { id: 'ประเพณีและเทศกาล', label: 'ประเพณีและเทศกาล' },
];

const CATEGORY_ID_MAP = {
  '1': 'ศาสนาและความเชื่อ',
  '2': 'ธรรมชาติและผจญภัย',
  '3': 'ทะเลและเกาะ',
  '4': 'สวนสัตว์',
  '5': 'ถ่ายภาพ',
  '6': 'ประวัติศาสตร์และวัฒนธรรม',
  '7': 'อาหารคาเฟ่และไลฟ์สไตล์',
  '8': 'ประเพณีและเทศกาล',
};

const DISTANCE_CHIPS = [
  { id: 'any', label: 'ไม่จำกัด', max: null },
  { id: '5', label: '5 กม.', max: 5 },
  { id: '10', label: '10 กม.', max: 10 },
  { id: '25', label: '25 กม.', max: 25 },
  { id: '50', label: '50 กม.+', max: 50 },
];

const PAGE_SIZE = 6;

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
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const resultsRef = useRef(null);

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(() => {
    const catParam = searchParams.get('category');
    const initCat = CATEGORY_ID_MAP[catParam] || catParam || '';
    return initCat ? [initCat] : [];
  });
  const [selectedProvince, setSelectedProvince] = useState('');
  const [distanceId, setDistanceId] = useState('any');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [userLocation, setUserLocation] = useState(null);
  const [, setLikedTick] = useState(0);

  const toggleCategory = (catId) => {
    setPage(1);
    if (!catId) {
      setSelectedCategories([]);
      return;
    }
    setSelectedCategories((prev) => {
      if (prev.includes(catId)) {
        return prev.filter((c) => c !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const handleToggleLike = async (e, place) => {
    e.stopPropagation();
    e.preventDefault();
    const nextLiked = interactionStorage.toggleLike(place);
    setLikedTick((t) => t + 1);
    if (user) {
      try {
        await api.signals.log({ place_id: place.id, signal_type: 'like' });
      } catch { /* silent */ }
    }
  };

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
      (err) => {
        console.log('Geolocation error:', err);
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
    const selectedDistance = DISTANCE_CHIPS.find((item) => item.id === distanceId);

    return places.filter((place) => {
      const categories = toCategoryArray(place);

      // 1. Category filter (must match ALL selected categories)
      if (selectedCategories.length > 0) {
        const matchesAll = selectedCategories.every((selectedCat) => categories.includes(selectedCat));
        if (!matchesAll) return false;
      }

      // 2. Province filter
      if (selectedProvince && place.province !== selectedProvince) {
        return false;
      }

      // 3. Search query filter
      if (normalizedQuery) {
        const placeName = (place.place_name || '').toLowerCase();
        const province = (place.province || '').toLowerCase();
        const district = (place.district || '').toLowerCase();
        if (!placeName.includes(normalizedQuery) && !province.includes(normalizedQuery) && !district.includes(normalizedQuery)) {
          return false;
        }
      }

      // 4. Open now filter
      if (openNowOnly) {
        const opening = toTimeMinutes(getFirstTime(place.opening_time));
        const closing = toTimeMinutes(getFirstTime(place.closing_time));
        if (opening === null || closing === null) return false;
        if (closing >= opening) {
          if (nowMinutes < opening || nowMinutes > closing) return false;
        } else {
          if (nowMinutes < opening && nowMinutes > closing) return false;
        }
      }

      // 5. Distance filter
      if (selectedDistance?.max) {
        if (!userLocation) return false;
        const lat = Number(place.latitude ?? place.lat);
        const lng = Number(place.longitude ?? place.lng);
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return false;
        const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
        if (selectedDistance.id === '50') {
          if (distance <= 50) return false;
        } else {
          if (distance > selectedDistance.max) return false;
        }
      }

      return true;
    });
  }, [places, selectedCategories, selectedProvince, normalizedQuery, openNowOnly, distanceId, userLocation]);

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
    const maxButtons = 5;
    const start = Math.max(1, Math.min(page - 2, totalPages - maxButtons + 1));
    const end = Math.min(totalPages, Math.max(start + maxButtons - 1, 1));
    const pages = [];
    for (let i = Math.max(1, start); i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  const clearAllFilters = () => {
    setQuery('');
    setSelectedCategories([]);
    setSelectedProvince('');
    setDistanceId('any');
    setOpenNowOnly(false);
    setPage(1);
  };

  const applyFilters = () => {
    setPage(1);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="tt-search-page-root">
      <Navbar />

      {/* Hero Header with Search Bar */}
      <section className="tt-search-hero">
        <div className="tt-search-hero-bg-overlay" />
        <div className="tt-search-hero-container">
          {/* Top Full-Width Search Input Bar */}
          <div className="tt-search-input-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#877462" strokeWidth="2.5" className="tt-search-input-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="tt-search-input"
              placeholder="ค้นหาสถานที่ท่องเที่ยว"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </section>

      {/* Main Search Content Layout */}
      <main className="tt-search-main-content">
        <div className="tt-search-layout">
          {/* Left Sidebar Filters */}
          <aside className="tt-search-sidebar">
            <div className="tt-sidebar-header">
              <h3 className="tt-sidebar-title">ตัวกรอง</h3>
              <button className="tt-clear-all-btn" onClick={clearAllFilters}>
                ล้างทั้งหมด
              </button>
            </div>

            {/* Filter 1: Categories Checkbox List */}
            <div className="tt-filter-group">
              <div className="tt-filter-group-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#544434" style={{ flexShrink: 0 }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
                <span>หมวดหมู่ท่องเที่ยว</span>
              </div>
              <div className="tt-category-checkbox-list">
                {CATEGORY_CHECKBOXES.map((item) => {
                  const isAllOption = !item.id;
                  const isChecked = isAllOption
                    ? selectedCategories.length === 0
                    : selectedCategories.includes(item.id);
                  return (
                    <label key={item.id || 'all'} className="tt-checkbox-item">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(item.id)}
                        className="tt-checkbox-input"
                      />
                      <span className={`tt-checkbox-custom ${isChecked ? 'is-checked' : ''}`} />
                      <span className="tt-checkbox-label">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Filter 2: Province Dropdown */}
            <div className="tt-filter-group">
              <div className="tt-filter-group-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#544434" style={{ flexShrink: 0 }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
                <span>จังหวัด</span>
              </div>
              <div className="tt-select-wrapper">
                <select
                  className="tt-select"
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">เลือกจังหวัด</option>
                  {provinceOptions.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" className="tt-select-arrow">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {/* Filter 3: Distance Chips */}
            <div className="tt-filter-group">
              <div className="tt-filter-group-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#544434" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="#544434" strokeWidth="2" fill="none" />
                  <path d="M12 6v6l4 2" stroke="#544434" strokeWidth="2" />
                </svg>
                <span>ระยะทางจากตำแหน่งปัจจุบัน</span>
              </div>
              <div className="tt-distance-chips">
                <div className="tt-chips-row">
                  {DISTANCE_CHIPS.slice(0, 3).map((chip) => (
                    <button
                      key={chip.id}
                      className={`tt-chip ${distanceId === chip.id ? 'is-active' : ''}`}
                      onClick={() => {
                        setDistanceId(chip.id);
                        setPage(1);
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <div className="tt-chips-row">
                  {DISTANCE_CHIPS.slice(3).map((chip) => (
                    <button
                      key={chip.id}
                      className={`tt-chip ${distanceId === chip.id ? 'is-active' : ''}`}
                      onClick={() => {
                        setDistanceId(chip.id);
                        setPage(1);
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter 4: Open Hours Switch */}
            <div className="tt-filter-group">
              <div className="tt-filter-group-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#544434" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>เปิดให้บริการ</span>
              </div>
              <div className="tt-open-now-box">
                <span className="tt-open-now-text">เปิดอยู่ตอนนี้</span>
                <button
                  type="button"
                  className={`tt-switch ${openNowOnly ? 'is-active' : ''}`}
                  onClick={() => {
                    setOpenNowOnly((prev) => !prev);
                    setPage(1);
                  }}
                  aria-pressed={openNowOnly}
                >
                  <span className="tt-switch-dot" />
                </button>
              </div>
            </div>


          </aside>

          {/* Right Results Column */}
          <section className="tt-search-results-section" ref={resultsRef}>
            <h2 className="tt-results-title">
              ผลลัพธ์ ({filteredPlaces.length} แห่ง)
            </h2>

            {loading && (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#727272', fontSize: 15 }}>กำลังค้นหาสถานที่...</p>
              </div>
            )}

            {!loading && error && (
              <div className="alert-error" style={{ margin: '20px 0' }}>
                {error}
              </div>
            )}

            {!loading && !error && pagedPlaces.length === 0 && (
              <div className="empty-state" style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid #DAC2AE', padding: '64px 24px' }}>
                <span className="empty-icon">🔍</span>
                <h2 className="empty-title">ไม่พบสถานที่</h2>
                <p className="empty-sub">ลองเปลี่ยนคำค้นหาหรือปรับเงื่อนไขตัวกรองใหม่</p>
                <button className="tt-load-more-btn" onClick={clearAllFilters} style={{ marginTop: 16 }}>
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            )}

            {/* Horizontal Result Cards */}
            {!loading && !error && pagedPlaces.length > 0 && (
              <div className="tt-horizontal-cards-list">
                {pagedPlaces.map((place) => {
                  const categories = toCategoryArray(place);
                  const image = resolvePlaceImage(place, FALLBACK_IMAGES);
                  const hasLocation = Boolean((place.province && place.province.trim()) || (place.district && place.district.trim()));
                  const locationText = (place.province && place.province.trim())
                    ? `${place.district ? place.district + ' ' : ''}จ.${place.province.trim()}`
                    : (place.district ? place.district.trim() : '');

                  const displayCats = categories.slice(0, 2).map(c => {
                    return c.replace('และผจญภัย', '')
                            .replace('และเกาะ', '')
                            .replace('และศาสนา', '')
                            .replace('และวัฒนธรรม', '')
                            .replace('คาเฟ่และไลฟ์สไตล์', '')
                            .replace('และเทศกาล', '');
                  });

                  return (
                    <article
                      key={place.id}
                      className="tt-hcard fade-in"
                      onClick={() => navigate(`/places/${place.id}`)}
                    >
                      {/* Left Image Section */}
                      <div className="tt-hcard-image-wrapper">
                        <img src={image} alt={place.place_name} loading="lazy" className="tt-hcard-img" />

                        {/* Floating Location Tag (only shown if location exists) */}
                        {hasLocation && (
                          <div className="tt-hcard-location-tag">
                            <svg width="12" height="13" viewBox="0 0 24 24" fill="#FF9F1C" style={{ flexShrink: 0 }}>
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                            </svg>
                            <span className="tt-hcard-location-text">{place.province?.trim() || place.district?.trim()}</span>
                          </div>
                        )}
                      </div>

                      {/* Right Body Content */}
                      <div className="tt-hcard-body">
                        <div className="tt-hcard-header">
                          <h3 className="tt-hcard-title">{place.place_name}</h3>
                          <button
                            type="button"
                            className={`tt-hcard-heart-btn ${isLiked ? 'is-liked' : ''}`}
                            onClick={(e) => handleToggleLike(e, place)}
                            title={isLiked ? 'เลิกถูกใจ' : 'ถูกใจ'}
                            aria-label="Heart button"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? '#E53E3E' : 'none'} stroke={isLiked ? '#E53E3E' : '#544434'} strokeWidth="1.8">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          </button>
                        </div>

                        <p className="tt-hcard-desc">
                          {place.description ||
                            'สวรรค์ของคนรักทะเลและกิจกรรมท่องเที่ยว เข้าถึงได้พร้อมความเงียบสงบและน้ำใสสะอาด'}
                        </p>

                        <div className="tt-hcard-footer">
                          <div className="tt-hcard-badges">
                            {displayCats.map((cat, i) => (
                              <span
                                key={cat + i}
                                className="tt-hcard-badge"
                                style={{
                                  background: i === 0 ? 'rgba(174, 238, 203, 0.3)' : 'rgba(255, 159, 28, 0.1)',
                                  border: i === 0 ? '1px solid rgba(44, 105, 78, 0.1)' : '1px solid rgba(255, 202, 28, 0.1)',
                                  color: i === 0 ? '#2C694E' : '#895100',
                                }}
                              >
                                {cat}
                              </span>
                            ))}
                          </div>

                          <button
                            type="button"
                            className="tt-hcard-detail-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/places/${place.id}`);
                            }}
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

            {/* Pagination Controls */}
            {!loading && !error && totalPages > 1 && (
              <div className="tt-pagination">
                <button
                  className="tt-page-btn"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  ‹
                </button>

                {pageNumbers.map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`tt-page-btn ${pageNum === page ? 'is-active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  className="tt-page-btn"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                >
                  ›
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default SearchPage;