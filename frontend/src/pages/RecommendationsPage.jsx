import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PlaceCard from '../components/PlaceCard';
import Navbar from '../components/Navbar';

const PAGE_SIZE = 24;

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

  return (
    <div className="page">
      <Navbar />
      <div className="container">
        {/* Hero Banner */}
        <div className="hero fade-in">
          <p className="hero-eyebrow">✨ แนะนำและค้นหา</p>
          <h1 className="hero-title">
            สวัสดี, <span className="gradient-text">{user?.name || 'ผู้เยี่ยมชม'}</span>
          </h1>
          <p className="hero-subtitle">
            ค้นพบสถานที่ท่องเที่ยวและกิจกรรมที่เหมาะกับไลฟ์สไตล์ของคุณ
          </p>
        </div>

        {/* Tab Filters */}
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
                  showScore={activeTab === 'recommend'}
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
