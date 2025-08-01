const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const enhancedSearchController = require('../controllers/enhancedSearchController');

// Basic search routes
router.get('/autosuggest', searchController.getAutosuggestions);
router.get('/products', searchController.searchProducts);

// Enhanced search routes with Gemini AI
router.get('/enhanced', enhancedSearchController.enhancedSearch);
router.get('/recommendations', enhancedSearchController.getSmartRecommendations);
router.get('/insights', enhancedSearchController.getQueryInsights);

module.exports = router;
