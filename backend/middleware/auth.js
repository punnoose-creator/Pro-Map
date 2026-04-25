const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

/**
 * Verifies Bearer JWT and sets req.user to the employee document.
 */
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const employee = await Employee.findById(decoded.id);
    if (!employee || !employee.isActive) {
      return res.status(401).json({ success: false, message: 'User no longer exists or is inactive' });
    }

    req.user = employee;
    req.employeeId = employee._id; // Maintain backward compatibility
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
}

/**
 * Restricts access to specific roles.
 * @param {...string} roles - Allowed roles
 */
function restrictTo(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }
    next();
  };
}

module.exports = { protect, restrictTo };
