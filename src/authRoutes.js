const express = require('express');
const { googleAuth } = require('./googleAuthController');
const router = express.Router();

router.post('/google', googleAuth);

module.exports = router;
