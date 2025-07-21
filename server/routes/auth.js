const express = require('express');
const { body, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  authenticateToken 
} = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');

const router = express.Router();

// Validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const registerValidation = [
  body('employeeId')
    .isLength({ min: 3 })
    .withMessage('Employee ID must be at least 3 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters long'),
  body('lastName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters long'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Please provide a valid phone number'),
  body('department')
    .isIn(['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Management'])
    .withMessage('Please select a valid department'),
  body('position')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Position must be at least 2 characters long')
];

// @route   POST /api/auth/login
// @desc    Employee login
// @access  Public
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { email, password } = req.body;

  // Find employee by email
  const employee = await Employee.findByEmail(email);
  if (!employee) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if employee is active
  if (!employee.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Account is deactivated. Please contact administrator.'
    });
  }

  // Verify password
  const isPasswordValid = await employee.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Update last login
  employee.lastLogin = new Date();
  await employee.save();

  // Generate tokens
  const accessToken = generateAccessToken(employee);
  const refreshToken = generateRefreshToken(employee);

  // Send response
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      employee: employee.getPublicProfile(),
      accessToken,
      refreshToken
    }
  });
}));

// @route   POST /api/auth/register
// @desc    Register new employee (Admin only)
// @access  Private (Admin)
router.post('/register', registerValidation, authenticateToken, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  // Check if user is admin
  if (req.employee.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  const {
    employeeId,
    firstName,
    lastName,
    email,
    password,
    phone,
    department,
    position,
    manager,
    address,
    emergencyContact
  } = req.body;

  // Check if employee already exists
  const existingEmployee = await Employee.findOne({
    $or: [{ email }, { employeeId }]
  });

  if (existingEmployee) {
    return res.status(400).json({
      success: false,
      message: 'Employee with this email or ID already exists'
    });
  }

  // Create new employee
  const employee = new Employee({
    employeeId,
    firstName,
    lastName,
    email,
    password,
    phone,
    department,
    position,
    manager,
    address,
    emergencyContact
  });

  await employee.save();

  res.status(201).json({
    success: true,
    message: 'Employee registered successfully',
    data: {
      employee: employee.getPublicProfile()
    }
  });
}));

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  try {
    // Verify refresh token
    const employee = await verifyRefreshToken(refreshToken);

    // Generate new access token
    const newAccessToken = generateAccessToken(employee);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
}));

// @route   POST /api/auth/logout
// @desc    Employee logout
// @access  Private
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // In a more complex system, you might want to blacklist the token
  // For now, we'll just return a success response
  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

// @route   GET /api/auth/me
// @desc    Get current employee profile
// @access  Private
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      employee: req.employee.getPublicProfile()
    }
  });
}));

// @route   PUT /api/auth/change-password
// @desc    Change employee password
// @access  Private
router.put('/change-password', [
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('Current password must be at least 6 characters long'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
], authenticateToken, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { currentPassword, newPassword } = req.body;

  // Fetch employee with password field for comparison
  const employee = await Employee.findById(req.employee._id);

  // Verify current password
  const isCurrentPasswordValid = await employee.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  employee.password = newPassword;
  await employee.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { email } = req.body;

  // Find employee by email
  const employee = await Employee.findByEmail(email);
  if (!employee) {
    // Don't reveal if email exists or not for security
    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });
  }

  // Generate reset token
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  employee.passwordResetToken = resetToken;
  employee.passwordResetExpires = Date.now() + 3600000; // 1 hour
  await employee.save();

  // TODO: Send email with reset link
  // For now, just return success
  res.json({
    success: true,
    message: 'If the email exists, a password reset link has been sent'
  });
}));

module.exports = router; 