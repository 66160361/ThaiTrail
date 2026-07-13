import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import PlaceCard from '../components/PlaceCard';

const PAGE_SIZE = 24;

function RecommendationsPage() {
  const navigate  = useNavigate();

  const [allRecommended, setAllRecommended] = useState([]);
  const [places,  setPlaces]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [offset,  setOffset]  = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Read guest interests from localStorage
  const guestInterests = useMemo(() => {
    try {
      const stored = localStorage.getItem('guest_interests');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      // Fetch all places (since we don't have a backend guest session)
      const res = await api.places.getAll();
      const allPlaces = Array.isArray(res) ? res : (res.data || []);
      
      // Filter places that match at least one of the user's selected categories
      const recommended = allPlaces.filter(p => {
        if (!p.category_ids) return false;
        
        // Backend returns category_ids as a comma-separated string (e.g. "1,2")
        const catIds = typeof p.category_ids === 'string'
          ? p.category_ids.split(',').map(Number)
          : (Array.isArray(p.category_ids) ? p.category_ids.map(Number) : []);

        // Check intersection between place categories and guest interests
        return catIds.some(id => guestInterests.includes(id));
      });

      // Sort randomly or by ID to simulate recommendations
      recommended.sort(() => Math.random() - 0.5);

      setAllRecommended(recommended);
      setPlaces(recommended.slice(0, PAGE_SIZE));
      setHasMore(recommended.length > PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    }
  }, [guestInterests]);

  useEffect(() => {
    if (guestInterests.length === 0) {
      // If no interests are set, redirect back to onboarding to select them
      navigate('/onboarding', { replace: true });
      return;
    }
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData, guestInterests.length, navigate]);

  const loadMore = () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    // Simulate network delay
    setTimeout(() => {
      const nextBatch = allRecommended.slice(nextOffset, nextOffset + PAGE_SIZE);
      setPlaces(prev => [...prev, ...nextBatch]);
      setOffset(nextOffset);
      setHasMore(allRecommended.length > nextOffset + PAGE_SIZE);
      setLoadingMore(false);
    }, 400);
  };

  const handleDismissed = (placeId) => {
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
  };

  const handleEditInterests = () => navigate('/onboarding');

  return (
    <div className="page">
      <div className="container">

        {/* Hero */}
        <div className="hero fade-in">
          <p className="hero-eyebrow">✨ แนะนำสำหรับคุณ</p>
          <h1 className="hero-title">
            สวัสดี, <span className="gradient-text">ผู้เยี่ยมชม</span>
          </h1>
          <p className="hero-subtitle">
            สถานที่เหล่านี้ถูกคัดเลือกมาจากความสนใจของคุณ
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>กำลังโหลดคำแนะนำ...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="alert-error" style={{ maxWidth: 400, margin: '40px auto' }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && places.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🗺️</span>
            <h2 className="empty-title">ยังไม่มีคำแนะนำ</h2>
            <p className="empty-sub">
              ดูเหมือนว่าสถานที่ทั้งหมดในหมวดที่คุณสนใจถูกดูไปแล้ว
              หรือลองเพิ่มความสนใจใหม่เพื่อรับคำแนะนำเพิ่มเติม
            </p>
            <button className="btn btn-primary" onClick={handleEditInterests}>
              แก้ไขความสนใจ
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && places.length > 0 && (
          <>
            <div className="section-header fade-in-2">
              <h2 className="section-title">สถานที่แนะนำ</h2>
              <span className="section-count">{places.length} แห่ง</span>
            </div>

            <div className="places-grid fade-in-2">
              {places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  showScore
                  onDismissed={handleDismissed}
                />
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 36 }}>
                <button
                  className="btn btn-ghost"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? <><span className="spinner spinner-sm" /> กำลังโหลด...</>
                    : 'โหลดเพิ่มเติม'}
                </button>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleEditInterests}
              >
                ✏️ แก้ไขความสนใจ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default RecommendationsPage;
