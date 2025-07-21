const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        message: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if employee exists and is active
    const employee = await Employee.findById(decoded.employeeId).select('-password');
    
    if (!employee) {
      return res.status(401).json({ 
        message: 'Invalid token - employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    if (!employee.isActive) {
      return res.status(401).json({ 
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    req.employee = employee;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.employee.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

// Middleware to check if user is manager or admin
const requireManager = (req, res, next) => {
  if (!['manager', 'admin'].includes(req.employee.role)) {
    return res.status(403).json({ 
      message: 'Manager or admin access required',
      code: 'MANAGER_REQUIRED'
    });
  }
  next();
};

// Middleware to check if user can access employee data
const canAccessEmployee = async (req, res, next) => {
  const targetEmployeeId = req.params.employeeId || req.body.employeeId;
  
  if (!targetEmployeeId) {
    return next();
  }

  // Admin can access all employees
  if (req.employee.role === 'admin') {
    return next();
  }

  // Manager can access their team members
  if (req.employee.role === 'manager') {
    const targetEmployee = await Employee.findById(targetEmployeeId);
    if (targetEmployee && targetEmployee.manager?.toString() === req.employee._id.toString()) {
      return next();
    }
  }

  // Employee can only access their own data
  if (targetEmployeeId === req.employee._id.toString()) {
    return next();
  }

  return res.status(403).json({ 
    message: 'Access denied to employee data',
    code: 'ACCESS_DENIED'
  });
};

// Middleware to generate new access token
const generateAccessToken = (employee) => {
  return jwt.sign(
    { 
      employeeId: employee._id,
      email: employee.email,
      role: employee.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Middleware to generate refresh token
const generateRefreshToken = (employee) => {
  return jwt.sign(
    { 
      employeeId: employee._id,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

// Middleware to verify refresh token
const verifyRefreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const employee = await Employee.findById(decoded.employeeId);
    if (!employee || !employee.isActive) {
      throw new Error('Employee not found or inactive');
    }

    return employee;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireManager,
  canAccessEmployee,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
}; 