// const express = require('express');
// const router = express.Router();
// const client = require('../config/mongoClient');
// const axios = require('axios');
// const authToken = require ('../middleware/authMiddleware')
// // Helper function to get geolocation from IP
// async function getGeolocation(ip) {
//   try {
//     const response = await axios.get(`http://ip-api.com/json/${ip}`);
//     return response.data;
//   } catch (err) {
//     return { message: 'Geolocation unavailable' };
//   }
// }

// // GET /api/analytics/:alias - Retrieve detailed analytics for a short URL
// router.get('/analytics/:alias',authToken, async (req, res) => {
//   const alias = req.params.alias;

//   try {
//     const db = client.db('url_shortener');
//     const urlEntry = await db.collection('urls').findOne({ alias });

//     if (!urlEntry) {
//       return res.status(404).json({ error: 'Short URL not found' });
//     }

//     const totalClicks = urlEntry.clickAnalytics.length;

//     // Aggregate clicks by IP and device, including OS and browser
//     const clickSummary = {};
//     urlEntry.clickAnalytics.forEach((click) => {
//       const key = `${click.ip}-${click.device}`;
//       if (!clickSummary[key]) {
//         clickSummary[key] = {
//           ip: click.ip,
//           device: click.device,
//           os: click.os || 'unknown',  // Include OS
//           browser: click.browser || 'unknown',  // Include browser
//           batteryPercentage: click.batteryPercentage,
//           isCharging: click.isCharging,
//           geoData: click.geoData || {},
//           clicks: 0,
//         };
//       }
//       clickSummary[key].clicks += 1;
//     });

//     res.status(200).json({
//       alias,
//       longUrl: urlEntry.longUrl,
//       totalClicks,
//       ipSummary: Object.values(clickSummary),
//     });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to retrieve analytics', details: err.message });
//   }
// });


// router.get('/analytics/user', async (req, res) => {
//   try {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//       return res.status(401).json({ error: 'Authorization token missing' });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const db = client.db('url_shortener');

//     // Get all URLs created by the authenticated user
//     const urls = await db.collection('urls').find({ createdBy: decoded.id }).toArray();

//     // Compile analytics for all URLs
//     const analytics = urls.map((url) => {
//       const totalClicks = url.clickAnalytics.length;
//       return {
//         shortUrl: url.shortUrl,
//         longUrl: url.longUrl,
//         totalClicks,
//         topic: url.topic || 'General',
//       };
//     });

//     res.status(200).json(analytics);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to retrieve user-specific analytics', details: error.message });
//   }
// });

// router.get('/analytics/url', async (req, res) => {
//   const { shortUrl } = req.query;

//   try {
//     // Extract alias from the given short URL
//     const alias = shortUrl.split('/').pop();  // Extract the last segment

//     const db = client.db('url_shortener');
//     const urlEntry = await db.collection('urls').findOne({ alias });

//     if (!urlEntry) {
//       return res.status(404).json({ error: 'Shortened URL not found' });
//     }

//     const totalClicks = urlEntry.clickAnalytics.length;

//     // Aggregate clicks by IP and device
//     const clickSummary = {};
//     urlEntry.clickAnalytics.forEach((click) => {
//       const key = `${click.ip}-${click.device}`;
//       if (!clickSummary[key]) {
//         clickSummary[key] = {
//           ip: click.ip,
//           device: click.device,
//           os: click.os,
//           batteryPercentage: click.batteryPercentage,
//           isCharging: click.isCharging,
//           geoData: click.geoData || {},
//           clicks: 0,
//         };
//       }
//       clickSummary[key].clicks += 1;
//     });

//     res.status(200).json({
//       alias,
//       longUrl: urlEntry.longUrl,
//       totalClicks,
//       ipSummary: Object.values(clickSummary),
//     });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to retrieve analytics', details: err.message });
//   }
// });

// module.exports = router;

//updated one
const express = require('express');
const router = express.Router();
const client = require('../config/mongoClient');
const authToken = require('../middleware/authMiddleware');
const axios = require('axios');

// Helper function to get geolocation from IP
async function getGeolocation(ip) {
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    return response.data;
  } catch (err) {
    return { message: 'Geolocation unavailable' };
  }
}

// Helper function to aggregate click analytics
function aggregateClickAnalytics(clickAnalytics) {
  const clickSummary = {};
  clickAnalytics.forEach((click) => {
    const key = `${click.ip}-${click.device}`;
    if (!clickSummary[key]) {
      clickSummary[key] = {
        ip: click.ip,
        device: click.device,
        os: click.os || 'unknown',
        browser: click.browser || 'unknown',
        batteryPercentage: click.batteryPercentage,
        isCharging: click.isCharging,
        geoData: click.geoData || {},
        clicks: 0,
      };
    }
    clickSummary[key].clicks += 1;
  });

  return Object.values(clickSummary);
}

// **Overall Analytics API**
router.get('/analytics/overall', authToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const db = client.db('url_shortener');
    const urls = await db.collection('urls').find({ userId }).toArray();

    if (!urls.length) {
      return res.status(200).json({
        message: 'No URLs found for this user',
        totalUrls: 0,
        totalClicks: 0,
        urls: [],
      });
    }

    const overallAnalytics = {
      totalUrls: urls.length,
      totalClicks: urls.reduce((acc, url) => acc + (url.clickAnalytics?.length || 0), 0),
      urls: urls.map((url) => ({
        alias: url.alias,
        shortUrl: url.shortUrl,
        longUrl: url.longUrl,
        topic: url.topic || 'general',
        clicks: url.clickAnalytics?.length || 0,
        ipSummary: aggregateClickAnalytics(url.clickAnalytics || []),
      })),
    };

    res.status(200).json(overallAnalytics);
  } catch (err) {
    console.error('Error fetching overall analytics:', err);
    res.status(500).json({ error: 'Failed to retrieve overall analytics' });
  }
});

// **Topic-Based Analytics API**
router.get('/analytics/topic/:topic', authToken, async (req, res) => {
  try {
    const topic = req.params.topic;
    const userId = req.user.id;
    const db = client.db('url_shortener');
    const urls = await db.collection('urls').find({ userId, topic }).toArray();

    if (!urls.length) {
      return res.status(200).json({
        message: `No URLs found under topic '${topic}'`,
        urls: [],
      });
    }

    const topicAnalytics = urls.map((url) => ({
      alias: url.alias,
      shortUrl: url.shortUrl,
      longUrl: url.longUrl,
      totalClicks: url.clickAnalytics?.length || 0,
      ipSummary: aggregateClickAnalytics(url.clickAnalytics || []),
    }));

    res.status(200).json({ topic, urls: topicAnalytics });
  } catch (err) {
    console.error('Error fetching topic-based analytics:', err);
    res.status(500).json({ error: 'Failed to retrieve topic-based analytics' });
  }
});

// **Analytics by Shortened URL**
router.get('/analytics/url', authToken, async (req, res) => {
  try {
    const { shortUrl } = req.query;
    const alias = shortUrl.split('/').pop();

    const db = client.db('url_shortener');
    const urlEntry = await db.collection('urls').findOne({ alias, userId: req.user.id });

    if (!urlEntry) {
      return res.status(404).json({ error: 'Shortened URL not found' });
    }

    const totalClicks = urlEntry.clickAnalytics?.length || 0;
    const ipSummary = aggregateClickAnalytics(urlEntry.clickAnalytics || []);

    res.status(200).json({
      alias: urlEntry.alias,
      longUrl: urlEntry.longUrl,
      totalClicks,
      ipSummary,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

// **1. Get Analytics by Alias**
router.get('/analytics/:alias', authToken, async (req, res) => {
  const alias = req.params.alias;

  try {
    const db = client.db('url_shortener');
    const urlEntry = await db.collection('urls').findOne({ alias, userId: req.user.id });

    if (!urlEntry) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const totalClicks = (urlEntry.clickAnalytics || []).length;

    // Aggregate clicks by IP and device
    const clickSummary = {};
    (urlEntry.clickAnalytics || []).forEach((click) => {
      const key = `${click.ip}-${click.device}`;
      if (!clickSummary[key]) {
        clickSummary[key] = {
          ip: click.ip,
          device: click.device,
          os: click.os || 'unknown',
          browser: click.browser || 'unknown',
          batteryPercentage: click.batteryPercentage,
          isCharging: click.isCharging,
          geoData: click.geoData || {},
          clicks: 0,
        };
      }
      clickSummary[key].clicks += 1;
    });

    res.status(200).json({
      alias,
      longUrl: urlEntry.longUrl,
      totalClicks,
      ipSummary: Object.values(clickSummary),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve analytics', details: err.message });
  }
});

module.exports = router;

