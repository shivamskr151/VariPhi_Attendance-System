const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const { authenticateToken, canAccessEmployee } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');
const { validateLocation } = require('../utils/geolocation');

const router = express.Router();

// Working hours validation function
const isWithinWorkingHours = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Convert current time to minutes for easier comparison
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  // Working hours: 9:00 AM (540 minutes) to 6:00 PM (1080 minutes)
  const workStartMinutes = 9 * 60; // 9:00 AM
  const workEndMinutes = 18 * 60;  // 6:00 PM
  
  return currentTimeInMinutes >= workStartMinutes && currentTimeInMinutes <= workEndMinutes;
};

// Get working hours message
const getWorkingHoursMessage = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  if (currentHour < 9) {
    return 'Punch in is only allowed during official working hours (9:00 AM to 6:00 PM). Please try again at 9:00 AM.';
  } else if (currentHour >= 18) {
    return 'Punch in is only allowed during official working hours (9:00 AM to 6:00 PM). Working hours have ended for today.';
  }
  
  return 'Punch in is only allowed during official working hours (9:00 AM to 6:00 PM).';
};

// Validation rules
const punchInValidation = [
  body('location.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('location.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  body('device')
    .optional()
    .isIn(['web', 'mobile', 'tablet'])
    .withMessage('Invalid device type')
];

const punchOutValidation = [
  body('location.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
  body('location.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
  body('device')
    .optional()
    .isIn(['web', 'mobile', 'tablet'])
    .withMessage('Invalid device type')
];

const historyValidation = [
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

// @route   POST /api/attendance/punch-in
// @desc    Employee punch in
// @access  Private
router.post('/punch-in', punchInValidation, authenticateToken, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { location, device = 'web', notes } = req.body;
  const employeeId = req.employee._id;

  // Check if today is a holiday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const holiday = await Holiday.findOne({ date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } });
  if (holiday) {
    return res.status(400).json({
      success: false,
      message: `Attendance cannot be marked on a holiday: ${holiday.name}`
    });
  }

  // Check if within working hours (9:00 AM to 6:00 PM)
  if (!isWithinWorkingHours()) {
    return res.status(400).json({
      success: false,
      message: getWorkingHoursMessage()
    });
  }

  // Validate location (check if within allowed distance)
  const locationValidation = await validateLocation(location);
  if (!locationValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: locationValidation.message
    });
  }

  // Check if already punched in today
  const todayAttendance = await Attendance.findTodayAttendance(employeeId);
  
  if (todayAttendance && todayAttendance.punchIn?.time) {
    return res.status(400).json({
      success: false,
      message: 'Already punched in today'
    });
  }

  let attendance;
  
  if (todayAttendance) {
    // Update existing attendance record
    attendance = todayAttendance;
  } else {
    // Create new attendance record
    attendance = new Attendance({
      employee: employeeId,
      date: new Date()
    });
  }

  // Punch in
  await attendance.performPunchIn(
    location,
    device,
    req.ip,
    req.get('User-Agent')
  );

  if (notes) {
    attendance.notes = notes;
    await attendance.save();
  }

  res.json({
    success: true,
    message: 'Punch in successful',
    data: {
      attendance: {
        _id: attendance._id,
        employee: attendance.employee,
        date: attendance.date,
        punchIn: attendance.punchIn,
        punchOut: attendance.punchOut,
        totalHours: attendance.totalHours,
        status: attendance.status,
        notes: attendance.notes,
        isRemote: attendance.isRemote,
        approvedBy: attendance.approvedBy,
        approvedAt: attendance.approvedAt,
        isApproved: attendance.isApproved,
        createdAt: attendance.createdAt,
        updatedAt: attendance.updatedAt
      }
    }
  });
}));

// @route   POST /api/attendance/punch-out
// @desc    Employee punch out
// @access  Private
router.post('/punch-out', punchOutValidation, authenticateToken, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { location, device = 'web', notes } = req.body;
  const employeeId = req.employee._id;

  // Check if today is a holiday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const holiday = await Holiday.findOne({ date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } });
  if (holiday) {
    return res.status(400).json({
      success: false,
      message: `Attendance cannot be marked on a holiday: ${holiday.name}`
    });
  }

  // Check if within working hours for punch out (should be after 9:00 AM)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const workStartMinutes = 9 * 60; // 9:00 AM
  
  if (currentTimeInMinutes < workStartMinutes) {
    return res.status(400).json({
      success: false,
      message: 'Punch out is only allowed after official working hours begin (9:00 AM). Please try again after 9:00 AM.'
    });
  }

  // Validate location
  const locationValidation = await validateLocation(location);
  if (!locationValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: locationValidation.message
    });
  }

  // Find today's attendance
  const attendance = await Attendance.findTodayAttendance(employeeId);
  
  if (!attendance || !attendance.punchIn?.time) {
    return res.status(400).json({
      success: false,
      message: 'No punch in record found for today'
    });
  }

  if (attendance.punchOut?.time) {
    return res.status(400).json({
      success: false,
      message: 'Already punched out today'
    });
  }

  // Punch out
  await attendance.performPunchOut(
    location,
    device,
    req.ip,
    req.get('User-Agent')
  );

  if (notes) {
    attendance.notes = notes;
    await attendance.save();
  }

  res.json({
    success: true,
    message: 'Punch out successful',
    data: {
      attendance: {
        _id: attendance._id,
        employee: attendance.employee,
        date: attendance.date,
        punchIn: attendance.punchIn,
        punchOut: attendance.punchOut,
        totalHours: attendance.totalHours,
        status: attendance.status,
        notes: attendance.notes,
        isRemote: attendance.isRemote,
        approvedBy: attendance.approvedBy,
        approvedAt: attendance.approvedAt,
        isApproved: attendance.isApproved,
        createdAt: attendance.createdAt,
        updatedAt: attendance.updatedAt
      }
    }
  });
}));

// @route   GET /api/attendance/today
// @desc    Get today's attendance status
// @access  Private
router.get('/today', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const employeeId = req.employee._id;
    
    console.log('Fetching today\'s attendance for employee:', employeeId);
    
    const attendance = await Attendance.findTodayAttendance(employeeId);

    console.log('Today\'s attendance:', attendance);

    if (!attendance) {
      return res.json({
        success: true,
        data: {
          status: 'not_started',
          canPunchIn: true,
          canPunchOut: false,
          attendance: null
        }
      });
    }

    const canPunchIn = attendance.canPunchIn();
    const canPunchOut = attendance.canPunchOut();

    res.json({
      success: true,
      data: {
        status: canPunchIn ? 'not_started' : canPunchOut ? 'working' : 'completed',
        canPunchIn,
        canPunchOut,
        attendance: {
          _id: attendance._id,
          employee: attendance.employee,
          date: attendance.date,
          punchIn: attendance.punchIn,
          punchOut: attendance.punchOut,
          totalHours: attendance.totalHours,
          status: attendance.status,
          notes: attendance.notes,
          isRemote: attendance.isRemote,
          approvedBy: attendance.approvedBy,
          approvedAt: attendance.approvedAt,
          isApproved: attendance.isApproved,
          createdAt: attendance.createdAt,
          updatedAt: attendance.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Error in today\'s attendance:', error);
    throw error;
  }
}));

// @route   GET /api/attendance/history
// @desc    Get attendance history
// @access  Private
router.get('/history', historyValidation, authenticateToken, canAccessEmployee, asyncHandler(async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const {
      startDate,
      endDate,
      page = 1,
      limit = 20,
      employeeId
    } = req.query;

    const targetEmployeeId = employeeId || req.employee._id;

    console.log('Fetching attendance history:', {
      targetEmployeeId,
      targetEmployeeIdType: typeof targetEmployeeId,
      startDate,
      endDate,
      page,
      limit
    });

    // Set default date range if not provided
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30); // Last 30 days
    defaultStartDate.setHours(0, 0, 0, 0); // Start of day

    // Handle date filtering properly
    let queryStartDate, queryEndDate;
    
    if (startDate) {
      queryStartDate = new Date(startDate);
      queryStartDate.setHours(0, 0, 0, 0); // Start of day
    } else {
      queryStartDate = defaultStartDate;
    }
    
    if (endDate) {
      queryEndDate = new Date(endDate);
      queryEndDate.setHours(23, 59, 59, 999); // End of day
    } else {
      queryEndDate = new Date();
      queryEndDate.setHours(23, 59, 59, 999); // End of current day
    }

    const query = {
      employee: targetEmployeeId,
      date: {
        $gte: queryStartDate,
        $lte: queryEndDate
      }
    };

    console.log('Query:', JSON.stringify(query, null, 2));
    console.log('Date range:', {
      startDate: startDate,
      endDate: endDate,
      queryStartDate: queryStartDate.toISOString(),
      queryEndDate: queryEndDate.toISOString()
    });

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get attendance records
    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`Found ${attendance.length} attendance records`);
    if (attendance.length > 0) {
      console.log('Sample attendance records:', attendance.map(a => ({
        id: a._id,
        employee: a.employee,
        date: a.date,
        status: a.status
      })));
    }

    // Get total count
    const total = await Attendance.countDocuments(query);

    // Calculate summary
    const summary = await Attendance.getAttendanceSummary(
      targetEmployeeId,
      query.date.$gte,
      query.date.$lte
    );

    console.log('Summary:', summary);

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
          totalDays: 0,
          totalHours: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0
        }
      }
    });
  } catch (error) {
    console.error('Error in attendance history:', error);
    throw error;
  }
}));

// @route   GET /api/attendance/:id
// @desc    Get specific attendance record
// @access  Private
router.get('/:id', authenticateToken, canAccessEmployee, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const attendance = await Attendance.findById(id)
    .populate('employee', 'firstName lastName employeeId department')
    .populate('approvedBy', 'firstName lastName employeeId');

  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: 'Attendance record not found'
    });
  }

  res.json({
    success: true,
    data: {
      attendance
    }
  });
}));

// @route   PUT /api/attendance/:id
// @desc    Update attendance record (Admin/Manager only)
// @access  Private
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes, isApproved } = req.body;

  // Check permissions
  if (!['admin', 'manager'].includes(req.employee.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const attendance = await Attendance.findById(id);
  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: 'Attendance record not found'
    });
  }

  // Update fields
  if (status) attendance.status = status;
  if (notes !== undefined) attendance.notes = notes;
  if (isApproved !== undefined) {
    attendance.isApproved = isApproved;
    if (isApproved) {
      attendance.approvedBy = req.employee._id;
      attendance.approvedAt = new Date();
    }
  }

  await attendance.save();

  res.json({
    success: true,
    message: 'Attendance record updated successfully',
    data: {
      attendance
    }
  });
}));

module.exports = router; 