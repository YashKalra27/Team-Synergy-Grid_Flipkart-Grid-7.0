const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
  }

  async getCorrectedSpelling(query) {
    try {
      const prompt = `
        You are a spell checker for e-commerce search queries. 
        
        Task: Fix spelling mistakes in the search query: "${query}"
        
        Rules:
        1. Only fix obvious spelling mistakes
        2. Keep the original query if spelling seems correct
        3. Maintain the same meaning and intent
        4. Return only the corrected query, no explanation
        
        Examples:
        - "sneekers for men" → "sneakers for men"
        - "iphone 14 pro max" → "iphone 14 pro max" (no change needed)
        - "adiddas shoes" → "adidas shoes"
        
        Query to correct: "${query}"
        Corrected query:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      return text || query;
    } catch (error) {
      console.error('Spelling correction error:', error);
      return query; // Return original query if correction fails
    }
  }

  async getConceptualSearchKeywords(query) {
    try {
      const prompt = `
        Generate related search keywords for e-commerce product search.
        
        Original query: "${query}"
        
        Task: Generate 5-8 related keywords that capture the same intent but use different terms.
        
        Examples:
        Query: "wireless headphones"
        Keywords: bluetooth headphones, earphones, audio devices, wireless earbuds, headsets
        
        Query: "running shoes for women"
        Keywords: athletic footwear, sports shoes, jogging shoes, fitness shoes, trainers
        
        Return only comma-separated keywords, no explanations:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      return text ? text.split(',').map(keyword => keyword.trim()) : [];
    } catch (error) {
      console.error('Conceptual keywords error:', error);
      return this.getFallbackKeywords(query);
    }
  }

  getFallbackKeywords(query) {
    const queryLower = query.toLowerCase();
    
    // Shoe-related keywords
    if (queryLower.includes('shoe') || queryLower.includes('footwear')) {
      return ['sneakers', 'sports shoes', 'casual shoes', 'formal shoes', 'running shoes', 'walking shoes'];
    }
    
    // Mobile-related keywords
    if (queryLower.includes('mobile') || queryLower.includes('phone') || queryLower.includes('smartphone')) {
      return ['smartphone', 'mobile phone', 'cell phone', 'android phone', 'iphone'];
    }
    
    // Laptop-related keywords
    if (queryLower.includes('laptop') || queryLower.includes('computer')) {
      return ['notebook', 'portable computer', 'gaming laptop', 'business laptop'];
    }
    
    // Headphone-related keywords
    if (queryLower.includes('headphone') || queryLower.includes('earphone')) {
      return ['earphones', 'earbuds', 'bluetooth headphones', 'wireless headphones', 'audio devices'];
    }
    
    // General fallback
    return [query, 'best ' + query, 'top ' + query, 'popular ' + query];
  }

  async extractQueryIntent(query) {
    try {
      const prompt = `
        Analyze this e-commerce search query and extract structured information.
        
        Query: "${query}"
        
        Extract the following information in JSON format:
        {
          "category": "main product category (shoes, electronics, fashion, books, etc.)",
          "subcategory": "specific subcategory if identifiable",
          "brand": "brand name if mentioned",
          "gender": "target gender (men, women, kids, unisex) or null",
          "occasion": "usage occasion (formal, casual, sports, party, wedding) or null",
          "priceRange": "price indication (budget, mid-range, premium) or null",
          "attributes": {
            "color": "color if mentioned",
            "size": "size if mentioned", 
            "material": "material if mentioned",
            "features": ["list of specific features mentioned"]
          },
          "intent": "search intent (product_search, comparison, gift, replacement)",
          "urgency": "urgency level (immediate, planned, browsing)",
          "specificity": "how specific the query is (very_specific, moderate, general)"
        }
        
        Examples:
        
        Query: "nike running shoes for men under 5000"
        Response: {
          "category": "shoes",
          "subcategory": "running shoes", 
          "brand": "nike",
          "gender": "men",
          "occasion": "sports",
          "priceRange": "mid-range",
          "attributes": {
            "maxPrice": 5000,
            "features": ["running"]
          },
          "intent": "product_search",
          "urgency": "planned",
          "specificity": "very_specific"
        }
        
        Query: "rakhi for brother"
        Response: {
          "category": "rakhi-merchandise",
          "subcategory": "rakhi",
          "brand": null,
          "gender": "men",
          "occasion": "raksha_bandhan",
          "priceRange": null,
          "attributes": {
            "recipient": "brother",
            "features": ["traditional", "festival"]
          },
          "intent": "gift",
          "urgency": "immediate",
          "specificity": "moderate"
        }
        
        Now analyze: "${query}"
        
        Return only valid JSON, no explanations:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Clean up the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Query intent extraction error:', error);
      return null;
    }
  }

  async generateProductRecommendations(userQuery, similarProducts) {
    try {
      const prompt = `
        Based on the user's search query and similar products found, generate personalized product recommendations.
        
        User Query: "${userQuery}"
        
        Similar Products Found: ${JSON.stringify(similarProducts.slice(0, 5), null, 2)}
        
        Task: Suggest 3-5 alternative search queries or product types that the user might be interested in.
        
        Consider:
        1. Complementary products
        2. Alternative brands or models
        3. Different price ranges
        4. Related categories
        5. Seasonal or trending alternatives
        
        Return recommendations as a JSON array:
        [
          {
            "suggestion": "suggested search query",
            "reason": "why this might interest the user",
            "type": "alternative|complementary|upgrade|budget_option"
          }
        ]
        
        Example:
        Query: "bluetooth headphones"
        Response: [
          {
            "suggestion": "wireless earbuds",
            "reason": "More portable alternative with similar functionality",
            "type": "alternative"
          },
          {
            "suggestion": "phone case with headphone storage",
            "reason": "Complementary accessory for headphone users",
            "type": "complementary"
          }
        ]`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Product recommendations error:', error);
      // Fallback recommendations when Gemini API fails
      return this.getFallbackRecommendations(userQuery, similarProducts);
    }
  }

  getFallbackRecommendations(userQuery, similarProducts) {
    const query = userQuery.toLowerCase();
    const recommendations = [];

    // Shoe-related recommendations
    if (query.includes('shoe') || query.includes('footwear')) {
      recommendations.push(
        {
          suggestion: 'sneakers',
          reason: 'Popular alternative to formal shoes',
          type: 'alternative'
        },
        {
          suggestion: 'sports shoes',
          reason: 'Great for athletic activities',
          type: 'alternative'
        },
        {
          suggestion: 'casual shoes',
          reason: 'Comfortable everyday wear',
          type: 'alternative'
        },
        {
          suggestion: 'shoe accessories',
          reason: 'Complete your footwear collection',
          type: 'complementary'
        }
      );
    }
    
    // Mobile-related recommendations
    else if (query.includes('mobile') || query.includes('phone') || query.includes('smartphone')) {
      recommendations.push(
        {
          suggestion: 'mobile cases',
          reason: 'Protect your device',
          type: 'complementary'
        },
        {
          suggestion: 'earphones',
          reason: 'Perfect companion for your phone',
          type: 'complementary'
        },
        {
          suggestion: 'power banks',
          reason: 'Keep your phone charged',
          type: 'complementary'
        }
      );
    }
    
    // Laptop-related recommendations
    else if (query.includes('laptop') || query.includes('computer')) {
      recommendations.push(
        {
          suggestion: 'laptop bags',
          reason: 'Carry your laptop safely',
          type: 'complementary'
        },
        {
          suggestion: 'wireless mouse',
          reason: 'Enhance your computing experience',
          type: 'complementary'
        },
        {
          suggestion: 'laptop stand',
          reason: 'Improve ergonomics',
          type: 'complementary'
        }
      );
    }
    
    // Headphone-related recommendations
    else if (query.includes('headphone') || query.includes('earphone')) {
      recommendations.push(
        {
          suggestion: 'bluetooth headphones',
          reason: 'Wireless freedom',
          type: 'alternative'
        },
        {
          suggestion: 'gaming headphones',
          reason: 'Enhanced audio for gaming',
          type: 'alternative'
        },
        {
          suggestion: 'headphone stand',
          reason: 'Organize your audio gear',
          type: 'complementary'
        }
      );
    }
    
    // General recommendations
    else {
      recommendations.push(
        {
          suggestion: 'trending products',
          reason: 'Discover what\'s popular now',
          type: 'alternative'
        },
        {
          suggestion: 'best deals',
          reason: 'Find great offers',
          type: 'budget_option'
        },
        {
          suggestion: 'new arrivals',
          reason: 'Check out latest products',
          type: 'alternative'
        }
      );
    }

    return recommendations.slice(0, 4);
  }

  async enhanceProductDescriptions(products, userQuery) {
    try {
      const prompt = `
        Enhance product search results by adding personalized highlights based on user query.
        
        User Query: "${userQuery}"
        Products: ${JSON.stringify(products.slice(0, 3), null, 2)}
        
        For each product, identify:
        1. Which aspects match the user's query
        2. Key selling points to highlight
        3. Potential concerns or limitations
        4. Comparison points with similar products
        
        Return enhanced product data as JSON array:
        [
          {
            "product_id": "original product id",
            "highlights": ["key feature 1", "key feature 2"],
            "match_reasons": ["why this matches user query"],
            "concerns": ["potential limitations"],
            "recommendation_strength": "high|medium|low"
          }
        ]`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Product enhancement error:', error);
      return [];
    }
  }

  async analyzeSearchTrends(recentQueries) {
    try {
      const prompt = `
        Analyze recent search queries to identify trends and patterns.
        
        Recent Queries: ${JSON.stringify(recentQueries, null, 2)}
        
        Identify:
        1. Popular categories
        2. Trending brands
        3. Seasonal patterns
        4. Price sensitivity trends
        5. Emerging search patterns
        
        Return analysis as JSON:
        {
          "trending_categories": ["category1", "category2"],
          "popular_brands": ["brand1", "brand2"], 
          "seasonal_trends": ["trend1", "trend2"],
          "price_patterns": {
            "average_budget": "estimated average user budget",
            "price_sensitivity": "high|medium|low"
          },
          "emerging_keywords": ["keyword1", "keyword2"],
          "recommendations": ["actionable insight 1", "actionable insight 2"]
        }`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Search trends analysis error:', error);
      return null;
    }
  }

  async generateSmartFilters(query, availableFilters) {
    try {
      const prompt = `
        Based on the user query and available filters, suggest the most relevant filters to show prominently.
        
        User Query: "${query}"
        Available Filters: ${JSON.stringify(availableFilters, null, 2)}
        
        Task: Rank and select the top 5-7 most relevant filters for this query.
        
        Consider:
        1. Query intent and context
        2. Filter relevance to the search
        3. User decision-making process
        4. Common filtering patterns
        
        Return as JSON:
        {
          "priority_filters": [
            {
              "filter_name": "filter category name",
              "relevance_score": 0.9,
              "reason": "why this filter is important for this query",
              "suggested_values": ["value1", "value2"]
            }
          ],
          "hidden_filters": ["filter1", "filter2"],
          "suggested_sorting": "recommended sort order for this query"
        }`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Smart filters generation error:', error);
      return null;
    }
  }
}

// Export singleton instance
const geminiService = new GeminiService();

module.exports = {
  getCorrectedSpelling: (query) => geminiService.getCorrectedSpelling(query),
  getConceptualSearchKeywords: (query) => geminiService.getConceptualSearchKeywords(query),
  extractQueryIntent: (query) => geminiService.extractQueryIntent(query),
  generateProductRecommendations: (query, products) => geminiService.generateProductRecommendations(query, products),
  enhanceProductDescriptions: (products, query) => geminiService.enhanceProductDescriptions(products, query),
  analyzeSearchTrends: (queries) => geminiService.analyzeSearchTrends(queries),
  generateSmartFilters: (query, filters) => geminiService.generateSmartFilters(query, filters)
};