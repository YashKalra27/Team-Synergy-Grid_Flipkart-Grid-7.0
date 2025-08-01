import React from 'react';
import styles from './ProductCard.module.css';
import ImageWithFallback from './ImageWithFallback';

const ProductCard = ({ product }) => {
  // Extract category from product for fallback image
  const getCategory = (product) => {
    const categoryTree = product.category || product.product_category_tree || '';
    const tree = categoryTree.toLowerCase();
    if (tree.includes('clothing') || tree.includes('apparel')) return 'clothing';
    if (tree.includes('footwear') || tree.includes('shoes')) return 'footwear';
    if (tree.includes('electronics') || tree.includes('mobile')) return 'electronics';
    if (tree.includes('furniture') || tree.includes('home')) return 'furniture';
    if (tree.includes('beauty') || tree.includes('cosmetics')) return 'beauty';
    if (tree.includes('sports') || tree.includes('fitness')) return 'sports';
    if (tree.includes('books') || tree.includes('media')) return 'books';
    return 'default';
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <ImageWithFallback 
          src={product.thumbnail} 
          alt={product.name} 
          className={styles.image}
          category={getCategory(product)}
        />
      </div>
      <div className={styles.details}>
        <p className={styles.brand}>{product.brand}</p>
        <h4 className={styles.name}>{product.name}</h4>
        <div className={styles.ratingsContainer}>
            <span className={styles.ratings}>{product.rating} ★</span>
            <span className={styles.numReviews}>({(product.numReviews || 0).toLocaleString()})</span>
        </div>
        <div className={styles.priceContainer}>
            <span className={styles.price}>₹{(product.price || 0).toLocaleString()}</span>
            {product.offers && <span className={styles.offer}>{product.offers}</span>}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

