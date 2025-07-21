const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  punchIn: {
    time: {
      type: Date,
      required: true
    },
    location: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      },
      address: String,
      accuracy: Number
    },
    device: {
      type: String,
      enum: ['web', 'mobile', 'tablet'],
      default: 'web'
    },
    ipAddress: String,
    userAgent: String
  },
  punchOut: {
    time: {
      type: Date,
      default: null
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      accuracy: Number
    },
    device: {
      type: String,
      enum: ['web', 'mobile', 'tablet'],
      default: 'web'
    },
    ipAddress: String,
    userAgent: String
  },
  totalHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'leave'],
    default: 'present'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isRemote: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  approvedAt: Date,
  isApproved: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
attendanceSchema.index({ employee: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ 'punchIn.time': 1 });
attendanceSchema.index({ 'punchOut.time': 1 });

// Virtual for formatted date
attendanceSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Virtual for punch in time
attendanceSchema.virtual('punchInTime').get(function() {
  return this.punchIn?.time ? this.punchIn.time.toLocaleTimeString() : null;
});

// Virtual for punch out time
attendanceSchema.virtual('punchOutTime').get(function() {
  return this.punchOut?.time ? this.punchOut.time.toLocaleTimeString() : null;
});

// Virtual for total hours worked
attendanceSchema.virtual('hoursWorked').get(function() {
  if (!this.punchIn?.time || !this.punchOut?.time) return 0;
  const diffMs = this.punchOut.time - this.punchIn.time;
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
});

// Pre-save middleware to calculate total hours
attendanceSchema.pre('save', function(next) {
  if (this.punchIn?.time && this.punchOut?.time) {
    const diffMs = this.punchOut.time - this.punchIn.time;
    this.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }
  next();
});

// Static method to find attendance by date range
attendanceSchema.statics.findByDateRange = function(employeeId, startDate, endDate) {
  return this.find({
    employee: employeeId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('employee', 'firstName lastName employeeId department');
};

// Static method to find today's attendance
attendanceSchema.statics.findTodayAttendance = function(employeeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.findOne({
    employee: employeeId,
    date: {
      $gte: today,
      $lt: tomorrow
    }
  });
};

// Static method to get attendance summary
attendanceSchema.statics.getAttendanceSummary = function(employeeId, startDate, endDate) {
  // Convert employeeId to ObjectId if it's a string
  const employeeObjectId = typeof employeeId === 'string' ? mongoose.Types.ObjectId(employeeId) : employeeId;
  
  return this.aggregate([
    {
      $match: {
        employee: employeeObjectId,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        totalHours: { $sum: '$totalHours' },
        presentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absentDays: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        lateDays: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Method to check if employee can punch in
attendanceSchema.methods.canPunchIn = function() {
  return !this.punchIn?.time;
};

// Method to check if employee can punch out
attendanceSchema.methods.canPunchOut = function() {
  return this.punchIn?.time && !this.punchOut?.time;
};

// Method to punch in
attendanceSchema.methods.performPunchIn = function(location, device, ipAddress, userAgent) {
  this.punchIn = {
    time: new Date(),
    location,
    device,
    ipAddress,
    userAgent
  };
  return this.save();
};

// Method to punch out
attendanceSchema.methods.performPunchOut = function(location, device, ipAddress, userAgent) {
  this.punchOut = {
    time: new Date(),
    location,
    device,
    ipAddress,
    userAgent
  };
  return this.save();
};

module.exports = mongoose.model('Attendance', attendanceSchema); 