import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff'
    }}>
      <button 
        onClick={() => navigate('/onboarding')}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Login as guest
      </button>
    </div>
  );
}
