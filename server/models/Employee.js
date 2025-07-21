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
  phone: {
    type: String,
    required: true,
    trim: true
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
  preferences: {
    language: { type: String, default: 'en' },
    theme: { type: String, default: 'light' },
    timezone: { type: String, default: 'UTC' },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true },
    attendanceReminders: { type: Boolean, default: true },
    leaveNotifications: { type: Boolean, default: true },
    weeklyReports: { type: Boolean, default: false },
    monthlyReports: { type: Boolean, default: true }
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
  return bcrypt.compare(candidatePassword, this.password);
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