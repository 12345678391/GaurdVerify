const mongoose = require('mongoose');

const GuardSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    guardId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // Personal Information
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    fatherName: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', ''],
      default: 'Male',
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    alternateMobileNumber: {
      type: String,
      trim: true,
    },
    emergencyContactNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    residentialAddress: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pinCode: {
      type: String,
      trim: true,
    },
    profilePhotoUrl: {
      type: String,
      default: '',
    },

    // Employment Information
    employeeId: {
      type: String,
      trim: true,
    },
    dateOfJoining: {
      type: Date,
      default: Date.now,
    },
    designation: {
      type: String,
      default: 'Security Guard',
    },
    assignedSite: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      index: true,
    },
    assignedSupervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supervisor',
      index: true,
    },
    assignedShift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      index: true,
    },
    employmentStatus: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended', 'On Leave', 'Archived'],
      default: 'Active',
      index: true,
    },

    // Real-Time Duty & Attendance State
    currentDutyStatus: {
      type: String,
      enum: ['On Duty', 'Off Duty', 'On Break'],
      default: 'Off Duty',
    },
    attendanceStatus: {
      type: String,
      enum: ['Confirmed', 'Missed', 'Pending', 'Assistance Requested', 'Not Started'],
      default: 'Not Started',
      index: true,
    },
    lastVerificationTime: {
      type: Date,
    },
    nextScheduledCall: {
      type: Date,
    },
    lastCallResponse: {
      type: String,
      default: 'None',
    },
    consecutiveMissedCalls: {
      type: Number,
      default: 0,
    },
    lastShiftDate: {
      type: String,
      default: null,
    },
    lastShiftCycle: {
      type: String,
      default: null,
      index: true,
    },

    // Compliance & Verification Documents
    policeVerificationStatus: {
      type: String,
      enum: ['Verified', 'Pending', 'Rejected', 'Exempted'],
      default: 'Pending',
    },
    trainingStatus: {
      type: String,
      enum: ['Completed', 'In Progress', 'Scheduled'],
      default: 'Completed',
    },
    identityDocType: {
      type: String,
      enum: ['Aadhaar Card', 'Voter ID', 'Driving License', 'Passport', 'Other'],
      default: 'Aadhaar Card',
    },
    identityDocNumber: {
      type: String,
      trim: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

GuardSchema.index({ companyId: 1, guardId: 1 }, { unique: true });
GuardSchema.index({ companyId: 1, mobileNumber: 1 });

module.exports = mongoose.model('Guard', GuardSchema);
