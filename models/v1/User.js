const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  professional: { type: String, required: true },
  // OTP related fields
  otp: { type: String },
  otpExpiry: { type: Date },
  otpCooldown: { type: Date }, // Prevents spam requests
  isVerified: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lastLoginAttempt: { type: Date },
}, { timestamps: true });

// Index for OTP expiry cleanup
userSchema.index({ otpExpiry: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('UserV1', userSchema);
