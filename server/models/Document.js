const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'Aadhar Card',
      'PAN Card',
      'Passport',
      'Offer Letter',
      'Experience Letter',
      'Salary Slip',
      'Graduation Certificate',
      'Photos',
      'Other'
    ]
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  // GCS fields
  gcsFileName: {
    type: String,
    required: false
  },
  gcsPublicUrl: {
    type: String,
    required: false
  },
  fileSize: {
    type: Number,
    required: false
  },
  mimeType: {
    type: String,
    required: false
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

documentSchema.index({ employee: 1, type: 1 });

documentSchema.virtual('downloadUrl').get(function() {
  return `/uploads/documents/${this.filename}`;
});

module.exports = mongoose.model('Document', documentSchema); 