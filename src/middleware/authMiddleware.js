// const jwt = require('jsonwebtoken');

// const authenticateToken = (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ error: 'Authorization token missing' });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;  // Attach user data to the request object
//     next();  // Proceed to the next middleware or route handler
//   } catch (err) {
//     return res.status(403).json({ error: 'Invalid or expired token' });
//   }
// };

// module.exports = authenticateToken;


const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Convert `googleId` to a string and attach it as userId to the request
    req.user = { id: String(decoded.googleId) };

    console.log('Decoded Token:', decoded);
    console.log('User ID attached to request:', req.user.id);  // Should log the userId correctly as a string

    next();  // Move to the next middleware or route handler
  } catch (err) {
    console.error('Error verifying token:', err);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authenticateToken;

