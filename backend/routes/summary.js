const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateDailySummary } = require('../lib/groqParser');
const { appendRow, getRows } = require('../lib/sheetsClient');

/**
 * GET /api/summary/generate
 * Generates a daily summary for the logged-in employee based on today's logs.
 */
router.get('/generate', protect, async (req, res) => {
  try {
    const employeeName = req.user.fullName;
    const today = new Date().toISOString().split('T')[0];

    // Fetch all rows from Daily Log
    const rows = await getRows('Daily Log', req.user.googleSheetId);
    if (rows.length < 5) {
      return res.json({ success: true, summary: "No field visits logged yet today to summarize." });
    }

    // Daily Log loggedBy is at index 16 (Q) and date is at index 0 (A)
    const todaysLogs = rows.filter(
      (row) => row[16] === employeeName && row[0] === today
    );

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
 * Saves the finalized daily summary to the Google Sheet.
 */
router.post('/save', protect, async (req, res) => {
  try {
    const { summary } = req.body;
    if (!summary || summary.trim() === '') {
      return res.status(400).json({ success: false, message: 'Summary text cannot be empty' });
    }

    const employeeName = req.user.fullName;
    const today = new Date().toISOString().split('T')[0];

    // Append to a "Daily Summaries" tab
    // We assume column order: Date, Employee Name, Summary Text
    const rowValues = [today, employeeName, summary.trim()];
    await appendRow('Daily Summaries', rowValues, req.user.googleSheetId);

    res.json({ success: true, message: 'Daily summary saved successfully.' });
  } catch (err) {
    console.error('Save summary error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save summary' });
  }
});

module.exports = router;
