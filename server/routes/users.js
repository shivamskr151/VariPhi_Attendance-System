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
  const newPreferences = req.body;

  // Validate preferences
  const validationErrors = validatePreferences(newPreferences);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors
    });
  }

  // Get current preferences and merge with new ones
  const currentPreferences = employee.preferences || {};
  const updatedPreferences = { ...currentPreferences };

  // Update only the provided preferences
  Object.keys(newPreferences).forEach(key => {
    if (newPreferences[key] !== undefined) {
      updatedPreferences[key] = newPreferences[key];
    }
  });

  // Update employee preferences
  employee.preferences = updatedPreferences;
  await employee.save();

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: {
      preferences: employee.preferences
    }
  });
}));

// @route   GET /api/users/preferences
// @desc    Get user preferences
// @access  Private
router.get('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const employee = req.employee;

  res.json({
    success: true,
    data: {
      preferences: employee.preferences || {}
    }
  });
}));

// @route   POST /api/users/preferences/reset
// @desc    Reset user preferences to default
// @access  Private
router.post('/preferences/reset', authenticateToken, asyncHandler(async (req, res) => {
  const employee = req.employee;
  const { categories } = req.body; // Optional: reset only specific categories

  // Get default preferences
  const defaultPreferences = getDefaultPreferences();
  
  if (categories && Array.isArray(categories)) {
    // Reset only specific categories
    const categoryFields = getCategoryFields(categories);
    categoryFields.forEach(field => {
      employee.preferences[field] = defaultPreferences[field];
    });
  } else {
    // Reset all preferences
    employee.preferences = defaultPreferences;
  }

  await employee.save();

  res.json({
    success: true,
    message: 'Preferences reset successfully',
    data: {
      preferences: employee.preferences
    }
  });
}));

// @route   GET /api/users/preferences/schema
// @desc    Get preferences schema/configuration
// @access  Private
router.get('/preferences/schema', authenticateToken, asyncHandler(async (req, res) => {
  const schema = getPreferencesSchema();
  
  res.json({
    success: true,
    data: {
      categories: schema.categories,
      fields: schema.fields
    }
  });
}));

// Helper function to validate preferences
function validatePreferences(preferences) {
  const errors = [];
  
  // Define validation rules
  const validationRules = {
    fontSize: { type: 'number', min: 12, max: 20 },
    breakDuration: { type: 'number', min: 15, max: 120 },
    lowBalanceThreshold: { type: 'number', min: 1, max: 30 },
    dataRetentionPeriod: { type: 'number', min: 12, max: 84 },
    autoLogoutTime: { type: 'number', min: 5, max: 480 },
    sessionTimeout: { type: 'number', min: 1, max: 168 },
    language: { type: 'string', enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'] },
    theme: { type: 'string', enum: ['light', 'dark', 'auto'] },
    dateFormat: { type: 'string', enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'] },
    timeFormat: { type: 'string', enum: ['12', '24'] },
    currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'KRW'] },
    numberFormat: { type: 'string', enum: ['US', 'EU', 'IN'] },
    dashboardLayout: { type: 'string', enum: ['grid', 'list', 'compact'] },
    notificationSound: { type: 'string', enum: ['default', 'bell', 'chime', 'ding', 'tone', 'silent'] },
    reportFormat: { type: 'string', enum: ['pdf', 'excel', 'csv', 'html'] },
    reportDelivery: { type: 'string', enum: ['email', 'download', 'both'] },
    profileVisibility: { type: 'string', enum: ['public', 'team', 'managers', 'private'] },
    calendarProvider: { type: 'string', enum: ['google', 'outlook', 'apple'] },
    colorBlindMode: { type: 'string', enum: ['none', 'protanopia', 'deuteranopia', 'tritanopia'] },
    webhookUrl: { type: 'string', pattern: /^(https?:\/\/.+)?$/ }
  };

  // Validate each preference
  Object.keys(preferences).forEach(key => {
    const value = preferences[key];
    const rule = validationRules[key];

    if (!rule) return; // No validation rule for this field

    // Type validation
    if (rule.type === 'number' && typeof value !== 'number') {
      errors.push(`${key} must be a number`);
      return;
    }

    if (rule.type === 'string' && typeof value !== 'string') {
      errors.push(`${key} must be a string`);
      return;
    }

    if (rule.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${key} must be a boolean`);
      return;
    }

    // Range validation for numbers
    if (rule.type === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${key} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${key} must be at most ${rule.max}`);
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${key} must be one of: ${rule.enum.join(', ')}`);
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push(`${key} format is invalid`);
    }
  });

  return errors;
}

// Helper function to get default preferences
function getDefaultPreferences() {
  return {
    // General Settings
    language: 'en',
    theme: 'light',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12',
    currency: 'USD',
    numberFormat: 'US',
    
    // Display Settings
    dashboardLayout: 'grid',
    sidebarCollapsed: false,
    compactMode: false,
    showTooltips: true,
    animationsEnabled: true,
    highContrast: false,
    fontSize: 14,
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    browserNotifications: true,
    soundEnabled: true,
    notificationSound: 'default',
    
    // Attendance Settings
    attendanceReminders: true,
    reminderTime: '08:45',
    autoBreakDeduction: true,
    breakDuration: 60,
    overtimeNotifications: true,
    lateArrivalNotifications: true,
    earlyDepartureNotifications: true,
    weekendReminders: false,
    holidayReminders: false,
    
    // Leave Settings
    leaveNotifications: true,
    leaveApprovalNotifications: true,
    leaveRejectionNotifications: true,
    leaveBalanceReminders: true,
    lowBalanceThreshold: 5,
    autoSubmitLeaveRequests: false,
    
    // Report Settings
    weeklyReports: false,
    monthlyReports: true,
    reportFormat: 'pdf',
    reportDelivery: 'email',
    includeCharts: true,
    reportLanguage: 'en',
    
    // Privacy Settings
    profileVisibility: 'team',
    shareAttendanceData: true,
    shareLeaveData: true,
    allowManagerAccess: true,
    twoFactorReminders: true,
    
    // Advanced Settings
    enableBetaFeatures: false,
    enableDebugMode: false,
    dataRetentionPeriod: 24,
    autoLogout: true,
    autoLogoutTime: 30,
    sessionTimeout: 24,
    
    // Mobile Settings
    locationTracking: true,
    backgroundSync: true,
    offlineMode: true,
    biometricLogin: false,
    quickActions: ['punch_in', 'punch_out', 'request_leave'],
    
    // Integration Settings
    calendarSync: false,
    calendarProvider: 'google',
    slackIntegration: false,
    teamsIntegration: false,
    webhookUrl: '',
    
    // Accessibility Settings
    screenReader: false,
    keyboardNavigation: false,
    reducedMotion: false,
    colorBlindMode: 'none',
    largeText: false,
    
    // Custom Settings
    customSettings: {}
  };
}

// Helper function to get fields by categories
function getCategoryFields(categories) {
  const categoryFieldMap = {
    general: ['language', 'theme', 'timezone', 'dateFormat', 'timeFormat', 'currency', 'numberFormat'],
    display: ['dashboardLayout', 'sidebarCollapsed', 'compactMode', 'showTooltips', 'animationsEnabled', 'highContrast', 'fontSize'],
    notifications: ['emailNotifications', 'smsNotifications', 'pushNotifications', 'browserNotifications', 'soundEnabled', 'notificationSound'],
    attendance: ['attendanceReminders', 'reminderTime', 'autoBreakDeduction', 'breakDuration', 'overtimeNotifications', 'lateArrivalNotifications', 'earlyDepartureNotifications', 'weekendReminders', 'holidayReminders'],
    leave: ['leaveNotifications', 'leaveApprovalNotifications', 'leaveRejectionNotifications', 'leaveBalanceReminders', 'lowBalanceThreshold', 'autoSubmitLeaveRequests'],
    reports: ['weeklyReports', 'monthlyReports', 'reportFormat', 'reportDelivery', 'includeCharts', 'reportLanguage'],
    privacy: ['profileVisibility', 'shareAttendanceData', 'shareLeaveData', 'allowManagerAccess', 'twoFactorReminders'],
    advanced: ['enableBetaFeatures', 'enableDebugMode', 'dataRetentionPeriod', 'autoLogout', 'autoLogoutTime', 'sessionTimeout'],
    mobile: ['locationTracking', 'backgroundSync', 'offlineMode', 'biometricLogin', 'quickActions'],
    integrations: ['calendarSync', 'calendarProvider', 'slackIntegration', 'teamsIntegration', 'webhookUrl'],
    accessibility: ['screenReader', 'keyboardNavigation', 'reducedMotion', 'colorBlindMode', 'largeText']
  };

  let fields = [];
  categories.forEach(category => {
    if (categoryFieldMap[category]) {
      fields = fields.concat(categoryFieldMap[category]);
    }
  });

  return fields;
}

// Helper function to get preferences schema
function getPreferencesSchema() {
  return {
    categories: [
      { key: 'general', label: 'General', description: 'Basic system preferences and localization settings', icon: 'SettingsApplications' },
      { key: 'display', label: 'Display & Appearance', description: 'Customize the look and feel of your interface', icon: 'Palette' },
      { key: 'notifications', label: 'Notifications', description: 'Configure how and when you receive notifications', icon: 'Notifications' },
      { key: 'attendance', label: 'Attendance', description: 'Attendance tracking and reminder preferences', icon: 'Schedule' },
      { key: 'leave', label: 'Leave Management', description: 'Leave request and approval notification settings', icon: 'EventNote' },
      { key: 'reports', label: 'Reports & Analytics', description: 'Report generation and delivery preferences', icon: 'Analytics' },
      { key: 'privacy', label: 'Privacy & Security', description: 'Control your data sharing and privacy settings', icon: 'Shield' },
      { key: 'advanced', label: 'Advanced', description: 'Advanced system settings and beta features', icon: 'Security' },
      { key: 'mobile', label: 'Mobile', description: 'Mobile app specific preferences', icon: 'DeviceHub' },
      { key: 'integrations', label: 'Integrations', description: 'Third-party service integrations', icon: 'CloudSync' },
      { key: 'accessibility', label: 'Accessibility', description: 'Accessibility and usability options', icon: 'Accessibility' }
    ],
    fields: [] // Would include full field definitions in a real implementation
  };
}

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