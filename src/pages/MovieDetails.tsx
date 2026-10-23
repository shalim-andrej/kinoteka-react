import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast'; // Для уведомления о копировании
import '../App.css';

const API_KEY = import.meta.env.VITE_KINOPOISK_API_KEY;
const BASE_URL = 'https://kinopoiskapiunofficial.tech/api/v2.2';

interface MovieDetailsData {
  nameRu: string | null;
  nameEn: string | null;
  posterUrl: string;
  ratingKinopoisk: number | null;
  year: number | null;
  filmLength: number | null;
  description: string | null;
  shortDescription: string | null;
  genres: { genre: string }[];
}

interface TrailerInfo {
  url: string;
  isEmbeddable: boolean;
}

interface MovieDetailsProps {
  theme: string;
  toggleTheme: () => void;
}

function MovieDetails({ theme, toggleTheme }: MovieDetailsProps) {
  const { id } = useParams<{ id: string }>(); 
  const navigate = useNavigate(); 
  
  const [movie, setMovie] = useState<MovieDetailsData | null>(null);
  const [trailerInfo, setTrailerInfo] = useState<TrailerInfo | null>(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Смена заголовка вкладки и загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const detailsResponse = await fetch(`${BASE_URL}/films/${id}`, {
          headers: { 'X-API-KEY': API_KEY, 'Content-Type': 'application/json' }
        });
        if (!detailsResponse.ok) throw new Error('Фильм не найден');
        const detailsData: MovieDetailsData = await detailsResponse.json();
        setMovie(detailsData);

        // МЕНЯЕМ ЗАГОЛОВОК ВКЛАДКИ БРАУЗЕРА
        document.title = `${detailsData.nameRu || 'Фильм'} | Кинотека`;

        const videosResponse = await fetch(`${BASE_URL}/films/${id}/videos`, {
          headers: { 'X-API-KEY': API_KEY, 'Content-Type': 'application/json' }
        });
        
        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          
          if (videosData.items && videosData.items.length > 0) {
            const youtubeVideo = videosData.items.find((item: any) => 
              item.url && item.url.toLowerCase().includes('youtube')
            );

            if (youtubeVideo) {
              const videoIdMatch = youtubeVideo.url.match(/(?:v=|\/v\/|youtu\.be\/|embed\/)([^&?/]+)/);
              if (videoIdMatch && videoIdMatch[1]) {
                setTrailerInfo({
                  url: `https://www.youtube.com/embed/${videoIdMatch[1]}`,
                  isEmbeddable: true
                });
              }
            } else {
              setTrailerInfo({
                url: videosData.items[0].url,
                isEmbeddable: false
              });
            }
          }
        }
      } catch (err: any) {
        setError(err.message);
        document.title = 'Ошибка | Кинотека';
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) fetchData();

    // Возвращаем стандартный заголовок при уходе со страницы
    return () => { document.title = 'Кинотека | Поиск фильмов'; };
  }, [id]);

  // Функция копирования ссылки
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Ссылка на фильм скопирована!', { icon: '🔗' });
  };

  if (isLoading) return <div className="details-page"><h2>Загрузка...</h2></div>;
  if (error) return <div className="details-page"><h2 style={{color: 'red'}}>Ошибка: {error}</h2></div>;
  if (!movie) return null;

  return (
    <motion.div 
      className="details-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '1000px', marginBottom: '30px' }}>
        <button className="back-btn" onClick={() => navigate(-1)}>← Назад</button>
        <button className="theme-toggle" onClick={toggleTheme} title="Сменить тему">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
      
      <div className="details-content">
        <img 
          src={movie.posterUrl || 'https://via.placeholder.com/300x450?text=Нет+постера'} 
          alt={movie.nameRu || 'Постер'} 
          className="details-poster" 
        />
        
        <div className="details-info">
          <h1>{movie.nameRu || movie.nameEn || 'Без названия'}</h1>
          <p className="details-original-name">{movie.nameEn || ''}</p>
          
          <div className="details-meta">
            <span>⭐ Рейтинг: {movie.ratingKinopoisk || '—'}</span>
            <span>📅 Год: {movie.year || '—'}</span>
            <span>⏳ Время: {movie.filmLength ? `${movie.filmLength} мин.` : '—'}</span>
          </div>

          <p className="details-description">
            {movie.description || movie.shortDescription || 'Описание для этого фильма пока отсутствует.'}
          </p>

          <div className="modal-tags">
            {movie.genres && movie.genres.length > 0 ? (
              movie.genres.map((g, index) => (
                <span key={index} className="modal-tag">{g.genre}</span>
              ))
            ) : (
              <span className="modal-tag">Жанры не указаны</span>
            )}
          </div>

          <div className="actions-row">
            {trailerInfo && (
              trailerInfo.isEmbeddable ? (
                <button className="trailer-btn" onClick={() => setIsTrailerOpen(true)}>
                  ▶ Смотреть трейлер
                </button>
              ) : (
                <a 
                  href={trailerInfo.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="trailer-btn"
                >
                  ▶ Смотреть трейлер на Кинопоиске
                </a>
              )
            )}
            
            <button className="share-btn" onClick={handleShare} title="Поделиться фильмом">
              🔗 Поделиться
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isTrailerOpen && trailerInfo?.isEmbeddable && (
          <motion.div 
            className="trailer-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsTrailerOpen(false)}
          >
            <motion.div 
              className="trailer-modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="close-trailer-btn" onClick={() => setIsTrailerOpen(false)}>✖</button>
              <iframe 
                width="100%" 
                height="100%" 
                src={trailerInfo.url} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

export default MovieDetails;