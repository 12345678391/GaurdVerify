const mongoose = require('mongoose');

const SiteSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    siteId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    siteName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    assignedSupervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supervisor',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    guardCapacity: {
      type: Number,
      default: 5,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

SiteSchema.index({ companyId: 1, siteId: 1 }, { unique: true });

module.exports = mongoose.model('Site', SiteSchema);
