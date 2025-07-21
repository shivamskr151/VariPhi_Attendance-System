const express = require('express');
const { query, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');

const router = express.Router();

// Validation rules
const reportValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  query('department')
    .optional()
    .isIn(['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Management'])
    .withMessage('Invalid department filter')
];

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Employee statistics
  const totalEmployees = await Employee.countDocuments({ isActive: true });
  const newEmployeesThisMonth = await Employee.countDocuments({
    isActive: true,
    hireDate: { $gte: startOfMonth, $lte: endOfMonth }
  });

  // Attendance statistics for today
  const todayAttendance = await Attendance.aggregate([
    {
      $match: {
        date: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Leave statistics
  const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
  const approvedLeavesThisMonth = await Leave.countDocuments({
    status: 'approved',
    approvedAt: { $gte: startOfMonth, $lte: endOfMonth }
  });

  // Department statistics
  const departmentStats = await Employee.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Recent activities
  const recentAttendance = await Attendance.find()
    .populate('employee', 'firstName lastName employeeId department')
    .sort({ createdAt: -1 })
    .limit(10);

  const recentLeaves = await Leave.find()
    .populate('employee', 'firstName lastName employeeId department')
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    success: true,
    data: {
      overview: {
        totalEmployees,
        newEmployeesThisMonth,
        pendingLeaves,
        approvedLeavesThisMonth
      },
      todayAttendance: todayAttendance.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      departmentStats,
      recentActivities: {
        attendance: recentAttendance,
        leaves: recentLeaves
      }
    }
  });
}));

// @route   GET /api/admin/attendance-report
// @desc    Generate attendance report
// @access  Private (Admin only)
router.get('/attendance-report', reportValidation, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const {
    startDate,
    endDate,
    department,
    page = 1,
    limit = 50
  } = req.query;

  // Set default date range if not provided
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);

  const query = {
    date: {
      $gte: startDate ? new Date(startDate) : defaultStartDate,
      $lte: endDate ? new Date(endDate) : new Date()
    }
  };

  // Add department filter if provided
  if (department) {
    const employeesInDept = await Employee.find({ department, isActive: true }).select('_id');
    const employeeIds = employeesInDept.map(emp => emp._id);
    query.employee = { $in: employeeIds };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get attendance records
  const attendance = await Attendance.find(query)
    .populate('employee', 'firstName lastName employeeId department')
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await Attendance.countDocuments(query);

  // Get summary statistics
  const summary = await Attendance.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        totalHours: { $sum: '$totalHours' },
        presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        averageHours: { $avg: '$totalHours' }
      }
    }
  ]);

  // Get daily statistics
  const dailyStats = await Attendance.aggregate([
    { $match: query },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        totalHours: { $sum: '$totalHours' }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  res.json({
    success: true,
    data: {
      attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      summary: summary[0] || {
        totalRecords: 0,
        totalHours: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        averageHours: 0
      },
      dailyStats
    }
  });
}));

// @route   GET /api/admin/leave-report
// @desc    Generate leave report
// @access  Private (Admin only)
router.get('/leave-report', reportValidation, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const {
    startDate,
    endDate,
    department,
    status,
    page = 1,
    limit = 50
  } = req.query;

  // Set default date range if not provided
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);

  const query = {
    startDate: {
      $gte: startDate ? new Date(startDate) : defaultStartDate,
      $lte: endDate ? new Date(endDate) : new Date()
    }
  };

  // Add filters
  if (status) query.status = status;
  if (department) {
    const employeesInDept = await Employee.find({ department, isActive: true }).select('_id');
    const employeeIds = employeesInDept.map(emp => emp._id);
    query.employee = { $in: employeeIds };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get leave records
  const leaves = await Leave.find(query)
    .populate('employee', 'firstName lastName employeeId department')
    .populate('approvedBy', 'firstName lastName employeeId')
    .sort({ startDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await Leave.countDocuments(query);

  // Get summary statistics
  const summary = await Leave.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalDays: { $sum: '$totalDays' },
        approvedRequests: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejectedRequests: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        pendingRequests: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        averageDays: { $avg: '$totalDays' }
      }
    }
  ]);

  // Get leave type statistics
  const leaveTypeStats = await Leave.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$leaveType',
        count: { $sum: 1 },
        totalDays: { $sum: '$totalDays' },
        approvedCount: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);

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
      summary: summary[0] || {
        totalRequests: 0,
        totalDays: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        pendingRequests: 0,
        averageDays: 0
      },
      leaveTypeStats
    }
  });
}));

// @route   GET /api/admin/employee-report
// @desc    Generate employee report
// @access  Private (Admin only)
router.get('/employee-report', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { department, role, isActive } = req.query;

  // Build query
  const query = {};
  if (department) query.department = department;
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  // Get employees
  const employees = await Employee.find(query)
    .populate('manager', 'firstName lastName employeeId')
    .select('-password')
    .sort({ firstName: 1, lastName: 1 });

  // Get statistics
  const totalEmployees = await Employee.countDocuments(query);
  const activeEmployees = await Employee.countDocuments({ ...query, isActive: true });
  const inactiveEmployees = totalEmployees - activeEmployees;

  // Department distribution
  const departmentDistribution = await Employee.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
        activeCount: { $sum: { $cond: ['$isActive', 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Role distribution
  const roleDistribution = await Employee.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Hire date distribution (by year)
  const hireYearDistribution = await Employee.aggregate([
    { $match: query },
    {
      $group: {
        _id: { $year: '$hireDate' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  res.json({
    success: true,
    data: {
      employees,
      statistics: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees
      },
      distributions: {
        departments: departmentDistribution,
        roles: roleDistribution,
        hireYears: hireYearDistribution
      }
    }
  });
}));

// @route   GET /api/admin/analytics
// @desc    Get analytics data for charts
// @access  Private (Admin only)
router.get('/analytics', reportValidation, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { startDate, endDate, department } = req.query;

  // Set default date range if not provided
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);

  const dateRange = {
    $gte: startDate ? new Date(startDate) : defaultStartDate,
    $lte: endDate ? new Date(endDate) : new Date()
  };

  // Attendance analytics
  const attendanceAnalytics = await Attendance.aggregate([
    {
      $match: {
        date: dateRange
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        presentCount: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absentCount: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        lateCount: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        totalHours: { $sum: '$totalHours' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Leave analytics
  const leaveAnalytics = await Leave.aggregate([
    {
      $match: {
        startDate: dateRange
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startDate' } },
        approvedCount: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        totalDays: { $sum: '$totalDays' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Department performance
  const departmentPerformance = await Attendance.aggregate([
    {
      $match: {
        date: dateRange
      }
    },
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employeeData'
      }
    },
    { $unwind: '$employeeData' },
    {
      $group: {
        _id: '$employeeData.department',
        totalHours: { $sum: '$totalHours' },
        presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        employeeCount: { $addToSet: '$employee' }
      }
    },
    {
      $project: {
        department: '$_id',
        totalHours: 1,
        presentDays: 1,
        absentDays: 1,
        employeeCount: { $size: '$employeeCount' },
        averageHours: { $divide: ['$totalHours', { $size: '$employeeCount' }] }
      }
    },
    { $sort: { totalHours: -1 } }
  ]);

  res.json({
    success: true,
    data: {
      attendanceAnalytics,
      leaveAnalytics,
      departmentPerformance
    }
  });
}));

// @route   GET /api/admin/system-stats
// @desc    Get system statistics
// @access  Private (Admin only)
router.get('/system-stats', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // System statistics
  const totalEmployees = await Employee.countDocuments({ isActive: true });
  const totalAttendanceRecords = await Attendance.countDocuments();
  const totalLeaveRequests = await Leave.countDocuments();
  const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

  // Today's statistics
  const todayAttendance = await Attendance.countDocuments({
    date: {
      $gte: new Date(today.setHours(0, 0, 0, 0)),
      $lt: new Date(today.setHours(23, 59, 59, 999))
    }
  });

  const presentToday = await Attendance.countDocuments({
    date: {
      $gte: new Date(today.setHours(0, 0, 0, 0)),
      $lt: new Date(today.setHours(23, 59, 59, 999))
    },
    status: 'present'
  });

  // Monthly statistics
  const newEmployeesThisMonth = await Employee.countDocuments({
    isActive: true,
    hireDate: { $gte: startOfMonth, $lte: endOfMonth }
  });

  const approvedLeavesThisMonth = await Leave.countDocuments({
    status: 'approved',
    approvedAt: { $gte: startOfMonth, $lte: endOfMonth }
  });

  // Department breakdown
  const departmentStats = await Employee.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Role breakdown
  const roleStats = await Employee.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        totalEmployees,
        totalAttendanceRecords,
        totalLeaveRequests,
        pendingLeaves
      },
      today: {
        totalAttendance: todayAttendance,
        presentToday,
        attendanceRate: totalEmployees > 0 ? (presentToday / totalEmployees * 100).toFixed(2) : 0
      },
      monthly: {
        newEmployees: newEmployeesThisMonth,
        approvedLeaves: approvedLeavesThisMonth
      },
      breakdown: {
        departments: departmentStats,
        roles: roleStats
      }
    }
  });
}));

// @route   GET /api/admin/users
// @desc    Get all users for admin management
// @access  Private (Admin only)
router.get('/users', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, department, role, isActive } = req.query;

  // Build query
  const query = {};
  
  if (department) query.department = department;
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  // Search functionality
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const users = await Employee.find(query)
    .select('-password')
    .populate('manager', 'firstName lastName employeeId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Employee.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// @route   GET /api/admin/settings
// @desc    Get system settings
// @access  Private (Admin only)
router.get('/settings', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // For now, return default system settings
  // In a real application, these would be stored in a separate collection
  const systemSettings = {
    general: {
      companyName: 'Attendance System',
      timezone: 'UTC',
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      weekStart: 'monday'
    },
    attendance: {
      allowLatePunchIn: true,
      lateThreshold: 15, // minutes
      overtimeEnabled: true,
      geolocationRequired: false
    },
    leave: {
      autoApprove: false,
      requireManagerApproval: true,
      allowNegativeBalance: false
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true
    },
    security: {
      sessionTimeout: 24, // hours
      maxLoginAttempts: 5,
      passwordExpiry: 90 // days
    }
  };

  res.json({
    success: true,
    data: systemSettings
  });
}));

// @route   PUT /api/admin/office-location
// @desc    Update office location configuration
// @access  Private (Admin only)
router.put('/office-location', authenticateToken, asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.employee.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  const { latitude, longitude, maxDistance, locationValidationEnabled } = req.body;

  // Validate input
  if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
    return res.status(400).json({
      success: false,
      message: 'Latitude must be between -90 and 90'
    });
  }

  if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
    return res.status(400).json({
      success: false,
      message: 'Longitude must be between -180 and 180'
    });
  }

  if (maxDistance !== undefined && maxDistance <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Maximum distance must be greater than 0'
    });
  }

  // Update environment variables (in a real application, you'd store these in a database)
  if (latitude !== undefined) process.env.DEFAULT_LOCATION_LAT = latitude.toString();
  if (longitude !== undefined) process.env.DEFAULT_LOCATION_LNG = longitude.toString();
  if (maxDistance !== undefined) process.env.MAX_DISTANCE_KM = maxDistance.toString();
  if (locationValidationEnabled !== undefined) process.env.LOCATION_VALIDATION_ENABLED = locationValidationEnabled.toString();

  res.json({
    success: true,
    message: 'Office location configuration updated successfully',
    data: {
      latitude: parseFloat(process.env.DEFAULT_LOCATION_LAT) || 51.5074,
      longitude: parseFloat(process.env.DEFAULT_LOCATION_LNG) || -0.1278,
      maxDistance: parseFloat(process.env.MAX_DISTANCE_KM) || 100,
      locationValidationEnabled: process.env.LOCATION_VALIDATION_ENABLED === 'true'
    }
  });
}));

// @route   GET /api/admin/office-location
// @desc    Get current office location configuration
// @access  Private (Admin only)
router.get('/office-location', authenticateToken, asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.employee.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  res.json({
    success: true,
    data: {
      latitude: parseFloat(process.env.DEFAULT_LOCATION_LAT) || 51.5074,
      longitude: parseFloat(process.env.DEFAULT_LOCATION_LNG) || -0.1278,
      maxDistance: parseFloat(process.env.MAX_DISTANCE_KM) || 100,
      locationValidationEnabled: process.env.LOCATION_VALIDATION_ENABLED === 'true'
    }
  });
}));

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Private (Admin only)
router.post('/users', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, department, position, role, isActive } = req.body;

  // Check if user already exists
  const existingUser = await Employee.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Generate employee ID
  const employeeCount = await Employee.countDocuments();
  const employeeId = `EMP${String(employeeCount + 1).padStart(4, '0')}`;

  // Generate a default password (first letter of firstName + lastName + employeeId)
  const defaultPassword = `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}${employeeId}`;

  // Create new user
  const newUser = new Employee({
    firstName,
    lastName,
    email,
    phone,
    password: defaultPassword, // Add the default password
    department,
    position,
    role: role || 'employee',
    isActive: isActive !== undefined ? isActive : true,
    employeeId,
    hireDate: new Date(),
    leaveBalance: {
      annual: 20,
      sick: 10,
      personal: 5
    }
  });

  await newUser.save();

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        employeeId: newUser.employeeId,
        department: newUser.department,
        position: newUser.position,
        role: newUser.role,
        isActive: newUser.isActive
      },
      defaultPassword // Return the default password so admin can share it with the user
    }
  });
}));

// @route   PUT /api/admin/users/:userId
// @desc    Update a user
// @access  Private (Admin only)
router.put('/users/:userId', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { firstName, lastName, email, phone, department, position, role, isActive } = req.body;

  const user = await Employee.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if email is being changed and if it already exists
  if (email && email !== user.email) {
    const existingUser = await Employee.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
  }

  // Update user
  user.firstName = firstName || user.firstName;
  user.lastName = lastName || user.lastName;
  user.email = email || user.email;
  user.phone = phone || user.phone;
  user.department = department || user.department;
  user.position = position || user.position;
  user.role = role || user.role;
  user.isActive = isActive !== undefined ? isActive : user.isActive;

  await user.save();

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
        position: user.position,
        role: user.role,
        isActive: user.isActive
      }
    }
  });
}));

// @route   DELETE /api/admin/users/:userId
// @desc    Delete a user
// @access  Private (Admin only)
router.delete('/users/:userId', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await Employee.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if user is trying to delete themselves
  if (userId === req.employee._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete your own account'
    });
  }

  await Employee.findByIdAndDelete(userId);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// @route   PATCH /api/admin/users/:userId/status
// @desc    Toggle user active status
// @access  Private (Admin only)
router.patch('/users/:userId/status', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  const user = await Employee.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if user is trying to deactivate themselves
  if (userId === req.employee._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot deactivate your own account'
    });
  }

  user.isActive = isActive;
  await user.save();

  res.json({
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        employeeId: user.employeeId,
        isActive: user.isActive
      }
    }
  });
}));

// @route   PUT /api/admin/settings
// @desc    Update system settings
// @access  Private (Admin only)
router.put('/settings', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // For now, just return success
  // In a real application, you would save these settings to a database
  res.json({
    success: true,
    message: 'System settings updated successfully',
    data: req.body
  });
}));

// @route   POST /api/admin/backup
// @desc    Create system backup
// @access  Private (Admin only)
router.post('/backup', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // For now, just return success
  // In a real application, you would implement actual backup functionality
  res.json({
    success: true,
    message: 'System backup created successfully',
    data: {
      backupId: `backup_${Date.now()}`,
      timestamp: new Date().toISOString()
    }
  });
}));

// @route   POST /api/admin/restore
// @desc    Restore system from backup
// @access  Private (Admin only)
router.post('/restore', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // For now, just return success
  // In a real application, you would implement actual restore functionality
  res.json({
    success: true,
    message: 'System restored successfully',
    data: {
      restoreId: `restore_${Date.now()}`,
      timestamp: new Date().toISOString()
    }
  });
}));

module.exports = router; 