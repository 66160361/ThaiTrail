import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PlaceCard from '../components/PlaceCard';

const CATEGORIES = [
  { id: '',  name: 'ทั้งหมด' },
  { id: '1', name: 'ศาสนาและความเชื่อ' },
  { id: '2', name: 'ธรรมชาติและผจญภัย' },
  { id: '3', name: 'ทะเลและเกาะ' },
  { id: '4', name: 'สวนสัตว์' },
  { id: '5', name: 'ถ่ายภาพ' },
  { id: '6', name: 'ประวัติศาสตร์และวัฒนธรรม' },
  { id: '7', name: 'อาหารคาเฟ่และไลฟ์สไตล์' },
  { id: '8', name: 'ประเพณีและเทศกาล' },
];

function CategoryPage() {
  const { categoryId = '' } = useParams();
  const navigate             = useNavigate();
  const { user }             = useAuth();

  const [places,  setPlaces]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = categoryId ? { category_id: categoryId } : {};
    api.places.getAll(params)
      .then((data) => setPlaces(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [categoryId]);

  const handleDismissed = (placeId) => {
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
  };

  const currentCat = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0];

  return (
    <div className="page">
      <div className="container">

        {/* Header */}
        <div className="hero fade-in">
          <p className="hero-eyebrow">🔍 เรียกดูสถานที่</p>
          <h1 className="hero-title">{currentCat.name}</h1>
        </div>

        {/* Filter chips */}
        <div className="filter-bar fade-in-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`filter-chip${cat.id === categoryId ? ' active' : ''}`}
              onClick={() =>
                cat.id ? navigate(`/browse/${cat.id}`) : navigate('/browse')
              }
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>กำลังโหลด...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="alert-error" style={{ maxWidth: 400, margin: '40px auto' }}>
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && places.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">📍</span>
            <h2 className="empty-title">ไม่พบสถานที่</h2>
            <p className="empty-sub">ลองเลือกหมวดหมู่อื่นดูสิ</p>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && places.length > 0 && (
          <>
            <div className="section-header fade-in-2">
              <h2 className="section-title">
                {categoryId ? `สถานที่ในหมวด "${currentCat.name}"` : 'สถานที่ทั้งหมด'}
              </h2>
              <span className="section-count">{places.length} แห่ง</span>
            </div>
            <div className="places-grid fade-in-2">
              {places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  showScore={false}
                  onDismissed={user ? handleDismissed : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CategoryPage;
