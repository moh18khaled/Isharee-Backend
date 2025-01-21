const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

const singleDeviceLogout = asyncHandler(async (cookieToken, user) => {
  // Filter refresh tokens asynchronously
  const updatedTokens = [];
  for (const refreshToken of user.refreshTokens) {
    const isValid = await bcrypt.compare(cookieToken, refreshToken.token);
    if (!isValid) {
      updatedTokens.push(refreshToken); // Keep tokens that do not match the cookieToken
    }
  }
  // Update the user's tokens in the database
  user.refreshTokens = updatedTokens;

  await user.save();
});

module.exports = singleDeviceLogout;
