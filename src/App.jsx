import { useState, useEffect } from 'react';
import './App.css';

function MovieCard({ movie, isFavorite, onToggleFavorite, onClick }) {
  const imageUrl = movie.image ? movie.image.medium : 'https://via.placeholder.com/210x295?text=Нет+постера';
  const rating = movie.rating.average ? movie.rating.average : 'Нет';
  const year = movie.premiered ? movie.premiered.slice(0, 4) : 'Неизвестно';

  return (
    <div className="movie-card" onClick={onClick}>
      <button className="fav-btn" onClick={(e) => { e.stopPropagation(); onToggleFavorite(movie.id); }}>
        {isFavorite ? '❤️' : '🤍'}
      </button>
      <img src={imageUrl} alt={movie.name} className="movie-poster" />
      <div className="movie-info">
        <h3 className="movie-title">{movie.name}</h3>
        <div className="movie-meta">
          <span>⭐ {rating}</span>
          <span>📅 {year}</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [movies, setMovies] = useState([]); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [currentTab, setCurrentTab] = useState('all'); 
  const [sortBy, setSortBy] = useState('default'); // НОВОЕ СОСТОЯНИЕ ДЛЯ СОРТИРОВКИ
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMovie, setSelectedMovie] = useState(null);

  useEffect(() => {
    fetch('https://api.tvmaze.com/shows?page=1')
      .then(response => response.json())
      .then(data => setMovies(data))
      .catch(error => console.error('Ошибка:', error));
  }, []);

  const toggleFavorite = (movieId) => {
    let newFavorites = favorites.includes(movieId) 
      ? favorites.filter(id => id !== movieId) 
      : [...favorites, movieId];
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  // --- ФИЛЬТРАЦИЯ И СОРТИРОВКА ---
  // 1. Берем копию массива [...], чтобы sort не мутировал исходный стейт movies!
  let result = currentTab === 'all' ? [...movies] : movies.filter(m => favorites.includes(m.id));

  // 2. Фильтруем
  result = result.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // 3. Сортируем
  if (sortBy === 'rating') {
    result.sort((a, b) => (b.rating.average || 0) - (a.rating.average || 0));
  } else if (sortBy === 'year') {
    result.sort((a, b) => {
      const yearA = a.premiered ? a.premiered.slice(0, 4) : '0';
      const yearB = b.premiered ? b.premiered.slice(0, 4) : '0';
      return yearB.localeCompare(yearA);
    });
  } else if (sortBy === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div style={{ backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      
      <header className="header">
        <h1>🎬 Моя Кинотека</h1>
        
        <div className="tabs">
          <button className={`tab-btn ${currentTab === 'all' ? 'active' : ''}`} onClick={() => setCurrentTab('all')}>Все фильмы</button>
          <button className={`tab-btn ${currentTab === 'favorites' ? 'active' : ''}`} onClick={() => setCurrentTab('favorites')}>Избранное ❤️</button>
        </div>
        
        <div className="controls">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Привязываем значение к sortBy и обновляем его при выборе */}
          <select 
            className="sort-select" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="default">По умолчанию</option>
            <option value="rating">По рейтингу</option>
            <option value="year">По году</option>
            <option value="name">По алфавиту</option>
          </select>
        </div>
      </header>
      
      {movies.length === 0 ? (
        <p style={{ padding: '20px' }}>Загрузка данных...</p>
      ) : result.length === 0 ? (
        <p style={{ padding: '20px' }}>Ничего не найдено 😢</p>
      ) : (
        <div className="movies-grid">
          {result.map(movie => (
            <MovieCard 
              key={movie.id} movie={movie} 
              isFavorite={favorites.includes(movie.id)} 
              onToggleFavorite={toggleFavorite}
              onClick={() => setSelectedMovie(movie)} 
            />
          ))}
        </div>
      )}

      {selectedMovie && (
        <div className="modal-overlay" onClick={() => setSelectedMovie(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMovie(null)}>✖</button>
            <div className="modal-body">
              <img src={selectedMovie.image ? selectedMovie.image.original : 'https://via.placeholder.com/300x450'} alt={selectedMovie.name} className="modal-poster" />
              <div className="modal-info">
                <h2>{selectedMovie.name}</h2>
                <p>{selectedMovie.summary ? selectedMovie.summary.replace(/<[^>]*>/g, '') : 'Описание отсутствует.'}</p>
                <div className="modal-tags">
                  {selectedMovie.genres.map((genre, index) => <span key={index} className="modal-tag">{genre}</span>)}
                </div>
                {selectedMovie.officialSite && (
                  <a href={selectedMovie.officialSite} target="_blank" rel="noreferrer" className="modal-link">Перейти на сайт</a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;