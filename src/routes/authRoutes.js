// const express = require('express');
// const router = express.Router();
// const jwt = require('jsonwebtoken');
// const { OAuth2Client } = require('google-auth-library');
// const client = require('../config/mongoClient');
// const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// // Google Sign-In
// router.post('/google', async (req, res) => {
//   const { token } = req.body;
//   try {
//     const ticket = await googleClient.verifyIdToken({
//       idToken: token,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const { sub, email, name } = ticket.getPayload();
//     const db = client.db('url_shortener');
//     const usersCollection = db.collection('users');

//     let user = await usersCollection.findOne({ googleId: sub });
//     if (!user) {
//       await usersCollection.insertOne({
//         googleId: sub,
//         email,
//         name,
//         createdAt: new Date(),
//       });
//     }

//     const jwtToken = jwt.sign({ googleId: sub, email }, process.env.JWT_SECRET, { expiresIn: '1h' });
//     res.status(200).json({ token: jwtToken, user: { email, name } });
//   } catch (err) {
//     res.status(400).json({ error: 'Google authentication failed', details: err.message });
//   }
// });

// module.exports = router;


//added userId
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = require('../config/mongoClient');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name } = ticket.getPayload();  // `sub` is the unique Google ID
    const db = client.db('url_shortener');
    const usersCollection = db.collection('users');

    let user = await usersCollection.findOne({ googleId });
    if (!user) {
      await usersCollection.insertOne({
        googleId,
        email,
        name,
        createdAt: new Date(),
      });
    }

    // Include `googleId` in the JWT payload
    const jwtToken = jwt.sign({ googleId, email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Return the token and user details
    res.status(200).json({ 
      token: jwtToken, 
      user: { googleId, email, name } 
    });
  } catch (err) {
    res.status(400).json({ error: 'Google authentication failed', details: err.message });
  }
});

module.exports = router;
