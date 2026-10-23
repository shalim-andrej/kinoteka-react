import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ScrollToTop from './components/ScrollToTop';
import BackToTop from './components/BackToTop'; // Подключаем кнопку
import Home from './pages/Home';
import MovieDetails from './pages/MovieDetails';
import NotFound from './pages/NotFound';

function App() {
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/movie/:id" element={<MovieDetails theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      <BackToTop /> {/* Рендерим кнопку поверх всех страниц */}
      
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            fontSize: '14px',
            fontWeight: 'bold',
          },
        }}
      />
    </>
  );
}

export default App;