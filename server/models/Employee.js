const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  // 2FA fields
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorTempSecret: {
    type: String,
    default: null
  },
  backupCodes: [{
    type: String
  }],
  phone: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    required: true,
    enum: ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Management']
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['employee', 'manager', 'admin'],
    default: 'employee'
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  hireDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  leaveBalance: {
    annual: { type: Number, default: 20 },
    sick: { type: Number, default: 10 },
    personal: { type: Number, default: 5 },
    maternity: { type: Number, default: 90 },
    paternity: { type: Number, default: 14 }
  },
  workSchedule: {
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '17:00' },
    timezone: { type: String, default: 'UTC' }
  },
  lastLogin: {
    type: Date,
    default: null
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerified: {
    type: Boolean,
    default: false
  },
  invitationToken: String,
  invitationExpires: Date,
  invitationAccepted: {
    type: Boolean,
    default: false
  },
  preferences: {
    // General Settings
    language: { type: String, default: 'en' },
    theme: { type: String, default: 'light' },
    timezone: { type: String, default: 'UTC' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    timeFormat: { type: String, default: '12' },
    currency: { type: String, default: 'USD' },
    numberFormat: { type: String, default: 'US' },
    
    // Display Settings
    dashboardLayout: { type: String, default: 'grid' },
    sidebarCollapsed: { type: Boolean, default: false },
    compactMode: { type: Boolean, default: false },
    showTooltips: { type: Boolean, default: true },
    animationsEnabled: { type: Boolean, default: true },
    highContrast: { type: Boolean, default: false },
    fontSize: { type: Number, default: 14, min: 12, max: 20 },
    
    // Notification Settings
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true },
    browserNotifications: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    notificationSound: { type: String, default: 'default' },
    
    // Attendance Settings
    attendanceReminders: { type: Boolean, default: true },
    reminderTime: { type: String, default: '08:45' },
    autoBreakDeduction: { type: Boolean, default: true },
    breakDuration: { type: Number, default: 60, min: 15, max: 120 },
    overtimeNotifications: { type: Boolean, default: true },
    lateArrivalNotifications: { type: Boolean, default: true },
    earlyDepartureNotifications: { type: Boolean, default: true },
    weekendReminders: { type: Boolean, default: false },
    holidayReminders: { type: Boolean, default: false },
    
    // Leave Settings
    leaveNotifications: { type: Boolean, default: true },
    leaveApprovalNotifications: { type: Boolean, default: true },
    leaveRejectionNotifications: { type: Boolean, default: true },
    leaveBalanceReminders: { type: Boolean, default: true },
    lowBalanceThreshold: { type: Number, default: 5, min: 1, max: 30 },
    autoSubmitLeaveRequests: { type: Boolean, default: false },
    
    // Report Settings
    weeklyReports: { type: Boolean, default: false },
    monthlyReports: { type: Boolean, default: true },
    reportFormat: { type: String, default: 'pdf' },
    reportDelivery: { type: String, default: 'email' },
    includeCharts: { type: Boolean, default: true },
    reportLanguage: { type: String, default: 'en' },
    
    // Privacy Settings
    profileVisibility: { type: String, default: 'team' },
    shareAttendanceData: { type: Boolean, default: true },
    shareLeaveData: { type: Boolean, default: true },
    allowManagerAccess: { type: Boolean, default: true },
    twoFactorReminders: { type: Boolean, default: true },
    
    // Advanced Settings
    enableBetaFeatures: { type: Boolean, default: false },
    enableDebugMode: { type: Boolean, default: false },
    dataRetentionPeriod: { type: Number, default: 24, min: 12, max: 84 },
    autoLogout: { type: Boolean, default: true },
    autoLogoutTime: { type: Number, default: 30, min: 5, max: 480 },
    sessionTimeout: { type: Number, default: 24, min: 1, max: 168 },
    
    // Mobile Settings
    locationTracking: { type: Boolean, default: true },
    backgroundSync: { type: Boolean, default: true },
    offlineMode: { type: Boolean, default: true },
    biometricLogin: { type: Boolean, default: false },
    quickActions: [{ type: String }],
    
    // Integration Settings
    calendarSync: { type: Boolean, default: false },
    calendarProvider: { type: String, default: 'google' },
    slackIntegration: { type: Boolean, default: false },
    teamsIntegration: { type: Boolean, default: false },
    webhookUrl: { type: String, default: '' },
    
    // Accessibility Settings
    screenReader: { type: Boolean, default: false },
    keyboardNavigation: { type: Boolean, default: false },
    reducedMotion: { type: Boolean, default: false },
    colorBlindMode: { type: String, default: 'none' },
    largeText: { type: Boolean, default: false },
    
    // Custom Settings (extensible)
    customSettings: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
employeeSchema.index({ department: 1 });
employeeSchema.index({ role: 1 });
employeeSchema.index({ isActive: 1 });

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for total leave balance
employeeSchema.virtual('totalLeaveBalance').get(function() {
  return Object.values(this.leaveBalance).reduce((sum, balance) => sum + balance, 0);
});

// Pre-save middleware to hash password
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  // Add validation to prevent undefined arguments
  if (!candidatePassword || !this.password) {
    return false;
  }
  
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('bcrypt.compare error:', error);
    return false;
  }
};

// Method to get public profile (without sensitive data)
employeeSchema.methods.getPublicProfile = function() {
  const employeeObject = this.toObject();
  delete employeeObject.password;
  delete employeeObject.passwordResetToken;
  delete employeeObject.passwordResetExpires;
  delete employeeObject.emailVerificationToken;
  return employeeObject;
};

// Static method to find by email
employeeSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active employees
employeeSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

module.exports = mongoose.model('Employee', employeeSchema); 