const express = require('express');
const shortid = require('shortid');
const router = express.Router();
const client = require('../config/mongoClient');
const UAParser = require('ua-parser-js');
const jwt = require('jsonwebtoken');
const authToken = require ('../middleware/authMiddleware')

// // Create short URL
// router.post('/shorten',authToken ,async (req, res) => {
//   const { longUrl, customAlias, topic, batteryPercentage, isCharging } = req.body;
//   console.log('Received battery percentage on backend:', batteryPercentage, '| Charging:', isCharging);

//   const alias = customAlias || shortid.generate();
//   const shortUrl = `http://localhost:5000/${alias}`;

//   try {
//     const db = client.db('url_shortener');
//     const urlsCollection = db.collection('urls');

//     if (await urlsCollection.findOne({ alias })) {
//       return res.status(400).json({ error: 'Alias already in use' });
//     }

//     await urlsCollection.insertOne({
//       longUrl,
//       alias,
//       shortUrl,
//       topic: topic || 'general',
//       batteryPercentage: batteryPercentage || 'unknown',
//       isCharging: isCharging || false,
//       createdAt: new Date(),
//     });

//     res.status(201).json({ shortUrl, createdAt: new Date() });
//   } catch (error) {
//     console.error('Error in shortening URL:', error);
//     res.status(500).json({ error: 'Failed to shorten URL' });
//   }
// });

//Below one saves under a user
// router.post('/shorten', authToken, async (req, res) => {
//   const { longUrl, customAlias, topic } = req.body;
//   const alias = customAlias || shortid.generate();
//   const shortUrl = `http://localhost:5000/${alias}`;

//   try {
//     const db = client.db('url_shortener');
//     const urlsCollection = db.collection('urls');

//     if (await urlsCollection.findOne({ alias })) {
//       return res.status(400).json({ error: 'Alias already in use' });
//     }

//     // Store the `googleId` (userId) with the URL entry
//     await urlsCollection.insertOne({
//       userId: req.user.id,  // `googleId` attached by auth middleware
//       longUrl,
//       alias,
//       shortUrl,
//       topic: topic || 'general',
//       clickAnalytics: [],
//       createdAt: new Date(),
//     });
//     console.log(req.user.id);
//     res.status(201).json({ shortUrl });
//   } catch (error) {
//     console.error('Error creating short URL:', error);
//     res.status(500).json({ error: 'Failed to shorten URL' });
//   }
// });


//below one saves allows same alias but under diffrent user 
// Example domain
const BASE_DOMAIN = process.env.APP_DOMAIN || 'localhost:5000';

router.post('/shorten', authToken, async (req, res) => {
  const { longUrl, customAlias, topic } = req.body;

  try {
    // 1) Generate or use the provided custom alias
    const alias = customAlias || shortid.generate();

    // 2) Construct the short URL
    const shortUrl = `http://${BASE_DOMAIN}/${alias}`;

    // 3) Store the URL under this specific userId, alias, and topic
    const db = client.db('url_shortener');
    const urlsCollection = db.collection('urls');

    // **NO CHECK FOR GLOBAL ALIAS UNIQUENESS**
    // Instead, ensure (userId + alias + topic) uniqueness
    const existing = await urlsCollection.findOne({
      userId: req.user.id,
      alias,
      topic: topic || 'general',
    });

    if (existing) {
      return res.status(400).json({
        error: `You already have an entry for alias "${alias}" under topic "${topic || 'general'}". Please try a different combination.`,
      });
    }

    // 4) Insert the new document for this user
    await urlsCollection.insertOne({
      userId: req.user.id,  // Unique per user
      longUrl,
      alias,
      shortUrl,
      topic: topic || 'general',  // Default to "general"
      clickAnalytics: [],
      createdAt: new Date(),
    });

    console.log(`Created short URL for user ${req.user.id} → ${shortUrl}`);
    return res.status(201).json({ shortUrl });
  } catch (error) {
    console.error('Error creating short URL:', error);
    return res.status(500).json({ error: 'Failed to shorten URL' });
  }
});


// GET /:alias - get ip adress and much more and then Redirect to the original URL
const fetch = require('node-fetch');


router.get('/:alias',  async (req, res) => {
  const alias = req.params.alias;

  try {
    const db = client.db('url_shortener');
    const urlEntry = await db.collection('urls').findOne({ alias });

    if (!urlEntry) {
      return res.status(404).send('Short URL not found');
    }

    // Detect the real client IP
    let clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.split('::ffff:')[1];  // Handle IPv4-mapped addresses
    }

    console.log('Detected Client IP:', clientIp);

    // Parse user agent to detect device, OS, and browser
    const parser = new UAParser(req.headers['user-agent']);
    const device = parser.getDevice().type || 'unknown';
    const os = `${parser.getOS().name || 'unknown'} ${parser.getOS().version || ''}`.trim();
    const browser = parser.getBrowser().name || 'unknown';

    // Fetch geolocation details using IP
    const ipInfo = await fetch(`http://ip-api.com/json/${clientIp}`).then((response) => response.json());

    const geoData = {
      city: ipInfo.city || 'N/A',
      region: ipInfo.regionName || 'N/A',
      country: ipInfo.country || 'N/A',
      isp: ipInfo.isp || 'N/A',
    };

    // Send a script to the client to collect battery data and log the click
    res.send(`
      <script>
        navigator.getBattery().then(battery => {
          fetch('/api/log-click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ip: '${clientIp}',
              alias: '${alias}',
              device: '${device}',
              os: '${os}',
              browser: '${browser}',
              batteryPercentage: Math.floor(battery.level * 100),
              isCharging: battery.charging,
              geoData: ${JSON.stringify(geoData)}
            })
          });
          // Redirect immediately to avoid delay
          window.location.href = '${urlEntry.longUrl}';
        });
      </script>
    `);
  } catch (err) {
    console.error('Error during redirection:', err);
    res.status(500).send('Error during redirection');
  }
});




module.exports = router;
