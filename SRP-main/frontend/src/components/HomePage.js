import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

const HomePage = () => {
    const navigate = useNavigate();

    const handleSearch = (query) => {
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    const popularSearches = [
        'iPhone', 'Samsung Galaxy', 'Laptop', 'Headphones', 'Shoes', 'T-shirt', 
        'Books', 'Watch', 'Backpack', 'Sunglasses', 'Camera', 'Bluetooth Speaker'
    ];

    const categories = [
        { name: 'Electronics', icon: '📱', color: '#667eea' },
        { name: 'Fashion', icon: '👕', color: '#764ba2' },
        { name: 'Home & Kitchen', icon: '🏠', color: '#f093fb' },
        { name: 'Books', icon: '📚', color: '#4facfe' },
        { name: 'Sports', icon: '⚽', color: '#43e97b' },
        { name: 'Beauty', icon: '💄', color: '#fa709a' }
    ];

    return (
        <div className={styles.homePage}>
            <div className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>
                        Discover Amazing Products
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Search through thousands of products with our intelligent search engine
                    </p>
                    
                    <div className={styles.searchSection}>
                        <div className={styles.searchInputContainer}>
                            <input
                                type="text"
                                placeholder="Search for products, brands and more..."
                                className={styles.heroSearchInput}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearch(e.target.value);
                                    }
                                }}
                            />
                            <button 
                                className={styles.searchButton}
                                onClick={(e) => {
                                    const input = e.target.parentElement.querySelector('input');
                                    handleSearch(input.value);
                                }}
                            >
                                🔍
                            </button>
                        </div>
                    </div>

                    <div className={styles.popularSearches}>
                        <h3>Popular Searches</h3>
                        <div className={styles.searchTags}>
                            {popularSearches.map((search, index) => (
                                <button
                                    key={index}
                                    className={styles.searchTag}
                                    onClick={() => handleSearch(search)}
                                >
                                    {search}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.categories}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>Shop by Category</h2>
                    <div className={styles.categoryGrid}>
                        {categories.map((category, index) => (
                            <div
                                key={index}
                                className={styles.categoryCard}
                                onClick={() => handleSearch(category.name)}
                                style={{ '--category-color': category.color }}
                            >
                                <div className={styles.categoryIcon}>{category.icon}</div>
                                <h3 className={styles.categoryName}>{category.name}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.features}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>Why Choose Our Search?</h2>
                    <div className={styles.featureGrid}>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>⚡</div>
                            <h3>Lightning Fast</h3>
                            <p>Get instant search results with our optimized search engine</p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>🎯</div>
                            <h3>Smart Suggestions</h3>
                            <p>Intelligent autocomplete with typo tolerance</p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>🔍</div>
                            <h3>Advanced Filters</h3>
                            <p>Filter by price, brand, rating, and more</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
