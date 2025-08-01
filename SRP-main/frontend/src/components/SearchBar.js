import React, { useState, useEffect, useRef } from 'react';
import styles from './SearchBar.module.css';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchContainerRef = useRef(null);

  // --- SIDE EFFECTS ---

  // Effect 1: Sync the search bar's text with the URL when the page location changes.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlQuery = params.get('q') || '';
    setQuery(urlQuery);
    setInitialLoadComplete(true); // Mark that the initial URL has been processed
  }, [location.search]);

  // Effect 2: Fetch suggestions when the user types.
  useEffect(() => {
    // Don't fetch suggestions until the initial URL query has been set.
    if (!initialLoadComplete) {
      return;
    }

    // Condition to fetch: query must not be empty.
    if (query) {
      setIsLoading(true);
      const timerId = setTimeout(() => {
        fetchAutosuggestions(query)
          .then(response => {
            setSuggestions(response.data || []);
            setError(null);
          })
          .catch(err => {
            setError(err.message || 'Could not fetch suggestions');
            setSuggestions([]);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }, 300); // Debounce API calls
      return () => clearTimeout(timerId);
    } else {
      // Clear suggestions if the query is empty.
      setSuggestions([]);
    }
  }, [query, initialLoadComplete]);

  // Effect 3: Load search history from localStorage on initial render.
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('searchHistory');
      if (storedHistory) {
        setSearchHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error('Failed to parse search history:', e);
      setSearchHistory([]);
    }
  }, []);

  // Effect 4: Handle clicks outside the search bar to close suggestions.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HANDLER FUNCTIONS ---

  const updateSearchHistory = (term) => {
    const newHistory = [term, ...searchHistory.filter(t => t !== term)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  const fetchAutosuggestions = async (q) => {
    // This check prevents sending empty queries to the backend
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    return axios.get(`http://localhost:5001/api/search/autosuggest?q=${q}`);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // If the user focuses on the bar and there's already text but no suggestions, fetch them.
    if (query && suggestions.length === 0) {
      setIsLoading(true);
      fetchAutosuggestions(query)
        .then(response => setSuggestions(response.data || []))
        .catch(err => setError(err.message || 'Could not fetch suggestions'))
        .finally(() => setIsLoading(false));
    }
  };

  const handleSearch = (searchTerm) => {
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm) return;

    // Log the direct search event for analytics.
    try {
      axios.post('http://localhost:5001/api/analytics/log-search', { query: trimmedTerm });
    } catch (err) {
      console.error('Failed to log search event:', err);
    }

    // Update local history and navigate.
    updateSearchHistory(trimmedTerm);
    setIsFocused(false);
    navigate(`/search?q=${encodeURIComponent(trimmedTerm)}`);
  };

  const handleSuggestionClick = async (suggestionText) => {
    // First, log the click event for analytics. Await ensures this completes before navigation.
    try {
      await axios.post('http://localhost:5001/api/analytics/autosuggest-click', {
        query: suggestionText,
        prefix: query // 'query' state holds the original user input
      });
    } catch (err) {
      // Log error without disturbing the user. The navigation will still proceed.
      console.error('Failed to log suggestion click:', err);
    }

    // Then, navigate the user to the search results page.
    handleSearch(suggestionText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  // --- RENDER LOGIC ---

  const showHistory = isFocused && query.length === 0 && searchHistory.length > 0;
  const showSuggestions = isFocused && query.length > 0;

  return (
    <div className={styles.searchContainer} ref={searchContainerRef}>
      <div className={styles.searchWrapper}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search for products, brands and more"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />
        {(showHistory || showSuggestions || (isFocused && error)) && (
          <ul className={styles.suggestionsList}>
            {error && <li className={styles.errorItem}>{error}</li>}
            {showHistory && (
              <>
                <li className={styles.historyHeader}>Recent Searches</li>
                {searchHistory.map((term, index) => (
                  <li
                    key={`${term}-${index}`}
                    className={styles.suggestionItem}
                    onClick={() => handleSearch(term)}
                  >
                    <span className={styles.historyIcon}></span>
                    <span className={styles.suggestionText}>{term}</span>
                  </li>
                ))}
              </>
            )}
            {showSuggestions && isLoading && <li className={styles.loadingItem}>Loading...</li>}
            {showSuggestions && !isLoading && suggestions.length === 0 && (
              <li className={styles.noResultsItem}>No suggestions found</li>
            )}
            {showSuggestions && !isLoading &&
              suggestions.map((s, index) => (
                <li
                  key={`${s.text}-${index}`}
                  className={styles.suggestionItem}
                  onClick={() => handleSuggestionClick(s.text)}
                >
                  <span className={s.type === 'popular' ? styles.popularIcon : styles.generalIcon}></span>
                  <span className={styles.suggestionText}>{s.text}</span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
