import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Navbar from '../components/Navbar';

/* ── SVG Icons ── */
const ChevronRight = () => (
  <svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="#877462" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 1L6.5 6L1.5 11" />
  </svg>
);

const UserEditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#683D00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E5138" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.2L21.6 12l-7.2 2.4L12 21.6l-2.4-7.2L2.4 12l7.2-2.4z" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BA1A1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);



function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const userKey = user?.email || user?.id;
  const [nameInput, setNameInput] = useState(
    () => user?.name || (userKey ? localStorage.getItem(`thaitrail_user_name_${userKey}`) : null) || 'นักเดินทาง'
  );
  const [avatarInput, setAvatarInput] = useState(
    () => user?.avatar_url || user?.picture || (userKey ? localStorage.getItem(`thaitrail_user_avatar_${userKey}`) : null) || ''
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const handleLogout = async () => {
    if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      try {
        if (logout) await logout();
        sessionStorage.clear();
        navigate('/login', { replace: true });
      } catch (err) {
        console.error('Logout error:', err);
        sessionStorage.clear();
        navigate('/login', { replace: true });
      }
    }
  };

  const handleEditProfileClick = () => {
    setNameInput(user?.name || (userKey ? localStorage.getItem(`thaitrail_user_name_${userKey}`) : null) || 'นักเดินทาง');
    setAvatarInput(user?.avatar_url || user?.picture || (userKey ? localStorage.getItem(`thaitrail_user_avatar_${userKey}`) : null) || '');
    setSaveSuccess('');
    setSaveError('');
    setShowEditModal(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        setAvatarInput(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const newName = nameInput.trim();
    if (!newName) return;

    setSaving(true);
    setSaveSuccess('');
    setSaveError('');
    const newAvatar = avatarInput;

    try {
      // 1. ยิง API บันทึกฝั่ง Backend ก่อนเสมอ
      if (user) {
        await api.user.updateProfile({ name: newName, avatar_url: newAvatar });
      }

      // 2. Backend สำเร็จ → บันทึกลง localStorage เฉพาะ key ของบัญชีนี้เท่านั้น (ไม่ใช้ global key)
      if (userKey) {
        localStorage.setItem(`thaitrail_user_name_${userKey}`, newName);
        if (newAvatar) {
          localStorage.setItem(`thaitrail_user_avatar_${userKey}`, newAvatar);
        } else {
          localStorage.removeItem(`thaitrail_user_avatar_${userKey}`);
        }
      }

      // 3. อัปเดต AuthContext → Navbar / ProfilePage เปลี่ยนทันทีโดยไม่ต้อง reload
      if (updateUser) updateUser({ name: newName, avatar_url: newAvatar });

      setSaveSuccess('บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว!');
      setTimeout(() => setShowEditModal(false), 800);
    } catch (err) {
      console.error('Backend updateProfile failed:', err);
      setSaveError(err.message || 'ไม่สามารถบันทึกข้อมูลไปยังฐานข้อมูลหลังบ้านได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  const handleEditInterestsClick = () => {
    navigate('/onboarding');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      backgroundAttachment: 'fixed',
      paddingTop: '96px',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      <Navbar />

      {/* Atmospheric Background Glows (from Figma spec) */}
      <div style={{
        position: 'absolute',
        width: '320px',
        height: '320px',
        left: '-80px',
        top: '60px',
        background: 'rgba(137, 81, 0, 0.08)',
        filter: 'blur(48px)',
        borderRadius: '9999px',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '360px',
        height: '360px',
        right: '-100px',
        top: '240px',
        background: 'rgba(255, 159, 28, 0.08)',
        filter: 'blur(48px)',
        borderRadius: '9999px',
        pointerEvents: 'none',
      }} />

      {/* Main Settings Container (Adapted for Web) */}
      <div style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: '32px 20px 80px',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}>
        {/* Header - Top Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(218, 194, 174, 0.2)',
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '9999px',
              border: 'none',
              background: '#FFFFFF',
              boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#1B1B1C',
              transition: 'transform 0.18s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            title="ย้อนกลับ"
          >
            ←
          </button>
          <h1 style={{
            fontFamily: 'Prompt, sans-serif',
            fontWeight: '700',
            fontSize: '24px',
            lineHeight: '32px',
            color: '#1B1B1C',
            margin: 0,
          }}>
            ตั้งค่า
          </h1>
        </div>

        {/* ── Section 1: บัญชีผู้ใช้ (Account Settings) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            fontFamily: 'Prompt, sans-serif',
            fontWeight: '600',
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '0.7px',
            textTransform: 'uppercase',
            color: '#544434',
            paddingLeft: '8px',
          }}>
            บัญชีผู้ใช้
          </div>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid rgba(218, 194, 174, 0.25)',
            boxShadow: '0px 2px 8px rgba(26, 26, 27, 0.04)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <button
              onClick={handleEditProfileClick}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 0.18s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF6F4')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '9999px',
                  background: '#FFDCBC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <UserEditIcon />
                </div>
                <span style={{
                  fontFamily: 'Prompt, sans-serif',
                  fontWeight: '500',
                  fontSize: '16px',
                  color: '#1B1B1C',
                }}>
                  แก้ไขโปรไฟล์
                </span>
              </div>
              <ChevronRight />
            </button>
          </div>
        </div>

        {/* ── Section 2: ความพึงพอใจ (Preferences) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            fontFamily: 'Prompt, sans-serif',
            fontWeight: '600',
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '0.7px',
            textTransform: 'uppercase',
            color: '#544434',
            paddingLeft: '8px',
          }}>
            ความพึงพอใจ
          </div>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid rgba(218, 194, 174, 0.25)',
            boxShadow: '0px 2px 8px rgba(26, 26, 27, 0.04)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <button
              onClick={handleEditInterestsClick}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 0.18s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#FAF6F4')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '9999px',
                  background: '#B1F0CE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <SparklesIcon />
                </div>
                <span style={{
                  fontFamily: 'Prompt, sans-serif',
                  fontWeight: '500',
                  fontSize: '16px',
                  color: '#1B1B1C',
                }}>
                  แก้ไขความสนใจ
                </span>
              </div>
              <ChevronRight />
            </button>
          </div>
        </div>

        {/* ── Section 3: ออกจากระบบ (Logout Button) ── */}
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px',
              borderRadius: '16px',
              background: 'rgba(186, 26, 26, 0.05)',
              border: '2px solid rgba(186, 26, 26, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(186, 26, 26, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(186, 26, 26, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(186, 26, 26, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(186, 26, 26, 0.2)';
            }}
          >
            <LogoutIcon />
            <span style={{
              fontFamily: 'Prompt, sans-serif',
              fontWeight: '600',
              fontSize: '18px',
              color: '#BA1A1A',
            }}>
              ออกจากระบบ
            </span>
          </button>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }} onClick={() => setShowEditModal(false)}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '440px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            position: 'relative',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{
              fontFamily: 'Prompt, sans-serif',
              fontWeight: '700',
              fontSize: '20px',
              color: '#1B1B1C',
              margin: '0 0 20px 0',
            }}>
              ✏️ แก้ไขข้อมูลโปรไฟล์
            </h2>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Avatar Preview & Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '9999px',
                  border: '3px solid #1C2B6E',
                  overflow: 'hidden',
                  background: '#EFEDED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(28, 43, 110, 0.1)',
                }}>
                  {avatarInput ? (
                    <img src={avatarInput} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      background: 'linear-gradient(135deg, #E0F2FE, #BAE6FD)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '36px', fontWeight: '700', color: '#0369A1',
                      fontFamily: 'Prompt, sans-serif',
                    }}>
                      {nameInput ? nameInput.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>

                {/* Upload & Clear Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '999px',
                    border: '1px solid #1C2B6E',
                    background: '#1C2B6E',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontFamily: 'Prompt, sans-serif',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}>
                    <span>📷</span>
                    <span>อัปโหลดรูปภาพ</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'Prompt, sans-serif',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#544434',
                  marginBottom: '8px',
                }}>
                  ชื่อผู้ใช้งาน
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="กรอกชื่อของคุณ..."
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid #C2C9BC',
                    fontSize: '16px',
                    fontFamily: 'Prompt, sans-serif',
                    color: '#1B1B1C',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#1C2B6E')}
                  onBlur={(e) => (e.target.style.borderColor = '#C2C9BC')}
                />
              </div>

              {saveSuccess && (
                <div style={{
                  color: '#0D7A3F',
                  fontFamily: 'Prompt, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  textAlign: 'center',
                }}>
                  ✅ {saveSuccess}
                </div>
              )}

              {saveError && (
                <div style={{
                  color: '#B91C1C',
                  fontFamily: 'Prompt, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                  textAlign: 'center',
                }}>
                  ❌ {saveError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #C2C9BC',
                    background: '#fff',
                    color: '#42493F',
                    fontFamily: 'Prompt, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#1C2B6E',
                    color: '#fff',
                    fontFamily: 'Prompt, sans-serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
