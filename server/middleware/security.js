const SecurityAuditLog = require('../models/SecurityAuditLog');
const SecuritySettings = require('../models/SecuritySettings');
const Employee = require('../models/Employee');

// Rate limiting for login attempts
const loginAttempts = new Map();

// IP blocking
const blockedIPs = new Set();

// Get client IP address
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip;
};

// Log security event
const logSecurityEvent = async (eventData) => {
  try {
    await SecurityAuditLog.logEvent({
      ...eventData,
      ipAddress: getClientIP(eventData.req),
      userAgent: eventData.req?.headers['user-agent'],
      requestMethod: eventData.req?.method,
      requestUrl: eventData.req?.url,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Check if IP is blocked
const isIPBlocked = (ip) => {
  return blockedIPs.has(ip);
};

// Block IP address
const blockIP = (ip, duration = 15 * 60 * 1000) => { // 15 minutes default
  blockedIPs.add(ip);
  setTimeout(() => {
    blockedIPs.delete(ip);
  }, duration);
};

// Rate limiting middleware
const rateLimit = (req, res, next) => {
  const ip = getClientIP(req);
  
  if (isIPBlocked(ip)) {
    logSecurityEvent({
      eventType: 'IP_BLOCKED',
      severity: 'HIGH',
      req,
      details: { reason: 'Rate limit exceeded' }
    });
    
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }
  
  next();
};

// Login attempt tracking
const trackLoginAttempt = async (email, success, req) => {
  const ip = getClientIP(req);
  const key = `${email}:${ip}`;
  
  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, { count: 0, firstAttempt: Date.now() });
  }
  
  const attempt = loginAttempts.get(key);
  
  if (success) {
    // Reset on successful login
    loginAttempts.delete(key);
    
    await logSecurityEvent({
      eventType: 'LOGIN_SUCCESS',
      severity: 'LOW',
      req,
      userEmail: email,
      details: { ip }
    });
  } else {
    // Increment failed attempts
    attempt.count++;
    
    await logSecurityEvent({
      eventType: 'LOGIN_FAILED',
      severity: attempt.count >= 5 ? 'HIGH' : 'MEDIUM',
      req,
      userEmail: email,
      details: { 
        ip,
        attemptCount: attempt.count,
        timeSinceFirstAttempt: Date.now() - attempt.firstAttempt
      }
    });
    
    // Check if we should block the IP
    if (attempt.count >= 5) {
      blockIP(ip);
      
      // Lock the account if it exists
      try {
        const user = await Employee.findOne({ email });
        if (user) {
          user.isLocked = true;
          user.lockedAt = new Date();
          await user.save();
          
          await logSecurityEvent({
            eventType: 'ACCOUNT_LOCKED',
            severity: 'HIGH',
            req,
            userId: user._id,
            userEmail: email,
            details: { reason: 'Too many failed login attempts' }
          });
        }
      } catch (error) {
        console.error('Failed to lock account:', error);
      }
    }
  }
};

// Session security middleware
const sessionSecurity = async (req, res, next) => {
  try {
    // Get security settings
    const securitySettings = await SecuritySettings.findOne() || new SecuritySettings();
    
    // Check session timeout
    if (req.employee && req.employee.lastActivity) {
      const sessionTimeoutMs = securitySettings.sessionTimeout * 60 * 1000; // Convert to milliseconds
      const timeSinceLastActivity = Date.now() - req.employee.lastActivity.getTime();
      
      if (timeSinceLastActivity > sessionTimeoutMs) {
        await logSecurityEvent({
          eventType: 'SESSION_EXPIRED',
          severity: 'MEDIUM',
          req,
          userId: req.employee._id,
          userEmail: req.employee.email,
          details: { sessionTimeout: securitySettings.sessionTimeout }
        });
        
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.'
        });
      }
    }
    
    // Update last activity
    if (req.employee) {
      req.employee.lastActivity = new Date();
      await req.employee.save();
    }
    
    next();
  } catch (error) {
    console.error('Session security error:', error);
    next();
  }
};

// Password policy validation
const validatePasswordPolicy = (password, securitySettings) => {
  const errors = [];
  
  if (securitySettings.requireStrongPasswords) {
    if (password.length < securitySettings.minPasswordLength) {
      errors.push(`Password must be at least ${securitySettings.minPasswordLength} characters long`);
    }
    
    if (securitySettings.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (securitySettings.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (securitySettings.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (securitySettings.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }
  
  return errors;
};

// Admin action logging
const logAdminAction = async (req, action, details = {}) => {
  if (req.employee && req.employee.role === 'admin') {
    await logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'MEDIUM',
      req,
      userId: req.employee._id,
      userEmail: req.employee.email,
      details: { action, ...details }
    });
  }
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (for HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content security policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  
  next();
};

module.exports = {
  rateLimit,
  trackLoginAttempt,
  sessionSecurity,
  validatePasswordPolicy,
  logAdminAction,
  securityHeaders,
  logSecurityEvent,
  isIPBlocked,
  blockIP,
  getClientIP
}; 