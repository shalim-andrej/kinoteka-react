import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider, db } from '../firebase/config';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import '../App.css';

const API_KEY = import.meta.env.VITE_KINOPOISK_API_KEY;
const BASE_URL = 'https://kinopoiskapiunofficial.tech/api/v2.2';

interface Genre {
  genre: string;
}

interface Movie {
  kinopoiskId: number;
  nameRu: string | null;
  nameEn: string | null;
  posterUrlPreview: string;
  ratingKinopoisk: number | null;
  year: number | null;
  genres: Genre[];
}

interface ApiResponse {
  items: Movie[];
}

interface HomeProps {
  theme: string;
  toggleTheme: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-poster"></div>
      <div className="skeleton-info">
        <div className="skeleton-title"></div>
        <div className="skeleton-meta"></div>
      </div>
    </div>
  );
}

interface MovieCardProps {
  movie: Movie;
  isFavorite: boolean;
  onToggleFavorite: (movie: Movie) => void;
  onClick: () => void;
}

function MovieCard({ movie, isFavorite, onToggleFavorite, onClick }: MovieCardProps) {
  const imageUrl = movie.posterUrlPreview ? movie.posterUrlPreview : 'https://via.placeholder.com/210x295?text=Нет+постера';
  const rating = movie.ratingKinopoisk ? movie.ratingKinopoisk.toFixed(1) : 'Нет';
  const year = movie.year ? movie.year : 'Неизвестно';
  const title = movie.nameRu || movie.nameEn || 'Без названия';

  return (
    <motion.div className="movie-card" variants={cardVariants} onClick={onClick}>
      <button className="fav-btn" onClick={(e) => { e.stopPropagation(); onToggleFavorite(movie); }}>
        {isFavorite ? '❤️' : '🤍'}
      </button>
      <img src={imageUrl} alt={title} className="movie-poster" />
      <div className="movie-info">
        <h3 className="movie-title">{title}</h3>
        <div className="movie-meta">
          <span>⭐ {rating}</span>
          <span>📅 {year}</span>
        </div>
      </div>
    </motion.div>
  );
}

function Home({ theme, toggleTheme }: HomeProps) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const { user } = useAuth();
  
  const [movies, setMovies] = useState<Movie[]>([]); 
  const [searchTerm, setSearchTerm] = useState<string>(''); 
  const [currentTab, setCurrentTab] = useState<'all' | 'favorites'>('all'); 
  const [sortBy, setSortBy] = useState<string>('default'); 
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [error, setError] = useState<string | null>(null); 
  
  const [yearRange, setYearRange] = useState<number[]>([1950, currentYear]);
  const [ratingRange, setRatingRange] = useState<number[]>([0, 10]);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const debouncedSearchTerm = useDebounce<string>(searchTerm, 400);
  const { ref, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    const syncFavorites = async () => {
      if (!user) {
        const saved = localStorage.getItem('favorites');
        setFavorites(saved ? JSON.parse(saved) : []);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().favorites) {
          const cloudFavorites = userDocSnap.data().favorites as number[];
          setFavorites(cloudFavorites);
          localStorage.setItem('favorites', JSON.stringify(cloudFavorites));
        } else {
          const localFavorites: number[] = JSON.parse(localStorage.getItem('favorites') || '[]');
          if (localFavorites.length > 0) {
            await setDoc(userDocRef, { favorites: localFavorites }, { merge: true });
            toast.success(`Перенесено ${localFavorites.length} фильмов в облако`, { icon: '☁️' });
          }
        }
      } catch (err) {
        console.error('Ошибка синхронизации:', err);
        toast.error('Не удалось синхронизировать избранное');
      }
    };

    syncFavorites();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Вы успешно вошли!');
    } catch (error: any) {
      toast.error('Ошибка входа: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Вы вышли из аккаунта');
    } catch (error) {
      toast.error('Ошибка выхода');
    }
  };

  const fetchMovies = async (pageNumber: number) => {
    setIsLoading(true);
    setError(null); 
    try {
      const response = await fetch(`${BASE_URL}/films/collections?type=TOP_POPULAR_ALL&page=${pageNumber}`, {
        headers: { 'X-API-KEY': API_KEY, 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Ошибка API');
      const data: ApiResponse = await response.json();
      
      if (!data.items || data.items.length === 0) {
        setHasMore(false);
      } else {
        setMovies(prevMovies => {
          const existingIds = new Set(prevMovies.map(m => m.kinopoiskId));
          const uniqueNewMovies = data.items.filter(m => !existingIds.has(m.kinopoiskId));
          return [...prevMovies, ...uniqueNewMovies];
        });
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies(1);
  }, []);

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      handleLoadMore();
    }
  }, [inView, hasMore, isLoading]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMovies(nextPage);
  };

  const toggleFavorite = async (movie: Movie) => {
    const isCurrentlyFavorite = favorites.includes(movie.kinopoiskId);
    const movieTitle = movie.nameRu || movie.nameEn || 'Фильм';
    
    let newFavorites: number[];
    if (isCurrentlyFavorite) {
      newFavorites = favorites.filter(id => id !== movie.kinopoiskId);
      toast.error(`"${movieTitle}" удален из избранного`, { icon: '💔' });
    } else {
      newFavorites = [...favorites, movie.kinopoiskId];
      toast.success(`"${movieTitle}" добавлен в избранное`, { icon: '❤️' });
    }

    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { favorites: newFavorites }, { merge: true });
      } catch (err) {
        console.error('Ошибка сохранения в облако:', err);
        toast.error('Не удалось сохранить в облако');
      }
    }
  };

  const resetFilters = () => {
    setYearRange([1950, currentYear]);
    setRatingRange([0, 10]);
    setSelectedGenre('all');
    setSearchTerm('');
    setSortBy('default');
  };

  const allGenres = ['all', ...Array.from(new Set(movies.flatMap(m => m.genres ? m.genres.map(g => g.genre) : [])))];

  let result = currentTab === 'all' ? [...movies] : movies.filter(m => favorites.includes(m.kinopoiskId));
  
  const getTitle = (m: Movie) => (m.nameRu || m.nameEn || '').toLowerCase();
  result = result.filter(m => getTitle(m).includes(debouncedSearchTerm.toLowerCase()));
  
  if (selectedGenre !== 'all') {
    result = result.filter(m => m.genres && m.genres.some(g => g.genre === selectedGenre));
  }

  result = result.filter(m => m.year && m.year >= yearRange[0] && m.year <= yearRange[1]);
  result = result.filter(m => m.ratingKinopoisk && m.ratingKinopoisk >= ratingRange[0] && m.ratingKinopoisk <= ratingRange[1]);

  if (sortBy === 'rating') result.sort((a, b) => (b.ratingKinopoisk || 0) - (a.ratingKinopoisk || 0));
  else if (sortBy === 'year') result.sort((a, b) => (b.year || 0) - (a.year || 0));
  else if (sortBy === 'name') result.sort((a, b) => (a.nameRu || '').localeCompare(b.nameRu || ''));

  const showInfiniteTrigger = currentTab === 'all' && !debouncedSearchTerm && hasMore;

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: '40px', transition: 'background-color 0.3s' }}>
      
      <header className="header">
        <h1>🎬 Моя Кинотека</h1>
        
        <div className="tabs">
          <button className={`tab-btn ${currentTab === 'all' ? 'active' : ''}`} onClick={() => setCurrentTab('all')}>Все фильмы</button>
          <button className={`tab-btn ${currentTab === 'favorites' ? 'active' : ''}`} onClick={() => setCurrentTab('favorites')}>
            Избранное ❤️ {user && '☁️'}
          </button>
        </div>
        
        <div className="controls">
          {/* КОНТЕЙНЕР ДЛЯ ПОИСКА С КНОПКОЙ ОЧИСТКИ */}
          <div className="search-wrapper">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Поиск..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {searchTerm && (
              <button 
                className="clear-search-btn" 
                onClick={() => setSearchTerm('')}
                title="Очистить поиск"
              >
                ✕
              </button>
            )}
          </div>
          
          <select className="sort-select" value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}>
            {allGenres.map(genre => <option key={genre} value={genre}>{genre === 'all' ? 'Все жанры' : genre}</option>)}
          </select>

          <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="default">По умолчанию</option>
            <option value="rating">По рейтингу</option>
            <option value="year">По году</option>
            <option value="name">По алфавиту</option>
          </select>

          <button className="filters-btn" onClick={() => setShowFilters(!showFilters)}>
            ⚙️ Фильтры
          </button>

          <button className="theme-toggle" onClick={toggleTheme} title="Сменить тему">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user ? (
            <div className="user-profile">
              <img src={user.photoURL || 'https://via.placeholder.com/30'} alt="avatar" className="user-avatar" title={user.displayName || 'User'} />
              <button className="filters-btn" onClick={handleLogout}>Выйти</button>
            </div>
          ) : (
            <button className="filters-btn" onClick={handleLogin}>Войти</button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 20 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="filters-panel">
              <div className="filter-group">
                <label>Год выпуска: <b>{yearRange[0]} - {yearRange[1]}</b></label>
                <Slider 
                  range 
                  min={1950} 
                  max={currentYear} 
                  value={yearRange} 
                  onChange={(val) => setYearRange(val as number[])} 
                  className="custom-slider" 
                />
              </div>
              
              <div className="filter-group">
                <label>Рейтинг Кинопоиска: <b>{ratingRange[0]} - {ratingRange[1]}</b></label>
                <Slider 
                  range 
                  min={0} 
                  max={10} 
                  step={0.1} 
                  value={ratingRange} 
                  onChange={(val) => setRatingRange(val as number[])} 
                  className="custom-slider" 
                />
              </div>

              <button className="reset-btn" onClick={resetFilters}>Сбросить все</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {error && <div style={{ padding: '20px', color: '#ff6b6b', textAlign: 'center' }}>⚠️ {error}</div>}

      {!error && result.length === 0 && isLoading ? (
        <div className="movies-grid">{Array(10).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : !error && result.length === 0 ? (
        <p style={{ padding: '20px', textAlign: 'center' }}>
          {currentTab === 'favorites' ? 'В избранном пока пусто 😢' : 'По вашим фильмам ничего не найдено 😢'}
        </p>
      ) : (
        <motion.div 
          className="movies-grid" 
          variants={containerVariants} 
          initial="hidden" 
          animate="visible"
        >
          {result.map(movie => (
            <MovieCard 
              key={movie.kinopoiskId} 
              movie={movie} 
              isFavorite={favorites.includes(movie.kinopoiskId)} 
              onToggleFavorite={toggleFavorite} 
              onClick={() => navigate(`/movie/${movie.kinopoiskId}`)} 
            />
          ))}
        </motion.div>
      )}

      {showInfiniteTrigger && (
        <div ref={ref} className="infinite-scroll-trigger">
          {isLoading && <p>Ищем еще фильмы...</p>}
        </div>
      )}
    </div>
  );
}

export default Home;