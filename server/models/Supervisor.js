const mongoose = require('mongoose');

const SupervisorSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    supervisorId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    assignedSites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site',
      },
    ],
    employmentStatus: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    alertPreferences: {
      sms: { type: Boolean, default: true },
      call: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

SupervisorSchema.index({ companyId: 1, supervisorId: 1 }, { unique: true });

module.exports = mongoose.model('Supervisor', SupervisorSchema);
