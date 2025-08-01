# Technical Documentation: Flipkart Search Redesign Project

This document provides a detailed, code-centric technical workflow of the search functionality, intended for developers.

---

## 1. Frontend Architecture & Flow

The frontend is built with React and handles all user interaction, state management, and API communication.

### 1.1. `frontend/src/components/SearchBar.js`

This component is the primary user entry point for search.

**Key Responsibilities:**
*   Capture user input in real-time.
*   Fetch and display autosuggestions.
*   Handle search submission and navigation.

**Autosuggestion Logic:**
When the user types, the `useEffect` hook is triggered. It uses a 300ms debounce to prevent API calls on every keystroke, reducing backend load.

```javascript
// In SearchBar.js
useEffect(() => {
  if (query) {
    const timerId = setTimeout(() => {
      fetchAutosuggestions(query).then(response => {
        setSuggestions(response.data || []);
      });
    }, 300); // Debounce API calls
    return () => clearTimeout(timerId);
  } else {
    setSuggestions([]);
  }
}, [query]);
```

The `fetchAutosuggestions` function makes a GET request to the backend using `axios`.

```javascript
// In SearchBar.js
const fetchAutosuggestions = async (q) => {
  return axios.get(`http://localhost:5000/api/search/autosuggest?q=${q}`);
};
```

**Search Submission Logic:**
When the user hits Enter or clicks a suggestion, `handleSearch` is called. It updates the browser's URL with the search query, which triggers a navigation to the results page.

```javascript
// In SearchBar.js
const handleSearch = (searchTerm) => {
  const trimmedTerm = searchTerm.trim();
  if (!trimmedTerm) return;
  navigate(`/search?q=${encodeURIComponent(trimmedTerm)}`);
};
```

### 1.2. `frontend/src/components/SearchResultsPage.js`

This component is responsible for fetching and displaying the final search results.

**Data Fetching Logic:**
The `useEffect` hook listens for changes in the URL (`location.search`). When it detects a change (e.g., a new search), it extracts the query parameter and calls the `fetchSearchResults` API function.

```javascript
// In SearchResultsPage.js
useEffect(() => {
  const searchParams = Object.fromEntries(query.entries());
  const currentQuery = searchParams.q;

  setLoading(true);
  fetchSearchResults(searchParams)
    .then(response => {
      setResults(response.data);
    })
    .catch(err => {
      setError('Could not fetch search results');
    })
    .finally(() => {
      setLoading(false);
    });
}, [location.search]);
```

The component then maps over the `results.products` array and renders a `ProductCard` for each item.

---

## 2. Backend Architecture & Flow

The backend is built with Node.js and Express. It acts as the intermediary between the frontend and the databases.

### 2.1. `backend/index.js` (Server Entry Point)

This file sets up the Express server and registers the API routes.

```javascript
// In index.js
const app = express();

// Init Middleware
app.use(cors());
app.use(express.json());

// Define Routes
app.use('/api/search', require('./routes/searchRoutes'));
```

### 2.2. `backend/routes/searchRoutes.js` (Routing)

This file defines the specific endpoints for the search functionality and maps them to the correct controller functions.

```javascript
// In searchRoutes.js
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// @route   GET /api/search/autosuggest
router.get('/autosuggest', searchController.getAutosuggestions);

// @route   GET /api/search
router.get('/', searchController.searchProducts);

module.exports = router;
```

### 2.3. `backend/controllers/searchController.js` (Core Logic)

This is the most critical file, containing the logic for interacting with Elasticsearch.

**Autosuggestion (`getAutosuggestions`):**
This function uses a hybrid strategy, querying two different Elasticsearch indices in parallel for performance.

1.  **Popular Queries**: Uses a `completion` suggester on the `search_queries` index. This is highly optimized for prefix-based lookups.
2.  **Product Names**: Uses a `multi_match` query with `type: 'bool_prefix'` on the `products_index`. This allows matching prefixes on multiple fields like `name` and `brand`.

```javascript
// In searchController.js - getAutosuggestions
const popularSuggestionPromise = elasticClient.search({
  index: 'search_queries',
  body: {
    suggest: {
      'query-suggester': {
        prefix: query.toLowerCase(),
        completion: { field: 'suggest', size: 5, skip_duplicates: true }
      }
    }
  }
});

const generalSuggestionPromise = elasticClient.search({
  index: 'products_index',
  body: {
    query: {
      multi_match: {
        query: query,
        fields: ['name^3', 'brand^2', 'category'],
        type: 'bool_prefix'
      }
    }
  }
});

const [popularResponse, generalResponse] = await Promise.all([popularSuggestionPromise, generalSuggestionPromise]);
```

**Search Results (`searchProducts`):**
This function builds a sophisticated query to find the most relevant products.

The core is a `bool` query that combines different clauses:
*   `must`: The conditions here *must* be met. We use it to ensure all search terms appear in the most important fields (`name`, `category`).
*   `should`: The conditions here are optional but will increase the score if met. We use it to boost documents that match the full original query phrase.

To improve relevance, the query is wrapped in a `function_score` that modifies the final score based on business metrics.

```javascript
// In searchController.js - searchProducts
const response = await elasticClient.search({
  index: 'products_index',
  body: {
    query: {
      function_score: {
        query: searchQuery, // The bool query
        functions: [
          {
            field_value_factor: {
              field: "rating",
              factor: 1.5,
              modifier: "ln1p", // Logarithmic modifier to prevent extreme score boosts
              missing: 1
            }
          },
          {
            field_value_factor: {
              field: "popularity",
              factor: 0.1,
              modifier: "ln1p",
              missing: 1
            }
          }
        ],
        score_mode: "sum", // Add the function scores to the original query score
        boost_mode: "multiply"
      }
    }
  }
});
```
This `field_value_factor` function directly translates a field's value (like a 4.5 rating) into a score multiplier, ensuring that better-rated and more popular products rank higher.

---

## 3. Database Layer

*   **Elasticsearch**: The primary search engine. It uses two main indices:
    *   `products_index`: Contains the full, denormalized product data. Fields like `name` are analyzed for full-text search, while fields like `brand` are `keyword` type for exact matching and aggregations.
    *   `search_queries`: A smaller index used for autosuggestions. It contains a special `completion` field for fast prefix lookups.

*   **MongoDB**: Used as a logging and analytics database. It stores raw event data, such as user search queries and clicks on suggestions. This data can be processed offline to update the `search_queries` index in Elasticsearch, creating a feedback loop that improves suggestion quality over time.

---

## 4. Data Pipeline: From CSV to Search

This section explains the one-time setup process that populates the databases. It breaks down what happens when you run the `seed` and `index` scripts.

### 4.1. `npm run seed` - Populating the Primary Database (MongoDB)

This command executes `node insertExpandedData.js`. The purpose of this script is to take the raw product data from a CSV file, clean it, and insert it into MongoDB, which will act as our primary source of truth.

**Technical Workflow:**

1.  **Connect to MongoDB**: The script establishes a connection to the MongoDB server specified in the `.env` file.

2.  **Clear Existing Data**: To ensure a fresh start, it deletes all existing documents from the `products` collection in the `flipkart-grid` database.
    ```javascript
    // In insertExpandedData.js
    await this.collection.deleteMany({});
    ```

3.  **Read and Process CSV**: It reads `./data/flipkart_expanded_clean.csv` row by row. For each raw product, it performs a series of data cleaning and transformation operations in the `processProduct` function:
    *   Parses stringified JSON fields like `image` and `product_category_tree` into actual arrays.
    *   Converts price and rating fields into proper floating-point numbers, handling missing values.
    *   Generates a synthetic `numReviews` field based on the product's rating to create more realistic data.
    *   Constructs a clean, well-structured product JSON object.

4.  **Batch Insert into MongoDB**: To avoid overwhelming the database with millions of individual write operations, the script groups the cleaned product objects into batches (e.g., 1000 products per batch) and inserts them using a single `insertMany` command per batch. This is significantly more performant.

5.  **Create Database Indexes**: After all data is inserted, the script runs `createIndexes`. It creates indexes on fields that are frequently queried, such as `product_name`, `brand`, `category`, and `price`. This dramatically speeds up read operations from MongoDB.

### 4.2. `npm run index-data` - Building the Search Index (Elasticsearch)

This command executes `node indexCleanedData.js`. Its purpose is to take the data and prepare it specifically for the complex, text-based queries required by a search engine. It builds a highly optimized data structure (an inverted index) in Elasticsearch.

**Technical Workflow:**

1.  **Define Index Mapping**: The script first defines a strict schema, or `mapping`, for the Elasticsearch index (`products_index`). This is the most critical step for search relevance.
    *   **Text Fields**: Fields like `name` and `description` are defined as `text`, which means Elasticsearch will analyze them (e.g., break them into individual words, lowercase them) to enable full-text search.
    *   **Keyword Fields**: Fields like `brand` and `category` are also mapped as `keyword`, which allows for exact-match filtering and aggregations (e.g., creating a "Filter by Brand" sidebar).
    *   **Completion Suggester**: A special field named `suggest` of type `completion` is created. This field is specifically designed for ultra-fast prefix-based autosuggestions.

    ```json
    // In indexCleanedData.js (conceptual mapping)
    "mappings": {
      "properties": {
        "name": { "type": "text" },
        "brand": { "type": "keyword" },
        "suggest": { 
          "type": "completion",
          "contexts": [
            {
              "name": "CATEGORY",
              "type": "category",
              "path": "category"
            }
          ]
        }
      }
    }
    ```

2.  **Create the Index**: The script sends a request to Elasticsearch to delete the old `products_index` (if it exists) and create a new one with the mapping defined above.

3.  **Read CSV and Transform for Search**: It reads the same CSV file again. For each row, it creates a document tailored for Elasticsearch. This includes populating the `suggest` field with weighted inputs. The product's name is given a higher weight than its category, so it's more likely to appear as a suggestion.

    ```javascript
    // In indexCleanedData.js
    const suggest = [
      { input: product.product_name, weight: 35 },
      { input: product.brand, weight: 30 },
      { input: product.category, weight: 25 }
    ];
    ```

4.  **Bulk Index into Elasticsearch**: Similar to the MongoDB script, this script uses the `bulk` API. It sends thousands of documents to Elasticsearch in a single network request, which is orders of magnitude faster than sending them one by one. This process creates the inverted index that makes Elasticsearch so fast.
