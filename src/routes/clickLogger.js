// const express = require('express');
// const router = express.Router();
// const client = require('../config/mongoClient');

// // Log the click details
// router.post('/log-click', async (req, res) => {
//     const { ip, alias, device, batteryPercentage, isCharging, geoData } = req.body;
  
//     try {
//       const db = client.db('url_shortener');
//       await db.collection('urls').updateOne(
//         { alias },
//         {
//           $push: {
//             clickAnalytics: {
//               timestamp: new Date(),
//               ip,
//               device,
//               batteryPercentage,
//               isCharging,
//               geoData,
//             },
//           },
//         }
//       );
//       res.status(200).send('Click logged successfully');
//     } catch (err) {
//       console.error('Error logging click:', err);
//       res.status(500).send('Error logging click');
//     }
//   });
  
// module.exports = router;


//with OS

const express = require('express');
const router = express.Router();
const client = require('../config/mongoClient');

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
