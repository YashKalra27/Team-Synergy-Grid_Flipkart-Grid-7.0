const elasticClient = require('../elasticClient');
const extractFilters = require('../utils/dynamicQueryParser');

// Known categories for category-specific searches
const knownCategories = ['clothing', 'jewellery', 'footwear', 'mobile phones', 'mobiles & accessories', 
  'automotive', 'home decor', 'home decor & festive needs', 'home furnishing', 'computers'];

// --- Helper Functions ---

const isTopRatedQuery = (query) => {
  const topRatedKeywords = ['top rated', 'best rated', 'highest rated', 'top', 'best'];
  return topRatedKeywords.some(keyword => query.toLowerCase().includes(keyword));
};

const extractRatingFromQuery = (query) => {
  const lowerQuery = query.toLowerCase();
  const underMatch = lowerQuery.match(/rating\s+(under|below|less\s+than)\s+(\d+(?:\.\d+)?)/);
  if (underMatch) return { lt: parseFloat(underMatch[2]) };
  
  const aboveMatch = lowerQuery.match(/rating\s+(above|over|greater\s+than)\s+(\d+(?:\.\d+)?)/);
  if (aboveMatch) return { gte: parseFloat(aboveMatch[2]) };

  const starAboveMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s+(star|rating)\s+(and\s+)?above/);
  if (starAboveMatch) return { gte: parseFloat(starAboveMatch[1]) };

  const exactStarMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s+star(?!s)/);
  if (exactStarMatch) return { gte: parseFloat(exactStarMatch[1]) };
  
  return null;
};


exports.dynamicSearch = async (req, res) => {
  const { q, page = 1, category, brand, sortBy, price_lt, price_gt, rating_gte } = req.query;

  console.log('Dynamic search received sortBy:', sortBy);
  console.log('All query parameters:', req.query);
  console.log('Query string:', req.url);

  if (!q) {
    return res.status(400).json({ error: "Query is required" });
  }

  // For category searches, return all products. For other searches, use pagination
  const isCategorySearch = category || knownCategories.includes(q.toLowerCase().trim());
  const pageSize = isCategorySearch ? 10000 : 20; // Large number for category searches
  const from = isCategorySearch ? 0 : (parseInt(page, 10) - 1) * pageSize;

  const parsedFilters = extractFilters(q);
  const queryKeywords = parsedFilters.keywords.join(' ');

  const filter_clauses = [];
  const must_not_clauses = [];
  const shouldClauses = [];

  // Enhanced category filtering
  if (parsedFilters.category) {
    // Add category boost to improve relevance
    shouldClauses.push({
      multi_match: {
        query: parsedFilters.category,
        fields: ['category^3', 'name^2', 'description^1'],
        type: 'phrase',
        boost: 2.0
      }
    });
    
    // Add strict category filter to ensure results are in the right category
    filter_clauses.push({
      bool: {
        should: [
          {
            term: {
              'category.keyword': {
                value: parsedFilters.category,
                boost: 5.0
              }
            }
          },
          {
            match_phrase: {
              category: {
                query: parsedFilters.category,
                boost: 3.0
              }
            }
          }
        ],
        minimum_should_match: 1
      }
    });
  }

  if (parsedFilters.gender) {
    filter_clauses.push({
      multi_match: { query: parsedFilters.gender, fields: ['name', 'description'], type: 'phrase', boost: 2 }
    });
  }

  // Enhanced brand filtering
  if (parsedFilters.brand) {
    // Add strict brand filter to ensure only products from that brand
    filter_clauses.push({
      bool: {
        should: [
          {
            term: {
              'brand.keyword': {
                value: parsedFilters.brand,
                boost: 5.0
              }
            }
          },
          {
            match_phrase: {
              brand: {
                query: parsedFilters.brand,
                boost: 3.0
              }
            }
          },
          {
            match: {
              brand: {
                query: parsedFilters.brand,
                boost: 2.0
              }
            }
          }
        ],
        minimum_should_match: 1
      }
    });
    
    // Also add brand boost to should clauses for better relevance
    shouldClauses.push({
      multi_match: {
        query: parsedFilters.brand,
        fields: ['brand^4', 'name^2', 'description^1'],
        type: 'phrase',
        boost: 3.0
      }
    });
  }

  const priceRange = {};
  if (parsedFilters.price.gte) priceRange.gte = parsedFilters.price.gte;
  if (parsedFilters.price.lte) priceRange.lte = parsedFilters.price.lte;
  if (price_gt) priceRange.gte = parseFloat(price_gt);
  if (price_lt) priceRange.lte = parseFloat(price_lt);
  if (Object.keys(priceRange).length > 0) {
    filter_clauses.push({ range: { price: priceRange } });
  }

  const ratingRange = {};
  const queryRating = extractRatingFromQuery(q);
  if (queryRating) {
    Object.assign(ratingRange, queryRating);
  }
  if (parsedFilters.rating.gte) ratingRange.gte = parsedFilters.rating.gte;
  if (parsedFilters.rating.lte) ratingRange.lte = parsedFilters.rating.lte;
  if (rating_gte && !queryRating) {
    ratingRange.gte = parseFloat(rating_gte);
  }
  if (Object.keys(ratingRange).length > 0) {
    filter_clauses.push({ range: { rating: ratingRange } });
  }

  if (category) {
    filter_clauses.push({ term: { 'category.keyword': category } });
  }
  if (brand) {
    filter_clauses.push({ term: { 'brand.keyword': brand } });
  }

  // Default sort by relevance score (client-side sorting will handle the rest)
  let sort_options = [{ _score: { order: 'desc' } }];

  try {
    // Enhanced search query for compound queries
    const searchBody = {
      from,
      size: pageSize,
      sort: sort_options,
      query: {
        function_score: {
          query: {
            bool: {
              should: [
                // Exact phrase match (highest boost)
                {
                  multi_match: {
                    query: queryKeywords,
                    fields: ['name^4', 'brand^3', 'description^2'],
                    type: 'phrase',
                    boost: 3
                  }
                },
                // Individual keyword matches with AND operator (high boost)
                {
                  multi_match: {
                    query: queryKeywords,
                    fields: ['name^4', 'brand^3', 'description^2'],
                    operator: 'and',
                    boost: 2.5
                  }
                },
                // Individual keyword matches with OR operator (medium boost)
                {
                  multi_match: {
                    query: queryKeywords,
                    fields: ['name^4', 'brand^3', 'description^2'],
                    operator: 'or',
                    boost: 1.5
                  }
                },
                // Fuzzy matching for typos and variations (lower boost)
                {
                  multi_match: {
                    query: queryKeywords,
                    fields: ['name^2', 'brand^2', 'description^1'],
                    fuzziness: 'AUTO',
                    boost: 0.8
                  }
                }
              ],
              minimum_should_match: 1,
              filter: filter_clauses
            }
          },
          functions: [
            {
              filter: { exists: { field: "rating" } },
              field_value_factor: {
                field: "rating",
                factor: 1.5,
                modifier: "ln1p",
                missing: 1
              },
              weight: 1.5
            },
            {
              filter: { exists: { field: "popularity" } },
              field_value_factor: {
                field: "popularity",
                factor: 0.2,
                modifier: "ln1p",
                missing: 1
              },
              weight: 2.5
            }
          ],
          score_mode: "sum",
          boost_mode: "multiply"
        }
      }
    };





    const response = await elasticClient.search({ 
      index: 'products_index',
      body: searchBody
    });

    if (!response || !response.hits) {
      throw new Error('Invalid response structure from Elasticsearch');
    }

    const results = response.hits.hits.map(hit => ({ ...hit._source, _score: hit._score }));
    const total = response.hits.total.value;
    
    // Safely handle aggregations
    const categoriesAggs = response.aggregations?.categories?.buckets || [];
    const brandsAggs = response.aggregations?.brands?.buckets || [];

    const uniqueResults = Array.from(new Map(results.map(item => [item.productId, item])).values());

    res.json({
      products: uniqueResults,
      total,
      page,
      pageSize,
      categories: categoriesAggs,
      brands: brandsAggs
    });

  } catch (error) {
    console.error('Error during Elasticsearch search:', error.meta?.body || error);
    res.status(500).json({ message: 'Error performing search', details: error.meta?.body?.error || error.message });
  }
};

