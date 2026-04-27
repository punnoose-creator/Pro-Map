const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const Employee = require('../models/Employee');
const LocationPing = require('../models/LocationPing');
const LogEntry = require('../models/LogEntry');

// All routes here are restricted to admin/manager
router.use(protect, restrictTo('admin', 'manager'));

/**
 * GET /api/admin/employees
 * List all employees
 */
router.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true }).select('-password');
    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/stats
 * Basic dashboard stats
 */
router.get('/stats', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeEmployees = await LocationPing.distinct('employee', {
      createdAt: { $gte: today }
    });

    const totalPingsToday = await LocationPing.countDocuments({
      createdAt: { $gte: today }
    });

    const totalLogsToday = await LogEntry.countDocuments({
      date: todayStr,
      category: { $ne: 'Daily Summary' }
    });

    res.json({
      success: true,
      stats: {
        activeInField: activeEmployees.length,
        totalPings: totalPingsToday,
        totalLogsToday: totalLogsToday,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/locations/:employeeId
 * Get travel path for a specific employee and date
 */
router.get('/locations/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);
    const endDate = new Date(queryDate);
    endDate.setHours(23, 59, 59, 999);

    const pings = await LocationPing.find({
      employee: employeeId,
      createdAt: { $gte: queryDate, $lte: endDate }
    }).sort({ createdAt: 1 });

    res.json({ success: true, pings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/activity/:employeeName
 * Fetch logs from MongoDB for a specific employee
 */
router.get('/activity/:employeeName', async (req, res) => {
  try {
    const { employeeName } = req.params;
    
    // Find employee first
    const employee = await Employee.findOne({ fullName: employeeName });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Fetch all logs for this employee
    const entries = await LogEntry.find({ employee: employee._id })
      .sort({ date: -1, createdAt: -1 });

    const activity = entries.map(entry => ({
      _id: entry._id,
      tab: entry.category,
      date: entry.date,
      company: entry.company || 'N/A',
      purpose: entry.purpose || entry.summaryText || 'N/A',
      outcome: entry.keyOutcome || entry.outcome || 'N/A',
      nextAction: entry.nextAction || 'N/A',
      rawText: entry.rawText,
      estValue: entry.estValueAED || entry.proposalValueAED || entry.wonValue || 0,
    }));

    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

