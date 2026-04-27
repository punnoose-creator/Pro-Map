const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateDailySummary } = require('../lib/groqParser');
const LogEntry = require('../models/LogEntry');

/**
 * GET /api/summary/generate
 * Generates a daily summary for the logged-in employee based on today's logs.
 */
router.get('/generate', protect, async (req, res) => {
  try {
    const employeeName = req.user.fullName;
    const today = new Date().toISOString().split('T')[0];

    // Fetch all logs for today from DB
    const todaysLogs = await LogEntry.find({
      employee: req.user._id,
      date: today,
      category: { $ne: 'Daily Summary' } // Don't summarize previous summaries
    });

    if (todaysLogs.length === 0) {
      return res.json({ success: true, summary: "No field visits logged yet today to summarize." });
    }

    // Generate summary via Groq
    const summaryText = await generateDailySummary(todaysLogs, employeeName, today);

    res.json({ success: true, summary: summaryText });
  } catch (err) {
    console.error('Generate summary error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate summary' });
  }
});

/**
 * POST /api/summary/save
 * Saves the finalized daily summary to the DB.
 */
router.post('/save', protect, async (req, res) => {
  try {
    const { summary } = req.body;
    if (!summary || summary.trim() === '') {
      return res.status(400).json({ success: false, message: 'Summary text cannot be empty' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Save as a LogEntry with category 'Daily Summary'
    await LogEntry.create({
      employee: req.user._id,
      category: 'Daily Summary',
      date: today,
      summaryText: summary.trim(),
    });

    res.json({ success: true, message: 'Daily summary saved successfully.' });
  } catch (err) {
    console.error('Save summary error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save summary' });
  }
});

module.exports = router;
