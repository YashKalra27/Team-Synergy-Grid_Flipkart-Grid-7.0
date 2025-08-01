const elasticClient = require('../elasticClient');
const extractFilters = require('../utils/dynamicQueryParser');
const { getCorrectedSpelling, getExpectedCategories, filterRelevantProducts, translateToEnglish } = require('../services/geminiService');
const { updateAndSyncQuery } = require('../services/popularityService');

// Known categories for category-specific searches
const knownCategories = ['clothing', 'jewellery', 'footwear', 'mobile phones', 'mobiles & accessories', 
  'automotive', 'home decor', 'home decor & festive needs', 'home furnishing', 'computers'];


// Typo correction is now handled entirely by Gemini AI service
// No static mappings needed - AI detects and corrects any typing mistakes

// All typo correction is now handled by Gemini AI - no static function needed

const isTopRatedQuery = (query) => {
  const topRatedKeywords = ['top rated', 'best rated', 'highest rated', 'top', 'best'];
  return topRatedKeywords.some(keyword => query.toLowerCase().includes(keyword));
};

// Build should clauses for search query
const buildShouldClauses = (searchQuery, originalQuery) => {
  const clauses = [
    // Exact phrase match with corrected query (highest boost)
    {
      multi_match: {
        query: searchQuery,
        fields: ['name^4', 'brand^3', 'category^2'],
        type: 'phrase',
        boost: 10.0
      }
    },
    // Best fields match with corrected query
    {
      multi_match: {
        query: searchQuery,
        fields: ['name^3', 'brand^2', 'category^1'],
        type: 'best_fields',
        boost: 6.0
      }
    },
    // Cross fields match for better relevance
    {
      multi_match: {
        query: searchQuery,
        fields: ['name^2', 'brand^2', 'category^1'],
        type: 'cross_fields',
        boost: 4.0
      }
    },
    // Fuzzy matching for typos (Level 1 - Conservative)
    {
      multi_match: {
        query: searchQuery,
        fields: ['name^2', 'brand^2'],
        fuzziness: 'AUTO',
        prefix_length: 0,
        max_expansions: 20,
        boost: 3.0
      }
    },
    // Fuzzy matching for typos (Level 2 - Medium)
    {
      multi_match: {
        query: searchQuery,
        fields: ['name^1.5', 'brand^1.5'],
        fuzziness: 2,
        prefix_length: 0,
        max_expansions: 25,
        boost: 2.0
      }
    },
    // Fuzzy matching for typos (Level 3 - Lenient)
    {
      multi_match: {
        query: searchQuery,
        fields: ['name^1', 'brand^1', 'category^1'],
        fuzziness: 3,
        prefix_length: 0,
        max_expansions: 30,
        boost: 1.0
      }
    }
  ];
  
  // Add original query phrase match if different from corrected
  if (originalQuery !== searchQuery) {
    clauses.push({
      multi_match: {
        query: originalQuery,
        fields: ['name^3', 'brand^2', 'category^1'],
        type: 'phrase',
        boost: 8.0
      }
    });
  }
  
  return clauses;
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

// Enhanced sorting function with BM25 and relevance support
const getSortOptions = (sortBy, queryKeywords) => {
  switch (sortBy) {
    case 'price-low-high':
      return [{ price: { order: 'asc' } }];
    case 'price-high-low':
      return [{ price: { order: 'desc' } }];
    case 'rating':
      return [{ rating: { order: 'desc' } }];
    case 'popularity':
      return [{ popularity: { order: 'desc' } }];
    case 'relevance':
    default:
      // BM25 relevance scoring with custom boost
      return [{ _score: { order: 'desc' } }];
  }
};

exports.dynamicSearch = async (req, res) => {
  const { q, page = 1, category, brand, sortBy = 'relevance', price_lt, price_gt, rating_gte } = req.query;

  console.log('Dynamic search received sortBy:', sortBy);
  console.log('All query parameters:', req.query);
  console.log('Query string:', req.url);

  if (!q) {
    return res.status(400).json({ error: "Query is required" });
  }

  // Step 1: Translate any language to English first
  const originalQuery = q;
  const translatedQuery = await translateToEnglish(q);
  
  // Step 2: Extract price constraints from the query using dynamic parser (faster than Gemini AI)
  
  // Debug: Test the dynamic parser directly with the exact query
  console.log(`🧪 Testing dynamic parser with query: "${translatedQuery}"`);
  const testResult = extractFilters("shoes under 5000");
  console.log(`🧪 Direct test result for "shoes under 5000":`, testResult);
  
  // Debug: Test regex patterns directly
  const testQuery = "shoes under 5000";
  const priceUnderMatch = testQuery.match(/(?:under|less than|below)\s*(\d+)/);
  console.log(`🧪 Regex test for "under" pattern:`, priceUnderMatch);
  if (priceUnderMatch) {
    console.log(`🧪 Extracted price value:`, parseInt(priceUnderMatch[1]));
  }
  
  const parsedFilters = extractFilters(translatedQuery);
  const extractedPriceConstraints = parsedFilters.price || {};
  
  // Debug: Log the full parsed filters to see what dynamic parser returns
  console.log(`🔍 Dynamic parser full output:`, parsedFilters);
  console.log(`🔍 Dynamic parser price object:`, parsedFilters.price);
  console.log(`🔍 Extracted price constraints:`, extractedPriceConstraints);
  
  // Step 3: Apply typo correction to the translated query
  const correctedQuery = await getCorrectedSpelling(translatedQuery);
  const searchQuery = correctedQuery || translatedQuery;
  
  console.log(`🌍 Original query: "${originalQuery}", 🔄 Translated: "${translatedQuery}", 🤖 Corrected: "${correctedQuery}"`);  
  
  // Log extracted price constraints
  if (Object.keys(extractedPriceConstraints).length > 0) {
    console.log(`💰 Extracted price constraints:`, extractedPriceConstraints);
  }
  
  // Merge extracted price constraints with URL parameters (URL params take precedence)
  const finalPriceMin = price_gt || extractedPriceConstraints.gte;
  const finalPriceMax = price_lt || extractedPriceConstraints.lte;
  
  if (finalPriceMin || finalPriceMax) {
    console.log(`💰 Final price constraints - Min: ${finalPriceMin || 'none'}, Max: ${finalPriceMax || 'none'}`);
  }  

  // Store the AI-corrected query in database for better suggestions
  try {
    const queryToStore = correctedQuery && correctedQuery !== originalQuery ? correctedQuery : originalQuery;
    await updateAndSyncQuery(queryToStore.trim());
    console.log(`[Dynamic Search] Stored enhanced query: "${queryToStore.trim()}" (original: "${originalQuery.trim()}")`);
  } catch (error) {
    console.error(`[Dynamic Search] Failed to store query "${queryToStore.trim()}":`, error);
    // Don't fail the search if storing fails
  }

  // Fetch all available products - no pagination limit
  const pageSize = 10000; // Large number to fetch all products
  const from = 0; // Always start from 0 to get all products
  
  // Minimal filtering for testing
  const filter_clauses = [];
  
  // Add basic filters only if provided
  if (category) {
    filter_clauses.push({ term: { 'category.keyword': category } });
  }
  if (brand) {
    filter_clauses.push({ term: { 'brand.keyword': brand } });
  }
  
  // Apply merged price constraints (from URL params or extracted from query)
  if (finalPriceMin || finalPriceMax) {
    const priceRange = {};
    if (finalPriceMin) {
      priceRange.gte = parseFloat(finalPriceMin); // Use gte for "above/over" queries
    }
    if (finalPriceMax) {
      priceRange.lte = parseFloat(finalPriceMax); // Use lte for "under/below" queries
    }
    filter_clauses.push({ range: { price: priceRange } });
    console.log(`💰 Applied price filter:`, { range: { price: priceRange } });
  }
  
  if (rating_gte) {
    filter_clauses.push({ range: { rating: { gte: parseFloat(rating_gte) } } });
  }

  // Get sort options based on sortBy parameter
  const sort_options = getSortOptions(sortBy, '');

  try {
    console.log(`🔍 Searching for: "${originalQuery}" (corrected: "${searchQuery}")`);
    
    // Use Gemini AI for dynamic category detection
    const expectedCategories = await getExpectedCategories(searchQuery);
    console.log(`🤖 Gemini detected categories for "${searchQuery}":`, expectedCategories);
    
    // Build strict search clauses with better relevance filtering
    const shouldClauses = [
      // Exact phrase match with corrected query (highest boost)
      {
        multi_match: {
          query: searchQuery,
          fields: ['name^5', 'brand^4', 'category^3'],
          type: 'phrase',
          boost: 15.0
        }
      },
      // Best fields match with higher minimum should match
      {
        multi_match: {
          query: searchQuery,
          fields: ['name^4', 'brand^3', 'category^2'],
          type: 'best_fields',
          minimum_should_match: '75%',
          boost: 10.0
        }
      },
      // Cross fields match for better relevance
      {
        multi_match: {
          query: searchQuery,
          fields: ['name^3', 'brand^2'],
          type: 'cross_fields',
          minimum_should_match: '60%',
          boost: 8.0
        }
      },
      // Conservative fuzzy matching (only for minor typos)
      {
        multi_match: {
          query: searchQuery,
          fields: ['name^2', 'brand^2'],
          fuzziness: 1, // Reduced from 'AUTO' to be more strict
          prefix_length: 1, // Require at least 1 character prefix match
          max_expansions: 10, // Reduced expansions
          boost: 4.0
        }
      }
    ];
    
    // Add original query if different from corrected
    if (originalQuery !== searchQuery) {
      shouldClauses.push({
        multi_match: {
          query: originalQuery,
          fields: ['name^3', 'brand^2', 'category^1'],
          type: 'phrase',
          boost: 8.0
        }
      });
    }
    
    // Strict search with relevance threshold and must clause
    const searchBody = {
      from: (page - 1) * 100,
      size: 100,
      min_score: 2.0, // Set minimum score threshold to filter out irrelevant results
      query: {
        bool: {
          must: [
            // Ensure at least one strong match in name, brand, or category
            {
              multi_match: {
                query: searchQuery,
                fields: ['name^3', 'brand^2', 'category^1'],
                type: 'best_fields',
                minimum_should_match: '50%'
              }
            }
          ],
          should: shouldClauses,
          minimum_should_match: 1,
          filter: [
            // Add all basic filters (price, rating, etc.)
            ...filter_clauses,
            // Add category filtering if categories are detected
            ...(expectedCategories ? [
              {
                bool: {
                  should: expectedCategories.map(cat => ({
                    bool: {
                      should: [
                        { term: { 'category.keyword': cat } },
                        { match_phrase: { category: cat } },
                        { match: { category: { query: cat, boost: 2.0 } } }
                    ],
                      minimum_should_match: 1
                    }
                  })),
                  minimum_should_match: 1
                }
              }
            ] : [])
          ]
        }
      },
      sort: getSortOptions(sortBy)
    };
    
    console.log('Search body:', JSON.stringify(searchBody, null, 2));

    const response = await elasticClient.search({
      index: 'products_index',
      body: searchBody
    });

    if (!response || !response.hits) {
      throw new Error('Invalid response structure from Elasticsearch');
    }

    let results = response.hits.hits.map(hit => ({ ...hit._source, _score: hit._score }));
    const total = response.hits.total.value;
    
    console.log(`Found ${results.length} results for query: "${q}"`);
    
    // Smart AI filtering - skip for obvious category matches to improve speed and inclusivity
    const obviousCategoryQueries = ['shoes', 'mobile', 'phone', 'laptop', 'watch', 'shirt', 'dress', 'jeans', 'headphones', 'earphones'];
    const isObviousCategory = obviousCategoryQueries.some(cat => searchQuery.toLowerCase().includes(cat));
    
    // Apply Gemini AI-based relevance filtering only for ambiguous queries
    if (results.length > 0 && !isObviousCategory && results.length < 50) {
      console.log(`🤖 Applying Gemini AI relevance filtering for ambiguous query...`);
      try {
        const relevantProductsData = await filterRelevantProducts(searchQuery, results, 50);
        
        if (relevantProductsData && relevantProductsData.length > 0) {
          // Filter and reorder results based on Gemini AI relevance scores
          const filteredResults = [];
          
          relevantProductsData.forEach(relevantProduct => {
            const originalProduct = results.find(p => p.productId === relevantProduct.productId);
            if (originalProduct) {
              filteredResults.push({
                ...originalProduct,
                aiRelevanceScore: relevantProduct.relevanceScore,
                aiRelevanceReason: relevantProduct.relevanceReason,
                aiMatchType: relevantProduct.matchType
              });
            }
          });
          
          // Sort by AI relevance score (highest first)
          filteredResults.sort((a, b) => (b.aiRelevanceScore || 0) - (a.aiRelevanceScore || 0));
          
          // Check if AI filtering returned enough results
          const minResults = Math.min(20, Math.floor(results.length * 0.2)); // At least 20% of original results or 20 products
          
          if (filteredResults.length >= minResults) {
            results = filteredResults;
            console.log(`🎯 Gemini AI filtered results: ${results.length} relevant products (from ${response.hits.hits.length} original)`);
          } else {
            // If AI filtering is too restrictive, keep original results but add AI scores to top products
            console.log(`⚠️ AI filtering too restrictive (${filteredResults.length} results), keeping original ${results.length} results with AI enhancement`);
            
            // Add AI scores to the products that were analyzed
            results.forEach(product => {
              const aiData = relevantProductsData.find(ai => ai.productId === product.productId);
              if (aiData) {
                product.aiRelevanceScore = aiData.relevanceScore;
                product.aiRelevanceReason = aiData.relevanceReason;
                product.aiMatchType = aiData.matchType;
              }
            });
            
            // Sort by AI score if available, then by Elasticsearch score
            results.sort((a, b) => {
              const scoreA = a.aiRelevanceScore || (a._score / 2); // Normalize ES score
              const scoreB = b.aiRelevanceScore || (b._score / 2);
              return scoreB - scoreA;
            });
          }
        } else {
          console.log(`⚠️ Gemini AI found no relevant products, keeping original results`);
        }
      } catch (error) {
        console.error('Gemini AI relevance filtering error:', error);
        console.log(`⚠️ Falling back to original Elasticsearch results`);
      }
    } else if (isObviousCategory) {
      console.log(`⚡ Skipping AI filtering for obvious category query "${searchQuery}" - keeping all ${results.length} results for better speed and inclusivity`);
    } else {
      console.log(`⚡ Skipping AI filtering - too many results (${results.length}) for efficient processing`);
    }
    
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
