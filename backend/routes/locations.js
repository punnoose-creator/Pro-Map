const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const LocationPing = require('../models/LocationPing');
const Employee = require('../models/Employee');

const INTERVAL_MS = 5 * 60 * 1000;

// @route   POST /api/locations/ping
// @desc    Save one GPS sample for the authenticated employee
// @access  Private
router.post('/ping', protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    if (!employee.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      speed,
      clientRecordedAt,
    } = req.body;

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        success: false,
        message: 'latitude and longitude are required and must be numbers',
      });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'Coordinates out of range' });
    }

    const doc = await LocationPing.create({
      employee: req.employeeId,
      latitude: lat,
      longitude: lng,
      accuracy: accuracy != null ? Number(accuracy) : undefined,
      altitude: altitude != null ? Number(altitude) : undefined,
      altitudeAccuracy: altitudeAccuracy != null ? Number(altitudeAccuracy) : undefined,
      heading: heading != null ? Number(heading) : undefined,
      speed: speed != null ? Number(speed) : undefined,
      clientRecordedAt: clientRecordedAt ? new Date(clientRecordedAt) : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Location saved',
      ping: {
        id: doc._id,
        recordedAt: doc.createdAt,
        suggestedIntervalMs: INTERVAL_MS,
      },
    });
  } catch (error) {
    console.error('Location ping error:', error);
    res.status(500).json({ success: false, message: 'Could not save location' });
  }
});

module.exports = router;
