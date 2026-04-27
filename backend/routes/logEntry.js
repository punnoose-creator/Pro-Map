const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { parseLogEntry } = require('../lib/groqParser');
const LogEntry = require('../models/LogEntry');

/**
 * POST /api/log-entry
 * ...
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
    
    // Step 2 — Map to DB Model
    const category = parsed.sheet || 'Daily Log';
    
    const logEntryData = {
      employee: req.user._id,
      category: category,
      date: parsed.date || new Date().toISOString().split('T')[0],
      company: parsed.company,
      contactPerson: parsed.contact_person,
      designation: parsed.designation,
      activityType: parsed.activity_type,
      purpose: parsed.purpose,
      projectStage: parsed.project_stage,
      estValueAED: parsed.est_value_aed ? parseFloat(parsed.est_value_aed) : 0,
      keyOutcome: parsed.key_outcome,
      inquiryRaised: parsed.inquiry_raised,
      inquiryId: parsed.inquiry_id,
      nextAction: parsed.next_action,
      followUpDate: parsed.follow_up_date,
      gpsPhoto: parsed.gps_photo,
      // Category specific
      proposalTrack: parsed.proposal_track,
      proposalValueAED: parsed.proposal_value_aed ? parseFloat(parsed.proposal_value_aed) : 0,
      submissionDate: parsed.submission_date,
      proposalStatus: parsed.proposal_status,
      outcome: parsed.outcome,
      wonValue: parsed.won_value ? parseFloat(parsed.won_value) : 0,
      lossReason: parsed.loss_reason,
      winReason: parsed.win_reason,
      competitor: parsed.competitor,
      rawText: text.trim(),
    };

    // Step 3 — Save to MongoDB
    const entry = await LogEntry.create(logEntryData);

    // Step 4 — Return success
    return res.json({
      success: true,
      message: `Entry added to "${category}" successfully.`,
      sheet: category,
      parsed: entry,
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

