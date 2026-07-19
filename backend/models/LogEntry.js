const mongoose = require('mongoose');

const logEntrySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    category: {
      type: String,
      enum: ['Daily Log', 'Inquiry & Proposals', 'Win-Loss Register', 'Pending Follow-ups', 'Daily Summary'],
      required: true,
      default: 'Daily Log',
    },
    date: {
      type: String, // Stored as YYYY-MM-DD for consistency with sheets
      required: true,
    },
    company: {
      type: String,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
    },
    activityType: {
      type: String,
    },
    purpose: {
      type: String,
    },
    projectStage: {
      type: String,
    },
    estValueAED: {
      type: Number,
      default: 0,
    },
    keyOutcome: {
      type: String,
    },
    inquiryRaised: {
      type: String,
      enum: ['Y', 'N'],
      default: 'N',
    },
    inquiryId: {
      type: String,
    },
    nextAction: {
      type: String,
    },
    followUpDate: {
      type: String,
    },
    productive: {
      type: String,
    },
    // Inquiry Specific
    proposalTrack: {
      type: String,
    },
    proposalValueAED: {
      type: Number,
    },
    submissionDate: {
      type: String,
    },
    proposalStatus: {
      type: String,
    },
    // Win-Loss Specific
    outcome: {
      type: String,
    },
    wonValue: {
      type: Number,
    },
    lossReason: {
      type: String,
    },
    winReason: {
      type: String,
    },
    competitor: {
      type: String,
    },
    // Summary Specific
    summaryText: {
      type: String,
    },
    rawText: {
      type: String, // Original text from user
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // For any extra AI fields
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for faster searching
logEntrySchema.index({ employee: 1, date: -1 });
logEntrySchema.index({ category: 1 });
logEntrySchema.index({ company: 'text' });

module.exports = mongoose.model('LogEntry', logEntrySchema);
