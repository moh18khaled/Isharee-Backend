const User = require("../models/user");
const setCookie = require("../utils/setCookie");
const generateJWT = require("../utils/generateJWT");
const validateRefreshToken = require("../utils/validateRefreshToken");
const verifyJWT = require("../utils/verifyJWT");

const optionalAuth = async (req, res, next) => {
  try {
    const accessToken = req.cookies.access_token;
    const refreshToken = req.cookies.refresh_token;

    if (!accessToken) {
      if (!refreshToken) {
        req.user = null; // No tokens, treat as unauthenticated
        return next();
      }

      // Verify the refresh token
      const decodedRefreshToken = verifyJWT(refreshToken);
      const user = await User.findById(decodedRefreshToken.id);

      if (!user) {
        req.user = null; // Refresh token invalid, treat as unauthenticated
        return next();
      }

      // Optionally, validate the refresh token against the user
      const isValidRefreshToken = await validateRefreshToken(
        refreshToken,
        user
      );
      if (!isValidRefreshToken) {
        req.user = null; // Invalid refresh token
        return next();
      }

      // Generate a new access token
      const newAccessToken = await generateJWT(
        {
          id: user._id,
          role: user.role,
        },
        "5m" // Example: 5 minutes
      );

      setCookie(res, "access_token", newAccessToken, 5 * 60 * 1000); // Set the new access token

      req.user = { id: user._id, role: user.role }; // Attach minimal user info
      return next();
    }

    // Verify the access token if it exists
    const decodedAccessToken = verifyJWT(accessToken);
    req.user = { id: decodedAccessToken.id, role: decodedAccessToken.role }; // Attach minimal user info
    next();
  } catch (err) {
    // Expired or token
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;
