const { registerUser, registerWithOTP, loginUser, requestOTP, verifyOTP } = require('../../services/v1/authService');

exports.register = async (req, res) => {
  console.log('Register API hit', req.body);
  try {
    const { fullName, phone, email, password, professional } = req.body;
    const result = await registerWithOTP({ fullName, phone, email, password, professional });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.login = async (req, res) => {
  console.log('🔐 Login API hit with body:', { email: req.body.email, password: '***' });
  try {
    const { email, password } = req.body;
    const user = await loginUser({ email, password });
    console.log('✅ Login successful for user:', user.email);
    res.status(200).json({ message: 'Login successful', user: { id: user._id, fullName: user.fullName, phone: user.phone, email: user.email, professional: user.professional } });
  } catch (err) {
    console.error('❌ Login failed:', err.message);
    res.status(400).json({ error: err.message });
  }
};

exports.requestOTP = async (req, res) => {
  console.log('📧 Request OTP API hit for email:', req.body.email);
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const result = await requestOTP(email);
    console.log('✅ OTP sent successfully to:', email);
    res.status(200).json(result);
  } catch (err) {
    console.error('❌ Request OTP failed:', err.message);
    res.status(400).json({ error: err.message });
  }
};

exports.verifyOTP = async (req, res) => {
  console.log('🔍 Verify OTP API hit for email:', req.body.email);
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    const user = await verifyOTP(email, otp);
    console.log('✅ OTP verified successfully for user:', user.email);
    res.status(200).json({
      message: 'OTP verified successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        professional: user.professional,
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error('❌ Verify OTP failed:', err.message);
    res.status(400).json({ error: err.message });
  }
};
