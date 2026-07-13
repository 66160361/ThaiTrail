import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InterestPicker from '../components/InterestPicker';

function OnboardingPage() {
  const navigate = useNavigate();

  const [selected, setSelected] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async () => {
    if (selected.length === 0) {
      setError('กรุณาเลือกอย่างน้อย 1 ความสนใจ');
      return;
    }
    setError('');
    setLoading(true);
    
    // For guest mode: save interests locally
    localStorage.setItem('guest_interests', JSON.stringify(selected));
    
    // Simulate a brief loading state for UX
    setTimeout(() => {
      setLoading(false);
      navigate('/', { replace: true });
    }, 500);
  };

  return (
    <div
      className="center-page"
      style={{
        background: `
          radial-gradient(ellipse at 80% 10%, rgba(16,185,129,0.12) 0%, transparent 55%),
          radial-gradient(ellipse at 10% 90%, rgba(245,158,11,0.10) 0%, transparent 50%),
          var(--bg)
        `,
        alignItems: 'flex-start',
        padding: '48px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 700, margin: '0 auto' }}>
        {/* Header */}
        <div className="fade-in" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌏</div>
          <h1 className="hero-title">
            สวัสดี, <span className="gradient-text">ผู้เยี่ยมชม</span>!
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', marginTop: 10 }}>
            เลือกประเภทสถานที่ที่คุณสนใจ<br />
            เราจะแนะนำสถานที่ที่เหมาะกับคุณโดยเฉพาะ
          </p>
        </div>

        {/* Interest picker */}
        <div className="fade-in-2" style={{ position: 'relative' }}>
          <InterestPicker selected={selected} onChange={setSelected} />
        </div>

        {/* Selected count */}
        <p
          className="fade-in-3"
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 13,
            color: selected.length > 0 ? 'var(--primary-light)' : 'var(--text-dim)',
          }}
        >
          {selected.length > 0
            ? `เลือกแล้ว ${selected.length} ประเภท`
            : 'เลือกได้หลายประเภท'}
        </p>

        {error && (
          <div className="alert-error fade-in" style={{ marginTop: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="fade-in-3" style={{ marginTop: 28, textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            style={{ minWidth: 200, fontSize: 16 }}
            onClick={handleSubmit}
            disabled={loading || selected.length === 0}
          >
            {loading
              ? <><span className="spinner spinner-sm" /> กำลังบันทึก...</>
              : '✨ เริ่มค้นพบสถานที่'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;
