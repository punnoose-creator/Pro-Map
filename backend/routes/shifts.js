const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Shift = require('../models/Shift');

/**
 * POST /api/shifts/start
 * Start a new shift for the logged-in employee.
 */
router.post('/start', protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if there's an active shift
    const activeShift = await Shift.findOne({
      employee: req.user._id,
      endTime: { $exists: false }
    });

    if (activeShift) {
      // If the active shift is from a previous day, close it automatically at the end of that day
      if (activeShift.date !== today) {
        const autoEndTime = new Date(activeShift.startTime);
        autoEndTime.setHours(23, 59, 59, 999);
        activeShift.endTime = autoEndTime;
        await activeShift.save();
      } else {
        // Same day — return the existing active shift (e.g. employee re-opened the app)
        return res.json({ success: true, shift: activeShift, resumed: true });
      }
    }

    const shift = await Shift.create({
      employee: req.user._id,
      startTime: new Date(),
      date: today
    });

    res.json({ success: true, shift });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/shifts/stop
 * Stop the current active shift.
 */
router.post('/stop', protect, async (req, res) => {
  try {
    const activeShift = await Shift.findOne({
      employee: req.user._id,
      endTime: { $exists: false }
    });

    if (!activeShift) {
      return res.status(400).json({ success: false, message: 'No active shift found.' });
    }

    activeShift.endTime = new Date();
    await activeShift.save();

    res.json({ success: true, shift: activeShift });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
