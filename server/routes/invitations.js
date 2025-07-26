const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const Employee = require('../models/Employee');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

const router = express.Router();

// Validation rules
const sendInvitationValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('firstName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters long'),
  body('lastName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters long'),
  body('department')
    .isIn(['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Management'])
    .withMessage('Please select a valid department'),
  body('position')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Position must be at least 2 characters long'),
  body('role')
    .optional()
    .isIn(['employee', 'manager', 'admin'])
    .withMessage('Please select a valid role'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 10 })
    .withMessage('Please provide a valid phone number')
];

const acceptInvitationValidation = [
  body('token')
    .notEmpty()
    .withMessage('Invitation token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
    .withMessage('Password confirmation does not match password')
];

// @route   POST /api/invitations/send
// @desc    Send invitation email to new employee (Admin only)
// @access  Private (Admin)
router.post('/send', sendInvitationValidation, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const {
    email,
    firstName,
    lastName,
    department,
    position,
    role = 'employee',
    phone
  } = req.body;

  // Check if employee already exists
  const existingEmployee = await Employee.findOne({ email });
  if (existingEmployee) {
    return res.status(400).json({
      success: false,
      message: 'Employee with this email already exists'
    });
  }

  // Generate employee ID
  const lastEmployee = await Employee.findOne().sort({ employeeId: -1 });
  const lastNumber = lastEmployee ? parseInt(lastEmployee.employeeId.replace('EMP', '')) : 0;
  const newEmployeeId = `EMP${String(lastNumber + 1).padStart(3, '0')}`;

  // Generate invitation token
  const invitationToken = crypto.randomBytes(32).toString('hex');
  const invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create new employee with invitation data
  const newEmployee = new Employee({
    employeeId: newEmployeeId,
    firstName,
    lastName,
    email,
    department,
    position,
    role,
    phone: phone || '',
    password: crypto.randomBytes(16).toString('hex'), // Temporary password
    hireDate: new Date(),
    invitationToken,
    invitationExpires,
    invitationAccepted: false,
    isActive: false // Will be activated when invitation is accepted
  });

  await newEmployee.save();

  // Send invitation email
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const emailResult = await emailService.sendInvitationEmail(newEmployee, invitationToken, baseUrl);

    const message = emailResult.status === 'skipped' 
      ? 'Employee created successfully, but email invitation was not sent (email not configured - see email-setup-guide.md)'
      : emailResult.status === 'failed'
      ? 'Employee created successfully, but email invitation failed to send'
      : 'Invitation sent successfully';

    res.status(201).json({
      success: true,
      message: message,
      data: {
        employee: {
          _id: newEmployee._id,
          employeeId: newEmployee.employeeId,
          firstName: newEmployee.firstName,
          lastName: newEmployee.lastName,
          email: newEmployee.email,
          department: newEmployee.department,
          position: newEmployee.position,
          role: newEmployee.role,
          invitationExpires: newEmployee.invitationExpires
        },
        emailStatus: emailResult.status
      }
    });
  } catch (error) {
    // If email fails, delete the employee record
    await Employee.findByIdAndDelete(newEmployee._id);
    
    console.error('Failed to send invitation email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send invitation email. Please check your email configuration.'
    });
  }
}));

// @route   POST /api/invitations/send-bulk
// @desc    Send invitations to multiple employees (Admin only)
// @access  Private (Admin)
router.post('/send-bulk', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { employees } = req.body;

  if (!Array.isArray(employees) || employees.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of employees'
    });
  }

  const results = {
    successful: [],
    failed: []
  };

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

  for (const employeeData of employees) {
    try {
      // Validate employee data
      const { email, firstName, lastName, department, position, role = 'employee', phone } = employeeData;

      if (!email || !firstName || !lastName || !department || !position) {
        results.failed.push({
          email: email || 'unknown',
          error: 'Missing required fields'
        });
        continue;
      }

      // Check if employee already exists
      const existingEmployee = await Employee.findOne({ email });
      if (existingEmployee) {
        results.failed.push({
          email,
          error: 'Employee with this email already exists'
        });
        continue;
      }

      // Generate employee ID
      const lastEmployee = await Employee.findOne().sort({ employeeId: -1 });
      const lastNumber = lastEmployee ? parseInt(lastEmployee.employeeId.replace('EMP', '')) : 0;
      const newEmployeeId = `EMP${String(lastNumber + 1).padStart(3, '0')}`;

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create new employee
      const newEmployee = new Employee({
        employeeId: newEmployeeId,
        firstName,
        lastName,
        email,
        department,
        position,
        role,
        phone: phone || '',
        password: crypto.randomBytes(16).toString('hex'),
        hireDate: new Date(),
        invitationToken,
        invitationExpires,
        invitationAccepted: false,
        isActive: false
      });

      await newEmployee.save();

      // Send invitation email
      const emailResult = await emailService.sendInvitationEmail(newEmployee, invitationToken, baseUrl);

      results.successful.push({
        email,
        employeeId: newEmployeeId,
        firstName,
        lastName,
        emailStatus: emailResult.status
      });

    } catch (error) {
      console.error(`Failed to process employee ${employeeData.email}:`, error);
      results.failed.push({
        email: employeeData.email || 'unknown',
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    message: `Processed ${employees.length} invitations`,
    data: results
  });
}));

// @route   GET /api/invitations/verify/:token
// @desc    Verify invitation token
// @access  Public
router.get('/verify/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;

  const employee = await Employee.findOne({
    invitationToken: token,
    invitationExpires: { $gt: new Date() },
    invitationAccepted: false
  });

  if (!employee) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired invitation token'
    });
  }

  res.json({
    success: true,
    message: 'Invitation token is valid',
    data: {
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        role: employee.role
      }
    }
  });
}));

// @route   POST /api/invitations/accept
// @desc    Accept invitation and set up account
// @access  Public
router.post('/accept', acceptInvitationValidation, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { token, password } = req.body;

  const employee = await Employee.findOne({
    invitationToken: token,
    invitationExpires: { $gt: new Date() },
    invitationAccepted: false
  });

  if (!employee) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired invitation token'
    });
  }

  // Update employee with new password and mark invitation as accepted
  employee.password = password;
  employee.invitationToken = undefined;
  employee.invitationExpires = undefined;
  employee.invitationAccepted = true;
  employee.isActive = true;
  employee.emailVerified = true;

  await employee.save();

  // Send welcome email
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const emailResult = await emailService.sendWelcomeEmail(employee, baseUrl);
    
    if (emailResult.status === 'skipped') {
      console.log('Welcome email not sent: Email service not configured');
    } else if (emailResult.status === 'failed') {
      console.error('Failed to send welcome email:', emailResult.error);
    } else {
      console.log('Welcome email sent successfully');
    }
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't fail the request if welcome email fails
  }

  res.json({
    success: true,
    message: 'Account set up successfully. You can now log in.',
    data: {
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email
      }
    }
  });
}));

// @route   POST /api/invitations/resend/:employeeId
// @desc    Resend invitation email (Admin only)
// @access  Private (Admin)
router.post('/resend/:employeeId', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  if (employee.invitationAccepted) {
    return res.status(400).json({
      success: false,
      message: 'Invitation has already been accepted'
    });
  }

  // Generate new invitation token
  const invitationToken = crypto.randomBytes(32).toString('hex');
  const invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  employee.invitationToken = invitationToken;
  employee.invitationExpires = invitationExpires;

  await employee.save();

  // Send invitation email
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const emailResult = await emailService.sendInvitationEmail(employee, invitationToken, baseUrl);

    const message = emailResult.status === 'skipped' 
      ? 'Invitation updated successfully, but email was not sent (email not configured)'
      : emailResult.status === 'failed'
      ? 'Invitation updated successfully, but email failed to send'
      : 'Invitation resent successfully';

    res.json({
      success: true,
      message: message,
      data: {
        employee: {
          _id: employee._id,
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          invitationExpires: employee.invitationExpires
        },
        emailStatus: emailResult.status
      }
    });
  } catch (error) {
    console.error('Failed to resend invitation email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend invitation email. Please check your email configuration.'
    });
  }
}));

// @route   GET /api/invitations/pending
// @desc    Get pending invitations (Admin only)
// @access  Private (Admin)
router.get('/pending', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // Get all employees with pending invitations (not accepted)
  const pendingInvitations = await Employee.find({
    invitationAccepted: false,
    invitationToken: { $exists: true, $ne: null },
    invitationExpires: { $exists: true, $ne: null }
  }).select('-password -invitationToken');

  // Separate active and expired invitations
  const now = new Date();
  const activeInvitations = pendingInvitations.filter(inv => inv.invitationExpires > now);
  const expiredInvitations = pendingInvitations.filter(inv => inv.invitationExpires <= now);

  res.json({
    success: true,
    data: {
      invitations: pendingInvitations,
      activeCount: activeInvitations.length,
      expiredCount: expiredInvitations.length,
      totalCount: pendingInvitations.length
    }
  });
}));

// @route   POST /api/invitations/cleanup-expired
// @desc    Clean up expired invitations (Admin only)
// @access  Private (Admin)
router.post('/cleanup-expired', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const now = new Date();
  
  // Find and delete expired invitations
  const result = await Employee.deleteMany({
    invitationAccepted: false,
    invitationExpires: { $lt: now }
  });

  res.json({
    success: true,
    message: `Cleaned up ${result.deletedCount} expired invitations`,
    data: {
      deletedCount: result.deletedCount
    }
  });
}));

// @route   DELETE /api/invitations/:employeeId
// @desc    Delete invitation and employee record (Admin only)
// @access  Private (Admin)
router.delete('/:employeeId', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  // Only allow deletion of employees with pending invitations
  if (employee.invitationAccepted) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete employee with accepted invitation'
    });
  }

  // Delete the employee record
  await Employee.findByIdAndDelete(employeeId);

  res.json({
    success: true,
    message: 'Invitation deleted successfully'
  });
}));

module.exports = router; 