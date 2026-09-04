import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import PlaceCard from '../components/PlaceCard';
import { interactionStorage } from '../services/interactionStorage';
import { resolvePlaceImage, FALLBACK_IMAGES } from '../services/placeImageResolver';

const PASTEL_PALETTES = [
  { bg: 'linear-gradient(135deg, #E0F2FE, #BAE6FD)', color: '#0369A1' },
  { bg: 'linear-gradient(135deg, #FFEDD5, #FED7AA)', color: '#C2410C' },
  { bg: 'linear-gradient(135deg, #DCFCE7, #BBF7D0)', color: '#15803D' },
  { bg: 'linear-gradient(135deg, #F3E8FF, #DDD6FE)', color: '#6D28D9' },
  { bg: 'linear-gradient(135deg, #FFE4E6, #FECDD3)', color: '#BE123C' },
  { bg: 'linear-gradient(135deg, #FEF9C3, #FEF08A)', color: '#A16207' },
];

function getPastelStyle(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PASTEL_PALETTES[Math.abs(hash) % PASTEL_PALETTES.length];
}

/* ── SVG Icons ── */
const HeartIcon = ({ filled, color = '#001D02' }) => (
  <svg width="20" height="19" viewBox="0 0 24 22" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 3.61a5.5 5.5 0 0 0-7.78 0L12 4.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 20.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const BookmarkIcon = ({ filled, color = '#001D02' }) => (
  <svg width="14" height="18" viewBox="0 0 14 18" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 17L7 13 1 17V1h12z" />
  </svg>
);

const CATEGORY_STYLES = {
  'ศาสนาและความเชื่อ': { color: '#B8860B', bg: 'rgba(252,211,77,0.18)' },
  'ธรรมชาติและผจญภัย': { color: '#0D7A3F', bg: 'rgba(52,211,153,0.15)' },
  'ทะเลและเกาะ': { color: '#0369A1', bg: 'rgba(56,189,248,0.15)' },
  'สวนสัตว์': { color: '#6D28D9', bg: 'rgba(167,139,250,0.15)' },
  'ถ่ายภาพ': { color: '#BE185D', bg: 'rgba(244,114,182,0.15)' },
  'ประวัติศาสตร์และวัฒนธรรม': { color: '#C2410C', bg: 'rgba(251,146,60,0.15)' },
  'อาหารคาเฟ่และไลฟ์สไตล์': { color: '#B91C1C', bg: 'rgba(248,113,113,0.15)' },
  'ประเพณีและเทศกาล': { color: '#7C3AED', bg: 'rgba(192,132,252,0.15)' },
};

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('liked');
  const [, setLikedTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.user.getProfile()
      .then((res) => {
        if (res && res.success) {
          setProfileData(res);
          interactionStorage.syncBackend(res.liked_places, res.saved_places);
        }
      })
      .catch((err) => {
        console.log('Backend profile fetch note:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const likedPlaces = useMemo(() => {
    const map = new Map();
    const backendList = profileData?.liked_places;
    const localList = interactionStorage.getLikedPlaces();
    if (Array.isArray(backendList)) {
      backendList.forEach((p) => { if (p && p.id != null) map.set(String(p.id), p); });
    }
    if (Array.isArray(localList)) {
      localList.forEach((p) => { if (p && p.id != null && !map.has(String(p.id))) map.set(String(p.id), p); });
    }
    return Array.from(map.values());
  }, [profileData]);

  const savedPlaces = useMemo(() => {
    const map = new Map();
    const backendList = profileData?.saved_places;
    const localList = interactionStorage.getSavedPlaces();
    if (Array.isArray(backendList)) {
      backendList.forEach((p) => { if (p && p.id != null) map.set(String(p.id), p); });
    }
    if (Array.isArray(localList)) {
      localList.forEach((p) => { if (p && p.id != null && !map.has(String(p.id))) map.set(String(p.id), p); });
    }
    return Array.from(map.values());
  }, [profileData]);

  // User details
  const userKey = user?.email || user?.id;
  const localName = (userKey ? localStorage.getItem(`thaitrail_user_name_${userKey}`) : null)
    || localStorage.getItem('thaitrail_user_name');
  const localAvatar = (userKey ? localStorage.getItem(`thaitrail_user_avatar_${userKey}`) : null)
    || localStorage.getItem('thaitrail_user_avatar');
  const baseUser = profileData?.user || user;

  const CATEGORY_MAP = useMemo(() => ({
    '1': 'ศาสนาและความเชื่อ',
    '2': 'ธรรมชาติและผจญภัย',
    '3': 'ทะเลและเกาะ',
    '4': 'สวนสัตว์',
    '5': 'ถ่ายภาพ',
    '6': 'ประวัติศาสตร์และวัฒนธรรม',
    '7': 'อาหารคาเฟ่และไลฟ์สไตล์',
    '8': 'ประเพณีและเทศกาล',
  }), []);

  const parsedInterests = useMemo(() => {
    let raw = null;
    try {
      if (user && user.id) {
        raw = localStorage.getItem(`thaitrail_user_interests_${user.id}`);
      }
      if (!raw) {
        raw = localStorage.getItem('thaitrail_user_interests');
      }
      if (raw) {
        raw = JSON.parse(raw);
      }
    } catch {
      raw = null;
    }

    // Fallback to baseUser?.interests only if localStorage has no stored user interests
    if (!raw || (Array.isArray(raw) && raw.length === 0)) {
      raw = baseUser?.interests;
    }

    if (!raw) return [];
    let list = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
      try {
        list = JSON.parse(raw);
      } catch {
        list = raw.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    const mapped = list.map((item) => {
      const val = typeof item === 'object' ? String(item.name || item.id || item.category_name) : String(item);
      return CATEGORY_MAP[val] || val;
    }).filter(Boolean);
    return Array.from(new Set(mapped));
  }, [baseUser?.interests, CATEGORY_MAP, user]);

  const userName = baseUser?.name || user?.name || localName || user?.email || 'นักเดินทาง';
  const avatarUrl = baseUser?.avatar_url || baseUser?.picture || user?.avatar_url || user?.picture || localAvatar || null;
  const currentPlaces = activeTab === 'liked' ? likedPlaces : savedPlaces;

  const handleDismissed = (placeId) => {
    setLikedTick((t) => t + 1);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', backgroundAttachment: 'fixed', paddingTop: '96px' }}>
      <Navbar />

      <div className="tt-profile-page-root" style={{ maxWidth: '1080px', margin: '0 auto', padding: '40px 20px' }}>

        {/* ── Unified White Container ── */}
        <div className="tt-profile-card">

          {/* ── Profile Header ── */}
          <div className="tt-profile-header">
            {/* Avatar */}
            <div className="tt-profile-avatar-wrapper" style={{
              flexShrink: 0,
              width: '140px',
              height: '140px',
              borderRadius: '9999px',
              border: '4px solid #FFFFFF',
              boxShadow: '0px 4px 20px rgba(13, 51, 14, 0.08)',
              overflow: 'hidden',
              background: '#EFEDED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: getPastelStyle(userName).bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '56px', fontWeight: '700', color: getPastelStyle(userName).color,
                  fontFamily: 'Prompt, sans-serif',
                }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* User Info */}
            <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name + Settings */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{
                  fontFamily: 'Prompt, sans-serif',
                  fontWeight: '700',
                  fontSize: '28px',
                  lineHeight: '36px',
                  color: '#1B1C1C',
                  margin: 0,
                }}>
                  {userName}
                </h1>
                <button
                  onClick={() => navigate('/settings')}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '9999px',
                    border: '1px solid #DAC2AE',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#544434',
                    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
                    transition: 'all 0.18s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#FAF6F4'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.transform = 'scale(1)'; }}
                  title="ตั้งค่า"
                >
                  ⚙️
                </button>
              </div>

              {/* Interest Tags */}
              {parsedInterests.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {parsedInterests.map((interest, idx) => {
                    const catStyle = CATEGORY_STYLES[interest];
                    return (
                      <span key={idx} style={{
                        padding: '5px 14px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontFamily: 'Prompt, sans-serif',
                        fontWeight: '500',
                        color: catStyle ? catStyle.color : '#544434',
                        background: catStyle ? catStyle.bg : 'rgba(218, 194, 174, 0.2)',
                        border: catStyle ? `1px solid ${catStyle.color}22` : '1px solid #DAC2AE',
                      }}>
                        {interest}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Stats Boxes */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '14px 28px',
                  borderRadius: '14px',
                  border: '1.5px solid #DAC2AE',
                  background: '#FFFFFF',
                  minWidth: '80px',
                }}>
                  <span style={{
                    fontFamily: 'Prompt, sans-serif',
                    fontWeight: '700',
                    fontSize: '22px',
                    color: '#895100',
                    lineHeight: '28px',
                  }}>
                    {likedPlaces.length}
                  </span>
                  <span style={{
                    fontFamily: 'Prompt, sans-serif',
                    fontWeight: '400',
                    fontSize: '13px',
                    color: '#877462',
                    marginTop: '2px',
                  }}>
                    ถูกใจ
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '14px 28px',
                  borderRadius: '14px',
                  border: '1.5px solid #DAC2AE',
                  background: '#FFFFFF',
                  minWidth: '80px',
                }}>
                  <span style={{
                    fontFamily: 'Prompt, sans-serif',
                    fontWeight: '700',
                    fontSize: '22px',
                    color: '#895100',
                    lineHeight: '28px',
                  }}>
                    {savedPlaces.length}
                  </span>
                  <span style={{
                    fontFamily: 'Prompt, sans-serif',
                    fontWeight: '400',
                    fontSize: '13px',
                    color: '#877462',
                    marginTop: '2px',
                  }}>
                    บันทึก
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            borderBottom: '1px solid #E8E2DE',
            gap: '0',
            marginTop: '8px',
          }}>
            <button
              onClick={() => setActiveTab('liked')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '16px 28px',
                border: 'none',
                borderBottom: activeTab === 'liked' ? '2.5px solid #544434' : '2.5px solid transparent',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'liked' ? '#544434' : '#877462',
                fontFamily: 'Prompt, sans-serif',
                fontWeight: activeTab === 'liked' ? '700' : '400',
                fontSize: '15px',
                transition: 'all 0.18s ease',
                marginBottom: '-1px',
              }}
            >
              <HeartIcon filled={activeTab === 'liked'} color={activeTab === 'liked' ? '#544434' : '#877462'} />
              <span>สถานที่ที่ถูกใจ</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '16px 28px',
                border: 'none',
                borderBottom: activeTab === 'saved' ? '2.5px solid #544434' : '2.5px solid transparent',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'saved' ? '#544434' : '#877462',
                fontFamily: 'Prompt, sans-serif',
                fontWeight: activeTab === 'saved' ? '700' : '400',
                fontSize: '15px',
                transition: 'all 0.18s ease',
                marginBottom: '-1px',
              }}
            >
              <BookmarkIcon filled={activeTab === 'saved'} color={activeTab === 'saved' ? '#544434' : '#877462'} />
              <span>Saved Places</span>
            </button>
          </div>

          {/* ── Content Area ── */}
          <div style={{ paddingTop: '32px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <div className="spinner" />
              </div>
            ) : currentPlaces.length > 0 ? (
              <div className="tt-profile-places-grid">
                {currentPlaces.map((place) => {
                  const imgSrc = resolvePlaceImage(place, FALLBACK_IMAGES);
                  return (
                    <div
                      key={place.id}
                      className="tt-ig-grid-item"
                      onClick={() => {
                        sessionStorage.setItem('scroll_pos', window.scrollY);
                        navigate(`/places/${place.id}`);
                      }}
                    >
                      <img
                        src={imgSrc}
                        alt={place.place_name}
                        loading="lazy"
                        className="tt-ig-grid-img"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_IMAGES[Math.abs(Number(place.id) || 0) % FALLBACK_IMAGES.length];
                        }}
                      />
                      <div className="tt-ig-grid-overlay">
                        <span className="tt-ig-grid-badge">
                          {activeTab === 'liked' ? '❤️' : '🔖'}
                        </span>
                        <span className="tt-ig-grid-title">{place.place_name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>
                  {activeTab === 'liked' ? '❤️' : '🔖'}
                </div>
                <h3 style={{ fontFamily: 'Prompt, sans-serif', fontSize: '20px', fontWeight: '700', color: '#1B1C1C', marginBottom: '8px' }}>
                  {activeTab === 'liked' ? 'ยังไม่มีสถานที่ที่ถูกใจ' : 'ยังไม่มีสถานที่ที่บันทึกไว้'}
                </h3>
                <p style={{ fontFamily: 'Prompt, sans-serif', fontSize: '14px', color: '#877462', marginBottom: '24px' }}>
                  {activeTab === 'liked'
                    ? 'เมื่อคุณกดถูกใจสถานที่ท่องเที่ยว รายการเหล่านั้นจะมาแสดงที่นี่'
                    : 'เมื่อคุณกดบันทึกสถานที่ท่องเที่ยว รายการเหล่านั้นจะมาแสดงที่นี่'}
                </p>
                <Link to="/" style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  borderRadius: '10px',
                  background: '#0D330E',
                  color: '#fff',
                  fontFamily: 'Prompt, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'background 0.18s ease',
                }}>
                  สำรวจสถานที่ท่องเที่ยว
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
