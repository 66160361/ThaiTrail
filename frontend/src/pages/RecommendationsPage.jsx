import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PlaceCard from '../components/PlaceCard';
import Navbar from '../components/Navbar';

const PAGE_SIZE = 24;

const TABS = [
  { id: 'recommend', name: 'แนะนำสถานที่' },
  { id: 'all', name: 'ทั้งหมด' },
  { id: '1', name: 'ศาสนาและความเชื่อ' },
  { id: '2', name: 'ธรรมชาติและผจญภัย' },
  { id: '3', name: 'ทะเลและเกาะ' },
  { id: '4', name: 'สวนสัตว์' },
  { id: '5', name: 'ถ่ายภาพ' },
  { id: '6', name: 'ประวัติศาสตร์และวัฒนธรรม' },
  { id: '7', name: 'อาหารคาเฟ่และไลฟ์สไตล์' },
  { id: '8', name: 'ประเพณีและเทศกาล' },
];

function RecommendationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const gridRef = useRef(null);

  const [allPlacesRaw, setAllPlacesRaw] = useState([]);
  const [userRecommendedPlaces, setUserRecommendedPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem('active_tab');
    return TABS.some((t) => t.id === saved) ? saved : 'recommend';
  });
  const [page, setPage] = useState(() => {
    const saved = sessionStorage.getItem('current_page');
    return saved ? parseInt(saved, 10) : 1;
  });

  // Fetch all places & user-specific recommendations
  const loadData = useCallback(async () => {
    try {
      if (user) {
        api.recommendations.get()
          .then((res) => {
            if (res && Array.isArray(res.data)) {
              setUserRecommendedPlaces(res.data.filter((p) => p.province && p.province.trim() !== ''));
            }
          })
          .catch(() => { });
      }
      const res = await api.places.getAll();
      const raw = Array.isArray(res) ? res : (res.data || []);
      const allPlaces = raw.filter((p) => p.province && p.province.trim() !== '');
      setAllPlacesRaw(allPlaces);
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลสถานที่ได้');
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Filter & sort logic based on active tab
  const displayedPlaces = useMemo(() => {
    if (activeTab === 'recommend') {
      if (userRecommendedPlaces.length > 0) {
        return userRecommendedPlaces;
      }
      return allPlacesRaw;
    } else if (activeTab === 'all') {
      return allPlacesRaw;
    } else {
      const targetCatId = Number(activeTab);
      return allPlacesRaw.filter((p) => {
        if (!p.category_ids) return false;
        const catIds = typeof p.category_ids === 'string'
          ? p.category_ids.split(',').map(Number)
          : (Array.isArray(p.category_ids) ? p.category_ids.map(Number) : []);
        return catIds.includes(targetCatId);
      });
    }
  }, [activeTab, allPlacesRaw, userRecommendedPlaces]);

  const totalPages = Math.max(1, Math.ceil(displayedPlaces.length / PAGE_SIZE));

  // Reset page to 1 if current page exceeds totalPages (only after data loaded)
  useEffect(() => {
    if (!loading && page > totalPages) {
      setPage(1);
      sessionStorage.setItem('current_page', '1');
    }
  }, [loading, page, totalPages]);

  const pagedPlaces = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return displayedPlaces.slice(start, start + PAGE_SIZE);
  }, [displayedPlaces, page]);

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

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
    sessionStorage.setItem('active_tab', tabId);
    sessionStorage.setItem('current_page', '1');
    sessionStorage.removeItem('scroll_pos');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    sessionStorage.setItem('current_page', String(newPage));
    if (gridRef.current) {
      const top = gridRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  // Restore scroll position when returning from detail page
  useEffect(() => {
    if (!loading && pagedPlaces.length > 0) {
      const savedScroll = sessionStorage.getItem('scroll_pos');
      if (savedScroll) {
        setTimeout(() => {
          window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
        }, 50);
      }
    }
  }, [loading, pagedPlaces.length]);

  const handleDismissed = (placeId) => {
    setAllPlacesRaw((prev) => prev.filter((p) => p.id !== placeId));
  };

  const activeTabName = TABS.find((t) => t.id === activeTab)?.name || 'แนะนำสถานที่';
  const userKey = user?.email || user?.id;
  const userName = user?.name
    || (userKey ? localStorage.getItem(`thaitrail_user_name_${userKey}`) : null)
    || localStorage.getItem('thaitrail_user_name')
    || 'นักเดินทาง';

  return (
    <div className="tt-page-root">
      <Navbar />

      {/* Hero Section with Scenic Background */}
      <section className="tt-hero">
        <div className="tt-hero-bg-overlay" />

        <div className="tt-hero-container">
          <h1 className="tt-hero-title">
            สวัสดี, {userName}
          </h1>
          <p className="tt-hero-subtitle">
            ค้นพบสถานที่ท่องเที่ยวและกิจกรรมที่เหมาะสมกับไลฟ์สไตล์ของคุณ
          </p>

          {/* Category Filter Grid */}
          <div className="tt-filter-pills-container">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`tt-filter-pill ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="tt-main-content">
        {/* Loading State */}
        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#727272', fontSize: 15 }}>กำลังโหลดข้อมูล...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="alert-error" style={{ maxWidth: 400, margin: '40px auto' }}>
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && pagedPlaces.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🗺️</span>
            <h2 className="empty-title">ไม่พบสถานที่</h2>
            <p className="empty-sub">
              ลองเลือกหมวดหมู่อื่น หรือแก้ไขความสนใจของคุณเพื่อรับคำแนะนำใหม่ๆ
            </p>
          </div>
        )}

        {/* Places Grid Header & Content */}
        {!loading && !error && pagedPlaces.length > 0 && (
          <>
            <div className="tt-section-header" ref={gridRef}>
              <h2 className="tt-section-title">{activeTabName}</h2>
              <span className="tt-section-count">{displayedPlaces.length} แห่ง</span>
            </div>

            <div className="tt-places-grid" key={`${activeTab}-${page}`}>
              {pagedPlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  showScore={false}
                  onDismissed={handleDismissed}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="tt-pagination">
                <button
                  className="tt-page-btn"
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  ‹
                </button>

                {pageNumbers[0] > 1 && (
                  <>
                    <button
                      className={`tt-page-btn ${page === 1 ? 'is-active' : ''}`}
                      onClick={() => handlePageChange(1)}
                    >
                      1
                    </button>
                    {pageNumbers[0] > 2 && (
                      <span className="tt-page-ellipsis">…</span>
                    )}
                  </>
                )}

                {pageNumbers.map((pageNum) => (
                  <button
                    key={pageNum}
                    className={`tt-page-btn ${pageNum === page ? 'is-active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                      <span className="tt-page-ellipsis">…</span>
                    )}
                    <button
                      className={`tt-page-btn ${page === totalPages ? 'is-active' : ''}`}
                      onClick={() => handlePageChange(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  className="tt-page-btn"
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default RecommendationsPage;
