const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

// Helper: Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Helper: Send token response
const sendTokenResponse = (employee, statusCode, res) => {
  const token = generateToken(employee._id);

  res.status(statusCode).json({
    success: true,
    token,
    employee: {
      id: employee._id,
      fullName: employee.fullName,
      employeeId: employee.employeeId,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      phone: employee.phone,
    },
  });
};

// @route   POST /api/auth/register
// @desc    Register new employee
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { fullName, employeeId, email, password, department, phone } = req.body;

    // Validate required fields
    if (!fullName || !employeeId || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, employee ID, email and password',
      });
    }

    // Check if email already exists
    const existingEmail = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Check if employee ID already exists
    const existingId = await Employee.findOne({ employeeId: employeeId.toUpperCase() });
    if (existingId) {
      return res.status(409).json({
        success: false,
        message: 'This Employee ID is already registered',
      });
    }

    // Create employee
    const employee = await Employee.create({
      fullName,
      employeeId,
      email,
      password,
      department: department || 'Sales',
      phone,
    });

    sendTokenResponse(employee, 201, res);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate field value entered',
      });
    }
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)
        .map((val) => val.message)
        .join(', ');
      return res.status(400).json({ success: false, message });
    }
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// @route   POST /api/auth/login
// @desc    Login employee
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find employee with password field
    const employee = await Employee.findOne({ email: email.toLowerCase() }).select('+password');

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!employee.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact your manager.',
      });
    }

    const isMatch = await employee.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    employee.lastLogin = new Date();
    await employee.save({ validateBeforeSave: false });

    sendTokenResponse(employee, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged-in employee
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const employee = await Employee.findById(decoded.id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.status(200).json({
      success: true,
      employee: {
        id: employee._id,
        fullName: employee.fullName,
        employeeId: employee.employeeId,
        email: employee.email,
        department: employee.department,
        role: employee.role,
        phone: employee.phone,
        lastLogin: employee.lastLogin,
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
});

module.exports = router;
