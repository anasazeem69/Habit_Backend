const User = require('../../models/v1/User');
const bcrypt = require('bcryptjs');

async function registerUser({ fullName, phone, email, password, professional }) {
  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) throw new Error('User already exists with this email or phone');
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ fullName, phone, email, password: hashed, professional });
  await user.save();
  return user;
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid credentials');
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Invalid credentials');
  return user;
}

module.exports = { registerUser, loginUser };
