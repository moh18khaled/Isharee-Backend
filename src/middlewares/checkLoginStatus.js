const verifyToken = require("./verifyToken");

const checkLoginStatus = async (req, res, next) => {
  // Use the verifyToken middleware with the flag to prevent token regeneration
  await verifyToken(req, res, next, { skipAccessTokenGeneration: true });
};

module.exports = checkLoginStatus;
