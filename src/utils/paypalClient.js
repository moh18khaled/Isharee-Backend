const axios = require("axios");
const asyncHandler = require("express-async-handler");

const getAccessToken = asyncHandler(async () => {
  const PAYPAL_API = process.env.PAYPAL_API;
  const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
  const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

  const response = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      auth: { username: CLIENT_ID, password: CLIENT_SECRET },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  return response.data.access_token;
});

module.exports = getAccessToken;
