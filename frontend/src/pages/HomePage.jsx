import { Link } from 'react-router-dom';

function HomePage({ categories }) {
  return (
    <div>
      <h1>ThaiTrail Places</h1>
      <p>ยินดีต้อนรับ! เลือกหมวดหมู่จากรายการด้านล่างเพื่อดูข้อมูล JSON ของแต่ละหมวดหมู่</p>

      <nav style={{ marginTop: '1.5rem', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {categories.map((category) => (
          <Link
            key={category.id}
            to={category.id ? `/category/${category.id}` : '/'}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fff',
              color: '#007bff',
              border: '1px solid #ddd',
              borderRadius: '20px',
              textDecoration: 'none'
            }}
          >
            {category.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default HomePage;
