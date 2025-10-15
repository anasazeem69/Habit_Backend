const { registerUser, loginUser } = require('../../services/v1/authService');

exports.register = async (req, res) => {
  console.log('Register API hit', req.body);
  try {
    const { fullName, phone, email, password, professional } = req.body;
    const user = await registerUser({ fullName, phone, email, password, professional });
    res.status(201).json({ message: 'User registered', user: { id: user._id, fullName: user.fullName, phone: user.phone, email: user.email, professional: user.professional } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await loginUser({ email, password });
    res.status(200).json({ message: 'Login successful', user: { id: user._id, fullName: user.fullName, phone: user.phone, email: user.email, professional: user.professional } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
