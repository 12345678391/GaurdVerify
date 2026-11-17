const mongoose = require('mongoose');

const GuardDocumentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    guardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guard',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: ['Police Verification', 'Training Certificate', 'Aadhaar / ID Card', 'Medical Fitness', 'Other'],
      default: 'Police Verification',
    },
    documentNumber: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String,
      default: '',
    },
    verificationStatus: {
      type: String,
      enum: ['Verified', 'Pending', 'Rejected'],
      default: 'Pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    expiryDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GuardDocument', GuardDocumentSchema);
