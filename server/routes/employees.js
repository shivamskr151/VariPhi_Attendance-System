const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Employee = require('../models/Employee');
const { authenticateToken, requireAdmin, requireManager, canAccessEmployee } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');

const router = express.Router();

// Validation rules for updating employees
const employeeUpdateValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters long'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters long'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Please provide a valid phone number'),
  body('department')
    .optional()
    .isIn(['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Management'])
    .withMessage('Please select a valid department'),
  body('position')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Position must be at least 2 characters long'),
  body('role')
    .optional()
    .isIn(['employee', 'manager', 'admin'])
    .withMessage('Please select a valid role'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('hireDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid hire date'),
  body('manager')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty/null values
      }
      // If value is provided, it should be a valid ObjectId
      return require('mongoose').Types.ObjectId.isValid(value);
    })
    .withMessage('Manager must be a valid employee ID')
];

// Validation rules for creating employees
const employeeCreateValidation = [
  body('firstName')
    .notEmpty()
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters long'),
  body('lastName')
    .notEmpty()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters long'),
  body('email')
    .notEmpty()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Please provide a valid phone number'),
  body('department')
    .notEmpty()
    .isIn(['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Management'])
    .withMessage('Please select a valid department'),
  body('position')
    .notEmpty()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Position must be at least 2 characters long'),
  body('role')
    .optional()
    .isIn(['employee', 'manager', 'admin'])
    .withMessage('Please select a valid role'),
  body('hireDate')
    .notEmpty()
    .isISO8601()
    .withMessage('Please provide a valid hire date'),
  body('manager')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty/null values
      }
      // If value is provided, it should be a valid ObjectId
      return require('mongoose').Types.ObjectId.isValid(value);
    })
    .withMessage('Manager must be a valid employee ID')
];

const employeeQueryValidation = [
  query('department')
    .optional()
    .isIn(['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Management'])
    .withMessage('Invalid department filter'),
  query('role')
    .optional()
    .isIn(['employee', 'manager', 'admin'])
    .withMessage('Invalid role filter'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search term must be at least 2 characters')
];

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profile-pictures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// @route   GET /api/employees
// @desc    Get all employees (Manager and Admin only)
// @access  Private
router.get('/', employeeQueryValidation, authenticateToken, requireManager, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const {
    department,
    role,
    isActive,
    page = 1,
    limit = 20,
    search
  } = req.query;

  // Build query
  const query = {};
  
  // Managers can only see their team members, admins can see all employees
  if (req.employee.role === 'manager') {
    query.manager = req.employee._id;
  }
  
  if (department) query.department = department;
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  // Search functionality
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Get employees
  const employees = await Employee.find(query)
    .populate('manager', 'firstName lastName employeeId')
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count
  const total = await Employee.countDocuments(query);

  // Get department statistics
  const departmentStats = await Employee.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get role statistics
  const roleStats = await Employee.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      statistics: {
        departments: departmentStats,
        roles: roleStats
      }
    }
  });
}));

// @route   POST /api/employees
// @desc    Create new employee (Admin only)
// @access  Private
router.post('/', employeeCreateValidation, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const employeeData = req.body;

  // Handle manager field - convert empty string to null
  if (employeeData.manager === '') {
    employeeData.manager = null;
  }

  // Check if email already exists
  const existingEmployee = await Employee.findOne({ email: employeeData.email });
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

  // Create new employee
  const newEmployee = new Employee({
    ...employeeData,
    employeeId: newEmployeeId,
    emailVerified: false
  });

  await newEmployee.save();

  res.status(201).json({
    success: true,
    message: 'Employee created successfully',
    data: {
      employee: newEmployee.getPublicProfile()
    }
  });
}));

// @route   GET /api/employees/me
// @desc    Get current employee profile
// @access  Private
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.employee._id)
    .populate('manager', 'firstName lastName employeeId department')
    .select('-password');

  res.json({
    success: true,
    data: { employee }
  });
}));

// @route   GET /api/employees/team
// @desc    Get team members (Manager only)
// @access  Private
router.get('/team', authenticateToken, asyncHandler(async (req, res) => {
  if (!['manager', 'admin'].includes(req.employee.role)) {
    return res.status(403).json({
      success: false,
      message: 'Manager access required'
    });
  }

  let query = {};

  if (req.employee.role === 'manager') {
    query.manager = req.employee._id;
  }

  const teamMembers = await Employee.find(query)
    .select('-password')
    .sort({ firstName: 1, lastName: 1 });

  res.json({
    success: true,
    data: { teamMembers }
  });
}));

// @route   GET /api/employees/:id
// @desc    Get specific employee
// @access  Private
router.get('/:id', authenticateToken, canAccessEmployee, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const employee = await Employee.findById(id)
    .populate('manager', 'firstName lastName employeeId department')
    .select('-password');

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  res.json({
    success: true,
    data: { employee }
  });
}));

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private
router.put('/:id', employeeUpdateValidation, authenticateToken, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const updateData = req.body;

  // Handle manager field - convert empty string to null
  if (updateData.manager === '') {
    updateData.manager = null;
  }

  // Check permissions
  if (id !== req.employee._id.toString() && req.employee.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own profile'
    });
  }

  // Remove sensitive fields that shouldn't be updated directly
  delete updateData.password;
  delete updateData.email;
  delete updateData.employeeId;

  const employee = await Employee.findById(id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  // Update employee
  Object.assign(employee, updateData);
  await employee.save();

  res.json({
    success: true,
    message: 'Employee updated successfully',
    data: {
      employee: employee.getPublicProfile()
    }
  });
}));

// @route   DELETE /api/employees/:id
// @desc    Delete employee (Admin only)
// @access  Private
router.delete('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (id === req.employee._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account'
    });
  }

  const employee = await Employee.findById(id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  // Check if employee has team members (if manager)
  if (employee.role === 'manager') {
    const teamMembers = await Employee.find({ manager: id });
    if (teamMembers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete manager with active team members'
      });
    }
  }

  await Employee.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'Employee deleted successfully'
  });
}));

// @route   PUT /api/employees/:id/activate
// @desc    Activate/deactivate employee (Manager and Admin only)
// @access  Private
router.put('/:id/activate', authenticateToken, requireManager, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'isActive must be a boolean'
    });
  }

  // Prevent self-deactivation
  if (id === req.employee._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot deactivate your own account'
    });
  }

  const employee = await Employee.findById(id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  // Managers can only activate/deactivate their team members
  if (req.employee.role === 'manager' && employee.manager?.toString() !== req.employee._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only activate/deactivate your team members'
    });
  }

  employee.isActive = isActive;
  await employee.save();

  res.json({
    success: true,
    message: `Employee ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      employee: employee.getPublicProfile()
    }
  });
}));

// @route   PUT /api/employees/:id/leave-balance
// @desc    Update employee leave balance (Manager and Admin only)
// @access  Private
router.put('/:id/leave-balance', authenticateToken, requireManager, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { leaveBalance } = req.body;

  if (!leaveBalance || typeof leaveBalance !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Leave balance object is required'
    });
  }

  const employee = await Employee.findById(id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  // Managers can only update leave balance for their team members
  if (req.employee.role === 'manager' && employee.manager?.toString() !== req.employee._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only update leave balance for your team members'
    });
  }

  // Update leave balance
  Object.assign(employee.leaveBalance, leaveBalance);
  await employee.save();

  res.json({
    success: true,
    message: 'Leave balance updated successfully',
    data: {
      employee: employee.getPublicProfile()
    }
  });
}));

// @route   PUT /api/employees/:id/profile-picture
// @desc    Upload profile picture
// @access  Private
router.put('/:id/profile-picture', authenticateToken, canAccessEmployee, (req, res, next) => {
  upload.single('profilePicture')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 5MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const { id } = req.params;
  const employee = await Employee.findById(id);
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  // Delete old profile picture if it exists
  if (employee.profilePicture) {
    const oldPicturePath = path.join(__dirname, '../uploads/profile-pictures', path.basename(employee.profilePicture));
    if (fs.existsSync(oldPicturePath)) {
      fs.unlinkSync(oldPicturePath);
    }
  }

  // Update employee profile picture path
  const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
  employee.profilePicture = profilePictureUrl;
  await employee.save();

  res.json({
    success: true,
    message: 'Profile picture updated successfully',
    data: {
      profilePicture: profilePictureUrl
    }
  });
}));

// @route   DELETE /api/employees/:id/profile-picture
// @desc    Delete profile picture
// @access  Private
router.delete('/:id/profile-picture', authenticateToken, canAccessEmployee, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employee = await Employee.findById(id);
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  if (employee.profilePicture) {
    // Delete the file from the filesystem
    const picturePath = path.join(__dirname, '../uploads/profile-pictures', path.basename(employee.profilePicture));
    if (fs.existsSync(picturePath)) {
      fs.unlinkSync(picturePath);
    }

    // Remove the profile picture reference from the employee
    employee.profilePicture = null;
    await employee.save();
  }

  res.json({
    success: true,
    message: 'Profile picture deleted successfully'
  });
}));

module.exports = router; 