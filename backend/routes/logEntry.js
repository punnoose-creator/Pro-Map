const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { parseLogEntry } = require('../lib/groqParser');
const { appendRow } = require('../lib/sheetsClient');
const { mapToRowValues } = require('../lib/columnMapper');

/**
 * POST /api/log-entry
 *
 * Body: { text: "Met Ahmed from Emaar today, discussed CCTV, 85000 AED, follow up Tuesday" }
 *
 * Flow:
 *   1. Validate JWT
 *   2. Send text to Groq → get structured JSON
 *   3. Map JSON to correct column order for the detected sheet
 *   4. Append row to Google Sheets
 *   5. Return parsed fields + confirmation to frontend
 */
router.post('/', protect, async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a note with at least a few words.',
    });
  }

  try {
    // Step 1 — Parse natural language with Groq LLM
    const parsed = await parseLogEntry(text.trim());
    
    // Add employee name for admin tracking
    parsed.logged_by = req.user.fullName;

    // Step 2 — Map to correct column order
    const sheetName = parsed.sheet || 'Daily Log';
    const rowValues = mapToRowValues(sheetName, parsed);

    // Step 3 — Append row to Google Sheet
    await appendRow(sheetName, rowValues, req.user.googleSheetId);

    // Step 4 — Return success with what was extracted (for frontend preview)
    return res.json({
      success: true,
      message: `Entry added to "${sheetName}" successfully.`,
      sheet: sheetName,
      parsed,
    });
  } catch (err) {
    console.error('❌ log-entry error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to save entry. Please try again.',
    });
  }
});

module.exports = router;
