function extractFilters(query) {
    query = query.toLowerCase();
    const filters = {
      gender: null,
      category: null,
      brand: null,
      price: {},
      rating: {},
      keywords: []
    };
  
    // Gender
    if (query.includes("men")) filters.gender = "men";
    if (query.includes("women")) filters.gender = "women";
    if (query.includes("kids")) filters.gender = "kids";

    // Brand Detection
    const knownBrands = [
      // Electronics
      'samsung', 'apple', 'iphone', 'xiaomi', 'oneplus', 'oppo', 'vivo', 'realme', 'nokia', 'motorola',
      'sony', 'lg', 'panasonic', 'philips', 'canon', 'nikon', 'gopro', 'jbl', 'bose', 'sennheiser',
      'dell', 'hp', 'lenovo', 'asus', 'acer', 'msi', 'razer', 'logitech', 'steelseries',
      
      // Clothing & Fashion
      'nike', 'adidas', 'puma', 'reebok', 'under armour', 'levis', 'wrangler', 'calvin klein', 'tommy hilfiger',
      'ralph lauren', 'gucci', 'prada', 'louis vuitton', 'zara', 'h&m', 'forever 21', 'gap',
      
      // Home & Kitchen
      'bosch', 'siemens', 'whirlpool', 'lg', 'samsung', 'ifb', 'godrej', 'havells', 'crompton',
      
      // Automotive
      'toyota', 'honda', 'maruti', 'hyundai', 'tata', 'mahindra', 'bmw', 'mercedes', 'audi',
      
      // Beauty & Personal Care
      'lakme', 'maybelline', 'loreal', 'garnier', 'ponds', 'dove', 'nivea', 'vaseline',
      
      // Sports & Fitness
      'decathlon', 'adidas', 'nike', 'puma', 'reebok', 'under armour',
      
      // Books & Stationery
      'scholastic', 'penguin', 'harper collins', 'oxford', 'cambridge',
      
      // Food & Beverages
      'nestle', 'cadbury', 'britannia', 'parle', 'amul', 'mother dairy'
    ];

    // Check for exact brand matches
    for (const brand of knownBrands) {
      if (query.includes(brand)) {
        filters.brand = brand;
        break; // Use the first matching brand
      }
    }
  
    // Enhanced Category Detection with Priority and Synonyms
    const categoryMappings = {
      // Main categories from dataset
      "clothing": ["clothing", "clothes", "apparel", "garments", "dress", "shirt", "pants", "jeans", "dresses", "tops", "shirts"],
      "jewellery": ["jewellery", "jewelry", "necklace", "earrings", "bracelet", "ring", "ornaments"],
      "footwear": ["footwear", "shoes", "sneakers", "boots", "sandals", "loafers", "pumps", "heels", "flats"],
      "mobiles": ["mobiles", "mobile phones", "smartphones", "phones", "cell phones", "iphone", "android"],
      "computers": ["computers", "laptops", "notebook", "portable computer", "macbook", "dell laptop", "hp laptop"],
      "automotive": ["automotive", "car accessories", "bike accessories", "vehicle"],
      "home": ["home", "home decor", "home accessories", "home goods"],
      "furniture": ["furniture", "sofa", "bed", "table", "chair", "cabinet"],
      
      // Subcategories for better matching
      "shoes": ["shoes", "sneakers", "footwear", "boots", "sandals", "loafers", "pumps", "heels", "flats", "sports shoes", "running shoes", "casual shoes", "formal shoes"],
      "sneakers": ["sneakers", "athletic shoes", "sports shoes", "running shoes", "trainers", "tennis shoes"],
      "boots": ["boots", "ankle boots", "knee boots", "winter boots", "hiking boots"],
      
      "shirts": ["shirts", "t-shirt", "tshirt", "polo", "formal shirt", "casual shirt", "dress shirt"],
      "tops": ["tops", "blouse", "tunic", "crop top", "tank top"],
      "jeans": ["jeans", "denim", "trousers", "pants"],
      "dresses": ["dresses", "gown", "frock", "maxi dress", "mini dress"],
      
      "laptops": ["laptops", "notebook", "portable computer", "macbook", "dell laptop", "hp laptop"],
      "headphones": ["headphones", "earphones", "earbuds", "bluetooth headphones", "wireless headphones"],
      "watches": ["watches", "smartwatch", "digital watch", "analog watch", "wristwatch"],
      
      "bags": ["bags", "backpack", "handbag", "shoulder bag", "crossbody bag", "tote bag", "laptop bag"],
      "wallets": ["wallets", "purse", "card holder", "money clip"],
      
      "appliances": ["appliances", "refrigerator", "washing machine", "air conditioner", "television", "tv"],
      "kitchen": ["kitchen", "cookware", "pressure cooker", "mixer grinder", "food processor", "juicer"],
      
      "sports": ["sports", "fitness", "gym", "exercise", "workout", "training"],
      "fitness": ["fitness", "gym equipment", "dumbbell", "yoga mat", "fitness tracker"],
      
      "beauty": ["beauty", "skincare", "makeup", "cosmetics", "perfume", "fragrance"],
      "skincare": ["skincare", "moisturizer", "face wash", "sunscreen", "serum"],
      
      "books": ["books", "novel", "textbook", "magazine", "journal"],
      "stationery": ["stationery", "pen", "pencil", "notebook", "paper"],
      
      "toys": ["toys", "games", "kids toys", "board games", "puzzles"]
    };

    // Enhanced category detection with priority scoring
    let bestCategory = null;
    let bestScore = 0;

    for (const [category, synonyms] of Object.entries(categoryMappings)) {
      let score = 0;
      
      // Check exact matches first (highest priority)
      if (query.toLowerCase() === category.toLowerCase()) {
        score += 20; // Much higher score for exact category matches
      } else if (query.toLowerCase().includes(category.toLowerCase())) {
        score += 10;
      }
      
      // Check synonyms
      for (const synonym of synonyms) {
        if (query.toLowerCase().includes(synonym.toLowerCase())) {
          score += 8;
          break; // Use the first matching synonym
        }
      }
      
      // Check partial matches (reduced weight)
      for (const synonym of synonyms) {
        if (synonym.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(synonym.substring(0, 4).toLowerCase())) {
          score += 2; // Reduced weight for partial matches
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    // Only set category if we have a strong match
    if (bestCategory && bestScore >= 8) {
      filters.category = bestCategory;
    }
  
    // Price
    const priceUnderMatch = query.match(/(?:under|less than|below)\s*(\d+)/);
    const priceAboveMatch = query.match(/(?:above|greater than|more than)\s*(\d+)/);
    const priceRangeMatch = query.match(/(\d+)\s*(?:to|-)\s*(\d+)/);
    const priceExactMatch = query.match(/at\s*(\d+)/);

    if (priceUnderMatch) filters.price.lte = parseInt(priceUnderMatch[1]);
    if (priceAboveMatch) filters.price.gte = parseInt(priceAboveMatch[1]);
    if (priceRangeMatch) {
      filters.price.gte = parseInt(priceRangeMatch[1]);
      filters.price.lte = parseInt(priceRangeMatch[2]);
    }
    if (priceExactMatch) {
      filters.price.gte = parseInt(priceExactMatch[1]);
      filters.price.lte = parseInt(priceExactMatch[1]);
    }

    // Rating
    const ratingAboveMatch = query.match(/(?:above|greater than|more than)\s*(\d(?:\.\d)?)\s*stars?/);
    const ratingExactMatch = query.match(/(\d(?:\.\d)?)\s*stars?/);
    const ratingUpToMatch = query.match(/(?:up to|below)\s*(\d(?:\.\d)?)\s*stars?/);

    if (ratingAboveMatch) filters.rating.gte = parseFloat(ratingAboveMatch[1]);
    else if (ratingExactMatch) filters.rating.gte = parseFloat(ratingExactMatch[1]); // Default to gte for exact
    if (ratingUpToMatch) filters.rating.lte = parseFloat(ratingUpToMatch[1]);

    // Keyword tokens (remove known words and numbers)
    const removeWords = [
      "men", "women", "kids", "under", "above", "below", "less", "more", "than",
      "with", "stars", "to", "at", "between", "and", "up", "for", "of", "in", "on",
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have",
      "has", "had", "do", "does", "did", "will", "would", "could", "should", "may",
      "might", "can", "must", "shall", "this", "that", "these", "those", "i", "you",
      "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your",
      "his", "her", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs"
    ];

    // Start with all words, then filter out stop words and numbers
    let keywords = query.split(" ").filter(w => w.trim() !== '');

    // Enhanced keyword filtering - preserve important compound terms
    filters.keywords = keywords
      .filter(w => {
        // Keep words that are not in removeWords and not numbers
        if (removeWords.includes(w) || isNaN(w) === false) {
          return false;
        }
        
        // Keep words with 2+ characters (filter out single letters)
        if (w.length < 2) {
          return false;
        }
        
        return true;
      })
      .map(w => w.toLowerCase().trim()); // Normalize keywords

    // If no keywords found, use the original query as fallback
    if (filters.keywords.length === 0) {
      filters.keywords = [query.trim()];
    }
  
    return filters;
  }
  
  module.exports = extractFilters;
  