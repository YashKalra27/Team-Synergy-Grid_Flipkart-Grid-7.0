const express = require('express');
const router = express.Router();
const { updateAndSyncQuery } = require('../services/popularityService');

// @route   POST /api/analytics/autosuggest-click
// @desc    Logs a click and updates its popularity in real-time.
// @access  Public
router.post('/autosuggest-click', (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ msg: 'Query is required.' });
    }

    // Don't wait for the update to complete. Respond to the user immediately.
    updateAndSyncQuery(query);

    res.status(202).json({ msg: 'Click event accepted for processing.' });
});

// @route   POST /api/analytics/log-search
// @desc    Logs a search and updates its popularity in real-time.
// @access  Public
router.post('/log-search', (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ msg: 'Query is required.' });
    }

    // Don't wait for the update to complete. Respond to the user immediately.
    updateAndSyncQuery(query);

    res.status(202).json({ msg: 'Search event accepted for processing.' });
});

module.exports = router;
