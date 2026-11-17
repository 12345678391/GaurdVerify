const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    shiftId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    shiftName: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true, // "06:00"
    },
    endTime: {
      type: String,
      required: true, // "14:00"
    },
    isOvernight: {
      type: Boolean,
      default: false,
    },
    verificationIntervalMinutes: {
      type: Number,
      default: 30,
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

ShiftSchema.index({ companyId: 1, shiftId: 1 }, { unique: true });

module.exports = mongoose.model('Shift', ShiftSchema);
