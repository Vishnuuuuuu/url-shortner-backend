const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./src/routes/authRoutes');
const shortenRoutes = require('./src/routes/shortenRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const clickLogger = require('./src/routes/clickLogger');
const client = require('./src/config/mongoClient');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');

const app = express();
app.use(morgan('dev'));  // logs requests to console

// CORS configuration
app.use(cors({ origin: 'http://localhost:3000', methods: ['GET', 'POST'], credentials: true }));
app.use(express.json());

// Connect to MongoDB
async function connectToDB() {
  try {
    await client.connect();
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('DB connection error:', error);
  }
}
connectToDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/', shortenRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', clickLogger);



app.get('/api/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authorization token missing' });
    }

    // Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Connect to the database and find the user by their Google ID
    const db = client.db('url_shortener');
    const user = await db.collection('users').findOne({ googleId: decoded.googleId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send only the relevant user details for the profile page
    res.status(200).json({
      username: user.name || user.username || 'User',  // Fallback in case of missing name
      email: user.email,
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(401).json({ error: 'Unauthorized access', details: error.message });
  }
});


// Default route for testing the server
app.get('/', (req, res) => {
  res.send('URL Shortener Backend is running.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
