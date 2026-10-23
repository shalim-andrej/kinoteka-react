import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function NotFound() {
  const navigate = useNavigate();

  return (
    <motion.div 
      className="details-page" 
      style={{ justifyContent: 'center', textAlign: 'center' }}
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
    >
      <h1 style={{ fontSize: '120px', margin: 0, color: 'var(--accent)' }}>404</h1>
      <h2 style={{ marginBottom: '30px' }}>Ой! Такой страницы не существует</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
        Возможно, фильм был удален, или вы ввели неверный адрес.
      </p>
      <button className="filters-btn" onClick={() => navigate('/')} style={{ fontSize: '18px' }}>
        ← Вернуться на главную
      </button>
    </motion.div>
  );
}

export default NotFound;