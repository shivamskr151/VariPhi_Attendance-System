const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const { authenticateToken, canAccessEmployee, requireManager } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const { isWorkingDay } = require('../utils/geolocation');

const router = express.Router();

// Validation rules
const leaveRequestValidation = [
  body('leaveType')
    .isIn(['annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'other'])
    .withMessage('Please select a valid leave type'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('reason')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Reason must be between 10 and 1000 characters'),
  body('isHalfDay')
    .optional()
    .isBoolean()
    .withMessage('isHalfDay must be a boolean'),
  body('halfDayType')
    .optional()
    .isIn(['morning', 'afternoon'])
    .withMessage('Half day type must be morning or afternoon'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Emergency contact name must be at least 2 characters'),
  body('emergencyContact.phone')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Emergency contact phone must be at least 10 characters'),
  body('workHandover')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Work handover must not exceed 1000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent')
];

const leaveApprovalValidation = [
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be approve or reject'),
  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters')
];

const leaveHistoryValidation = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'cancelled'])
    .withMessage('Invalid status filter'),
  query('leaveType')
    .optional()
    .isIn(['annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'other'])
    .withMessage('Invalid leave type filter'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// @route   POST /api/leaves/request
// @desc    Submit leave request
// @access  Private
router.post('/request', leaveRequestValidation, authenticateToken, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const {
    leaveType,
    startDate,
    endDate,
    reason,
    isHalfDay = false,
    halfDayType,
    emergencyContact,
    workHandover,
    priority = 'medium'
  } = req.body;

  const employeeId = req.employee._id;

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start < today) {
    return res.status(400).json({
      success: false,
      message: 'Start date cannot be in the past'
    });
  }

  if (end < start) {
    return res.status(400).json({
      success: false,
      message: 'End date cannot be before start date'
    });
  }

  // Check leave balance
  const employee = await Employee.findById(employeeId);
  const availableBalance = employee.leaveBalance[leaveType] || 0;

  // Calculate required days (count only working days)
  let requiredDays = 0;
  let current = new Date(start);
  while (current <= end) {
    if (isWorkingDay(current)) {
      requiredDays += isHalfDay ? 0.5 : 1;
    }
    current.setDate(current.getDate() + 1);
  }

  if (requiredDays > availableBalance) {
    return res.status(400).json({
      success: false,
      message: `Insufficient ${leaveType} leave balance. Available: ${availableBalance} days, Required: ${requiredDays} days`
    });
  }

  // Check for overlapping leaves
  const overlappingLeaves = await Leave.find({
    employee: employeeId,
    status: { $in: ['pending', 'approved'] },
    $or: [
      {
        startDate: { $lte: end },
        endDate: { $gte: start }
      }
    ]
  });

  if (overlappingLeaves.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'You have overlapping leave requests for this period'
    });
  }

  // Calculate total days (count only working days)
  let totalDays = 0;
  current = new Date(start);
  while (current <= end) {
    if (isWorkingDay(current)) {
      totalDays += isHalfDay ? 0.5 : 1;
    }
    current.setDate(current.getDate() + 1);
  }

  // Create leave request
  const leave = new Leave({
    employee: employeeId,
    leaveType,
    startDate: start,
    endDate: end,
    totalDays,
    reason,
    isHalfDay,
    halfDayType: isHalfDay ? halfDayType : undefined,
    emergencyContact,
    workHandover,
    priority
  });

  await leave.save();

  res.status(201).json({
    success: true,
    message: 'Leave request submitted successfully',
    data: {
      leave: {
        id: leave._id,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        totalDays: leave.totalDays,
        status: leave.status,
        priority: leave.priority
      }
    }
  });
}));

// @route   GET /api/leaves
// @desc    Get all leaves (with optional filters)
// @access  Private
router.get('/', authenticateToken, canAccessEmployee, asyncHandler(async (req, res) => {

  const {
    status,
    leaveType,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    employeeId
  } = req.query;

  const targetEmployeeId = employeeId || req.employee._id;

  // Build query
  const query = { employee: targetEmployeeId };
  
  if (status) query.status = status;
  if (leaveType) query.leaveType = leaveType;
  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get leave records
  const leaves = await Leave.find(query)
    .populate('approvedBy', 'firstName lastName employeeId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await Leave.countDocuments(query);

  // Get leave statistics
  const currentYear = new Date().getFullYear();
  const statistics = await Leave.getLeaveStatistics(targetEmployeeId, currentYear);

  res.json({
    success: true,
    data: {
      leaves,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      statistics
    }
  });
}));

// @route   GET /api/leaves/history
// @desc    Get leave history (alias for backward compatibility)
// @access  Private
router.get('/history', authenticateToken, canAccessEmployee, asyncHandler(async (req, res) => {

  const {
    status,
    leaveType,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    employeeId
  } = req.query;

  const targetEmployeeId = employeeId || req.employee._id;

  // Build query
  const query = { employee: targetEmployeeId };
  
  if (status) query.status = status;
  if (leaveType) query.leaveType = leaveType;
  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get leave records
  const leaves = await Leave.find(query)
    .populate('approvedBy', 'firstName lastName employeeId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await Leave.countDocuments(query);

  // Get leave statistics
  const currentYear = new Date().getFullYear();
  const statistics = await Leave.getLeaveStatistics(targetEmployeeId, currentYear);

  res.json({
    success: true,
    data: {
      leaves,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      statistics
    }
  });
}));

// @route   GET /api/leaves/pending
// @desc    Get pending leave requests (Manager/Admin only)
// @access  Private
router.get('/pending', authenticateToken, requireManager, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get pending leaves
  let query = { status: 'pending' };

  // If manager, only show leaves from their team
  if (req.employee.role === 'manager') {
    const teamMembers = await Employee.find({ manager: req.employee._id }).select('_id');
    const teamMemberIds = teamMembers.map(member => member._id);
    query.employee = { $in: teamMemberIds };
  }

  const leaves = await Leave.find(query)
    .populate('employee', 'firstName lastName employeeId department')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Leave.countDocuments(query);

  res.json({
    success: true,
    data: {
      leaves,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// @route   PUT /api/leaves/:id/approve
// @desc    Approve or reject leave request (Manager/Admin only)
// @access  Private
router.put('/:id/approve', leaveApprovalValidation, authenticateToken, requireManager, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const { action, rejectionReason } = req.body;

  const leave = await Leave.findById(id)
    .populate('employee', 'firstName lastName employeeId department leaveBalance');

  if (!leave) {
    return res.status(404).json({
      success: false,
      message: 'Leave request not found'
    });
  }

  // Check if user can approve this leave
  if (req.employee.role === 'manager') {
    const teamMembers = await Employee.find({ manager: req.employee._id }).select('_id');
    const teamMemberIds = teamMembers.map(member => member._id);
    
    if (!teamMemberIds.includes(leave.employee._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve leaves from your team members'
      });
    }
  }

  if (leave.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Leave request is not pending'
    });
  }

  if (action === 'approve') {
    // Check leave balance again before approving
    const availableBalance = leave.employee.leaveBalance[leave.leaveType] || 0;
    
    if (leave.totalDays > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Available: ${availableBalance} days, Required: ${leave.totalDays} days`
      });
    }

    await leave.approve(req.employee._id);

    // Update employee's leave balance
    const employee = await Employee.findById(leave.employee._id);
    employee.leaveBalance[leave.leaveType] -= leave.totalDays;
    await employee.save();

    res.json({
      success: true,
      message: 'Leave request approved successfully',
      data: { leave }
    });
  } else if (action === 'reject') {
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    await leave.reject(req.employee._id, rejectionReason);

    res.json({
      success: true,
      message: 'Leave request rejected successfully',
      data: { leave }
    });
  }
}));

// @route   PUT /api/leaves/:id/cancel
// @desc    Cancel leave request
// @access  Private
router.put('/:id/cancel', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const leave = await Leave.findById(id);

  if (!leave) {
    return res.status(404).json({
      success: false,
      message: 'Leave request not found'
    });
  }

  // Check if user can cancel this leave
  if (leave.employee.toString() !== req.employee._id.toString() && req.employee.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You can only cancel your own leave requests'
    });
  }

  if (leave.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Only pending leave requests can be cancelled'
    });
  }

  await leave.cancel();

  res.json({
    success: true,
    message: 'Leave request cancelled successfully',
    data: { leave }
  });
}));

// @route   GET /api/leaves/:id
// @desc    Get specific leave request
// @access  Private
router.get('/:id', authenticateToken, canAccessEmployee, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const leave = await Leave.findById(id)
    .populate('employee', 'firstName lastName employeeId department')
    .populate('approvedBy', 'firstName lastName employeeId');

  if (!leave) {
    return res.status(404).json({
      success: false,
      message: 'Leave request not found'
    });
  }

  res.json({
    success: true,
    data: { leave }
  });
}));

module.exports = router; 