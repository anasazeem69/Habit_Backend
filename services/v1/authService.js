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
  if (!user) throw new Error('Email not registered. Please check your email or sign up for a new account.');

  // Check if account is locked due to too many failed attempts
  if (user.loginAttempts >= 5) {
    const timeSinceLastAttempt = Date.now() - user.lastLoginAttempt;
    if (timeSinceLastAttempt < 15 * 60 * 1000) { // 15 minutes lockout
      throw new Error('Account temporarily locked due to multiple failed login attempts. Try again in 15 minutes.');
    }
    // Reset attempts after lockout period
    user.loginAttempts = 0;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    user.loginAttempts += 1;
    user.lastLoginAttempt = new Date();
    await user.save();
    throw new Error('Incorrect password. Please try again.');
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
async function sendOTPEmail(email, otp, type = 'registration') {
  try {
    const transporter = createTransporter();

    let subject, title, message, action;

    switch (type) {
      case 'password reset':
        subject = 'Reset Your Password - Habit App';
        title = 'Reset Your Password';
        message = 'You requested a password reset. Your One-Time Password (OTP) is:';
        action = 'Enter this code in the app to reset your password.';
        break;
      case 'login':
        subject = 'Login Verification - Habit App';
        title = 'Verify Your Login';
        message = 'To complete your login, use this One-Time Password (OTP):';
        action = 'Enter this code in the app to complete your login.';
        break;
      default: // registration
        subject = 'Verify Your Email - Habit App Registration';
        title = 'Welcome to Habit App!';
        message = 'Thank you for registering. Your One-Time Password (OTP) for email verification is:';
        action = 'Enter this code in the app to complete your registration.';
    }

    const mailOptions = {
      from: config.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p>${message}</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p style="color: #666;">This OTP will expire in 10 minutes.</p>
          <p style="color: #666;">${action}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">This is an automated message from Habit App. Please do not reply.</p>
        </div>
      `
    };

    console.log(`📧 Sending ${type} OTP email to:`, email);
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ ${type} OTP email sent successfully to:`, email);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send ${type} OTP email:`, error.message);
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
  
  // If this is for password reset, don't auto-login
  if (user.resetInProgress) {
    user.isVerified = true; // Mark as verified for password reset
    await user.save();
    return { ...user.toObject(), isPasswordReset: true };
  }
  
  // For normal registration/login verification
  user.isVerified = true;
  user.loginAttempts = 0; // Reset on successful verification
  await user.save();

  return user;
}

// Forgot password - send OTP for password reset
async function forgotPassword(email) {
  const user = await User.findOne({ email });
  if (!user) {
    // Don't hide the fact that email doesn't exist - better UX
    throw new Error('Email not found. Please check your email address or sign up for a new account.');
  }

  // Check cooldown (same as requestOTP)
  if (user.otpCooldown && Date.now() - user.otpCooldown.getTime() < 60 * 1000) {
    const remainingTime = Math.ceil((60 * 1000 - (Date.now() - user.otpCooldown.getTime())) / 1000);
    throw new Error(`Please wait ${remainingTime} seconds before requesting another OTP.`);
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  user.otpCooldown = new Date();
  user.resetInProgress = true; // Mark password reset in progress

  await user.save();

  // Send OTP email asynchronously
  sendOTPEmail(email, otp, 'password reset').catch(err => {
    console.error('Failed to send password reset OTP email:', err);
  });

  return { message: 'Password reset code sent to your email. Please check your inbox.' };
}

// Reset password after OTP verification
async function resetPassword(email, newPassword) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.isVerified) {
    throw new Error('Please verify your email with OTP first');
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  user.otp = null; // Clear any remaining OTP
  user.otpExpiry = null;
  user.otpCooldown = null;
  user.resetInProgress = false; // Clear reset flag
  user.isVerified = true; // Keep verified status

  await user.save();

  return { message: 'Password reset successfully' };
}

module.exports = {
  registerUser,
  registerWithOTP,
  loginUser,
  requestOTP,
  verifyOTP,
  forgotPassword,
  resetPassword
};
