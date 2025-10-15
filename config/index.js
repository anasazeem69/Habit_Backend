const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://fake:fake@localhost:27017/habitapp',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_here',
  EMAIL_USER: process.env.APP_EMAIL,
  EMAIL_PASS: process.env.APP_PASS,
  // etc.
};

// Debug logging for email config
console.log('📧 Email config loaded - User:', module.exports.EMAIL_USER ? 'SET' : 'NOT SET');
console.log('📧 Email config loaded - Pass:', module.exports.EMAIL_PASS ? 'SET' : 'NOT SET');