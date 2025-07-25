const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  // Office location settings
  officeLocation: {
    latitude: {
      type: Number,
      default: 0,
      required: true
    },
    longitude: {
      type: Number,
      default: 0,
      required: true
    },
    address: {
      type: String,
      default: 'Office Address'
    },
    city: {
      type: String,
      default: 'City'
    },
    state: {
      type: String,
      default: 'State'
    },
    country: {
      type: String,
      default: 'Country'
    }
  },
  
  // Location validation settings
  locationValidation: {
    enabled: {
      type: Boolean,
      default: false
    },
    maxDistanceKm: {
      type: Number,
      default: 100,
      min: 0,
      max: 10000
    },
    allowRemoteWork: {
      type: Boolean,
      default: true
    }
  },
  
  // Working hours settings
  workingHours: {
    startTime: {
      type: String,
      default: '09:00'
    },
    endTime: {
      type: String,
      default: '17:00'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  
  // System settings
  systemName: {
    type: String,
    default: 'Attendance System'
  },
  systemVersion: {
    type: String,
    default: '1.0.0'
  },
  adminContact: {
    type: String,
    default: 'information@variphi.com'
  },
  selfRegistrationEnabled: {
    type: Boolean,
    default: false
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
systemConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get or create default config
systemConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = new this();
    await config.save();
  }
  return config;
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema); 