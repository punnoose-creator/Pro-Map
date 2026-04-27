const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups
shiftSchema.index({ employee: 1, date: -1 });

module.exports = mongoose.model('Shift', shiftSchema);
