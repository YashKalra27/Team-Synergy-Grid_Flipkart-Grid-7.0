import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './SearchResultsPage.module.css';
import { fetchSearchResults } from '../api';
import ProductCard from './ProductCard';

const useQuery = () => {
    return new URLSearchParams(useLocation().search);
}

const SearchResultsPage = () => {
    const [results, setResults] = useState({ 
        products: [], 
        aggregations: { categories: [], brands: [] }, 
        totalPages: 1, 
        currentPage: 1, 
        totalProducts: 0 
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const query = useQuery();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const searchParams = Object.fromEntries(query.entries());
        const currentQuery = searchParams.q;

        if (!currentQuery) {
            navigate('/');
            return;
        }

        setLoading(true);
        setError(null);

        fetchSearchResults(searchParams)
            .then(response => {
                const data = response.data;

                setResults({
                    products: data.products || [],
                    aggregations: data.aggregations || { categories: [], brands: [] },
                    totalPages: Math.ceil(data.total / data.pageSize) || 1,
                    currentPage: data.page || 1,
                    totalProducts: data.total || 0
                });
            })
            .catch(err => {
                console.error('Search error:', err);
                setError('Could not fetch search results');
            })
            .finally(() => {
                setLoading(false);
            });

    }, [location.search, navigate]);

    const handleFilterChange = (filterType, value) => {
        const newQuery = new URLSearchParams(query);
        
        // Clear conflicting filters
        if (filterType === 'price_lt' || filterType === 'price_gt') {
            newQuery.delete('price_lt');
            newQuery.delete('price_gt');
        }
        
        newQuery.set(filterType, value);
        newQuery.set('page', '1');
        navigate({ search: newQuery.toString() });
    };

    const handleSortChange = (e) => {
        const newQuery = new URLSearchParams(query);
        newQuery.set('sortBy', e.target.value);
        newQuery.set('page', '1');
        navigate({ search: newQuery.toString() });
    };

    const handlePageChange = (newPage) => {
        const newQuery = new URLSearchParams(query);
        newQuery.set('page', newPage);
        navigate({ search: newQuery.toString() });
    };

    return (
        <div className={styles.srpContainer}>
            <div className={styles.content}>
                <div className={styles.resultsArea}>
                    <div className={styles.header}>
                        <p>Showing {results.products.length} of {results.totalProducts} results for <strong>"{query.get('q')}"</strong></p>
                        <select 
                            onChange={handleSortChange} 
                            className={styles.sortDropdown} 
                            value={query.get('sortBy') || ''}
                        >
                            <option value="">Sort by Relevance</option>
                            <option value="price:asc">Price: Low to High</option>
                            <option value="price:desc">Price: High to Low</option>
                            <option value="ratings:desc">Sort by Rating</option>
                        </select>
                    </div>

                    {loading && <div className={styles.loader}>Loading...</div>}
                    {error && <p className={styles.error}>{error}</p>}
                    
                    {!loading && !error && results.products.length === 0 && (
                        <div className={styles.noResults}>
                            <h3>No results found for "{query.get('q')}"</h3>
                            <p>Try different keywords or remove filters.</p>
                        </div>
                    )}

                    {!loading && !error && results.products.length > 0 && (
                        <>
                            <div className={styles.productGrid}>
                                {results.products.map(product => (
                                    <ProductCard key={product.productId} product={product} />
                                ))}
                            </div>
                            
                            {/* Simple Pagination */}
                            <div className={styles.pagination}>
                                {Array.from({ length: Math.min(results.totalPages, 10) }, (_, i) => i + 1).map(pageNum => (
                                    <button 
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)} 
                                        disabled={pageNum === results.currentPage}
                                        className={pageNum === results.currentPage ? styles.activePage : ''}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchResultsPage;