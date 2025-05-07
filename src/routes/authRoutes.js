// authRoutes.js
const express = require('express');
const passport = require('passport');
const { googleLogin, googleCallback ,googleSignup}  = require('../controllers/googleAuthController');
const router = express.Router();

// Google Login Routes
router.post('/login/google', googleLogin);  // Redirects to Google OAuth
router.post('/signup/google', googleSignup);  // Redirects to Google OAuth
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), googleCallback);


module.exports = router;
 