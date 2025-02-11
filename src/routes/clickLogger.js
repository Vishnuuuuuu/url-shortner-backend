

//with OS

const express = require('express');
const router = express.Router();
const client = require('../config/mongoClient');

/**
 * @swagger
 * /log-click:
 *   post:
 *     summary: Log click details for a shortened URL
 *     description: Logs information about a user interaction with the short URL, such as IP, device, OS, browser, and more.
 *     tags:
 *       - Analytics
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ip:
 *                 type: string
 *                 description: IP address of the user
 *                 example: 192.168.0.1
 *               alias:
 *                 type: string
 *                 description: The short URL alias being clicked
 *                 example: yt123
 *               device:
 *                 type: string
 *                 description: Device type (e.g., desktop, mobile)
 *                 example: mobile
 *               os:
 *                 type: string
 *                 description: Operating system of the device
 *                 example: Android
 *               browser:
 *                 type: string
 *                 description: Browser used to access the URL
 *                 example: Chrome
 *               batteryPercentage:
 *                 type: integer
 *                 description: Device battery percentage at the time of the click
 *                 example: 75
 *               isCharging:
 *                 type: boolean
 *                 description: Indicates if the device is charging
 *                 example: false
 *               geoData:
 *                 type: object
 *                 description: Geolocation data of the user
 *                 properties:
 *                   city:
 *                     type: string
 *                     description: City of the user
 *                     example: Bangalore
 *                   region:
 *                     type: string
 *                     description: Region of the user
 *                     example: Karnataka
 *                   country:
 *                     type: string
 *                     description: Country of the user
 *                     example: India
 *     responses:
 *       200:
 *         description: Click logged successfully
 *       500:
 *         description: Internal server error while logging the click
 */
// Log the click details
router.post('/log-click', async (req, res) => {
  const { ip, alias, device, os, browser, batteryPercentage, isCharging, geoData } = req.body;

  try {
    const db = client.db('url_shortener');
    await db.collection('urls').updateOne(
      { alias },
      {
        $push: {
          clickAnalytics: {
            timestamp: new Date(),
            ip,
            device,
            os,  // Store OS data
            browser,  // Store browser data
            batteryPercentage,
            isCharging,
            geoData,
          },
        },
      }
    );
    res.status(200).send('Click logged successfully');
  } catch (err) {
    console.error('Error logging click:', err);
    res.status(500).send('Error logging click');
  }
});

module.exports = router;
