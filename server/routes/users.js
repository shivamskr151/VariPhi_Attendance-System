const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/profile-pictures');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.employee._id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Validation rules
const profileUpdateValidation = [
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
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Please provide a valid phone number'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Street address is required'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('City is required'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('State is required'),
  body('address.zipCode')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('ZIP code is required'),
  body('address.country')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Country is required'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Emergency contact name is required'),
  body('emergencyContact.relationship')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Emergency contact relationship is required'),
  body('emergencyContact.phone')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Emergency contact phone is required')
];

const passwordChangeValidation = [
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('Current password must be at least 6 characters long'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
];

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', profileUpdateValidation, authenticateToken, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const employee = req.employee;
  const updateData = req.body;

  // Update allowed fields
  if (updateData.firstName) employee.firstName = updateData.firstName;
  if (updateData.lastName) employee.lastName = updateData.lastName;
  if (updateData.email) employee.email = updateData.email;
  if (updateData.phone) employee.phone = updateData.phone;
  if (updateData.address) employee.address = { ...employee.address, ...updateData.address };
  if (updateData.emergencyContact) employee.emergencyContact = { ...employee.emergencyContact, ...updateData.emergencyContact };

  await employee.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    employee: employee.getPublicProfile()
  });
}));

// @route   PUT /api/users/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', passwordChangeValidation, authenticateToken, asyncHandler(async (req, res) => {
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

// @route   PUT /api/users/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const employee = req.employee;
  const preferences = req.body;

  // Update preferences
  employee.preferences = { ...employee.preferences, ...preferences };
  await employee.save();

  res.json({
    success: true,
    message: 'Preferences updated successfully'
  });
}));

// @route   GET /api/users/export-data
// @desc    Export user data
// @access  Private
router.get('/export-data', authenticateToken, asyncHandler(async (req, res) => {
  const employee = req.employee;

  // Get user's attendance records
  const attendanceRecords = await Attendance.find({ employee: employee._id })
    .sort({ date: -1 })
    .limit(1000);

  // Get user's leave records
  const leaveRecords = await Leave.find({ employee: employee._id })
    .sort({ createdAt: -1 })
    .limit(1000);

  // Prepare export data
  const exportData = {
    user: {
      profile: employee.getPublicProfile(),
      preferences: employee.preferences || {}
    },
    attendance: attendanceRecords.map(record => ({
      date: record.date,
      punchIn: record.punchIn,
      punchOut: record.punchOut,
      totalHours: record.totalHours,
      status: record.status,
      location: record.location
    })),
    leaves: leaveRecords.map(record => ({
      type: record.type,
      startDate: record.startDate,
      endDate: record.endDate,
      reason: record.reason,
      status: record.status,
      approvedBy: record.approvedBy,
      createdAt: record.createdAt
    })),
    exportDate: new Date().toISOString()
  };

  // Set response headers for file download
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="user-data-${employee.employeeId}-${new Date().toISOString().split('T')[0]}.json"`);

  res.json(exportData);
}));

// @route   PUT /api/users/profile-picture
// @desc    Upload profile picture
// @access  Private
router.put('/profile-picture', authenticateToken, (req, res, next) => {
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

  const employee = req.employee;

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

// @route   DELETE /api/users/profile-picture
// @desc    Delete profile picture
// @access  Private
router.delete('/profile-picture', authenticateToken, asyncHandler(async (req, res) => {
  const employee = req.employee;

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

// @route   GET /api/users/profile-picture/:filename
// @desc    Get profile picture
// @access  Public
router.get('/profile-picture/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/profile-pictures', filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  // Set appropriate headers
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  
  // Send the file
  res.sendFile(filePath);
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', authenticateToken, asyncHandler(async (req, res) => {
  const employee = req.employee;

  // Soft delete - mark as inactive instead of actually deleting
  employee.isActive = false;
  employee.deletedAt = new Date();
  await employee.save();

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

module.exports = router; 