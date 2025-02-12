
// // with redis and rate limiter
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./src/routes/authRoutes');
const shortenRoutes = require('./src/routes/shortenRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const clickLogger = require('./src/routes/clickLogger');
const client = require('./src/config/mongoClient');
const redisClient = require('./src/config/redisClient');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { swaggerUi, swaggerDocs } = require('./swagger');
const app = express();

// Logger to log incoming requests
app.use(morgan('dev'));



// Allow frontend origin
const allowedOrigins = [
  'http://localhost:3000', // Local dev
  'https://url-shortner-frontend-mocha.vercel.app', // Deployed frontend
  'https://url-shortner-backend.up.railway.app', // Ensure backend is allowed too
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true, // Allow cookies and Authorization headers
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow necessary headers
};

app.use(cors(corsOptions));



app.use(express.json());


// **Rate Limiting Configuration**
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15-minute window
  max: 100,  // Limit each IP to 100 requests per 15 minutes
  message: { error: 'Too many requests, please try again later.' },
});

// Apply rate limiting globally to all API routes
app.use('/api', limiter);
// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// **Connect to MongoDB**
async function connectToDB() {
  try {
    await client.connect();
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('DB connection error:', error);
  }
}
connectToDB();

// **Middleware to Cache Responses Using Redis**
function cacheMiddleware(req, res, next) {
  const cacheKey = req.originalUrl;  // Use the requested URL as the cache key

  redisClient.get(cacheKey, (err, data) => {
    if (err) {
      console.error('Redis error:', err);
      return next();  // Proceed without caching if an error occurs
    }

    if (data) {
      console.log('Cache hit for:', cacheKey);
      return res.status(200).json(JSON.parse(data));  // Return cached data
    }

    console.log('Cache miss for:', cacheKey);
    next();  // Cache miss, proceed to route handler
  });
}

// **Routes**
app.use('/api/auth', authRoutes);
app.use('/', shortenRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', clickLogger);


// **Cache User Data**
app.get('/api/user', cacheMiddleware, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authorization token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = client.db('url_shortener');
    const user = await db.collection('users').findOne({ googleId: decoded.googleId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDetails = {
      username: user.name || user.username || 'User',
      email: user.email,
    };

    // Cache the user details for 15 minutes
    redisClient.setEx(`user:${decoded.googleId}`, 900, JSON.stringify(userDetails));

    res.status(200).json(userDetails);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(401).json({ error: 'Unauthorized access', details: error.message });
  }
});

// **Cache Analytics Example**
app.get('/api/cache-test', cacheMiddleware, async (req, res) => {
  // Simulating analytics data for demonstration
  const data = {
    alias: 'yt',
    longUrl: 'https://www.google.com',
    totalClicks: 5,
    ipSummary: [{ ip: '192.168.1.1', clicks: 2 }, { ip: '192.168.1.2', clicks: 3 }],
  };

  // Store the response in Redis with a 15-minute expiry time
  redisClient.setEx(req.originalUrl, 900, JSON.stringify(data));

  res.status(200).json(data);
});

// **Default route for testing the server**
app.get('/', (req, res) => {
  res.send('URL Shortener Backend is running.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
