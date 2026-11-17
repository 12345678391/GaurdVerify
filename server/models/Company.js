const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: '',
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '+91 98765 43210',
    },
    address: {
      type: String,
      default: 'Tower 4, Cyber City Phase 2',
    },
    city: {
      type: String,
      default: 'Gurugram',
    },
    state: {
      type: String,
      default: 'Haryana',
    },
    pincode: {
      type: String,
      default: '122002',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    settings: {
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
      dateFormat: {
        type: String,
        default: 'DD/MM/YYYY',
      },
      verificationIntervalMinutes: {
        type: Number,
        default: 30,
        min: 5,
        max: 180,
      },
      retryIntervalMinutes: {
        type: Number,
        default: 5,
        min: 1,
        max: 30,
      },
      maxRetryAttempts: {
        type: Number,
        default: 2,
        min: 1,
        max: 5,
      },
      automatedVoiceMessage: {
        type: String,
        default:
          'Hello. This is GuardConnect Security Monitoring System. Your duty attendance verification is in progress. Press 1 to confirm that you are currently on duty. Press 2 if you need assistance.',
      },
      supervisorAlerts: {
        type: Boolean,
        default: true,
      },
      missedCallAlerts: {
        type: Boolean,
        default: true,
      },
      assistanceAlerts: {
        type: Boolean,
        default: true,
      },
      workingDays: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      },
      plivoCallerId: {
        type: String,
        default: '+919876543210',
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

CompanySchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.isActive = this.status === 'active';
  } else if (this.isModified('isActive')) {
    this.status = this.isActive ? 'active' : 'suspended';
  }
  next();
});

module.exports = mongoose.model('Company', CompanySchema);
