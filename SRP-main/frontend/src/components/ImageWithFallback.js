import React, { useState } from 'react';
import './ImageFallback.css';

/**
 * Image component with fallback support for broken/missing images
 */
const ImageWithFallback = ({ 
  src, 
  alt, 
  className = '', 
  fallbackSrc = null,
  category = 'default',
  productName = '',
  ...props 
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced category-based fallback images with sophisticated detection
  const getCategoryFallback = (productName, category) => {
    const name = (productName || '').toLowerCase();
    const cat = (category || '').toLowerCase();
    
    // Footwear detection - comprehensive shoe categories
    if (name.includes('shoe') || name.includes('sneaker') || name.includes('boot') || 
        name.includes('sandal') || name.includes('slipper') || name.includes('heel') ||
        name.includes('loafer') || name.includes('oxford') || name.includes('running') ||
        name.includes('casual') || name.includes('formal') || name.includes('sports') ||
        name.includes('flip') || name.includes('flop') || name.includes('pump') ||
        cat.includes('footwear') || cat.includes('shoes')) {
      // Different shoe images for variety
      const shoeImages = [
        'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop&crop=center', // Sneakers
        'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&h=300&fit=crop&crop=center', // Running shoes
        'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=300&h=300&fit=crop&crop=center', // Casual shoes
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=300&h=300&fit=crop&crop=center'  // Boots
      ];
      return shoeImages[Math.floor(Math.random() * shoeImages.length)];
    }
    
    // Bags detection - comprehensive bag categories
    if (name.includes('bag') || name.includes('backpack') || name.includes('purse') ||
        name.includes('handbag') || name.includes('tote') || name.includes('clutch') ||
        name.includes('satchel') || name.includes('messenger') || name.includes('sling') ||
        name.includes('laptop bag') || name.includes('travel') || cat.includes('bags')) {
      const bagImages = [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop&crop=center', // Handbag
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop&crop=center', // Backpack
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=300&h=300&fit=crop&crop=center', // Leather bag
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=300&fit=crop&crop=center'  // Tote bag
      ];
      return bagImages[Math.floor(Math.random() * bagImages.length)];
    }
    
    // Clothing detection - comprehensive apparel categories
    if (name.includes('shirt') || name.includes('t-shirt') || name.includes('tee') ||
        name.includes('top') || name.includes('blouse') || name.includes('dress') ||
        name.includes('pant') || name.includes('jean') || name.includes('trouser') ||
        name.includes('skirt') || name.includes('jacket') || name.includes('coat') ||
        name.includes('sweater') || name.includes('hoodie') || name.includes('bra') ||
        name.includes('underwear') || name.includes('kurta') || name.includes('saree') ||
        cat.includes('clothing') || cat.includes('apparel') || cat.includes('fashion')) {
      const clothingImages = [
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=300&fit=crop&crop=center', // Clothing rack
        'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&h=300&fit=crop&crop=center', // T-shirts
        'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&h=300&fit=crop&crop=center', // Dress
        'https://images.unsplash.com/photo-1571455786673-9d9d6c194f90?w=300&h=300&fit=crop&crop=center'  // Fashion items
      ];
      return clothingImages[Math.floor(Math.random() * clothingImages.length)];
    }
    
    // Electronics detection - comprehensive tech categories
    if (name.includes('phone') || name.includes('mobile') || name.includes('smartphone') ||
        name.includes('laptop') || name.includes('computer') || name.includes('tablet') ||
        name.includes('headphone') || name.includes('speaker') || name.includes('camera') ||
        name.includes('watch') || name.includes('earphone') || name.includes('charger') ||
        name.includes('cable') || cat.includes('electronics') || cat.includes('technology')) {
      const electronicsImages = [
        'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=300&h=300&fit=crop&crop=center', // Smartphone
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=300&fit=crop&crop=center', // Laptop
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop&crop=center', // Headphones
        'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=300&h=300&fit=crop&crop=center'  // Camera
      ];
      return electronicsImages[Math.floor(Math.random() * electronicsImages.length)];
    }
    
    // Beauty & cosmetics detection
    if (name.includes('lipstick') || name.includes('makeup') || name.includes('cosmetic') ||
        name.includes('cream') || name.includes('lotion') || name.includes('perfume') ||
        name.includes('shampoo') || name.includes('soap') || name.includes('foundation') ||
        name.includes('mascara') || cat.includes('beauty') || cat.includes('cosmetics') || 
        cat.includes('personal care')) {
      const beautyImages = [
        'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=300&fit=crop&crop=center', // Cosmetics
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=300&fit=crop&crop=center', // Makeup
        'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&h=300&fit=crop&crop=center', // Beauty products
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center'  // Skincare
      ];
      return beautyImages[Math.floor(Math.random() * beautyImages.length)];
    }
    
    // Default fallback - a modern, clean product placeholder
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=300&fit=crop&crop=center';
  };

  const handleError = () => {
    console.log('🖼️ Image error for:', src, 'Category:', category, 'Alt:', alt);
    if (!hasError) {
      setHasError(true);
      
      // Get realistic fallback based on product name and category
      const nextSrc = fallbackSrc || getCategoryFallback(productName || alt, category);
      
      console.log('🔄 Switching to realistic fallback:', nextSrc);
      setImgSrc(nextSrc);
    }
  };

  const handleLoad = () => {
    // Reset error state when image loads successfully
    console.log('✅ Image loaded successfully:', imgSrc);
    setHasError(false);
    setIsLoading(false);
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`${className} ${hasError ? 'fallback-image' : ''} ${isLoading ? 'image-loading' : ''}`}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
};

export default ImageWithFallback;
