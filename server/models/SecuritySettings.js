const mongoose = require('mongoose');

const securitySettingsSchema = new mongoose.Schema({
  // Authentication settings
  twoFactorAuth: {
    type: Boolean,
    default: false
  },
  passwordPolicy: {
    type: Boolean,
    default: true
  },
  requireStrongPasswords: {
    type: Boolean,
    default: true
  },
  sessionTimeout: {
    type: Number,
    default: 30, // minutes
    min: 1,
    max: 1440
  },
  maxLoginAttempts: {
    type: Number,
    default: 5,
    min: 1,
    max: 20
  },
  passwordExpiry: {
    type: Number,
    default: 90, // days
    min: 0,
    max: 365
  },
  lockoutDuration: {
    type: Number,
    default: 15, // minutes
    min: 1,
    max: 1440
  },
  
  // Audit and logging
  enableAuditLog: {
    type: Boolean,
    default: true
  },
  securityAlerts: {
    type: Boolean,
    default: true
  },
  failedLoginAlerts: {
    type: Boolean,
    default: true
  },
  accountLockoutAlerts: {
    type: Boolean,
    default: true
  },
  
  // IP restrictions
  allowedIPs: [{
    type: String
  }],
  blockSuspiciousIPs: {
    type: Boolean,
    default: false
  },
  
  // Session management
  concurrentSessions: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  forceLogoutOnPasswordChange: {
    type: Boolean,
    default: true
  },
  
  // Password complexity requirements
  minPasswordLength: {
    type: Number,
    default: 8,
    min: 6,
    max: 50
  },
  requireUppercase: {
    type: Boolean,
    default: true
  },
  requireLowercase: {
    type: Boolean,
    default: true
  },
  requireNumbers: {
    type: Boolean,
    default: true
  },
  requireSpecialChars: {
    type: Boolean,
    default: true
  },
  
  // Account security
  accountLockoutThreshold: {
    type: Number,
    default: 5,
    min: 1,
    max: 20
  },
  accountLockoutDuration: {
    type: Number,
    default: 15,
    min: 1,
    max: 1440
  },
  
  // Created and updated timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
securitySettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SecuritySettings', securitySettingsSchema); 