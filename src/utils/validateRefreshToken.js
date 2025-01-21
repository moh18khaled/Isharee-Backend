const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

validateRefreshToken = asyncHandler(async (cookieToken, user) => {
  // Filter out expired tokens
  const validTokens = user.refreshTokens.filter(
    (refreshToken) => new Date() < new Date(refreshToken.expiresAt)
  );

  // Update the user's refreshTokens array in the database
  if (validTokens.length < user.refreshTokens.length) {
    user.refreshTokens = validTokens;
    await user.save(); // Save only if there are changes
  }

  // Check the validity of the refresh token
  for (const refreshToken of validTokens) {
    const isValid = await bcrypt.compare(cookieToken, refreshToken.token);

    if (isValid) {
      return true; // Token is valid
    }
  }
  return false;
});

module.exports = validateRefreshToken;
