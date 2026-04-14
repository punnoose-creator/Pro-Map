const mongoose = require('mongoose');

const locationPingSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracy: { type: Number },
    altitude: { type: Number },
    altitudeAccuracy: { type: Number },
    heading: { type: Number },
    speed: { type: Number },
    clientRecordedAt: { type: Date },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  { timestamps: true }
);

locationPingSchema.index({ employee: 1, createdAt: -1 });
locationPingSchema.index({ location: '2dsphere' });

locationPingSchema.pre('validate', function setGeo(next) {
  if (this.latitude != null && this.longitude != null) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude],
    };
  }
  next();
});

module.exports = mongoose.model('LocationPing', locationPingSchema);
