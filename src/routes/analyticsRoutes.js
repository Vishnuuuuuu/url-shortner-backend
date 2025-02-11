

//below with redis

const express = require('express');
const router = express.Router();
const client = require('../config/mongoClient');
const authToken = require('../middleware/authMiddleware');
const redisClient = require('../config/redisClient');

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

/**
 * @swagger
 * /analytics/overall:
 *   get:
 *     summary: Get overall analytics for a user
 *     description: Retrieve analytics including total URLs, total clicks, and details of each short URL.
 *     tags:
 *       - Analytics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved overall analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUrls:
 *                   type: integer
 *                   description: Total number of URLs created by the user
 *                   example: 5
 *                 totalClicks:
 *                   type: integer
 *                   description: Total number of clicks on all URLs
 *                   example: 100
 *                 urls:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       alias:
 *                         type: string
 *                         description: The alias of the short URL
 *                         example: yt123
 *                       shortUrl:
 *                         type: string
 *                         description: The shortened URL
 *                         example: https://short.url/yt123
 *                       longUrl:
 *                         type: string
 *                         description: The original long URL
 *                         example: https://youtube.com
 *                       topic:
 *                         type: string
 *                         description: The topic associated with the URL
 *                         example: tech
 *                       clicks:
 *                         type: integer
 *                         description: Number of clicks on this URL
 *                         example: 20
 *                       ipSummary:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             ip:
 *                               type: string
 *                               description: The IP address
 *                               example: 192.168.1.1
 *                             device:
 *                               type: string
 *                               description: Device type
 *                               example: mobile
 *                             os:
 *                               type: string
 *                               description: Operating system
 *                               example: Android
 *                             browser:
 *                               type: string
 *                               description: Browser name
 *                               example: Chrome
 *                             clicks:
 *                               type: integer
 *                               description: Total number of clicks from this IP and device combination
 *                               example: 5
 *       500:
 *         description: Internal server error
 */

// **1. Overall Analytics API with Redis Caching**
router.get('/analytics/overall', authToken, async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `overallAnalytics:${userId}`;

  try {
    // Check Redis cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log('Serving overall analytics from cache');
      return res.status(200).json(JSON.parse(cachedData));
    }

    console.log('Cache miss: querying MongoDB for overall analytics');
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

    // Cache the response in Redis for 10 minutes (600 seconds)
    await redisClient.set(cacheKey, JSON.stringify(overallAnalytics), {
      EX: 600,
    });

    res.status(200).json(overallAnalytics);
  } catch (err) {
    console.error('Error fetching overall analytics:', err);
    res.status(500).json({ error: 'Failed to retrieve overall analytics' });
  }
});

/**
 * @swagger
 * /analytics/topic/{topic}:
 *   get:
 *     summary: Get analytics based on a specific topic
 *     description: Retrieve analytics for all URLs under the specified topic.
 *     tags:
 *       - Analytics
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topic
 *         required: true
 *         schema:
 *           type: string
 *         description: The topic to filter analytics by
 *     responses:
 *       200:
 *         description: Successfully retrieved topic-based analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                   description: The topic being queried
 *                   example: tech
 *                 urls:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       alias:
 *                         type: string
 *                         description: The alias of the short URL
 *                         example: yt123
 *                       shortUrl:
 *                         type: string
 *                         description: The shortened URL
 *                         example: https://short.url/yt123
 *                       longUrl:
 *                         type: string
 *                         description: The original long URL
 *                         example: https://youtube.com
 *                       totalClicks:
 *                         type: integer
 *                         description: Number of clicks on this URL
 *                         example: 20
 *                       ipSummary:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             ip:
 *                               type: string
 *                               description: The IP address
 *                               example: 192.168.1.1
 *                             device:
 *                               type: string
 *                               description: Device type
 *                               example: desktop
 *                             clicks:
 *                               type: integer
 *                               description: Total number of clicks
 *                               example: 5
 *       500:
 *         description: Internal server error
 */


// **2. Topic-Based Analytics API with Redis Caching**
router.get('/analytics/topic/:topic', authToken, async (req, res) => {
  const topic = req.params.topic;
  const userId = req.user.id;
  const cacheKey = `topicAnalytics:${userId}:${topic}`;

  try {
    // Check Redis cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Serving topic-based analytics from cache for topic: ${topic}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    console.log(`Cache miss for topic: ${topic}. Querying MongoDB.`);
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

    // Cache the response in Redis for 10 minutes
    await redisClient.set(cacheKey, JSON.stringify({ topic, urls: topicAnalytics }), {
      EX: 600,
    });

    res.status(200).json({ topic, urls: topicAnalytics });
  } catch (err) {
    console.error('Error fetching topic-based analytics:', err);
    res.status(500).json({ error: 'Failed to retrieve topic-based analytics' });
  }
});


/**
 * @swagger
 * /analytics/url:
 *   get:
 *     summary: Get analytics for a specific shortened URL
 *     description: Retrieve click details and overall analytics for a given short URL.
 *     tags:
 *       - Analytics
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: shortUrl
 *         required: true
 *         schema:
 *           type: string
 *         description: The short URL to retrieve analytics for
 *         example: https://short.url/yt123
 *     responses:
 *       200:
 *         description: Successfully retrieved analytics for the short URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alias:
 *                   type: string
 *                   description: The alias of the short URL
 *                   example: yt123
 *                 longUrl:
 *                   type: string
 *                   description: The original long URL
 *                   example: https://youtube.com
 *                 totalClicks:
 *                   type: integer
 *                   description: Total number of clicks on this URL
 *                   example: 25
 *                 ipSummary:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ip:
 *                         type: string
 *                         description: The IP address
 *                         example: 192.168.1.1
 *                       device:
 *                         type: string
 *                         description: Device type
 *                         example: mobile
 *                       os:
 *                         type: string
 *                         description: Operating system
 *                         example: iOS
 *                       browser:
 *                         type: string
 *                         description: Browser name
 *                         example: Safari
 *                       clicks:
 *                         type: integer
 *                         description: Total number of clicks
 *                         example: 10
 *       404:
 *         description: Shortened URL not found
 *       500:
 *         description: Internal server error
 */

// **3. Analytics by Shortened URL (No caching needed)**
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

module.exports = router;

