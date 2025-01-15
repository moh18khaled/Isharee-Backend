const User = require("../models/user");
const setCookie = require("../utils/setCookie");
const generateJWT = require("../utils/generateJWT");
const validateRefreshToken = require("../utils/validateRefreshToken");
const sendError = require("../utils/sendError");
const verifyJWT = require("../utils/verifyJWT")

const verifyToken = async (req, res, next) => {
  const access_token = req.cookies.access_token;

  const refresh_token = req.cookies.refresh_token;

  if (!access_token) {
    // If no access token
    if (!refresh_token) return next(sendError(401));

    try {
      const decodedRefreshToken = verifyJWT(refresh_token);

      const user = await User.findById(decodedRefreshToken.id);

      if (!user) return next(sendError(401));

      const isValid = await validateRefreshToken(refresh_token, user);

      if (!isValid) return next(sendError(401));

      // Generate new access token
      const accessToken = await generateJWT(
        {
          email: decodedRefreshToken.email,
          id: decodedRefreshToken.id,
          role: decodedRefreshToken.role,
        },
        "5m"
      );

      // Attach user details to the request
      req.user = decodedRefreshToken;

      setCookie(res, "access_token", accessToken, 5 * 60 * 1000);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(sendError(401, "token")); // Specific message for expired token
      }
      return next(sendError(401)); // Generic message for other errors
    }
  } else {
    try {
      const decodedAccessToken = verifyJWT(access_token);

      req.user = decodedAccessToken;
    } catch (err) {
      return next(sendError(401));
    }
  }
  next();
};

module.exports = verifyToken;
