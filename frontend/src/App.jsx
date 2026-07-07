import { useState } from 'react';
import CategoryPage from './pages/CategoryPage';

function App() {
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = [
    { id: '', name: 'ทั้งหมด' },
    { id: '1', name: 'ศาสนาและความเชื่อ' },
    { id: '2', name: 'ธรรมชาติและผจญภัย' },
    { id: '3', name: 'ทะเลและเกาะ' },
    { id: '4', name: 'สวนสัตว์' },
    { id: '5', name: 'ถ่ายภาพ' },
    { id: '6', name: 'ประวัติศาสตร์และวัฒนธรรม' },
    { id: '7', name: 'อาหารคาเฟ่และไลฟ์สไตล์' },
    { id: '8', name: 'ประเพณีและเทศกาล' }
  ];

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1>ThaiTrail Places</h1>
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: selectedCategory === category.id ? '#007bff' : '#fff',
              color: selectedCategory === category.id ? '#fff' : '#333',
              border: '1px solid #ddd',
              borderRadius: '20px',
              cursor: 'pointer'
            }}
          >
            {category.name}
          </button>
        ))}
      </div>

      <CategoryPage categories={categories} categoryId={selectedCategory} />
    </div>
  );
}

export default App;
