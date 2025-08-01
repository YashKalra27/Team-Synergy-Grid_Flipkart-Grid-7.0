function extractFilters(query) {
  query = query.toLowerCase();
  const filters = {
    gender: null,
    category: null,
    price: {},
    rating: {},
    keywords: []
  };

  // Gender
  if (query.includes("men")) filters.gender = "men";
  if (query.includes("women")) filters.gender = "women";
  if (query.includes("kids")) filters.gender = "kids";

  // Category keywords (expandable list)
  const categories = [
    "shoes", "tops", "mobiles", "jeans", "sarees", "laptops",
    "sneakers", "t-shirt", "laptop bag", "watch", "headphone", "speaker",
    "camera", "refrigerator", "washing machine", "air conditioner", "television",
    "books", "perfume", "wallet", "sunglasses", "backpack", "power bank",
    "keyboard", "mouse", "monitor", "printer", "router", "smartwatch",
    "earbuds", "trimmer", "hair dryer", "mixer grinder", "pressure cooker",
    "cookware", "bedsheet", "curtains", "sofa", "dining table", "wardrobe",
    "mattress", "pillow", "blanket", "water bottle", "coffee maker", "air fryer",
    "gas stove", "dinner set", "food processor", "juicer", "vacuum cleaner",
    "iron box", "stabilizer", "running shoes", "dumbbell", "yoga mat",
    "cricket bat", "football", "badminton racquet", "cycling", "gym bag",
    "protein powder", "fitness tracker", "gaming console", "gaming headset",
    "gaming mouse", "mechanical keyboard", "4k monitor", "led strip lights",
    "skincare", "moisturizer", "face wash", "sunscreen", "shampoo", "conditioner",
    "body lotion", "deodorant", "makeup kit", "foundation", "lipstick", "kajal",
    "nail polish", "hair oil", "hair colour", "electric toothbrush", "grooming kit",
    "epilator", "bookshelf", "study table", "bluetooth headphones", "iphone charger",
    "tripod", "kids toys", "home decor", "kitchen appliances", "gardening tools",
    "musical instruments", "sports equipment", "travel accessories", "luggage",
    "jewellery", "art supplies", "craft supplies", "hobby kits", "drones",
    "car accessories", "bike accessories", "pet supplies", "health supplements",
    "face masks", "hand sanitizers"
  ];
  for (const cat of categories) {
    if (query.includes(cat)) {
      filters.category = cat;
      break;
    }
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
    "with", "stars", "to", "at", "between", "and", "up"
  ];

  // Start with all words, then filter out stop words and numbers
  let keywords = query.split(" ").filter(w => w.trim() !== '');

  // We don't remove the category from keywords anymore.
  // The search query needs it for relevance.
  filters.keywords = keywords
    .filter(w => !removeWords.includes(w) && isNaN(w));

  return filters;
}

module.exports = extractFilters;
