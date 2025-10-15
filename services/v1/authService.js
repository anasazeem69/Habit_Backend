const User = require('../../models/v1/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('../../config');

async function registerUser({ fullName, phone, email, password, professional }) {
  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) throw new Error('User already exists with this email or phone');
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ fullName, phone, email, password: hashed, professional });
  await user.save();
  return user;
}

// Register with OTP verification
async function registerWithOTP({ fullName, phone, email, password, professional }) {
  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) throw new Error('User already exists with this email or phone');

  const hashed = await bcrypt.hash(password, 10);
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const user = new User({
    fullName,
    phone,
    email,
    password: hashed,
    professional,
    otp,
    otpExpiry,
    otpCooldown: new Date(),
    isVerified: false
  });

  await user.save();

  // Send OTP email asynchronously
  sendOTPEmail(email, otp).catch(err => {
    console.error('Failed to send OTP email:', err);
  });

  return { message: 'Registration initiated. Please verify your email with OTP.' };
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid credentials');

  // Check if account is locked due to too many failed attempts
  if (user.loginAttempts >= 5) {
    const timeSinceLastAttempt = Date.now() - user.lastLoginAttempt;
    if (timeSinceLastAttempt < 15 * 60 * 1000) { // 15 minutes lockout
      throw new Error('Account temporarily locked due to multiple failed login attempts');
    }
    // Reset attempts after lockout period
    user.loginAttempts = 0;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    user.loginAttempts += 1;
    user.lastLoginAttempt = new Date();
    await user.save();
    throw new Error('Invalid credentials');
  }

  // Check if user is verified
  if (!user.isVerified) {
    throw new Error('Please verify your email first. Check your email for OTP verification.');
  }

  // Reset login attempts on successful login
  user.loginAttempts = 0;
  user.lastLoginAttempt = null;
  await user.save();

  return user;
}

// Generate 6-digit OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Create email transporter
function createTransporter() {
  console.log('📧 Creating email transporter with user:', config.EMAIL_USER ? '***@gmail.com' : 'NOT SET');
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS
    },
    // Additional Gmail-specific settings
    secure: true,
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Send OTP email
async function sendOTPEmail(email, otp) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: config.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - Habit App Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Habit App!</h2>
          <p>Thank you for registering. Your One-Time Password (OTP) for email verification is:</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p style="color: #666;">This OTP will expire in 10 minutes.</p>
          <p style="color: #666;">Enter this code in the app to complete your registration.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">This is an automated message from Habit App. Please do not reply.</p>
        </div>
      `
    };

    console.log('📧 Sending OTP email to:', email);
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully to:', email);
    return result;
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    throw new Error(`Email service error: ${error.message}`);
  }
}

// Request OTP for login
async function requestOTP(email) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('User not found');

  // Check cooldown (1 minute between requests)
  if (user.otpCooldown && Date.now() - user.otpCooldown < 60 * 1000) {
    const remainingTime = Math.ceil((60 * 1000 - (Date.now() - user.otpCooldown)) / 1000);
    throw new Error(`Please wait ${remainingTime} seconds before requesting another OTP`);
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  user.otpCooldown = new Date();
  await user.save();

  // Send OTP email asynchronously (don't wait for it to complete)
  sendOTPEmail(email, otp).catch(err => {
    console.error('Failed to send OTP email:', err);
    // Don't throw error here as it might be a temporary email service issue
  });

  return { message: 'OTP sent successfully' };
}

// Verify OTP and complete registration/login
async function verifyOTP(email, otp) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('User not found');

  if (!user.otp || !user.otpExpiry) {
    throw new Error('No OTP found. Please request a new OTP');
  }

  if (Date.now() > user.otpExpiry) {
    // Clear expired OTP
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    throw new Error('OTP has expired. Please request a new OTP');
  }

  if (user.otp !== otp) {
    throw new Error('Invalid OTP');
  }

  // Clear OTP and mark as verified
  user.otp = null;
  user.otpExpiry = null;
  user.otpCooldown = null;
  user.isVerified = true;
  user.loginAttempts = 0; // Reset on successful verification
  await user.save();

  return user;
}

module.exports = {
  registerUser,
  registerWithOTP,
  loginUser,
  requestOTP,
  verifyOTP
};
