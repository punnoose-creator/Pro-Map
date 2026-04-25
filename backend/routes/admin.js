const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const Employee = require('../models/Employee');
const LocationPing = require('../models/LocationPing');
const { getRows } = require('../lib/sheetsClient');

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeEmployees = await LocationPing.distinct('employee', {
      createdAt: { $gte: today }
    });

    const totalPingsToday = await LocationPing.countDocuments({
      createdAt: { $gte: today }
    });

    res.json({
      success: true,
      stats: {
        activeInField: activeEmployees.length,
        totalPings: totalPingsToday,
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
 * Fetch logs from Google Sheet for a specific employee
 */
router.get('/activity/:employeeName', async (req, res) => {
  try {
    const { employeeName } = req.params;
    
    // Find employee to get their specific sheet ID
    const employee = await Employee.findOne({ fullName: employeeName });
    const sheetId = employee?.googleSheetId;

    const tabs = ['Daily Log', 'Inquiry & Proposals', 'Win-Loss Register', 'Pending Follow-ups'];
    let allActivity = [];

    for (const tab of tabs) {
      const rows = await getRows(tab, sheetId);
      if (rows.length < 5) continue; // Skip if only headers

      // Logged By column index varies by sheet
      let loggedByIdx;
      if (tab === 'Daily Log') loggedByIdx = 16; // Q
      else if (tab === 'Inquiry & Proposals') loggedByIdx = 18; // S
      else if (tab === 'Win-Loss Register') loggedByIdx = 14; // O
      else if (tab === 'Pending Follow-ups') loggedByIdx = 10; // K

      const employeeRows = rows.filter(row => row[loggedByIdx] === employeeName);
      
      employeeRows.forEach(row => {
        allActivity.push({
          tab,
          date: row[0],
          company: row[2],
          purpose: tab === 'Daily Log' ? row[6] : row[6], // Simplified
          outcome: row[9] || '',
          nextAction: tab === 'Daily Log' ? row[12] : row[17],
        });
      });
    }

    res.json({ success: true, activity: allActivity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
