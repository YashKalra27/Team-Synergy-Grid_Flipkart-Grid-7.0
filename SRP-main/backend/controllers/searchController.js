const elasticClient = require('../elasticClient');
const { getCorrectedSpelling, getConceptualSearchKeywords } = require('../services/geminiService');

// REPLACE your searchController.js getAutosuggestions function with this:

exports.getAutosuggestions = async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json([]);
  }

  try {
    // TRUE HYBRID SEARCH: Query both indices and combine the results.

    // 1. Get POPULAR suggestions from our tracked queries
    const popularSuggestionPromise = elasticClient.search({
      index: 'search_queries',
      body: {
        suggest: {
          'query-suggester': {
            prefix: query.toLowerCase(),
            completion: {
              field: 'suggest',
              size: 5, // Get top 5 popular suggestions
              skip_duplicates: true,
              fuzzy: { fuzziness: 'AUTO' }
            }
          }
        }
      }
    });

    // 2. Get GENERAL suggestions from the main product catalog
    const generalSuggestionPromise = elasticClient.search({
      index: 'products_index',
      body: {
        size: 10,
        query: {
          multi_match: {
            query: query,
            fields: ['name^3', 'brand^2', 'category'],
            type: 'bool_prefix'
          }
        }
      }
    });

    // Run both queries in parallel
    const [popularResponse, generalResponse] = await Promise.all([
      popularSuggestionPromise,
      generalSuggestionPromise
    ]);

    // 3. Combine and de-duplicate the results
    const finalSuggestions = new Map();

    // Add popular suggestions first, tagging them with a 'type'
    if (popularResponse.suggest && popularResponse.suggest['query-suggester'] && popularResponse.suggest['query-suggester'][0] && popularResponse.suggest['query-suggester'][0].options.length > 0) {
      popularResponse.suggest['query-suggester'][0].options.forEach(option => {
        if (option._source && option._source.query) {
          finalSuggestions.set(option._source.query.toLowerCase(), { text: option._source.query, type: 'popular' });
        }
      });
    }

    // Add general suggestions, tagging them with a 'type' and avoiding duplicates
    generalResponse.hits.hits.forEach(hit => {
        if (hit._source && hit._source.name) {
            const name = hit._source.name;
            if (!finalSuggestions.has(name.toLowerCase())) {
                finalSuggestions.set(name.toLowerCase(), { text: name, type: 'general' });
            }
        }
    });

    // Convert map values to an array and limit to 10 results
    const suggestions = Array.from(finalSuggestions.values()).slice(0, 10);

    res.json(suggestions);

  } catch (error) {
    console.error('[Autosuggest] Error:', error);
    res.status(500).json({ message: 'Error fetching autosuggestions' });
  }
};

exports.searchProducts = async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: 'Search query is required.' });
  }

  // Enhanced category detection using the improved parser
  const extractFilters = require('../utils/dynamicQueryParser');
  const parsedFilters = extractFilters(q);
  const isCategoryQuery = parsedFilters.category !== null;

  let searchQuery;
  if (isCategoryQuery) {
    // Enhanced category-specific search with better filtering
    searchQuery = {
      bool: {
        must: [
          // Category-specific boost
          {
            multi_match: {
              query: parsedFilters.category,
              fields: ['category^4', 'name^3', 'description^2'],
              type: 'phrase',
              boost: 3.0
            }
          }
        ],
        should: [
          // General keyword matching within the category
          {
            multi_match: {
              query: q,
              fields: ['name^3', 'brand^2', 'description^1'],
              type: 'best_fields',
              minimum_should_match: '50%'
            }
          }
        ],
        filter: [
          // Ensure results are relevant to the detected category
          {
            multi_match: {
              query: parsedFilters.category,
              fields: ['category', 'name', 'description'],
              type: 'best_fields',
              minimum_should_match: '30%'
            }
          }
        ]
      }
    };
  } else {
    // Enhanced search query for compound queries (same logic as dynamic search)
    searchQuery = {
      bool: {
        should: [
          // Exact phrase match (highest boost)
          {
            multi_match: {
              query: q,
              fields: ['name^4', 'brand^3', 'description^2'],
              type: 'phrase',
              boost: 3
            }
          },
          // Individual keyword matches with AND operator (high boost)
          {
            multi_match: {
              query: q,
              fields: ['name^4', 'brand^3', 'description^2'],
              operator: 'and',
              boost: 2.5
            }
          },
          // Individual keyword matches with OR operator (medium boost)
          {
            multi_match: {
              query: q,
              fields: ['name^4', 'brand^3', 'description^2'],
              operator: 'or',
              boost: 1.5
            }
          },
          // Fuzzy matching for typos and variations (lower boost)
          {
            multi_match: {
              query: q,
              fields: ['name^2', 'brand^2', 'description^1'],
              fuzziness: 'AUTO',
              boost: 0.8
            }
          }
        ],
        minimum_should_match: 1
      }
    };
  }

  try {
    // For category searches, return all products. For other searches, limit to reasonable number
    const isCategorySearch = isCategoryQuery;
    const size = isCategorySearch ? 10000 : 100; // Large number for category searches
    
    // Default sort by relevance score (client-side sorting will handle the rest)
    let sortOptions = [{ _score: { order: 'desc' } }];

    const searchBody = {
      size: size,
      query: {
        function_score: {
          query: searchQuery, // Use the dynamically built search query
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
                factor: 0.2, // Increased factor for more impact
                modifier: "ln1p",
                missing: 1
              },
              weight: 2.5 // Increased weight to prioritize popularity
            }
          ],
          score_mode: "sum",
          boost_mode: "multiply"
        }
      }
    };

    // Add sort if specified
    if (sortOptions.length > 0) {
      searchBody.sort = sortOptions;
    }



    const response = await elasticClient.search({
      index: 'products_index',
      body: searchBody
    });

    console.log(`Total products found: ${response.hits.total.value}`);
    
    // Flatten the response to match the dynamic search format
    const results = response.hits.hits.map(hit => ({ ...hit._source, _score: hit._score }));
    const uniqueResults = Array.from(new Map(results.map(item => [item.productId, item])).values());
    
    res.json({ products: uniqueResults, total: response.hits.total.value });

  } catch (error) {
    console.error('[Search] Error fetching search results:', error);
    res.status(500).json({ message: 'Could not fetch search results. Please try again later.' });
  }
};
