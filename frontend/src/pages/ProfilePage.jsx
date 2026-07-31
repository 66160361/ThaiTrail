import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import { interactionStorage } from '../services/interactionStorage';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800',
  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=800',
];

const PASTEL_PALETTES = [
  { bg: 'linear-gradient(135deg, #E0F2FE, #BAE6FD)', color: '#0369A1' }, // Soft Blue
  { bg: 'linear-gradient(135deg, #FFEDD5, #FED7AA)', color: '#C2410C' }, // Soft Peach
  { bg: 'linear-gradient(135deg, #DCFCE7, #BBF7D0)', color: '#15803D' }, // Soft Mint
  { bg: 'linear-gradient(135deg, #F3E8FF, #DDD6FE)', color: '#6D28D9' }, // Soft Lavender
  { bg: 'linear-gradient(135deg, #FFE4E6, #FECDD3)', color: '#BE123C' }, // Soft Rose
  { bg: 'linear-gradient(135deg, #FEF9C3, #FEF08A)', color: '#A16207' }, // Soft Yellow
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

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('liked'); // 'liked' or 'saved'

  // Fetch backend profile data when user is present
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

  // Compute merged places for Liked and Saved tabs (Local + Backend)
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

  // User details — same priority as Navbar: localStorage (user-uploaded) > user from AuthContext
  const userKey = user?.email || user?.id;
  const localName = (userKey ? localStorage.getItem(`thaitrail_user_name_${userKey}`) : null)
    || localStorage.getItem('thaitrail_user_name');
  const localAvatar = (userKey ? localStorage.getItem(`thaitrail_user_avatar_${userKey}`) : null)
    || localStorage.getItem('thaitrail_user_avatar');
  const baseUser = profileData?.user || user;

  // Dynamic user interests parser
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
    let raw = baseUser?.interests;

    if (!raw || (Array.isArray(raw) && raw.length === 0)) {
      try {
        let stored = null;
        if (user && user.id) {
          stored = localStorage.getItem(`thaitrail_user_interests_${user.id}`);
        }
        if (stored) {
          raw = JSON.parse(stored);
        }
      } catch {
        raw = null;
      }
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
  }, [baseUser?.interests, CATEGORY_MAP]);

  const userName = localName || baseUser?.name || user?.name || user?.email || 'นักเดินทาง';
  const avatarUrl = localAvatar || baseUser?.avatar_url || baseUser?.picture || null;
  const currentPlaces = activeTab === 'liked' ? likedPlaces : savedPlaces;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', backgroundAttachment: 'fixed', paddingTop: '72px' }}>
      <Navbar />

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '40px 20px' }}>
        {/* ── Unified White Card Container covering Profile Info & Tabs/Grid ── */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '40px 44px',
          boxShadow: '0 8px 32px rgba(13, 51, 14, 0.06)',
          border: '1px solid #E8E2DE',
          display: 'flex',
          flexDirection: 'column',
          gap: '36px',
        }}>

          {/* ── 1. Profile Header ── */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: '48px',
            paddingBottom: '48px',
            borderBottom: '1px solid #C2C9BC',
            flexWrap: 'wrap',
          }}>
            {/* Avatar */}
            <div style={{
              flexShrink: 0,
              width: '180px',
              height: '180px',
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
                  fontSize: '64px', fontWeight: '700', color: getPastelStyle(userName).color,
                  fontFamily: 'Prompt, sans-serif',
                }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* User Info & Actions */}
            <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '8px' }}>

              {/* Name + Settings Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <h1 style={{
                  fontFamily: 'Prompt, sans-serif',
                  fontWeight: '700',
                  fontSize: '30px',
                  lineHeight: '38px',
                  color: '#1B1C1C',
                  margin: 0,
                }}>
                  {userName}
                </h1>
                <button
                  onClick={() => navigate('/settings')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '12px',
                    border: '1px solid #C2C9BC',
                    background: '#FFFFFF',
                    color: '#1B1C1C',
                    fontSize: '14px',
                    fontFamily: 'Prompt, sans-serif',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1C2B6E'; e.currentTarget.style.background = '#FAF6F4'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#C2C9BC'; e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <span>⚙️</span>
                  <span>ตั้งค่า</span>
                </button>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'Prompt, sans-serif', fontWeight: '700', fontSize: '18px', color: '#1B1C1C' }}>
                    {likedPlaces.length}
                  </span>
                  <span style={{ fontFamily: 'Prompt, sans-serif', fontWeight: '400', fontSize: '14px', color: '#42493F' }}>
                    ถูกใจ
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'Prompt, sans-serif', fontWeight: '700', fontSize: '18px', color: '#1B1C1C' }}>
                    {savedPlaces.length}
                  </span>
                  <span style={{ fontFamily: 'Prompt, sans-serif', fontWeight: '400', fontSize: '14px', color: '#42493F' }}>
                    บันทึก
                  </span>
                </div>
              </div>

              {/* Interest Tags */}
              {parsedInterests.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {parsedInterests.map((interest, idx) => (
                    <span key={idx} style={{
                      padding: '5px 14px',
                      borderRadius: '999px',
                      border: '1px solid #C2C9BC',
                      fontSize: '13px',
                      fontFamily: 'Prompt, sans-serif',
                      color: '#42493F',
                      background: '#FFFFFF',
                    }}>
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 2. Tabs Navigation ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            borderBottom: '1px solid #C2C9BC',
            gap: '0',
          }}>
            {/* Tab 1: ถูกใจ */}
            <button
              onClick={() => setActiveTab('liked')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '16px 28px',
                border: 'none',
                borderBottom: activeTab === 'liked' ? '2.5px solid #001D02' : '2.5px solid transparent',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'liked' ? '#001D02' : '#42493F',
                fontFamily: 'Prompt, sans-serif',
                fontWeight: activeTab === 'liked' ? '700' : '400',
                fontSize: '15px',
                transition: 'all 0.18s ease',
                marginBottom: '-1px',
              }}
            >
              <HeartIcon filled={activeTab === 'liked'} color={activeTab === 'liked' ? '#001D02' : '#42493F'} />
              <span>ถูกใจ</span>
            </button>

            {/* Tab 2: บันทึก */}
            <button
              onClick={() => setActiveTab('saved')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '16px 28px',
                border: 'none',
                borderBottom: activeTab === 'saved' ? '2.5px solid #001D02' : '2.5px solid transparent',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'saved' ? '#001D02' : '#42493F',
                fontFamily: 'Prompt, sans-serif',
                fontWeight: activeTab === 'saved' ? '700' : '400',
                fontSize: '15px',
                transition: 'all 0.18s ease',
                marginBottom: '-1px',
              }}
            >
              <BookmarkIcon filled={activeTab === 'saved'} color={activeTab === 'saved' ? '#001D02' : '#42493F'} />
              <span>บันทึก</span>
            </button>
          </div>

          {/* ── 3. Content Area / Photo Grid ── */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div className="spinner" />
            </div>
          ) : currentPlaces.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '16px',
            }}>
              {currentPlaces.map((place) => {
                const placeIdNum = Math.abs(Number(place.id) || 0);
                const image = place.image_url || FALLBACK_IMAGES[placeIdNum % FALLBACK_IMAGES.length];
                return (
                  <Link
                    key={place.id}
                    to={`/places/${place.id}`}
                    style={{ textDecoration: 'none', display: 'block' }}
                    className="profile-grid-item-link"
                  >
                    <div
                      className="profile-grid-item"
                      style={{
                        position: 'relative',
                        aspectRatio: '1 / 1',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#EFEDED',
                        isolation: 'isolate',
                      }}
                    >
                      <img
                        src={image}
                        alt={place.place_name || 'สถานที่'}
                        className="grid-item-img"
                        style={{
                          width: '100%', height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transition: 'transform 0.35s ease',
                        }}
                      />
                      <div
                        className="grid-item-overlay"
                        style={{
                          position: 'absolute', inset: 0,
                          background: 'rgba(0, 0, 0, 0.4)',
                          display: 'flex', flexDirection: 'column',
                          justifyContent: 'flex-end',
                          alignItems: 'flex-start',
                          padding: '12px',
                          opacity: 0,
                          transition: 'opacity 0.2s ease',
                          zIndex: 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '14px' }}>{activeTab === 'liked' ? '❤️' : '🔖'}</span>
                        </div>
                        <span style={{
                          fontFamily: 'Prompt, sans-serif',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#FFFFFF',
                          marginTop: '4px',
                          lineHeight: '1.3',
                        }}>
                          {place.place_name}
                        </span>
                        {place.province && (
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginTop: '2px', fontFamily: 'Prompt, sans-serif' }}>
                            📍 {place.province}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div style={{ textAlign: 'center', padding: '64px 20px' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>
                {activeTab === 'liked' ? '❤️' : '🔖'}
              </div>
              <h3 style={{ fontFamily: 'Prompt, sans-serif', fontSize: '20px', fontWeight: '700', color: '#1B1C1C', marginBottom: '8px' }}>
                {activeTab === 'liked' ? 'ยังไม่มีสถานที่ที่ถูกใจ' : 'ยังไม่มีสถานที่ที่บันทึกไว้'}
              </h3>
              <p style={{ fontFamily: 'Prompt, sans-serif', fontSize: '14px', color: '#42493F', marginBottom: '24px' }}>
                {activeTab === 'liked'
                  ? 'เมื่อคุณกดถูกใจสถานที่ท่องเที่ยว รายการเหล่านั้นจะมาแสดงที่นี่'
                  : 'เมื่อคุณกดบันทึกสถานที่ท่องเที่ยว รายการเหล่านั้นจะมาแสดงที่นี่'}
              </p>
              <Link to="/" style={{
                display: 'inline-block',
                padding: '10px 24px',
                borderRadius: '10px',
                background: '#1C2B6E',
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
  );
}

export default ProfilePage;
