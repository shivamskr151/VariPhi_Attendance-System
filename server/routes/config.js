const express = require('express');
const { body, validationResult } = require('express-validator');
const SystemConfig = require('../models/SystemConfig');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, ValidationError } = require('../middleware/errorHandler');

const router = express.Router();

// Validation rules
const updateConfigValidation = [
  body('officeLocation.latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('officeLocation.longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('officeLocation.address').optional().isString().trim().isLength({ min: 1, max: 500 }),
  body('officeLocation.city').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('officeLocation.state').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('officeLocation.country').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('locationValidation.enabled').optional().isBoolean(),
  body('locationValidation.maxDistanceKm').optional().isFloat({ min: 0, max: 10000 }).withMessage('Max distance must be between 0 and 10000 km'),
  body('locationValidation.allowRemoteWork').optional().isBoolean(),
  body('workingHours.startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('workingHours.endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('workingHours.timezone').optional().isString().trim(),
  body('systemName').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('systemVersion').optional().isString().trim().isLength({ min: 1, max: 20 })
];

// @route   GET /api/config
// @desc    Get system configuration
// @access  Private
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const config = await SystemConfig.getConfig();
  
  res.json({
    success: true,
    data: config
  });
}));

// @route   GET /api/config/public
// @desc    Get public system configuration (admin contact, registration flag)
// @access  Public
router.get('/public', asyncHandler(async (req, res) => {
  const config = await SystemConfig.getConfig();
  res.json({
    success: true,
    data: {
      adminContact: config.adminContact,
      selfRegistrationEnabled: config.selfRegistrationEnabled
    }
  });
}));

// @route   PUT /api/config
// @desc    Update system configuration (Admin only)
// @access  Private (Admin)
router.put('/', updateConfigValidation, authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const config = await SystemConfig.getConfig();
  
  // Update only the fields that are provided
  const updateData = req.body;
  
  if (updateData.officeLocation) {
    config.officeLocation = { ...config.officeLocation, ...updateData.officeLocation };
  }
  
  if (updateData.locationValidation) {
    config.locationValidation = { ...config.locationValidation, ...updateData.locationValidation };
  }
  
  if (updateData.workingHours) {
    config.workingHours = { ...config.workingHours, ...updateData.workingHours };
  }
  
  if (updateData.systemName) {
    config.systemName = updateData.systemName;
  }
  
  if (updateData.systemVersion) {
    config.systemVersion = updateData.systemVersion;
  }
  
  await config.save();
  
  res.json({
    success: true,
    message: 'System configuration updated successfully',
    data: config
  });
}));

// @route   POST /api/config/reset
// @desc    Reset system configuration to defaults (Admin only)
// @access  Private (Admin)
router.post('/reset', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const config = await SystemConfig.getConfig();
  
  // Reset to defaults
  config.officeLocation = {
    latitude: 0,
    longitude: 0,
    address: 'Office Address',
    city: 'City',
    state: 'State',
    country: 'Country'
  };
  
  config.locationValidation = {
    enabled: false,
    maxDistanceKm: 100,
    allowRemoteWork: true
  };
  
  config.workingHours = {
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'UTC'
  };
  
  config.systemName = 'Attendance System';
  config.systemVersion = '1.0.0';
  
  await config.save();
  
  res.json({
    success: true,
    message: 'System configuration reset to defaults',
    data: config
  });
}));

// @route   GET /api/config/location-test
// @desc    Test location validation with current settings
// @access  Private (Admin)
router.get('/location-test', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.query;
  
  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude are required'
    });
  }
  
  const config = await SystemConfig.getConfig();
  const { calculateDistance } = require('../utils/geolocation');
  
  const distance = calculateDistance(
    parseFloat(latitude),
    parseFloat(longitude),
    config.officeLocation.latitude,
    config.officeLocation.longitude
  );
  
  const isValid = distance <= config.locationValidation.maxDistanceKm;
  
  res.json({
    success: true,
    data: {
      testLocation: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      officeLocation: config.officeLocation,
      calculatedDistance: distance.toFixed(2),
      maxAllowedDistance: config.locationValidation.maxDistanceKm,
      isValid,
      locationValidationEnabled: config.locationValidation.enabled
    }
  });
}));

module.exports = router; 