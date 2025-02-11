const User = require('./userModel');
const client = require('./config');
const jwt = require('jsonwebtoken');

exports.googleAuth = async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, email, name } = ticket.getPayload();
    let user = await User.findOne({ googleId: sub });

    if (!user) {
      user = await User.create({ googleId: sub, email, name });
    }

    const jwtToken = jwt.sign({ id: user._id, email }, process.env.JWT_SECRET, {
      expiresIn: '2h',
    });

    res.status(200).json({ token: jwtToken, user });
  } catch (error) {
    res.status(400).json({ error: 'Google authentication failed' });
  }
};
