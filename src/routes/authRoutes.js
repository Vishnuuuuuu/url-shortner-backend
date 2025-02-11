


//added userId
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = require('../config/mongoClient');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Authenticate with Google and generate a JWT
 *     description: Verifies the Google ID token, checks if the user exists in the database, and returns a JWT.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Google ID token received from the frontend
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6Ijk...
 *     responses:
 *       200:
 *         description: Successfully authenticated with Google
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for further API access
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     googleId:
 *                       type: string
 *                       description: Unique Google user ID
 *                       example: 102253486702087162941
 *                     email:
 *                       type: string
 *                       description: User's email address
 *                       example: user@example.com
 *                     name:
 *                       type: string
 *                       description: User's name
 *                       example: John Doe
 *       400:
 *         description: Google authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message describing the failure
 *                   example: Google authentication failed
 *                 details:
 *                   type: string
 *                   description: Detailed error message
 *                   example: Invalid ID token
 */

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
