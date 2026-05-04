const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const Employee = require('../models/Employee');
const LocationPing = require('../models/LocationPing');
const LogEntry = require('../models/LogEntry');
const Shift = require('../models/Shift');

// All routes here are restricted to admin/manager
router.use(protect, restrictTo('admin', 'manager'));

/**
 * GET /api/admin/employees
 * List all employees
 */
router.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find({ role: 'employee' }).select('-password');
    res.json({ success: true, employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/dashboard
 * Stats + employee list with last ping, last log, active shift (for admin home UI).
 */
router.get('/dashboard', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    await Shift.updateMany(
      { date: { $lt: todayStr }, endTime: { $exists: false } },
      { $set: { endTime: yesterday } }
    );

    const totalEmployees = await Employee.countDocuments({ role: 'employee' });

    const activeEmployeeIds = await Shift.distinct('employee', {
      date: todayStr,
      endTime: { $exists: false },
    });
    const activeNow = activeEmployeeIds.length;

    const locationsTrackedToday = await LocationPing.countDocuments({
      createdAt: { $gte: today },
    });

    const workUpdatesToday = await LogEntry.countDocuments({
      date: todayStr,
      category: { $ne: 'Daily Summary' },
    });

    const employees = await Employee.find({ role: 'employee' }).select('-password').lean();
    const ids = employees.map((e) => e._id);

    const pingAgg =
      ids.length === 0
        ? []
        : await LocationPing.aggregate([
            { $match: { employee: { $in: ids } } },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: '$employee',
                createdAt: { $first: '$createdAt' },
                latitude: { $first: '$latitude' },
                longitude: { $first: '$longitude' },
              },
            },
          ]);

    const logAgg =
      ids.length === 0
        ? []
        : await LogEntry.aggregate([
            { $match: { employee: { $in: ids } } },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: '$employee',
                createdAt: { $first: '$createdAt' },
              },
            },
          ]);

    const pingMap = Object.fromEntries(pingAgg.map((p) => [String(p._id), p]));
    const logMap = Object.fromEntries(logAgg.map((l) => [String(l._id), l]));
    const activeSet = new Set(activeEmployeeIds.map((id) => String(id)));

    const list = employees.map((e) => {
      const id = String(e._id);
      const ping = pingMap[id];
      const log = logMap[id];
      const pingTime = ping?.createdAt ? new Date(ping.createdAt).getTime() : 0;
      const logTime = log?.createdAt ? new Date(log.createdAt).getTime() : 0;
      const lastActivityAt =
        pingTime || logTime
          ? new Date(Math.max(pingTime, logTime)).toISOString()
          : null;
      return {
        _id: e._id,
        fullName: e.fullName,
        email: e.email,
        employeeId: e.employeeId,
        department: e.department,
        isActive: e.isActive,
        isWorking: activeSet.has(id),
        lastPing: ping
          ? {
              at: ping.createdAt,
              latitude: ping.latitude,
              longitude: ping.longitude,
            }
          : null,
        lastLogAt: log?.createdAt || null,
        lastActivityAt,
      };
    });

    res.json({
      success: true,
      stats: {
        totalEmployees,
        activeNow,
        locationsTrackedToday,
        workUpdatesToday,
      },
      employees: list,
    });
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

    // Auto-close any orphaned shifts from previous days
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    await Shift.updateMany(
      { date: { $lt: todayStr }, endTime: { $exists: false } },
      { $set: { endTime: yesterday } }
    );

    // Only count shifts started today with no endTime as truly active
    const activeEmployees = await Shift.distinct('employee', {
      date: todayStr,
      endTime: { $exists: false }
    });

    const totalPingsToday = await LocationPing.countDocuments({
      createdAt: { $gte: today }
    });

    const totalLogsToday = await LogEntry.countDocuments({
      date: todayStr,
      category: { $ne: 'Daily Summary' }
    });

    const totalEmployees = await Employee.countDocuments({ role: 'employee' });

    res.json({
      success: true,
      stats: {
        totalEmployees,
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

    // Calculate Working Hours for the day
    const dayStr = queryDate.toISOString().split('T')[0];
    const shifts = await Shift.find({
      employee: employeeId,
      date: dayStr
    });

    let totalMinutes = 0;
    shifts.forEach(shift => {
      const start = new Date(shift.startTime);
      const end = shift.endTime ? new Date(shift.endTime) : (dayStr === new Date().toISOString().split('T')[0] ? new Date() : new Date(shift.startTime).setHours(23,59,59,999));
      totalMinutes += Math.max(0, Math.round((new Date(end).getTime() - start.getTime()) / 60000));
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const workTime = `${hours}h ${mins}m`;

    res.json({ success: true, pings, workTime });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/admin/employee/:employeeId/day-snapshot?date=YYYY-MM-DD
 * Employee profile + location pings + work logs for one calendar day.
 */
router.get('/employee/:employeeId/day-snapshot', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const dateParam = req.query.date;
    const queryDate = dateParam ? new Date(dateParam) : new Date();
    if (Number.isNaN(queryDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }
    queryDate.setHours(0, 0, 0, 0);
    const endDate = new Date(queryDate);
    endDate.setHours(23, 59, 59, 999);
    const dayStr = queryDate.toISOString().split('T')[0];

    const employee = await Employee.findById(employeeId).select('-password').lean();
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const pings = await LocationPing.find({
      employee: employeeId,
      createdAt: { $gte: queryDate, $lte: endDate },
    })
      .sort({ createdAt: 1 })
      .lean();

    const shifts = await Shift.find({
      employee: employeeId,
      date: dayStr,
    }).lean();

    let totalMinutes = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    shifts.forEach((shift) => {
      const start = new Date(shift.startTime);
      const end = shift.endTime
        ? new Date(shift.endTime)
        : dayStr === todayStr
          ? new Date()
          : new Date(new Date(shift.startTime).setHours(23, 59, 59, 999));
      totalMinutes += Math.max(0, Math.round((new Date(end).getTime() - start.getTime()) / 60000));
    });
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const workTime = `${hours}h ${mins}m`;

    const logs = await LogEntry.find({
      employee: employeeId,
      createdAt: { $gte: queryDate, $lte: endDate },
      category: { $ne: 'Daily Summary' },
    })
      .sort({ createdAt: 1 })
      .lean();

    const activeShift =
      dayStr === todayStr
        ? await Shift.findOne({
            employee: employeeId,
            date: todayStr,
            endTime: { $exists: false },
          }).lean()
        : null;

    const isWorking = !!(dayStr === todayStr && employee.isActive && activeShift);

    res.json({
      success: true,
      date: dayStr,
      employee: {
        _id: employee._id,
        fullName: employee.fullName,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department,
        isActive: employee.isActive,
        isWorking,
      },
      pings,
      workTime,
      logs: logs.map((l) => ({
        _id: l._id,
        createdAt: l.createdAt,
        category: l.category,
        rawText: l.rawText,
        purpose: l.purpose,
        company: l.company,
        metadata: l.metadata,
      })),
    });
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
      createdAt: entry.createdAt,
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

/**
 * GET /api/admin/summaries/:employeeId
 * Fetch Daily, Weekly, and Monthly summaries for an employee based on a reference date.
 */
router.get('/summaries/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date } = req.query; // YYYY-MM-DD
    const { generatePeriodSummary } = require('../lib/groqParser');

    const refDate = date ? new Date(date) : new Date();
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Helper to get logs for a range
    const getLogs = async (daysBack) => {
      const start = new Date(refDate);
      start.setDate(start.getDate() - daysBack);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(refDate);
      end.setHours(23, 59, 59, 999);

      return await LogEntry.find({
        employee: employeeId,
        createdAt: { $gte: start, $lte: end },
        category: { $ne: 'Daily Summary' }
      }).sort({ createdAt: 1 });
    };

    // 1. Daily
    const dailyLogs = await getLogs(0);
    const daily = await generatePeriodSummary(dailyLogs, employee.fullName, 'Daily');

    // 2. Weekly
    const weeklyLogs = await getLogs(7);
    const weekly = await generatePeriodSummary(weeklyLogs, employee.fullName, 'Weekly');

    // 3. Monthly
    const monthlyLogs = await getLogs(30);
    const monthly = await generatePeriodSummary(monthlyLogs, employee.fullName, 'Monthly');

    res.json({
      success: true,
      summaries: { daily, weekly, monthly }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

