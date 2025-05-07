// googleAuthController.js
const passport = require('passport');
const User = require('../models/user');
const  sendError  = require('../utils/sendError');
const  verifyGoogleToken  = require('../utils/verifyGoogleToken');
const generateAndSetTokens  = require('../utils/generateAndSetTokens');


// Redirect to Google OAuth
exports.googleLogin = async (req, res, next) => {
    const { googleToken } = req.body;
    console.log("<><>><", googleToken);

    if (!googleToken) return next(sendError(400, "missingGoogleToken"));
  
    try {
      // Validate Google Token
      const googleUser = await verifyGoogleToken(googleToken);
  
      // Check if user exists based on email from Google
      const user = await User.findOne({ email: googleUser.email });
  
      if (!user) return next(sendError(404, "user"));
  
      // Generate and set tokens after login
      await generateAndSetTokens(user, res);
  
      return res.status(200).json({
        message: "User successfully logged in",
        data: {
          user: {
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture.url,
            role: user.role,
            id: user._id,
          },
        },
        redirectUrl: process.env.CLIENT_REDIRECT_URL || '/',  // Send a redirect URL in the response
      });
    } catch (err) {
      console.error(err);
      return next(sendError(500, "googleLoginError"));
    }
  };


  exports.googleSignup = async (req, res, next) => {
    const { email, name, googleId } = req.body;
  
    if (!email || !googleId) return next(sendError(400, "missingGoogleCredentials"));
  
    let user = await User.findOne({ email });
  
    if (!user) {
      // New user → create account
      user = new User({
        email: email.toLowerCase(),
        username :email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, ""),
        name,
        authProvider: "google",
        isVerified: true,
        googleId, // Save the googleId to identify this user
        age:33,
      });
      await user.save();
    }
  
    // Existing or new user → generate tokens
    await generateAndSetTokens(user, res);
  
    return res.status(200).json({
      message: "Authenticated successfully with Google.",
      data: {
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  };
  

// Google OAuth callback
exports.googleCallback = (req, res) => {
  const redirectUrl = process.env.CLIENT_REDIRECT_URL || 'http://localhost:5173';
  res.redirect(redirectUrl);  // Redirect to a dashboard or main page after login
};
