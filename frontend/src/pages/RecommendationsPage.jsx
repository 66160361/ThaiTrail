import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PlaceCard from '../components/PlaceCard';
import Navbar from '../components/Navbar';

const PAGE_SIZE = 24;

const HERO_BACKGROUNDS = {
  recommend: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80',
  all: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80',
  1: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1800&q=80',
  2: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=80',
  3: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80',
  4: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=1800&q=80',
  5: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80',
  6: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1800&q=80',
  7: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1800&q=80',
  8: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1800&q=80',
};

const TABS = [
  { id: 'recommend', name: '✨ แนะนำสถานที่' },
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
  const { user, logout } = useAuth();

  const [allPlacesRaw, setAllPlacesRaw] = useState([]);
  const [userRecommendedPlaces, setUserRecommendedPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem('active_tab');
    return TABS.some((t) => t.id === saved) ? saved : 'recommend';
  });
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Fetch all places & user-specific recommendations
  const loadData = useCallback(async () => {
    try {
      if (user) {
        api.recommendations.get()
          .then((res) => {
            if (res && Array.isArray(res.data)) {
              setUserRecommendedPlaces(res.data);
            }
          })
          .catch(() => {});
      }
      const res = await api.places.getAll();
      const allPlaces = Array.isArray(res) ? res : (res.data || []);
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

  const placesToShow = useMemo(() => {
    return displayedPlaces.slice(0, limit);
  }, [displayedPlaces, limit]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    sessionStorage.setItem('active_tab', tabId);
    sessionStorage.removeItem('scroll_pos');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Restore scroll position when returning from detail page
  useEffect(() => {
    if (!loading && placesToShow.length > 0) {
      const savedScroll = sessionStorage.getItem('scroll_pos');
      if (savedScroll) {
        setTimeout(() => {
          window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
        }, 50);
      }
    }
  }, [loading, placesToShow.length]);

  // Reset limit when changing tab
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [activeTab]);

  const hasMore = displayedPlaces.length > limit;

  const loadMore = () => {
    setLimit((prev) => prev + PAGE_SIZE);
  };

  const handleDismissed = (placeId) => {
    setAllPlacesRaw((prev) => prev.filter((p) => p.id !== placeId));
  };

  const handleEditInterests = () => navigate('/onboarding');

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
      sessionStorage.clear();
      localStorage.clear();
      navigate('/login', { replace: true });
    } catch {
      sessionStorage.clear();
      localStorage.clear();
      navigate('/login', { replace: true });
    }
  };

  const activeHeroImage = HERO_BACKGROUNDS[activeTab] || HERO_BACKGROUNDS.recommend;

  return (
    <div className="page">
      <Navbar />
      <div className="container">
        <div
          className="hero-banner fade-in"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.18) 26%, rgba(255,255,255,0.06) 58%, rgba(255,255,255,0.1) 100%), url('${activeHeroImage}')`
          }}
        >
          <div className="hero-overlay" />
          <div className="hero-content">
            <p className="hero-eyebrow">แนะนำและค้นหา</p>
            <h1 className="hero-title">
              สวัสดี, <span className="hero-name">{user?.name || 'Niyada'}</span>
            </h1>
            <p className="hero-subtitle">
              ค้นพบสถานที่ท่องเที่ยวและกิจกรรมที่เหมาะกับไลฟ์สไตล์ของคุณ
            </p>
          </div>

          <div className="filter-bar fade-in-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`filter-chip${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>กำลังโหลดข้อมูล...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="alert-error" style={{ maxWidth: 400, margin: '40px auto' }}>
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && placesToShow.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🗺️</span>
            <h2 className="empty-title">ไม่พบสถานที่</h2>
            <p className="empty-sub">
              ลองเลือกหมวดหมู่อื่น หรือแก้ไขความสนใจของคุณเพื่อรับคำแนะนำใหม่ๆ
            </p>
            {activeTab === 'recommend' && (
              <button className="btn btn-primary" onClick={handleEditInterests} style={{ marginTop: 12 }}>
                ⚙️ แก้ไขความสนใจ
              </button>
            )}
          </div>
        )}

        {/* Places Grid */}
        {!loading && !error && placesToShow.length > 0 && (
          <>
            <div className="section-header fade-in-2">
              <h2 className="section-title">
                {TABS.find((t) => t.id === activeTab)?.name}
              </h2>
              <span className="section-count">{displayedPlaces.length} แห่ง</span>
            </div>

            <div className="places-grid fade-in-2" key={activeTab}>
              {placesToShow.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  showScore={false}
                  onDismissed={handleDismissed}
                />
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 36 }}>
                <button className="btn btn-ghost" onClick={loadMore}>
                  โหลดเพิ่มเติม
                </button>
              </div>
            )}

            {activeTab === 'recommend' && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button className="btn btn-ghost btn-sm" onClick={handleEditInterests}>
                  ✏️ แก้ไขความสนใจ
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default RecommendationsPage;
