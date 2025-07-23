const mongoose = require('mongoose');

const securityAuditLogSchema = new mongoose.Schema({
  // Event details
  eventType: {
    type: String,
    required: true,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'PASSWORD_CHANGED',
      'PASSWORD_RESET',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'TWO_FACTOR_ENABLED',
      'TWO_FACTOR_DISABLED',
      'SECURITY_SETTINGS_CHANGED',
      'ADMIN_ACTION',
      'SUSPICIOUS_ACTIVITY',
      'IP_BLOCKED',
      'SESSION_EXPIRED',
      'FORCE_LOGOUT'
    ]
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: false // Some events might not be tied to a specific user
  },
  userEmail: {
    type: String,
    required: false
  },
  
  // Request details
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: false
  },
  requestMethod: {
    type: String,
    required: false
  },
  requestUrl: {
    type: String,
    required: false
  },
  
  // Event specific data
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Security context
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  
  // Location data (if available)
  location: {
    country: String,
    city: String,
    region: String
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Index for efficient querying
securityAuditLogSchema.index({ eventType: 1, timestamp: -1 });
securityAuditLogSchema.index({ userId: 1, timestamp: -1 });
securityAuditLogSchema.index({ ipAddress: 1, timestamp: -1 });
securityAuditLogSchema.index({ severity: 1, timestamp: -1 });

// Static method to log security events
securityAuditLogSchema.statics.logEvent = function(eventData) {
  const logEntry = new this(eventData);
  return logEntry.save();
};

// Static method to get recent security events
securityAuditLogSchema.statics.getRecentEvents = function(limit = 50, filters = {}) {
  return this.find(filters)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email');
};

// Static method to get events by user
securityAuditLogSchema.statics.getUserEvents = function(userId, limit = 100) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get failed login attempts
securityAuditLogSchema.statics.getFailedLogins = function(timeWindow = 24 * 60 * 60 * 1000) { // 24 hours in ms
  const cutoffTime = new Date(Date.now() - timeWindow);
  return this.find({
    eventType: 'LOGIN_FAILED',
    timestamp: { $gte: cutoffTime }
  }).sort({ timestamp: -1 });
};

// Static method to get suspicious activities
securityAuditLogSchema.statics.getSuspiciousActivities = function(timeWindow = 24 * 60 * 60 * 1000) {
  const cutoffTime = new Date(Date.now() - timeWindow);
  return this.find({
    severity: { $in: ['HIGH', 'CRITICAL'] },
    timestamp: { $gte: cutoffTime }
  }).sort({ timestamp: -1 });
};

module.exports = mongoose.model('SecurityAuditLog', securityAuditLogSchema); 