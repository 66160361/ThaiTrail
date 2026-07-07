import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function fetchPlaces(categoryId) {
  const url = new URL(`${API_BASE_URL}/places`, window.location.origin);
  if (categoryId) {
    url.searchParams.set('category_id', categoryId);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  return response.json();
}

function CategoryPage({ categories, categoryId }) {
  // สถานะข้อมูลสถานที่ที่ได้รับจาก API
  const [places, setPlaces] = useState([]);
  // สถานะการโหลดข้อมูล
  const [loading, setLoading] = useState(true);
  // สถานะข้อผิดพลาดถ้ามี
  const [error, setError] = useState(null);

  useEffect(() => {
    // เริ่มต้นทุกครั้งเมื่อ categoryId เปลี่ยน
    setLoading(true);
    setError(null);

    fetchPlaces(categoryId)
      .then((data) => {
        setPlaces(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [categoryId]);

  // หา object หมวดหมู่จาก categories ตาม categoryId ที่ส่งมา
  // ถ้าไม่พบ จะใช้ค่า fallback แสดงว่าเป็น "ทั้งหมด" หรือ "หมวดหมู่ไม่พบ"
  const category = categories.find((category) => category.id === categoryId) || {
    id: categoryId,
    name: categoryId ? 'หมวดหมู่ไม่พบ' : 'ทั้งหมด'
  };

  return (
    <div>
      <h2>หมวดหมู่: {category.name}</h2>

      {loading ? (
        // แสดงสถานะกำลังโหลด
        <div>กำลังโหลดข้อมูล... ⏳</div>
      ) : error ? (
        // แสดงข้อความ error ถ้า fetch ล้มเหลว
        <div style={{ color: 'red' }}>Error: {error}</div>
      ) : (
        // แสดงข้อมูล JSON ของ places
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            backgroundColor: '#f7f7f7',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '1rem',
            overflowX: 'auto'
          }}
        >
          {JSON.stringify(places, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default CategoryPage;
